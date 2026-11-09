# GPA Calculator — verification record (author-run)

Environment: Node v24 (this VM), 2026-11-09. All commands run in `tools/gpa-calculator/`.

## Commands and results
- `npm test` — exit 0. **26 tests, 26 pass, 0 fail** across 4 suites
  (fixtures P1–P7; core exactness incl. a BigInt rational reference over 200 deterministic
  pseudo-random row sets; row lifecycle/scale switching; solver boundaries).
- `npm run check` — exit 0. File contract, scale-table audit against SPEC section 4,
  bilingual/SEO requirements, forbidden-pattern scan (no innerHTML/eval/fetch/storage).
- `npm run build:preview` (run twice) — exit 0 both runs; aggregate sha256 of the 8 output
  files identical across runs: `3b3e3d66bc7a8609555547fd300dbd7a9c6c47c16cc5b5fb93c84a41b98e279f`.
- `npm run check:generated:preview` — exit 0 (8 files byte-identical to `public/`).
- Loopback HTTP probe (`node scripts/serve.mjs 41739`, curl, then killed):
  `/` 200 (3551 B, zh title), `/en/` 200 (3671 B, en title), `/js/app.js` 200,
  `/js/core/calc.mjs` 200, `/styles/main.css` 200.

## Fixture reproduction
P1 3.24 · P2 4.00 · P3 2.00 · P4 3.33 (3.325 half-up) · P5 feasible 3.60 ·
P6 unreachable (R 6.00, max attainable 2.76) · P7 guaranteed (zero-final 3.00) — all exact.

## Test-derivation corrections (author honesty note)
Two initial test expectations were mis-derived by hand and corrected after hand
recomputation confirmed the implementation: (1) the "one hundredth above max" case now
uses G0 = 3.30 so R is exactly 4.31 (an earlier draft used 4.29, which gives R = 4.3001 —
classification unreachable on the exact value, display rounds to 4.30); (2) the C0 = 1000
bounds case expects `unreachable` (R = 9.87), not `feasible` — it is a validity check.

## Spec errata candidates
- None found: no printed fixture contradicts the SPEC's own formulas; P1–P7 all reproduce
  exactly from the stated rules.

## NOT_RUN (not performed; blocks acceptance until an independent reviewer runs them)
- Real-browser rendering and interaction (both languages, scale switching in a live DOM,
  A+ error-row display, solver stale-outcome freeze) — no browser run was made.
- Real devices / touch, mobile viewports, 200% zoom.
- Assistive technology and measured contrast.
- Cross-browser compatibility (Chrome/Edge/Firefox/Safari).
- Deployment / publication of any kind.
