# Verification — tax-included-converter

- Candidate branch: `muse/tax-included-converter-production-20261109`
  (base `codex/initial-publication`, head `c8ca5fd3` at branch creation)
- Spec source: commit `21410d31a0d51098e6bc71ede98cc36e9b841f72`,
  spec PR #242, registry rev 1392
- Fixtures SHA-256: `6e15f67484f6fabadf1049e231c992a9720b66609782f79b320cdbd3f69e850b`
- Environment: Node v24.22.1, `tools/tax-included-converter/`
- Date: 2026-11-21

## Commands run (all in tools/tax-included-converter/, exit 0 unless noted)

| Command | Result |
| --- | --- |
| `npm test` | 53/53 pass |
| `npm run check` | pass: files, package contract, core fields/limits/defaults/constants/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity |
| `npm run build:preview` (1st) | pass: 9 files written to dist-preview/ with BUILD-MANIFEST.json |
| `npm run build:preview` (2nd) | pass; dist-preview/ tree and BUILD-MANIFEST.json byte-identical to 1st run (recursive diff clean) |
| `npm run check:generated:preview` | pass: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |
| Independent fixture re-derivation (Python `fractions.Fraction`, scratch, not shipped) | 14/14 success fixtures match; 0 mismatches |

## Results

- Core: all 22 literal fixture cases pass verbatim; 18 additional
  hand-derived core cases (boundaries, grammar, schema, invariants)
  pass.
- Controller: all 3 literal fixture sequences pass with a controllable
  fake worker; 7 additional cases (busy ignore, late/wrong-sequence
  drops, worker failure modes, cancel, example, reset, storage
  restore) pass.
- Report: canonical compact JSON + LF verified byte-for-byte for
  single and lines results; OUTPUT_LIMIT verified over the cap.
- Static check: files, package contract (Node >= 24, ESM, zero
  dependencies), core constants/limits/defaults/status/example,
  fixtures hash and counts (22 core / 3 controller), pinned bilingual
  strings, bilingual page metadata (noindex, CSP, canonical, og,
  hreflang, same-language home links), script syntax, worker
  concatenation, forbidden-capability scan, core purity.

## NOT_RUN

- Browser / real-device checks (page render, keyboard flow, 320 px
  reflow, 200% zoom, download in a real browser, Network/Storage
  observation): NOT_RUN — no isolated-browser mechanism is available
  to this builder.
- Product checks against a live preview URL: NOT_RUN (preview build
  only; no production origin approved).
- Independent document review of the candidate: NOT_RUN — this is the
  next owner's step.

## Known limitations

- The delivered `SPEC.md` is truncated mid-sentence in inputsOutputs
  (see HANDOFF.md); nine rules were builder-pinned from the surviving
  text, fixtures and AUTHOR-CHECK.md for the reviewer to confirm.
- Preview canonical URLs are pinned placeholders; production build is
  refused until an origin is approved.
