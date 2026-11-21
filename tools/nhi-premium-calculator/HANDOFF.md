# NHI Premium Calculator — Handoff

Tool: `tools/nhi-premium-calculator/` — estimates a Category 1
(private-sector employee) NHI premium from the NHIA tables effective
January 1, 2026: insured-amount grade, per-person and dependent
premiums, employee total, employer share and government subsidy.

## Fixed source

- Spec ID: `spec-nhi-premium-calculator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/249
  (OPEN; head `muse/spec-nhi-premium-calculator-20261109`,
  candidate commit `840eaead392342a4fe18dfd105659b3b099c3043`)
- Spec fixtures SHA-256:
  `567c04562f0a8ddd9ad0ed273c802f2e293ef93c8c37b6c12c370a70a266eabc`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/nhi-premium-calculator-production-20261109`

## Files changed (only `tools/nhi-premium-calculator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/nhi-premium.mjs
public/styles/nhi-premium.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/nhi-premium-core.test.mjs
test/nhi-premium-controller.test.mjs
test/nhi-premium-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §3 worked anchors: all 10 success fixtures and all 5 error fixtures
  pass verbatim from `test/fixtures.json` (48 tests total, all passing).
- §3 appendix: all 58 grades asserted against the SPEC appendix table
  (self/employer/government per grade), and the same table was
  independently recomputed with exact rational arithmetic (Python
  `fractions`) before transcription — 58/58 match, zero difference.
- §3 grade boundaries: every grade amount takes that grade and amount
  + 1 takes the next grade (57 boundary pairs plus the floor/top clamps).
- §3 rounding: the half-up discriminator (150,000 → exactly 2326.5 →
  2327) is a fixture; the float trap is pinned by a dedicated test
  (grade 38: the float path `150000 * (5.17/100) * (30/100)` rounds to
  2326, the exact integer path gives 2327; grade 1: the float value is
  457.54499999999996, below the exact 457.545 tie).
- §3 serialization: the floor-grade and over-cap report bytes are
  asserted exactly in `test/nhi-premium-report.test.mjs`, including
  key-order independence and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local INTEGER_FORMAT on rerun,
  no second worker created), `state-cancel-late` (cancel keeps the
  draft, late reply ignored, reset returns to `empty` with defaults),
  `state-replace-late` (late success reply cannot replace the local
  error) — all driven through the controllable fake Worker with the
  pinned states.
- Reset: synchronous, restores the default draft byte-for-byte
  (`JSON.stringify` equality asserted) and the `empty` state.
- Build determinism: two consecutive `build:preview` runs produce
  byte-identical `dist-preview/` trees and `BUILD-MANIFEST.json`
  (recursive diff clean); `check:generated:preview` passes.
- Loopback HTTP probe: 200 for `/`, `/en/`, the stylesheet, all shipped
  scripts, the generated worker source and `/en/index.html`
  (see VERIFICATION.md).

## Deviations from the SPEC

1. **SPEC §implementation names `src/core.mjs`, `src/controller.mjs`
   and `src/app.mjs`.** The implementation uses the ES-module app
   pattern every other run-5 production uses (vo2max, salary,
   bill-split, dew-point, feels-like): `public/js/core/nhi-premium.mjs`,
   `public/js/controller.mjs`, `public/js/app.js` (an ES module that
   imports the controller, the core and the generated `worker-source.js`).
   A classic script cannot import the ESM controller/core, and the
   testable controller is what SPEC §7's controller cases drive. The
   page still runs from the static preview build exactly like the
   sibling tools.
2. **Sequence accounting for a locally-failed run.** SPEC §2 says every
   run increments the sequence, but the pinned `state-replace-late`
   fixture requires the newer (locally invalid) run to leave the
   sequence unchanged (no second worker is created), while edits and
   worker-submitting runs increment it. The only reading consistent
   with the fixtures: a run that fails local validation never posts to
   a Worker, so it leaves the sequence unchanged; every edit, reset,
   load-example, cancel and worker-submitting run increments it.
   Implemented and documented in `controller.mjs`.
3. **No draft persistence.** SPEC §2 keeps the draft in the current
   page only and §implementation forbids persistent storage, so the
   tool stores nothing: no localStorage/sessionStorage anywhere in the
   shipped sources (asserted by `scripts/check.mjs`), and switching
   language or leaving the page discards the draft. This follows the
   SPEC; it differs from sibling tools that persist drafts.
4. No other deviations. The 5.17% rate, 30/60/10 shares, 0.56 average
   dependents (1.56 factor), 3-dependent cap, 58-grade table, integer
   rational rounding and the validation order are all implemented
   literally.

## Spec-errata candidates

Errata 0. All 15 core fixtures pass verbatim against the normative
implementation, and the appendix table recomputes exactly. One
provenance note (already flagged in AUTHOR-CHECK.md §3, not a new
finding): the grade-1 government share of 238 is the formula's
derivation — the NHIA 115 (III) burden table page could not be opened
at authoring time — so the reviewer should re-check that one cell
against the 115 (III) table when it is reachable. The formula itself
is proven against all 354 amounts of the official 114 table.

## Known limitations

- The pinned page CSP meta now includes `worker-src blob:` (per SPEC
  §implementation), so the blob-URL module Worker is allowed by the
  page's own CSP. Real-browser verification is still NOT_RUN
  (see VERIFICATION.md); the reviewer should exercise the success path
  in a real browser.
- The planned production origin `https://nhi-premium.glossquote.com`
  is not yet configured (SPEC §7); the preview build refuses
  production mode, and the preview pages carry `noindex, nofollow`.
- Draft persistence is intentionally absent (see deviation 3).

## Next owner

Independent reviewer: score the fixed candidate commit on the nine
SPEC §6 aspects. Do not merge, publish, or register — the coordinator
owns acceptance, merge, and publication.
