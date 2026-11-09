# Handoff — Sunrise & Sunset Calculator （日出日落時間計算機）

## Fixed spec source

- Spec task id: `labs-sunrise-sunset-calculator-spec-20261109`
- Spec id: `spec-sunrise-sunset-calculator-20261109`
- Spec candidate commit: `f1f14924fae8e114c9b8f8e0caeba72922c64d30`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/164
- Implementation base: `codex/initial-publication` @ `c08e3243f0257f80fa512d15b1c37fcbeb6ef962`
- Scope: only `tools/sunrise-sunset-calculator/` added. Build-first mode: no registry/coordination commands were run; nothing is accepted, merged, or published.

## What was built

- `public/js/core/sun.mjs` — the pure core. Strict own-data validation (unknown/missing/wrong-type/accessor → SCHEMA, accessors never invoked), per-field checks in the SPEC's order (capacity INPUT_LIMIT → unpaired surrogate UNICODE → EMPTY → grammar DATE_FORMAT/DECIMAL_FORMAT/OFFSET_FORMAT → RANGE) in field order date → latitude → longitude → utcOffset, then the NOAA fractional-year computation exactly as pinned: γ at local noon (denominator 365 always), eqtime, declination, hour angle at the fixed 90.833° zenith, cosHa domain → POLAR_DAY / POLAR_NIGHT with all time fields null, per-time rounding floor(raw + 0.5) with dayOffset ∈ {−1, 0, 1}, and day length from the unrounded local minutes rounded once. No `Date`, no host-timezone reads: core tests pass identically under TZ=UTC, Asia/Taipei, America/New_York, and Pacific/Kiritimati. The canonical report serializer (keys sorted by UTF-16 code units recursively, compact, one trailing LF) never invokes an input `toJSON`.
- `public/js/controller.mjs` — generation-guarded draft/work controller (empty/dirty/busy/success/error/cancelled) over an injected Worker factory; late replies are dropped, edits and cancels terminate the worker, reset restores the SPEC defaults. Public state exposes `reportAvailable`.
- `public/js/app.js` + bilingual static pages — the eight SPEC city presets as app-level fixed data (choosing one fills latitude/longitude/utcOffset; hand-editing any of them returns the preset to custom), per-time （前一日）/(previous day) and （次一日）/(next day) markers from the result's dayOffsets, polar states shown as text only, the SPEC-pinned accuracy note resident under the results, the three pinned FAQ answers, and the fixed `sunrise-sunset-report.json` download (created only on click from the current success snapshot, Blob URL revoked within 30 s or on invalidation).
- `scripts/` — reproducible preview build (copies `public/`, embeds the fixed worker source = core + handler bytes, deny-all robots.txt, SHA-256 BUILD-MANIFEST), static check, generated-output check, and a loopback-only serve with the SPEC's CSP and noindex headers. Production mode is refused (no approved origin).

## Deviations and interpretations

- File layout follows the handbook contract (`public/js/core/*.mjs`, `public/js/app.js`, `public/js/controller.mjs`) rather than the SPEC implementation sketch's `src/` names; no behaviour difference.
- Candidate metadata follows the SPEC's pinned preview convention (noindex, no production canonical/hreflang/sitemap; production build refused) over the generic checklist wording.
- The preset select starts on Taipei because the SPEC's default draft (and the worked example) carry exactly the Taipei preset coordinates; reset restores the same state. The SPEC does not pin the select's initial value.
- Fixtures are vendored verbatim into `test/fixtures.json` (SHA-256 `98fdcc4f8290e396756544360b687a6bd4c54fcd034b971811eb525cf350d98d`, byte-identical to the spec candidate's file) because spec PR #164 is not merged into this branch's base.

## Spec-errata candidates

None. All 11 literal core fixtures and all 3 controller fixtures reproduce from the SPEC's stated rules; before product code existed, an independent scratch implementation of the NOAA steps reproduced all 7 successful fixtures value-for-value.

## Next owner

Independent reviewer (parent verifies the PR head first). Real-browser/device evidence and the nine-aspect review are still outstanding — see VERIFICATION.md NOT_RUN.
