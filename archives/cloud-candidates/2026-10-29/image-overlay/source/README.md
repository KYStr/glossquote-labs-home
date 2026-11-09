# Image Overlay Proofing / 兩張圖片疊合校稿

**Unpublished cloud scratch candidate.** No source repository, deployment, live URL or homepage catalog update has been created. Local/unpushed Codex work is not visible or claimed inspected.

Choose two equal-sized static PNG/JPEG images, adjust image B's opacity, or inspect absolute RGB differences. Both images are rendered on white. This is a visual proofing aid—not an authenticity test or print-color proof. Images never leave the browser; no accounts, tracking, storage writes or remote dependencies. No export, automatic alignment, resizing or batch features.

- Per image: ≤10 MiB, ≤4096 px per edge, ≤4,000,000 pixels, both encoded and decoded.
- Compare browser-oriented dimensions; mismatches are rejected rather than resized.
- Editing any source/mode/opacity invalidates the old preview immediately.
- Cancel/clear prevent late results. One native work lane plus only the latest pending job avoids overlapping image decodes. A native decode cannot always be interrupted; reload if it stalls indefinitely.
- ImageBitmap and temporary canvas resources are released; no object URLs exist. Memory release is not secure erasure and browser-native peak memory is not guaranteed.
- Traditional Chinese and English, labelled native controls, status text and 1:1 scrollable view.

## Development

Node 24+, built-in modules only. **Do not install packages.**

```sh
npm test
npm run check
npm run build
npm run dev
```

Default build: `dist-preview/`, noindex, no canonical/sitemap. Dev server binds only to loopback (`127.0.0.1:4196`, or a printed fallback port); it does not deploy or upload.

The separate production build needs a future explicitly approved HTTPS origin:

```sh
node scripts/build.mjs --production --site="$APPROVED_ORIGIN"
```

It writes `dist-production/`; building it is not publication. This candidate contains no presumed production origin or liveURL. Tests use only the reserved non-live origin `https://preview-test.invalid` and remove their production test output.

## Browser fixture runner

```sh
npm run fixtures
```

This builds a separate `test-product/` and serves it on loopback 4197. Open either language and click **Run browser fixtures**. Eleven synthetic native File/Canvas/DOM cases are prepared; preparing them does not mean they passed. The fixture code is excluded from preview and production builds.

## Evidence

- Node 24.22.1: **52/52 tests passed**, including controlled DOM and browser-adapter mocks (not actual browser evidence).
- Syntax/bilingual/no-network/no-storage/unsafe DOM scans: passed.
- Preview build and production-separation/headers/path HTTP tests: passed.
- Real browser: **NOT_RUN**. The supported CUA cloud browser could not reach the separate cloud shell's `127.0.0.1:4197` (`ERR_CONNECTION_REFUSED`). No alternate CDP, tunnelling or local-browser control was attempted. Shared managed preview is reserved for another review; this candidate waits its turn.
- Independent review: pending.

See [specification](docs/SPEC.md), [verification matrix](docs/VERIFICATION.md), and [test output](docs/node-test-results.txt).
