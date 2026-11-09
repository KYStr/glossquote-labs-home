# Verification — SVG to PNG Converter candidate

Environment: Node v24.22.1, zero npm dependencies, 2026-11-09. All commands run in `tools/svg-to-png-converter/`.

## Commands run

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 32 tests, 32 passed, 0 failed |
| `npm run check` | 0 | static checks passed (zero deps, JS syntax, safe sinks, core purity, sanitiser lists vs SPEC §4, bilingual structure) |
| `npm run build:preview` (×2) | 0 | byte-identical: aggregate SHA-256 of dist-preview tree `7a8086348cf17006d93c9600d2d5747d1701b8632b82cf09ca65d4b701047fe7` both runs |
| `npm run check:generated:preview` | 0 | 10 files byte-identical to a fresh build |
| loopback HTTP probe (`node scripts/serve.mjs`, PORT=8734) | — | `GET /` → 200 (4519 B, `lang="zh-Hant"`), `GET /en/` → 200 (4588 B, `lang="en"`), `GET /js/app.js` → 200; server killed after probe |

## What the tests cover (expectations derived from the SPEC, not from the implementation)

- Sizing: fixtures F1, F2, F3, F5 exactly; F7 cap boundaries (2,000,000 px allowed; exactly 33,554,432 px allowed; 8192×8192 refused); a constructed x.5 rounding case (2×1 at width 5 → height 3); the 1 px floor.
- Intrinsic resolution: rules 1–4; `width="10mm"` and `width="50%"` count as absent; `px` suffix counts; degenerate (zero/negative) and malformed viewBox count as absent; comma-separated viewBox.
- Sanitiser: F6's exact itemised counts and the exact English summary sentence from SPEC §3; one test per banned element (19) incl. subtree counted once; XHTML-namespace elements; `on*` attributes incl. root and uppercase; every href class (fragment allowed, four raster `data:image/` types allowed incl. the `data:image/pngx` prefix-spoof refused, `data:image/svg+xml` refused, https/javascript:/relative/protocol-relative refused); `xlink:href`; style `@import` and external `url()` declaration removal in both `style` elements and `style` attributes, with allowed data/fragment urls preserved; a benign document (gradients, fragment refs, text) passes with count 0 and a stable serialisation.
- Pipeline errors, each distinct: malformed XML (with line/column), undefined entity, duplicate attribute, unclosed tag, namespaceless `<svg>` root, non-svg root, undeterminable size, paste cap at exactly 200,000 chars (passes) and 200,001 (refused with actual size), file cap at 2,000,000 / 2,000,001 bytes.
- Bilingual string tables have identical key sets.

## Spec errata candidates

None. Every printed fixture (F1–F7) re-derives exactly from the §4 rules.

## Recorded interpretations (SPEC silent; safety-conservative)

1. A DOCTYPE with an internal subset (entity declarations) is refused under the not-well-formed error class; a plain DOCTYPE is accepted and dropped in serialisation (serialisation normalisation).
2. Banned elements match by local name in any namespace, in addition to every element in the XHTML namespace (SPEC's explicit rule).
3. `url()` targets inside style content follow the same allowlist as `href` values: `#` fragments and the four raster `data:image/` types are kept; anything else loses its declaration (counted once per declaration).
4. Style removals are reported as their own summary category ("style items" / 樣式項目）; SPEC §4 pins their counting (one per removed rule/declaration) but not a summary label.

## NOT_RUN (not verified here)

- Real-browser rendering and interaction, including the actual canvas rasterisation output (downloaded PNG dimensions/pixels), preview appearance, and drag-drop in a browser.
- The hostile-corpus network-log check in a real browser (zero requests after load) — core code contains no network APIs and static checks enforce that, but no browser network log was captured.
- Scanner/device checks, real-device and touch checks, assistive technology, measured contrast, keyboard-only end-to-end flow in a browser.
- Cross-browser compatibility (Chrome/Edge/Firefox/Safari) of dimensions and removal counts.
- Deployment and any public hosting.
