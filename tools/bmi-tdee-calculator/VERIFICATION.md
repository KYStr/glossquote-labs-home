# Verification — BMI / TDEE Calculator candidate

Environment: Node v24.22.1, Linux VM, 2026-11-09. All commands run inside
`tools/bmi-tdee-calculator/`.

## Commands and results

- `npm test` — exit 0. **23 passed / 0 failed** (fixtures 8, validation 7,
  rounding 4, scaffold 4; ~0.5 s). Coverage of SPEC §7 core requirements:
  (a) M1 and F1 in full incl. all five M1 TDEE values; (b) the six 200 cm
  boundary weights incl. the trap case's display/category split; (c) the
  imperial fixture end-to-end (69 in = 175.26 cm, 154 lb, BMI 22.7, BMR
  1649) plus a toggle round-trip invariant (display conversion never
  mutates the unrounded metric store, so toggling back returns identical
  computed outputs); (d) healthy range at 160 cm in kg and lb with the
  exclusive upper bound carried in the data model; (e) every range edge
  and refusal (age 10/120 ±1 step, non-integer age, height 50/272,
  weight 10/635, inches = 12, fractional feet, post-conversion range);
  (f) rounding ties: BMI 22.85 → "22.9" with category from the unrounded
  value, BMI 24.96 → displays "25.0" but normal, BMR 1351.5 → 1352,
  M1 sedentary TDEE 1978.5 → 1979.
- `npm run check` — exit 0. Static checks passed (file contract, zero
  runtime deps, core purity, textContent-only rendering, bilingual
  statement/unrounded-sentence/action-point presence, constants-once,
  honesty wording scan).
- `npm run build:preview` run twice — exit 0 both times; the two runs'
  SHA-256 manifests are **byte-identical** (5 files). dist/index.html
  sha256 `11cb8dd3…`, dist/en/index.html sha256 `015dfee6…`.
- `npm run check:generated:preview` — exit 0: 5 generated files
  byte-identical to `public/`.
- Loopback HTTP probe (`node scripts/serve.mjs 8321`, then killed):
  `GET /` → 200 (zh title 「BMI 與 TDEE 計算器」), `GET /en/` → 200
  (en title "BMI & TDEE Calculator"), `GET /js/core/bmi.mjs` → 200.

## Spec errata candidates

None. Every printed SPEC §4 fixture was re-derived from the SPEC's own
formulas during test authoring (M1, F1, six boundary weights, imperial,
healthy range, plus hand-computed lb conversions 104.4 / 141.1 for the
160 cm range) and all reproduce exactly; no fixture contradicts its
governing rule.

## NOT_RUN (explicit)

- Real-browser rendering and interaction (SPEC §7 GUI tests: fixtures
  entered through the real UI in both languages and both unit systems,
  stale-state behaviour in a live DOM, under-18 note toggling in a live
  DOM, full-page rendered-text honesty read).
- Real devices / touch input / mobile viewports.
- Assistive technology (screen reader pass), measured colour contrast.
- Deployment / hosting of any kind.
- Independent nine-aspect scoring (reviewer's job, not the author's).
