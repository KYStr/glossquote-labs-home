# Image overlay proofing — candidate specification

## Contract and provenance

Read-only catalog snapshot: `KYStr/glossquote-labs-home@26525d5f6380915ea95dde879dec769442db0d95`, `image-overlay` draft. Its publication date and URLs are null. Scope: overlay two equal-sized images, adjust opacity, inspect pixel differences. This is a visual proofing aid, not an authenticity test.

Reference architecture inspected: `KYStr/glossquote-labs-image-resizer` README, package, image header/session and build/site-output modules on 2026-10-28. This is a fresh cloud scratch candidate, not a checkout of a user's local Codex project. Read-only GitHub searches for `image-overlay user:KYStr` repositories and `user:KYStr "image-overlay" is:pr` returned zero. This does not establish absence of local/unpushed work. No repository, push, deployment, catalog or board write is authorized here.

## Small product boundary

- Two static PNG or 8-bit baseline/progressive JPEG files; never upload. Per file: nonempty, at most 10 MiB; encoded and decoded dimensions at most 4096 each and at most 4,000,000 pixels. Compare the browser-oriented decoded dimensions and reject mismatches; no resize, crop or registration.
- Before / after roles; both names and oriented dimensions are visible. B opacity is an integer 0–100%, initially 50. Overlay and absolute RGB difference are the only modes.
- To make transparency unambiguous, flatten each decoded image onto white before overlay/difference. Difference is per-channel absolute difference, black meaning equal rendered RGB. No similarity score or authenticity claim; hidden transparent colors, alpha invisible on white, metadata and original encoded bytes are not compared. Color conversion is browser-dependent, not a color-proofing guarantee.
- Explicit Preview button; changing a file, mode or opacity immediately clears the old result. Clear and Cancel are available. Cancel cannot forcibly interrupt a native decoder, but prevents stale commits; a single serial work lane prevents overlapping decodes and retains at most the newest queued job.
- Fit-to-width result plus 1:1 view in a bounded scroll region for pixel inspection. No image download, account, backend, remote URL import, analytics, remote assets, storage writes or external dependencies.
- Traditional Chinese and English pages, keyboard-native controls, visible focus, labels, live status, errors, fallback/help text, mobile layout and same-language homepage links.

## Safety and implementation

Byte signatures, container boundaries and dimensions are checked before decode. PNG animations and unsupported formats are rejected. Decoding failure is handled without a result. ImageBitmap is always closed; transient canvas backing stores are released. No object URLs are used. Names enter only via textContent. CSP forbids connections, objects, frames, form submissions and remote code. No secure-memory-erasure promise.

Node 24 built-in tests only, no install. Core functions, session controller, browser adapters and DOM shell are separate. Source comments are predominantly Chinese. Default `dist-preview` has noindex/no canonical/sitemap. Production build is separate and requires an explicit approved HTTPS origin argument; it is not a deployment and no origin/live URL is invented or recorded as published.

## Acceptance gates

Core pixel math/endpoints/transparency; file size/dimensions/container/animation/bad data; equal decoded dimensions; cancel/replace/late read/decode/render/error; single-lane bounded queue; stale result invalidation; bilingual structural parity; no-network/no-storage/XSS/object-URL static checks; path/SEO/security output; build/test/check. Actual browser checks only through available supported CUA/browser tools. Independent review must come from another agent; unrun browser/device/AT checks remain NOT_RUN.
