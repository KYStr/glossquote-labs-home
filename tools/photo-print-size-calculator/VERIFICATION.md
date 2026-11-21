# Photo Print Size Calculator — Verification

Candidate: `muse/photo-print-size-calculator-production-20261109`
(see the pushed head SHA in the handoff report; this file records
commands and results, not the SHA).

Environment: Node v24.22.1, no browser, no network services beyond
the local loopback probe below.

## Commands run

```text
cd tools/photo-print-size-calculator
npm test
npm run check
npm run build:preview   (twice; recursive diff of dist-preview/ and BUILD-MANIFEST.json)
npm run check:generated:preview
node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview   (loopback probe, then stopped)
```

## Results

- `npm test`: 57/57 passing (25 core fixtures verbatim, 3 controller
  fixtures verbatim, plus 15 hand-derived core boundary/validation/
  property tests, 10 extra controller tests, and 4 report tests).
- `npm run check`: pass.
- `npm run build:preview` twice: byte-identical dist-preview/ trees
  and BUILD-MANIFEST.json (recursive diff clean).
- `npm run check:generated:preview`: pass (9 files, hashes exact,
  bilingual metadata present, no production canonical, worker source
  matches fixed bytes).
- Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173
  --dir dist-preview`): 200 for `/`, `/en/`, `/en/index.html`,
  `/styles/photo-print-size.css`, `/js/app.js`,
  `/js/controller.mjs`, `/js/worker-handler.mjs`,
  `/js/core/photo-print-size.mjs`, `/js/worker-source.js`,
  `/robots.txt`, all with correct MIME types; 404 for `/nope` and
  for a `..` traversal attempt; 405 for POST. Response headers on
  `/` include the SPEC CSP, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(),
  microphone=(), geolocation=()`, and `X-Robots-Tag: noindex,
  nofollow`. Server stopped after the probe.

## NOT_RUN

- Real-browser checks (Chrome/Edge, two languages, keyboard,
  320 px, 200% zoom, reduced motion, touch targets, contrast):
  NOT_RUN — no isolated-browser mechanism is available to this
  builder. The SPEC's browser gate must be run by the reviewer.
- Network/Storage observation with a clean isolated profile:
  NOT_RUN — same reason. The code performs no fetch/XHR/WebSocket/
  beacon, uses no persistent storage, and has no upload path; the
  static check scans for those capabilities.
- Real-device checks: NOT_RUN.
- Formal HTTPS/SEO gate (canonical, hreflang, sitemap, headers on
  the planned origin): NOT_RUN — the origin is not configured.

## Known limitations

- The blob-URL module Worker under the pinned CSP can only be
  settled in a real browser (see HANDOFF.md).
- The draft is page-only by design (SPEC forbids persistent
  storage); switching language or leaving the page discards it.
