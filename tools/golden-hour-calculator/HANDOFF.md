# Handoff — Golden Hour Calculator （黃金時刻計算）

## Fixed spec source

- Spec id: `spec-golden-hour-calculator-20261121`
- Spec draft PR: #396 (per assignment; spec files vendored from `build6/specs/golden-hour-calculator/docs/specs/golden-hour-calculator/`)
- Registry rev at spec registration: 1827 (per assignment)
- Implementation base: `codex/initial-publication` @ `8c2652671012498891e7f7afe02fdca3f154aa64`
- Scope: only `tools/golden-hour-calculator/` added. Build-first mode: no registry/coordination commands were run; nothing is accepted, merged, or published.

## What was built

- `public/js/core/golden-hour.mjs` — the pure core. Strict own-data validation (unknown/missing/wrong-type/accessor → SCHEMA, accessors never invoked), fields in the SPEC's order (date → latitude → longitude → utcOffset); per field: capacity INPUT_LIMIT → unpaired surrogate UNICODE → EMPTY → grammar (DATE_FORMAT for date, DECIMAL_FORMAT for latitude/longitude, OFFSET_FORMAT for utcOffset) → RANGE. The computation is the SPEC's NOAA fractional-year model, steps 1–13: γ at local noon with denominator always 365, equation of time, declination, 90.833° zenith hour angle, polar day/night from the cosHa domain, floor(raw + 0.5) minute rounding with mathematical dayOffset, day length from unrounded values, noon elevation 90 − |latitude − decl°| half-up to 1 decimal (returned for polar day/night too), and the four elevation windows (golden −4° to +6°, blue −6° to −4°) with the low-bound-first windowStatus rule (SUN_NEVER_LOW when the low bound has no intersection, SUN_NEVER_HIGH when only the high bound is missing, low bound ruling when both are missing; POLAR_DAY all SUN_NEVER_LOW, POLAR_NIGHT all SUN_NEVER_HIGH). No clock, `Date`, `Intl`, network, storage, or DOM reads: the core is timezone-independent. The canonical report serializer (keys sorted by UTF-16 code units recursively, compact, one trailing LF) never invokes an input `toJSON`.
- `public/js/controller.mjs` — generation-guarded draft/work controller (empty/dirty/busy/success/error/cancelled) over an injected Worker factory; late replies are dropped, edits and cancels terminate the worker, reset restores the SPEC defaults. Public state exposes `reportAvailable`.
- `public/js/app.js` + bilingual static pages — the four fields (date/latitude/longitude/utcOffset text inputs), the eight-city preset select (app-layer fixed data; choosing a city fills the three fields, hand-editing any of them switches the preset back to custom), the SPEC-pinned precision statement resident in both the input and results areas, the five pinned FAQ answers, the method disclosure (NOAA fractional-year, γ at local noon, 90.833° zenith, elevation windows, rounding and dayOffset rules, polar behaviour), polar-day/night status text, per-window missing reasons, dayOffset markers （前一日）/（次一日） / (previous day)/(next day), and the fixed `golden-hour-report.json` download (created only on click from the current success snapshot, Blob URL revoked within 30 s or on invalidation).
- `scripts/` — reproducible preview build (copies `public/`, embeds the fixed worker source = core + handler bytes, deny-all robots.txt, SHA-256 BUILD-MANIFEST), static check, generated-output check, and a loopback-only serve with the SPEC's CSP and noindex headers. Production mode is refused (no approved origin).

## Deviations and interpretations

- File layout follows the handbook contract (`public/js/core/*.mjs`, `public/js/app.js`, `public/js/controller.mjs`) rather than the SPEC implementation sketch's `src/` names; no behaviour difference.
- Candidate metadata follows the SPEC's pinned preview convention (noindex, no production canonical/hreflang/sitemap; production build refused) over the generic checklist wording.
- The SPEC's tests section lists "單獨 surrogate" among the extra checks without naming an error code; the core reports `UNICODE` for an unpaired surrogate, following the sibling tools' convention (capacity → UNICODE → EMPTY prelude order).
- The precision statement is duplicated in the input area as well as next to the results, following the sibling tools' fixed-note pattern; the SPEC pins it under the results area.
- Fixtures are vendored verbatim into `test/fixtures.json` (SHA-256 `4984ccc36ee7bb4dbcaaefddcd11c8f4020390658d8ccc78ab187053941f4710`, byte-identical to the spec candidate's file) because spec PR #396 is not merged into this branch's base.

## Spec-errata candidates

1. **Symmetry property sentence (tests section) is false as literally written.** The SPEC says: 「緯度取負、日期取對稱日（相隔半年）時極晝與極夜互換」. Verified against the SPEC's own formula (step 5): cosHa is invariant under the combined transform (φ → −φ, δ → −δ), because cos is even and tanφ·tanδ is unchanged. Measured with the implementation (which reproduces all 16 fixtures): Tromsø 2026-06-21 lat +69.6492 → POLAR_DAY; negating the latitude alone → POLAR_NIGHT; taking the symmetric date alone (2026-12-21) → POLAR_NIGHT; doing **both** → POLAR_DAY (unchanged, not swapped). So each operation alone swaps the polar status, while both together preserve it. The implementation follows the normative formula (steps 1–13) and all fixtures; only the non-normative property sentence is wrong. Suggested fix: reword to state that negating the latitude alone, or taking the date half a year away alone, swaps polar day and night.
2. **No other errata found.** All 16 literal core fixtures and all 3 controller fixtures reproduce from the SPEC's stated rules; the golden-window-contains-sunrise/sunset, blue-meets-golden-at-the-shared-bound, equal morning/evening durations, and day-length display properties all hold on every successful fixture. No SPEC-vs-example conflict was found: every fixture agrees with the SPEC's formula text.

## Next owner

Independent reviewer (parent verifies the PR head first). Real-browser/device evidence and the nine-aspect review are still outstanding — see VERIFICATION.md NOT_RUN.
