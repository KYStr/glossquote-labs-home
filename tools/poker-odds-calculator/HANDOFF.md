# Poker Odds Calculator — HANDOFF

- Spec: `spec-poker-odds-calculator-20261121`, draft spec PR #395, registry rev 1822.
  Fixed source: `~/workspace/glossquote-factory/build6/specs/poker-odds-calculator/docs/specs/poker-odds-calculator/`
  (BRIEF.md, SPEC.md 8 sections, fixtures.json 16 cases, AUTHOR-CHECK.md), vendored verbatim
  as `tools/poker-odds-calculator/test/fixtures.json`
  (SHA-256 `94fa04850beb87da0eca296fc121172fd50c3b8ccc819ff0e0c7414142ca1077`).
- Product: `tools/poker-odds-calculator/` on branch
  `muse/poker-odds-calculator-production-20261121` (base `codex/initial-publication`).
  Build-first production, no registry production registration (run-5 mode:
  production is built + draft PR + parent verification + ledger only).
- Scope allowed: only `tools/poker-odds-calculator/` in this repo. No merge,
  no publish, no deploy, no registry write, no catalog change.
- Implementation: Node ≥24 ESM, zero runtime dependencies. Pure core
  `public/js/core/poker-odds.mjs` (validation, hand evaluation, outs,
  hypergeometric hit rates, exact enumeration / seeded Monte Carlo,
  pot odds, canonical report serializer). Controller
  `public/js/controller.mjs` (draft, generation guard, Worker wiring).
  `public/js/app.js` (DOM via textContent/value only). Bilingual static
  pages `public/index.html` / `public/en/index.html` (preview noindex,
  same-language home links). Scripts: build / check / check-generated /
  serve (loopback only). Tests import the same core the Worker runs.
- Rules followed: SPEC formulas govern over any worked example; outs are
  derived from the cards by the six pinned conversion rules (never user
  input); the rule of 2/4 is display-only; equity uses exact enumeration
  at ≤ 2,000,000 scenarios, otherwise Monte Carlo 100,000 trials,
  mulberry32, fixed seed 20261121; the hint compares unrounded exact
  fractions.

## Results

- `node --test`: 54 pass / 54 total (13 literal core fixtures verbatim,
  3 literal controller fixtures, plus hand-derived evaluator / outs /
  method / pot-odds / boundary / validation-order / schema tests).
- `node scripts/check.mjs`: pass (files, package contract, fixtures hash,
  core constants, bilingual pages, Monte Carlo note, syntax, worker
  concatenation, capability scan, core purity).
- `node scripts/build.mjs --mode preview` run twice: byte-identical
  (BUILD-MANIFEST.json SHA-256 `e8855fac8884a086bb07f99feef032a8d301ac4b4f50b447a896035dac09f783` on both runs).
- `node scripts/check-generated.mjs --mode preview`: pass.
- All 13 literal core fixtures match exactly, including the seeded
  Monte Carlo preflop-aces case (wins 84737 / ties 574 / losses 14689)
  and the exact-enumeration flush-draw case (1,070,190 scenarios).

## Errata candidates (spec issues found while building; the spec was NOT silently changed)

1. **Fixture purpose wording, `river-equity-call` / `river-equity-fold`:**
   the purposes say 「勝率 89.34%」, but the fixture numbers are
   winPct `"89.29"` and equityPct `"89.34"`. The 89.34% figure is the
   equity, not the win rate. The implementation follows the fixture
   numbers (win 89.29 / equity 89.34); only the purpose wording is
   imprecise.
2. **UNICODE error message is not pinned:** the SPEC names the UNICODE
   code for lone surrogates but gives no bilingual message for it (all
   other codes have verbatim messages). The implementation uses the
   house wording 「輸入含有不成對的字元 / Input contains an unpaired
   character」 (same as the run-5 house pattern).
3. **Raw-length basis for card fields is not defined for array input:**
   the SPEC pins raw limits (holeCards ≤ 15, boardCards ≤ 29 characters)
   while also stating the core input is card-code arrays. The
   implementation measures the raw length as the space-joined array
   (`join(" ")`), which is the text the user typed; the choice is
   documented in the core and covered by an INPUT_LIMIT test.
4. **No errata in the numbers:** all 13 literal core fixtures, the
   2/4 error table (including outs 15: 31.91% / 54.12% vs 30% / 60%),
   the scenario table, and the river hand-counts reproduce exactly
   from the SPEC's formulas as implemented.

## NOT_RUN / next owner

- Real-browser verification (Chrome/Edge, both languages, keyboard,
  200% zoom, 320px, Network/Storage, Blob download, Worker): NOT_RUN —
  no isolated-browser mechanism was available to this builder; must be
  done by the reviewer on the same PR head. Node/DOM checks above are
  not a substitute.
- Production HTTPS/SEO (canonical, hreflang, sitemap, origin
  `https://poker-odds-calculator.glossquote.com`): NOT_RUN — origin not
  configured; preview build is noindex-only by design.
- Independent review of this PR head (nine facets): pending; reviewer
  must not be the author of this production.
- Next owner: parent orchestrator — verify the PR head, run the
  independent review, and record the ledger entry. Do not merge or
  publish from this handoff.
