# Verification matrix — 2026-10-28

## Passed

`node --test test/*.test.mjs`: 52/52, Node v24.22.1. `node scripts/check.mjs`: pass. `node scripts/build.mjs`: pass. `node scripts/fixtures.mjs`: prepared only.

- 17 pixel/header/core tests: integer resource bounds, PNG CRC and boundaries, animation/unknown-critical rejection, JPEG supported SOF/boundaries and all post-SOS markers (late SOF/DNL rejected), unsupported/empty/large bytes, dimension equality, settings, exact overlay endpoints and half-up rounding, absolute differences, white-backed transparency, malformed buffers and cancellation between render chunks.
- 17 session tests: lifecycle, immediate stale result invalidation, invalid-settings fail-closed, invalid file replacement, pre-decode gates, claimed-size mismatch, oriented size mismatch, swapped orientation dimensions, decoder error sanitization, late read/decode resolution/rejection, bounded latest-only serial queue, late render, malformed renderer output, clear, hostile filename as data and disposal.
- 7 browser adapter **mock** tests: bitmap closure and canvas release on success/cancel/dimension mismatch/draw/context failures; capability absence.
- 9 build/server tests: preview origin absence, production argument validation, bilingual control/key parity, HTML escaping, canonical/alternate metadata, CSP/noindex output, symlink rejection, separate/reproducible builds, loopback HTTP MIME/HEAD/method/traversal checks.
- 2 app DOM **mock** integrations (zh-Hant/en): real app event wiring, source names as text, mode/opacity invalidation, display state, clear, pagehide then usable reset.

Static scans support—not replace—source review. Synthetic minimal JPEG header tests do not establish native JPEG decode success. DOM/adapter mocks do not establish real browser layout or accessibility.

## Actual browser status

NOT_RUN. An isolated loopback fixture server started and answered from the cloud shell. The supported CUA browser attempted `http://127.0.0.1:4197/index.html`; it returned `net::ERR_CONNECTION_REFUSED`. This demonstrates that this browser cannot reach that shell loopback route, not that the application failed. The server was stopped afterward. No alternate CDP/Playwright/browser process, tunnel, install, user-local browser or shared managed preview modification was used. Await shared managed preview coordination with the independent media reviewer.

Prepared `test-product/` includes 11 native browser fixture cases per language: PNG overlay, 0/100 endpoints, absolute difference, render cancel, identical JPEG, dimension mismatch, bad PNG CRC, hostile names, transparency and 1:1/clear. They remain NOT_RUN until the browser actually reports their results.

## Remaining gates

- Independent reviewer source/test pass and any fixes/recheck.
- Actual native decoder/Canvas fixture execution in both languages.
- Visual desktop/mobile layout, keyboard-only order/focus, visible status, real file-picker behaviour, back/forward and repeated interrupted workflows.
- EXIF orientations 1–8, nontrivial photographic JPEG, interlaced/palette/16-bit PNG, malformed native decoding, browser memory stress (4 MP bounds are conservative but not a native-memory guarantee).
- Network/storage/offline inspection, CSP console, multi-engine, actual 200% zoom, physical phones and assistive technologies.
- Repository creation/push, production origin choice, deployment, live HTTPS/SEO and homepage integration are **NOT_AUTHORIZED / NOT_PERFORMED**, not failed checks.

## Memory and privacy interpretation

At 4 MP an RGBA frame occupies 16,000,000 bytes. Normally two source arrays, a result array and its Canvas store are retained; decoding also needs an input buffer, native bitmap and temporary canvas. The implementation limits workload, serializes native jobs and drops obsolete references, but browsers may hold additional copies or defer GC. Native decoders cannot always be forcibly cancelled. Files and settings are not persisted, and no secure-memory-erasure claim is made. White-backed RGB comparison intentionally excludes hidden transparency data and metadata; it is not a cryptographic or forensic comparison.

## Source evidence

- Catalog `KYStr/glossquote-labs-home@26525d5f6380915ea95dde879dec769442db0d95`, full `image-overlay` record copied into SPEC scope. Draft date/URLs are null.
- Existing image-resizer architecture read at main resolving to `4a68c2d8aa99ea66fbb2a904ec50f2fbb760f558`; README, package, header/session and build/site-output inspected read-only.
- GitHub repository search `image-overlay user:KYStr` and PR search `user:KYStr "image-overlay" is:pr`: zero returned on 2026-10-28. Local/unpushed work remains unknown.
- API references consulted: https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap and https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData . No external runtime dependency is introduced.
