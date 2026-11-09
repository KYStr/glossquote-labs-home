# Verification — Studio Visit Fee Breakpoints

Environment: Node v24.22.1, offline. Commands were run from
`tools/service-block-breakpoints/` in the candidate checkout
(base `codex/initial-publication` @ `8e4044cfbd187793a643576be0875b677e5318ea`).

## Results

- `npm test`: exit 0 — **51/51 pass, 0 fail** (8 literal SPEC fixtures
  reproduced verbatim: 6 solve + 2 flow; 43 hand-derived cases covering
  SIZE boundary 65536/65537 bytes, SHAPE/TYPE/RANGE/ENUM/DUPLICATE/
  BAND_ORDER paths, name rules incl. NFC pairs and code-point counts,
  marginal progressive bands, block ceil, included visits, base fee at
  0 visits, the 240-visit / 5-band / full-rate maximum case, input
  immutability, and flow extras: reset, fail-then-edit, stale error
  reply ignored, run-while-busy ignored, cancel-while-idle no-op).
- `npm run check`: exit 0 — check passed.
- `npm run build:preview` (twice): exit 0 both times — 8 files to
  `dist/`; sha256 of every dist file and `BUILD-MANIFEST.json`
  **byte-identical between the two runs**.
- `npm run check:generated:preview`: exit 0 — passed.
- Loopback HTTP probe (serve.mjs, port 8123, then killed):
  `GET /` → 200 text/html, title `工作室次數費用交會表｜Gloss Tools`;
  `GET /en/` → 200 text/html, title `Studio Visit Fee Breakpoints |
  Gloss Tools`; `GET /js/app.js`, `/js/core/solve.mjs`,
  `/styles/app.css`, `/robots.txt` → all 200. Response headers carry
  the SPEC-pinned CSP (`default-src 'none'; script-src 'self';
  style-src 'self'; img-src 'self'; worker-src 'self'; connect-src
  'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none';
  object-src 'none'`) and `X-Content-Type-Options: nosniff`.

## Spec errata

None — every printed fixture reproduces exactly from the SPEC's own
rules. No fixture-vs-rule conflict was found.

## SPEC-silent interpretations (also in HANDOFF.md)

- A plan count other than exactly 2 reports RANGE at `/plans`; a bands
  array outside 1–5 rows reports RANGE at `/plans/<i>/bands`.
- A non-string or out-of-enum `type` reports ENUM at
  `/plans/<i>/type`.
- A blank numeric form field reports form-level SYNTAX; a blank plan
  name is passed to the core and reports RANGE.
- A blank band row (both fields empty) is skipped as absent; a blank
  `upTo` on a kept row means null (open).
- The SPEC handoff lists a `src/` file layout and production build
  scripts; this candidate follows the consolidated house format
  (`public/js/...`, preview-only build, production refused without an
  approved origin), matching the sibling tools in this run.
- Preview pages use relative canonical links; the SPEC-pinned
  `glossquote.com` home links are kept as the same-language home
  links, and the production canonical/sitemap are reserved for the
  production build.
- The SPEC's one-decimal half-up rule has no values to apply to in
  this tool: every amount is an integer in minor units and relations
  are direct integer comparisons.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 px, 200% zoom, reduced motion, Network/Storage observation)
- Real devices/touch
- Assistive tech
- Measured contrast
- Deployment
- Independent nine-aspect review
