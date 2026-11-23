# Poker Odds Calculator — VERIFICATION

- Spec: `spec-poker-odds-calculator-20261121`, draft spec PR #395, registry rev 1822.
  Source: `~/workspace/glossquote-factory/build6/specs/poker-odds-calculator/docs/specs/poker-odds-calculator/`.
- Candidate: branch `muse/poker-odds-calculator-production-20261121`
  (base `codex/initial-publication`), PR (see HANDOFF / parent report for
  the number and the 40-character head SHA read back with `gh pr view`).
- Environment: Node v24.22.1, no network use by the tool itself; all
  commands run locally in
  `~/workspace/glossquote-factory/build6/build/poker-odds-calculator/repo/tools/poker-odds-calculator/`.

## Commands and results

| Command | Result |
| --- | --- |
| `node --test` | 54 pass / 54 total, 0 fail (duration ~8.4 s) |
| `node scripts/check.mjs` | pass |
| `node scripts/build.mjs --mode preview` (run 1) | pass; BUILD-MANIFEST.json SHA-256: `e8855fac8884a086bb07f99feef032a8d301ac4b4f50b447a896035dac09f783` |
| `node scripts/build.mjs --mode preview` (run 2) | pass; BUILD-MANIFEST.json SHA-256: `e8855fac8884a086bb07f99feef032a8d301ac4b4f50b447a896035dac09f783` |
| `diff` of the two manifests | identical (byte-identical build) |
| `node scripts/check-generated.mjs --mode preview` | pass |
| Scratch fixture re-check (`/tmp/poker-verify.mjs`, before the test files were written) | 13/13 literal core fixtures pass (~2 s) |

## Scope

- Verified: all 16 vendored fixtures (13 core verbatim deep-equal,
  3 controller flows via a controllable fake worker); hand-derived
  evaluator boundaries (royal flush, wheel, full house, three pairs,
  quads); outs rules (overcard pairing and two-pair-to-three-pair
  excluded; outs-15 combo draw 31.91% / 54.12%); method selection
  (flop 2 opponents Monte Carlo, river 2 opponents exact 148,995,
  river 3 opponents Monte Carlo); Monte Carlo determinism (same input,
  same output); pot odds (free call, missing amounts, 0 /
  1,000,000,000 boundaries, exact marginal at 100% equity vs 100%
  break-even); validation order (capacity → surrogate → grammar →
  CARD_COUNT → DUPLICATE → RANGE); canonical report bytes
  (flush-draw 595 bytes, river-call literal).
- NOT_RUN: real isolated Chrome/Edge flows (both languages, keyboard,
  200% zoom, 320 px, Network/Storage zero-request check, Blob
  download, Worker in-browser); production HTTPS/SEO; the nine-facet
  independent review. Node/DOM evidence above is not a substitute
  for browser evidence.

## Known limitations

- Exact enumeration of the largest case (flop, 1 opponent, 1,070,190
  scenarios) takes ~0.4–0.5 s in Node per run; the full test suite
  takes ~8 s. In-browser Worker timing was not measured (see NOT_RUN).
- The SPEC's UNICODE message and the card-field raw-length basis are
  not pinned by the SPEC; the choices made are documented as errata
  candidates 2 and 3 in HANDOFF.md.
- Next owner: parent orchestrator / independent reviewer.
