# Morse Code Translator — verification record

Candidate: branch `muse/morse-code-translator-production-20261109` on
`KYStr/glossquote-labs-home`, based on `codex/consolidate-20261109` commit
`7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`. Specification implemented: the
REVISED SPEC at commit `b612c14d1c69ea9366a3312a2ca60a8ae887481c`
(`docs/specs/morse-code-translator/SPEC.md` on branch
`muse/morse-code-translator-spec-20261102`) — see HANDOFF.md for the
spec-source discrepancy note about the superseded draft stored under
`docs/specs/` on the consolidation branch.
Environment: Node v24.22.1, no network in any test.

## Commands run and results

- `npm test` — exit 0. **36 tests, 36 pass, 0 fail** (~0.55 s).
  Suites: `table.test.mjs` (shipped table deep-equals the SPEC §4 table
  transcribed literally into the test; full-table bijection over the shipped
  data; prosign runs literal + derived; collision codes decode to `+`/`&`/`(`
  with notes, never to prosigns), `fixtures.test.mjs` (SPEC fixtures 1–8
  exactly: strings, 27/43/23 unit counts, 1.62 s at 20 WPM, tagged
  round-trips, bare-twin `S+S` + note at index 2, `ß` refusals at raw
  positions 1 and 2, `<ß>` failing as a character error), `grammar.test.mjs`
  (spacing sweep, slash forms, tabs/newlines, malformed tags, caps at
  2000/2001 chars and 20000 Morse chars, empty inputs), `timing.test.mjs`
  (interval sums, no trailing gap, PARIS 43 standalone / 50 with trailing
  word gap). Expected values are hand-derived from the SPEC, never generated
  from the implementation's own output.
- `npm run check` — exit 0. File contract, package contract (ESM, Node ≥24,
  zero dependencies, required scripts), bilingual metadata (lang, noindex,
  title/description/h1, canonical, hreflang, same-language home links), no
  remote URLs under `public/`, core purity (no DOM/network/storage/timer
  tokens, relative imports only), DOM safety (no innerHTML, no eval), syntax
  parse of all 12 JS files.
- `npm run build:preview` run twice — exit 0 both times (8 files copied,
  manifest 1218 bytes); SHA-256 comparison of the two output trees:
  **byte-identical**.
- `npm run check:generated:preview` — exit 0; `preview/` matches a fresh
  build byte for byte.
- Loopback HTTP probe (`PORT=4173 node scripts/serve.mjs`, then killed):
  `GET /` → HTTP 200, zh-Hant page (title 摩斯碼翻譯器); `GET /en/` → HTTP
  200, English page; `GET /js/core/table.mjs` → HTTP 200; path-traversal
  probe → HTTP 404.

## Spec errata

None. Every printed fixture in the REVISED SPEC (1–8) was reproduced exactly
as written, and the character table is internally consistent (collision-free
as data; the three prosign/character collisions are the ones the SPEC names).

## Interpretations of edges the SPEC leaves unpinned

Recorded so the independent reviewer can overrule them explicitly:

1. **Token index counts `/` separator tokens.** SPEC §4 calls `/` "a `/`
   token" and defines the warning index as "1-based token index across the
   whole input", but no fixture places a `/` next to a warning. This build
   counts every whitespace-delimited token, `/` included.
2. **Text-side stray brackets.** The SPEC pins stray `<`/`>` handling for
   Morse tokens (whole token unknown) but not for text input. This build
   refuses encoding: an unclosed `<` is an `unclosed-prosign` error at its
   position, and a lone `>` is a `stray-bracket` error at its position —
   consistent with the SPEC's "encoding refuses rather than skipping" rule.
3. **Morse cap overflow** (input > 20,000 chars) refuses the decode with a
   `too-long` error shown in the messages area, mirroring the text cap.

## NOT_RUN (explicit)

- Real-browser rendering and interaction, including actual WebAudio
  playback, measured playback duration against the stated 1.62 s for SOS
  (SPEC §6 tolerance ±5%), per-character highlight behaviour in a live
  browser, stop-within-100 ms behaviour, and the no-WebAudio fallback
  message in an audio-less environment.
- Real devices / touch, native viewports, 200% zoom.
- Assistive technology (screen-reader pass over errors/warnings).
- Measured contrast.
- Deployment of any kind; no merge, no catalog or registry change.
