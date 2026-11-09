# Verification — Zodiac Sign Finder production candidate

Environment: Node v24.22.1, Linux, 2026-11-09. All commands run in
`tools/zodiac-sign-finder/` against the candidate commit of this PR.
Spec source: `spec-zodiac-sign-finder-20261109` @
`31713538123f8c774723edc68ba3de29819ac33a` (draft PR #171);
base `codex/initial-publication` @
`144a3b954b48c3c5096cf6a02ea9c694343d7b33`.

## Commands and results

| Command | Result |
| --- | --- |
| `npm run build:preview` | PASS — 8 files written to `dist-preview/`, `BUILD-MANIFEST.json` written |
| `npm test` (`node --test`) | PASS — 33 tests, 33 pass, 0 fail |
| `npm run check` | PASS — `check ok: 13 JS files, 2 HTML pages` |
| `npm run build:preview` (second run) | PASS — `dist-preview/` file hashes and `BUILD-MANIFEST.json` byte-identical to the first run (sha256sum diff empty) |
| `npm run check:generated:preview` | PASS — `8 files verified in dist-preview/` |

Test breakdown (33): 13 core fixture cases (deep-equal against the
spec fixtures), 366-pair coverage audit + leap-year/date-existence/
schema/validation-order/report-bytes core tests, 3 controller fixture
state cases + 3 extra controller tests (worker failure, edit during
busy, cancel/reset), 2 generated-worker end-to-end tests, 2 HTML
contract tests, plus the vendored-fixtures module load.

## Loopback HTTP probe (built preview)

`node scripts/serve.mjs --host 127.0.0.1 --port 43917 --dir dist-preview`
(the house server requires an explicit port ≥ 1; port 0 is rejected
by its own validation):

- `GET /` → HTTP 200, `<title>西洋星座查詢｜Gloss Tools</title>`
- `GET /en/` → HTTP 200, `<title>Zodiac Sign Finder | Gloss Tools</title>`
- Response headers include the SPEC CSP verbatim
  (`default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'blob:'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`),
  `X-Content-Type-Options: nosniff`, and `X-Robots-Tag: noindex, nofollow`
  on HTML responses.
- `GET /nope.html` → HTTP 404; `GET /../package.json` (path-as-is)
  → HTTP 404 (traversal refused).

The probe server was stopped afterwards; nothing was left listening.

## Spec-errata candidates

None. Every fixture expected value agrees with the SPEC's stated
rules (table, validation order, cusp rule, Feb 29 handling), and the
independent 366-pair audit matched the SPEC table with no gaps or
overlaps.

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): example load,
  typing, error focus, cancel, reset, Blob download byte check —
  NOT_RUN (no isolated browser in this environment).
- Real-device / mobile checks, 200% zoom, reduced-motion, screen
  reader passes — NOT_RUN.
- Network/Storage isolation audit in a clean browser profile
  (zero work requests, storage, console) — NOT_RUN in a browser;
  statically, the shipped sources contain no fetch/XHR/WebSocket/
  beacon/storage calls (enforced by `npm run check`).
- Production build, canonical/hreflang/sitemap, HTTPS deployment —
  NOT_RUN and intentionally absent from this preview candidate per
  the SPEC (no approved production origin).
- Independent review of this candidate (the nine product aspects)
  — NOT_RUN; acceptance belongs to a non-author reviewer against
  this fixed commit.
