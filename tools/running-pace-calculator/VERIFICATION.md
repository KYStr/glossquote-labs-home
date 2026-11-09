# Running Pace Calculator — verification record

Environment: Node v24.22.1, Linux VM, 2026-11-09. All commands run inside
`tools/running-pace-calculator/`. Candidate is build-first: this record is
the author's own run evidence for the independent reviewer, not an
acceptance verdict.

## Commands and results

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 42 tests, 42 pass, 0 fail (suites: time, validate, solver, splits, riegel, state) |
| `npm run check` | 0 | File contract, core purity (no DOM/network/storage/eval in core), SPEC constants single-sourced, both pages' lang/title/description/noindex/canonical/hreflang/home-link, loopback-only serve |
| `npm run build:preview` (twice) | 0 | 12 files copied to `dist/` plus `build-manifest.json`; SHA-256 of all 13 `dist/` files compared across the two runs: **byte-identical** |
| `npm run check:generated:preview` | 0 | `dist/` matches a fresh build byte for byte |
| Loopback HTTP probe | 0 | `node scripts/serve.mjs` on 127.0.0.1:4173 served `dist/`: `GET /` 200 (5422 bytes, `lang="zh-Hant"`, 繁中 title), `GET /en/` 200 (5561 bytes, `lang="en"`, English title), `GET /js/app.js`, `/js/core/state.mjs`, `/styles/app.css` all 200, `GET /missing` 404. Server stopped after the probe. |

## SPEC section 7 coverage by the test suites

- (a) Fixtures A (both pace units), B and C exactly — `solver.test.mjs`.
- (b) Full splits fixture including the finish row (cumulative 57:45,
  finish segment 2:45, segments summing to the total) and a constructed
  .5 s rounding case (905 s / 10 km) proving segments are differences of
  rounded cumulatives — `splits.test.mjs`.
- (c) Riegel: all four fixture predictions (raw values within 0.05 s of the
  SPEC's printed 1295.01 / 2700 / 5957.29 / 12420.54), the "your input"
  marking at exact equality (10 km and 21.0975 km cases), no target beyond
  the marathon — `riegel.test.mjs`.
- (d) Time grammar: every accepted shape and every refusal class of
  section 6 (digits-only, `5:30` valid; `5:3`, `45:90`, `1:60:00` refused,
  the ≥60 component named) — `time.test.mjs`, `validate.test.mjs`.
- Boundaries: distance 0.01 and 300 accepted, 0 and 300.01 refused; whole-unit
  count 100 → step 1, 101 → step 5 with a finish row; non-integer finish row —
  `validate.test.mjs`, `splits.test.mjs`.
- (e) Unit behaviour: km ↔ miles conversion from the unrounded store; a
  round trip returns identical displayed outputs and an unchanged store —
  `state.test.mjs`.
- (f) Solve-for switching preserves values across a full cycle
  (pace → time → distance → pace) — `state.test.mjs`.
- Stale freeze: an invalid edit leaves the last valid outputs displayed and
  flagged stale until the input is fixed — `state.test.mjs`.

## Development note

The first full test run was 41/42. The single failure was a wrong
hand-derived expectation in `state.test.mjs` (it expected the per-kilometre
pace where SPEC section 4 requires the solved pace displayed per chosen
unit — 5:30 per mile for a 55:00 10-mile run). The test was corrected; the
implementation was not changed.

## Spec-errata candidate

SPEC section 7 (GUI evidence) speaks of "the step-5 split table for a
120 km input shown with a finish row". Under section 4's normative rule a
finish row exists only "when the distance is not itself a marker", and
120 km is itself a step-5 marker (24 × 5), so no separate finish row can
exist for exactly 120. The implementation follows section 4; a test pins
that behaviour (`splits.test.mjs`: 120 km → step 5, 24 rows, no finish
row). The section 7 wording is left for the spec author / independent
reviewer to reconcile; no other fixture or rule contradiction was found —
fixtures A, B, C, the 10.5 km split table and all four Riegel values
re-derive exactly as printed.

## NOT_RUN (explicit)

- Real-browser rendering and interaction: fixtures entered through the
  real UI in both languages and both units, the stale state in a live
  page, the step-5 table in a browser.
- Real devices, touch input, native mobile viewports, 200% zoom, IME.
- Assistive technology (screen reader table semantics, focus order).
- Measured contrast of text and controls.
- Cross-browser equivalence (Chrome/Edge/Firefox/Safari) of the fixture
  corpus.
- Deployment, publication and catalog integration (separate later steps
  under existing approvals).

Nothing in this record claims acceptance: the nine aspects of SPEC
section 6 remain unscored until a non-author reviewer examines this fixed
candidate commit.
