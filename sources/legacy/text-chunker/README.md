# Text Chunker with a Code Point Limit

A bilingual (Traditional Chinese / English) browser-local tool for splitting a draft into copyable chunks. The limit counts Unicode code points, not grapheme clusters, visible emoji, or any platform's character rules.

- Strict mode splits at the chosen limit. Prefer line breaks keeps the last LF within the limit in that chunk.
- Joining chunks in order reproduces the current text-field source, including whitespace. A browser may normalize pasted CRLF/CR before the tool reads textarea.value.
- Source maximum: 100,000 UTF-16 code units. Limit: 1–10,000 code points. At most 1,000 chunks; overflow rejects the entire result.
- Edits immediately clear old results. Copy is user-triggered and single-flight, with state-instance/revision/request guards and manual selection on failure.
- No upload, account, automatic storage, analytics, remote fonts, or runtime dependencies. Reloading clears the draft.

## Run locally

Node.js 24 or newer; no npm install is needed.

```sh
npm test
npm run check
npm run build
npm run build:production
npm run check:production
npm run dev
```

The preview binds to 127.0.0.1:4203, falling back to an OS-assigned loopback port if occupied. Open /index.html or /en/index.html. Preview is noindex/nofollow. `npm run dev:production` serves the production assets on an OS-assigned loopback port for HTTP checks.

## Production

Fixed origin: https://chunks.glossquote.com. Production assets in dist-production include reciprocal bilingual canonical/hreflang metadata, static WebApplication JSON-LD, robots/sitemap, security headers and localized true 404 pages. Existing application code, CSS, text-field body and preview bytes are preserved. Wrangler configuration is assets-only, with metrics/logs/traces disabled.

Source publication and a verified live release are separate milestones. Cloudflare deployment, homepage inclusion and external review require their own verification; this source does not assert that they have passed. See [the release contract](docs/RELEASE.md).

## Verification limits

Offline tests use synthetic text and controlled clipboard promises. They execute the actual application callbacks across state replacement, but are not native BFCache or pending clipboard evidence. Physical IME/AT, native negative/pending clipboard ordering, actual 200% browser zoom and complete Network/Storage traces remain manual verification items.
