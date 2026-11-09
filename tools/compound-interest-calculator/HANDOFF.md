# Handoff — Compound Interest & Savings Goal Calculator (production candidate)

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Base commit of this branch: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (branch `codex/consolidate-20261109`)
- Spec paths (read in full before building):
  - `docs/specs/compound-interest-calculator/SPEC.md` — the normative contract (eight sections; section 4 pins the simulation, caps, fixtures and the Goal B binary search)
  - `docs/specs/compound-interest-calculator/BRIEF.md`
  - `docs/specs/compound-interest-calculator/AUTHOR-CHECK.md`
- House format: `docs/IMPLEMENTATION-CHECKLIST.md`, `docs/SOURCE-LAYOUT.md`.
- No `fixtures.json` exists for this tool; the five normative fixtures are the worked examples in SPEC section 4, and the test suites derive expectations from them plus hand-computed cases.

Note on placement: SPEC section 8 was written before the 2026-11-09 consolidation and mentions a per-tool repository. The user's consolidation instruction (AGENTS.md "單一來源與接續手冊" + `docs/SOURCE-LAYOUT.md`) supersedes that: new implementations live in this shared repo under `tools/<slug>/`. This candidate follows the consolidation.

## Allowed scope

- Only `tools/compound-interest-calculator/` was created or modified.
- No coordination registry writes, no catalog changes, no other tool or spec touched, no deployment.

## Build mode

Build-first: this is an unreviewed production candidate. It is **not** accepted, **not** published, **not** deployed. Independent bulk review is pending; the nine-aspect rubric in SPEC section 6 must be scored by a non-author reviewer against the fixed candidate commit before any acceptance.

## Implementation notes (against SPEC section 4)

- All money is integer cents held as **BigInt** end to end (parser, simulator, solvers, formatter), because at the input caps (999,999,999.99 at 100% for up to 600 months) balances and products far exceed float53 exactness. The only floating-point use is the display-only effective annual rate, as the SPEC permits.
- Monthly interest is `round-half-away-from-zero(balance × rateThousandths / 1,200,000)` computed in BigInt; the 1200 divisor, amount cap, rate cap and 600-month cap each appear once as named constants in `public/js/core/money.mjs`.
- Goal B is the SPEC's binary search over cents in `[0, targetCents]` against the same simulation; the page shows the final balance at the answer and at one cent less.
- Pages are static `public/index.html` (zh-Hant) and `public/en/index.html` (en) with path-absolute preview canonical/hreflang and `noindex`; the production build with the real domain is a later coordinator step (per IMPLEMENTATION-CHECKLIST), not part of this candidate.

## Next owner

Independent reviewer (non-author): score SPEC section 6's nine aspects against the candidate commit of the PR, complete the mandatory checks (including real-browser evidence, which is NOT_RUN here), and record the verdict through the normal review flow.
