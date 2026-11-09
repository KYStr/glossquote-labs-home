# Verification — Percentage Calculator

Environment: Node v24.22.1 (Linux), zero dependencies, tool directory
`tools/percentage-calculator/`. All commands run 2026-11-09 by the builder.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 44/44 tests |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks |
| `npm run build:preview` (run twice) | PASS — preview written to `dist-preview/` both times |
| `npm run check:generated:preview` | PASS — dist-preview matches a fresh build byte for byte (7 files) |
| Loopback HTTP probe of `dist-preview` via `scripts/serve.mjs` (ephemeral port) + curl | PASS — `GET /` 200 `text/html` with `<title>百分比計算機｜Gloss Tools</title>`; `GET /en/` 200 with `<title>Percentage Calculator \| Gloss Tools</title>`; `GET /styles/app.css` 200 `text/css`; missing file 404 |

## Test breakdown (44)

- Core fixtures: all 21 SPEC core cases deep-equal (modes, rounding,
  division-by-zero, error codes/fields, first-error-wins).
- Core rules derived by hand from the SPEC: absolute-value boundary
  999,999,999,999 (both signs), raw-length boundary exactly 24 characters,
  grammar accept/reject set (`0.5` valid; `.5`, `5.`, `007`, `+5`, `1e3`,
  ` 5`, `50%` invalid), exact-zero judgement for `-0` / `0.00`, SCHEMA for
  wrong types / missing field / accessor property, lone-surrogate UNICODE,
  the display trap (exact 2.3449999999999 → value `2.345`, display `2.34`),
  negative tie (-2.525 → display `-2.53`), normalizeEcho rules.
- Controller fixtures: all 3 SPEC state cases (dirty→error invalidation,
  cancel + late-result rejection + reset, replace + older-late rejection),
  plus edit-during-busy termination.
- Report: byte-exact serialization for two results (sorted keys, trailing
  LF, no BOM), SHA-256 of the bytes matches the hash of the literal
  expected text, recursive key sorting with array order preserved.
- Pages: both languages' lang/title/H1/description, noindex, no canonical
  or hreflang in the candidate, no external assets, same-language
  `../../` home links, full control set and status semantics.
- Build: two builds byte-identical (sorted SHA-256 lists equal); Worker
  token replaced; the embedded Worker source driven end to end through a
  `self` shim returns the fixture-exact outcome for share 2/3.
- Serve: real HTTP on an ephemeral loopback port — both pages 200 with
  titles, JS MIME, CSP includes `worker-src blob:`, `X-Robots-Tag`
  noindex, HEAD empty body, 404, `..%2f` traversal rejected with 404.

## Spec errata candidates

None. Every fixture value follows from the SPEC's stated rules; no
fixture-versus-rule conflict was found.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, mode switch,
  cancel, reset, real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  `https://percentage-calculator.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.
