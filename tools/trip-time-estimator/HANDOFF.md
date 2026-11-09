# Handoff — Trip Time Estimator （跨時區旅程時間計算機）

## Fixed spec source

- Spec task id: `labs-trip-time-estimator-spec-20261109`
- Spec id: `spec-trip-time-estimator-20261109`
- Spec candidate commit: `8d2f3ec18de2885916da813361e4d19a68eac3da`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/170
- Implementation base: `codex/initial-publication` @ `c08e3243f0257f80fa512d15b1c37fcbeb6ef962`
- Scope: only `tools/trip-time-estimator/` added. Build-first mode: no registry/coordination commands were run; nothing is accepted, merged, or published.

## What was built

- `public/js/core/trip.mjs` — the pure core. Strict own-data validation (unknown/missing/wrong-type/accessor → SCHEMA, accessors never invoked), mode judged first, then the SPEC's mode-exclusivity shape rule (the other mode's fields must be exactly empty, else SCHEMA — decided before field validation), then common fields in the SPEC's order (departureDate → departureTime → departureOffset → arrivalOffset), then the mode-specific fields; per field: capacity INPUT_LIMIT → unpaired surrogate UNICODE → EMPTY → grammar (DATE_FORMAT/DATE_INVALID, TIME_FORMAT, OFFSET_FORMAT including the 15-minute step and the forbidden `-00:00`, DURATION_FORMAT) → RANGE. The computation is the SPEC's absolute-minutes model with Hinnant civil conversions (`daysFromCivil`/`civilFromDays`, exact integers, floor division): mode A adds the duration to the departure instant; mode B takes the arrival date as the departure date plus the explicit next-day toggle only (never auto-adds 24 h), derives the duration, and reports DURATION_NOT_POSITIVE at ≤ 0 or RANGE above 2880 minutes. The four readings carry day shifts in the provable −2…+4 range. No clock, calendar, `Date`, or `Intl` reads: core tests pass identically under TZ=UTC, Asia/Taipei, America/New_York, and Pacific/Kiritimati. The canonical report serializer (keys sorted by UTF-16 code units recursively, compact, one trailing LF) never invokes an input `toJSON`.
- `public/js/controller.mjs` — generation-guarded draft/work controller (empty/dirty/busy/success/error/cancelled) over an injected Worker factory; late replies are dropped, edits and cancels terminate the worker, reset restores the SPEC defaults. Public state exposes `reportAvailable`.
- `public/js/app.js` + bilingual static pages — the mode switcher (switching immediately clears the other mode's exclusive fields through the controller patch), offset `<select>`s populated from the fixed −12:00…+14:00 / 15-minute list (zero only as `+00:00`), the six SPEC route presets as app-level fixed data filling only the two offsets (each with the standard-time note), the mode-B next-day checkbox, day-shift labels （前一天/當天/隔天/+n 天/−n 天 with the signed annotation), the SPEC-pinned fixed-offset note resident in both the input and results areas, the two pinned FAQ answers, and the fixed `trip-time-report.json` download (created only on click from the current success snapshot, Blob URL revoked within 30 s or on invalidation).
- `scripts/` — reproducible preview build (copies `public/`, embeds the fixed worker source = core + handler bytes, deny-all robots.txt, SHA-256 BUILD-MANIFEST), static check, generated-output check, and a loopback-only serve with the SPEC's CSP and noindex headers. Production mode is refused (no approved origin).

## Deviations and interpretations

- File layout follows the handbook contract (`public/js/core/*.mjs`, `public/js/app.js`, `public/js/controller.mjs`) rather than the SPEC implementation sketch's `src/` names; no behaviour difference.
- Candidate metadata follows the SPEC's pinned preview convention (noindex, no production canonical/hreflang/sitemap; production build refused) over the generic checklist wording.
- The shared brief's concept #36 is worded as a driving-time estimator in some checkouts; per the assignment, this build follows the fixed SPEC (the cross-timezone journey version) exactly. The difference is recorded in the spec's own AUTHOR-CHECK as well.
- Fixtures are vendored verbatim into `test/fixtures.json` (SHA-256 `e4d3bff4d5487e2b5a8200a3912397983247fefeee1b751435a19e8df50fb5d4`, byte-identical to the spec candidate's file) because spec PR #170 is not merged into this branch's base.

## Spec-errata candidates

None. All 11 literal core fixtures and all 3 controller fixtures reproduce from the SPEC's stated rules; before product code existed, an independent scratch implementation of the absolute-minutes model reproduced all 7 successful fixtures value-for-value, and the hand-derived day-shift extremes (−2 and +4) and mode-B duration boundaries (0, 1, 2880, 2881 minutes) agreed with the same scratch model.

## Next owner

Independent reviewer (parent verifies the PR head first). Real-browser/device evidence and the nine-aspect review are still outstanding — see VERIFICATION.md NOT_RUN.
