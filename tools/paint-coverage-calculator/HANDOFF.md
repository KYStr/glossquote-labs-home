# Paint Coverage Calculator — production handoff (build-first candidate)

## Fixed spec source

- Repository: `KYStr/glossquote-labs-home`
- Spec path: `docs/specs/paint-coverage-calculator/SPEC.md` (with `BRIEF.md` and
  `AUTHOR-CHECK.md` in the same directory)
- Spec fixed at base commit `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`
  (branch `codex/consolidate-20261109`, the consolidation branch this
  candidate is based on)
- The SPEC is the normative contract: section 4 pins the exact area chain
  (gross walls 2 × (L + W) × H; door 1.89 m²; window 1.80 m²), exact rational
  arithmetic, display rounding half-up to 2 dp, the can count as the exact
  mathematical ceiling of exact litres ÷ can size, the deductions ≥ gross
  computation error (ceiling never rescues it), all field bounds, and
  fixtures P1–P5. This implementation follows the SPEC as written; no
  fixture contradicts the SPEC's own formulas (see VERIFICATION.md).

## Allowed scope

- Implementation lives **only** in `tools/paint-coverage-calculator/`.
- No other path in the repository was modified; the coordination registry
  was not written to.

## Mode

Build-first production, following the 2026-11-09 consolidated format
(`docs/SOURCE-LAYOUT.md`, `docs/IMPLEMENTATION-CHECKLIST.md`): the tool is
implemented in the shared repo under `tools/<slug>/` ahead of the registry
production-task flow. Independent bulk review is pending.

This candidate is **not accepted, not published, not deployed**. No catalog,
registry, or deployment state was changed.

## Next owner

An independent reviewer (not the author) reviews this fixed candidate
commit against SPEC section 6's nine aspects; every aspect must reach ≥90
with all mandatory checks complete, otherwise the verdict is revision.
Unrun checks stay NOT_RUN (listed in VERIFICATION.md) and block acceptance.

## Build / verify

```sh
npm test                          # node:test suites (SPEC fixtures + validation)
npm run check                     # static checks
npm run build:preview             # reproducible preview build -> dist-preview/
npm run check:generated:preview   # dist-preview matches a fresh build byte-for-byte
npm run serve -- --port 8931      # loopback-only preview server
```
