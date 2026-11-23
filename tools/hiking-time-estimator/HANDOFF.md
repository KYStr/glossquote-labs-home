# Handoff — Hiking Time Estimator （登山時間預估）

## Fixed spec source

- Spec id: `spec-hiking-time-estimator-20261121`
- Spec candidate commit: `c38663f3c8ef0fe752a5516b93e4984c4d148955`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/371
- Registry rev at spec registration: 1702 (per assignment)
- Implementation base: `codex/initial-publication` @ `8c2652671012498891e7f7afe02fdca3f154aa64`
- Scope: only `tools/hiking-time-estimator/` added. Build-first mode: no registry/coordination commands were run; nothing is accepted, merged, or published.

## What was built

- `public/js/core/hiking.mjs` — the pure core. Strict own-data validation (unknown/missing/wrong-type/accessor → SCHEMA, accessors never invoked), fields in the SPEC's order (distanceKm → ascentM → descentM → descentType); per field: capacity INPUT_LIMIT → unpaired surrogate UNICODE → EMPTY → grammar (DECIMAL_FORMAT for distance, INTEGER_FORMAT for the metre fields, ENUM for descentType) → RANGE. descentM / descentType are optional: missing or empty means `"0"` / `"none"`, so they never report EMPTY. The computation is the SPEC's exact-rational model: with `d100 = distanceKm × 100`, `totalExactMin × 300 = d100 × 36 + ascentM × 30 ± descentM × 10` (gentle −, steep +, none 0), floored at 0; `totalMinutes` half-up to whole minutes, `totalDisplay` as `H:MM` (hours unpadded, may exceed 24); pace is the floored total ÷ distance, half-up to 1 dp; equivalent flat distance is `distanceKm + 7.92 × ascentM ÷ 1000`, half-up to 2 dp; the three segment values are each half-up to 1 dp on their own exact values (a negative descent adjustment rounds its absolute value and takes the sign back; a zero adjustment is exactly `0`, never `-0`). No clock, `Date`, `Intl`, network, storage, or DOM reads: core tests pass identically under TZ=UTC, Asia/Taipei, and Pacific/Kiritimati. The canonical report serializer (keys sorted by UTF-16 code units recursively, compact, one trailing LF) never invokes an input `toJSON`.
- `public/js/controller.mjs` — generation-guarded draft/work controller (empty/dirty/busy/success/error/cancelled) over an injected Worker factory; late replies are dropped, edits and cancels terminate the worker, reset restores the SPEC defaults. Public state exposes `reportAvailable`.
- `public/js/app.js` + bilingual static pages — the four fields (distance/ascent/descent text inputs, descent-type `<select>` with the three SPEC options), the SPEC-pinned estimate statement resident in both the input and results areas, the two pinned FAQ answers, the method disclosure (Naismith 5 km/h + 600 m/h, Langmuir descent correction, Scarf 7.92 equivalent distance, and the note that the separately rounded segments need not sum to the total), and the fixed `hiking-time-estimate.json` download (created only on click from the current success snapshot, Blob URL revoked within 30 s or on invalidation).
- `scripts/` — reproducible preview build (copies `public/`, embeds the fixed worker source = core + handler bytes, deny-all robots.txt, SHA-256 BUILD-MANIFEST), static check, generated-output check, and a loopback-only serve with the SPEC's CSP and noindex headers. Production mode is refused (no approved origin).

## Deviations and interpretations

- File layout follows the handbook contract (`public/js/core/*.mjs`, `public/js/app.js`, `public/js/controller.mjs`) rather than the SPEC implementation sketch's `src/` names; no behaviour difference.
- Candidate metadata follows the SPEC's pinned preview convention (noindex, no production canonical/hreflang/sitemap; production build refused) over the generic checklist wording.
- The SPEC's tests section lists "單獨 surrogate" among the extra checks without naming an error code; the core reports `UNICODE` for an unpaired surrogate, following the sibling trip-time-estimator tool's convention (capacity → UNICODE → EMPTY prelude order).
- The estimate statement is duplicated in the input area as well as next to the results, following the sibling tool's fixed-note pattern; the SPEC pins it next to the results.
- Fixtures are vendored verbatim into `test/fixtures.json` (SHA-256 `d63529eb7fc8a27c67cb786a9132b105cdcf3f63f5fb3c7aa29abe3452ac20d8`, byte-identical to the spec candidate's file) because spec PR #371 is not merged into this branch's base.

## Spec-errata candidates

None. All 16 literal core fixtures and all 3 controller fixtures reproduce from the SPEC's stated rules; before product code existed, an independent scratch implementation (Python `fractions.Fraction`) of the exact-rational model reproduced all 12 successful fixtures value-for-value, and the hand-derived half-up cases (exact x.5 totals, the gentle-descent floor at exactly 0) agreed with the same scratch model. No SPEC-vs-example conflict was found: every fixture agrees with the SPEC's formula text.

## Next owner

Independent reviewer (parent verifies the PR head first). Real-browser/device evidence and the nine-aspect review are still outstanding — see VERIFICATION.md NOT_RUN.
