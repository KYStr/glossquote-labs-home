# Archive Member Path Preflight — Verification

Environment: Node v24.22.1. All commands run from `tools/archive-path-preflight/`
unless noted. Base commit `8941a010da5722f0b4690487938c4e32d2a2587f`
(`codex/initial-publication`).

## Commands and results (all exit 0)

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | **31 pass / 0 fail** |
| `npm run check` (`node scripts/check.mjs`) | pass — package contract, required files, core purity, no forbidden sinks, HTML metadata + id parity, SPEC strings, i18n key parity |
| `npm run build:preview` (twice) | **byte-identical** — full `sha256sum` trees of `dist-preview/` compared with `diff`, no differences |
| `npm run check:generated:preview` | pass — 8 files, worker source embedded exactly (sha256 `21ee04f3…`), generated pages carry preview metadata |
| `node --check dist-preview/js/worker-source.mjs` | syntax OK |
| Loopback HTTP probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`) | `/` 200 `text/html`, `/en/` 200 `text/html`, `/js/app.js` 200, `/js/worker-source.mjs` 200, traversal attempt 404, unknown path 404; response headers carry the SPEC CSP, `nosniff`, `no-referrer`, `Permissions-Policy` camera/microphone/geolocation denied, `X-Robots-Tag: noindex,nofollow` |

## Test coverage (31 tests)

- `test/core.test.mjs` — all 7 SPEC core fixtures read live from
  `docs/specs/archive-path-preflight/fixtures.json` and deep-compared;
  SCHEMA envelope (wrong types, extra fields, accessor, inherited field);
  capacity order (65,536/65,537 units, lone surrogates, EMPTY, 500/501
  rows, one trailing LF stripped); ROW_FORMAT for every line before any
  path check; PATH_LIMIT / ABSOLUTE / BACKSLASH / DEPTH boundaries
  (240/241 chars, 16/17 segments); segment priority and boundaries
  (EMPTY, DOT, 64/65 chars, SEGMENT_CHAR incl. space/colon/percent/control/
  non-ASCII, TRAILING_DOT, DEVICE_NAME incl. COM10/LPT0/NULx negatives,
  TRAILING_DOT beats DEVICE_NAME); conflicts (intermediate alias, three
  spellings, same member ×3, file parent with D descendant, deep
  descendant, all three kinds at one node, ASCII key order, unsafe rows
  excluded from the trie); input is not mutated.
- `test/report.test.mjs` — exact byte layout for a clean result, recursive
  key sorting, JSON string escaping, **independent serializer agrees
  byte-for-byte and SHA-256 on every SPEC fixture result**, 2,097,152-byte
  cap → `OUTPUT_LIMIT`, non-plain values → `INTERNAL`.
- `test/controller.test.mjs` — the 3 SPEC controller fixtures
  (`state-dirty-error`, `state-cancel-late`, `state-replace-late`) with a
  controllable fake worker, plus stale-generation discard, worker error →
  `WORKER_ERROR` with draft kept, factory rejection → `WORKER_ERROR`,
  oversized report → `OUTPUT_LIMIT` error state, download payload only on
  success, cancel no-op when idle, empty draft → `empty`.
- `test/html.test.mjs` — exact SPEC zh/en strings (lang, title, H1,
  description, both FAQs, labels), preview metadata (robots noindex,
  CSP, no canonical/hreflang, no external URLs, no inline script or
  handlers), identical control-id sets on both pages, path-only language
  and home links.
- `test/build.test.mjs` — `build:preview` twice byte-identical and
  `check:generated:preview` passing, run through the real scripts.

## Spec errata found

None. All 7 printed core fixtures and all 3 controller fixtures reproduce
exactly from the SPEC's own rules.

## Interpretations (SPEC silent; recorded in HANDOFF.md)

1. A row with an empty path part (`F\t`) is `ROW_FORMAT`.
2. `INPUT_LIMIT` / `UNICODE` / `EMPTY` / `ROW_LIMIT` carry
   `field: "entries", row: null`.
3. `OUTPUT_LIMIT` is enforced at report serialization; the controller turns
   it into an error state with no download.
4. Editing the draft to an empty string returns the state machine to
   `empty`; any other edit returns it to `dirty`.

## Known limitations

- The tool must be served from the preview/production build
  (`dist-preview/`): `public/js/app.js` dynamically imports the generated
  `js/worker-source.mjs`, which only exists after `npm run build:preview`.
  Serving `public/` directly yields a `WORKER_ERROR` with the draft kept
  for retry (by design: a Worker failure never loses the draft).
- The 2,097,152-byte report cap is practically unreachable through the UI
  (at most 500 rows); it is enforced and tested via a synthetic result.
- No file input is offered (paste only), so the SPEC's
  "File.arrayBuffer late arrival" rule has no path in this build.

## NOT_RUN

- Real-browser rendering/interaction (both languages, keyboard flow,
  320 px, 200% zoom, reduced motion, touch targets, Worker + Blob
  download in Chrome/Edge).
- Real devices/touch, assistive technology, measured contrast of the
  tool's own UI.
- Network/Storage audit in a clean isolated profile (zero working
  requests, storage, URL, console).
- Cross-browser comparison, deployment, formal HTTPS/SEO (production
  canonical/hreflang/sitemap and absolute home links are a production-build
  concern, see HANDOFF.md).
- Independent nine-aspect review (pending by design in build-first mode).
