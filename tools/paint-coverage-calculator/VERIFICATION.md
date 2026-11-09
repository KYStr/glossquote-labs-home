# Paint Coverage Calculator — verification record

Build-first candidate by Muse (cloud-dot). Environment: Node v24.22.1,
zero npm dependencies, no network in any test. Commands run in
`tools/paint-coverage-calculator/` on 2026-11-09.

## Results

- `npm test` — exit 0. **19 tests passed, 0 failed** (11 in
  `test/fixtures.test.mjs`, 8 in `test/validation.test.mjs`).
  Coverage of SPEC section 7: fixtures P1–P5 exactly (every intermediate:
  gross, deductions, paintable; every final: litres, cans, purchased,
  leftover — exact fractions asserted, not only displays); the ceiling rule
  (P3 exact multiple buys no phantom can; core-level 3.001 L at 1 L cans
  buys 4); the error rule (deductions equal to gross, above gross, and
  0.01 m² below gross staying valid; enabled ceiling does not change the
  comparison); per-field bounds at and beyond each limit; counts/coats
  whole-only; can-size closed list; leftover asserted from exact litres in
  a case where purchased − displayed litres (1.01) differs from the
  exact-derived displayed leftover (1.02).
  One test expectation was corrected during the run: the just-below-gross
  case initially asserted a 0.5 L can leftover while using the default 5 L
  can; the hand derivation was fixed to pin the 0.5 L can explicitly. The
  implementation matched the SPEC formula in both readings.
- `npm run check` — exit 0. All static checks passed (file contract,
  bilingual page requirements, zero runtime dependencies, pure core, no
  remote URLs, no HTML-insertion APIs in app.js).
- `npm run build:preview` run twice — exit 0 both times; the two output
  trees are byte-identical: sorted per-file SHA-256 manifest hashes to
  `5bd42bfd355efd074275921e2d7989084a8820b8b8257a7b7eb86580e3e4252f`
  (6 files) in both runs.
- `npm run check:generated:preview` — exit 0 (dist-preview matches a fresh
  build byte-for-byte; dist-preview itself is gitignored, generated on
  demand).
- Loopback HTTP probe (`node scripts/serve.mjs --port 8931`, then curl):
  `/` 200 (zh page, title 油漆用量計算機）, `/en/` 200 (en page, title
  "Paint Coverage Calculator"), `/js/core/paint-core.mjs` 200,
  `/js/app.js` 200, `/styles/main.css` 200, unknown path 404. Server
  stopped after the probe.

## Spec errata candidates

None. Every printed fixture (P1–P5) agrees with the SPEC's own formulas
under exact rational arithmetic, and all section 4 rules were implementable
as written.

## Explicitly NOT_RUN

- Real-browser rendering and interaction (fixtures entered through the
  real UI in both languages, ceiling toggle updating the breakdown, the
  computation error appearing and clearing, stale-state behaviour on an
  invalid field) — no browser evidence in this run.
- Real devices / touch, native viewports, 200% zoom.
- Assistive technology checks; measured contrast ratios.
- Cross-browser compatibility (Chrome/Edge/Firefox/Safari).
- Deployment / publication of any kind.
