# Cubic Bézier Easing Explorer — private production candidate r1

A dependency-free, bilingual static calculator for one cubic Bézier timing function. Four raw decimal controls produce an exact-snapshot curve, nine three-column samples, static observation times, a two-second linear/curve comparison, and one CSS declaration. No account, upload, storage, imported file, download, analytics, external font or dependency installation.

## Fixed contract and provenance

- Repository baseline: KYStr/glossquote-labs-home, `26525d5f6380915ea95dde879dec769442db0d95`, README.md.
- Reviewed specification and brief: `8553231a365de4eafb964f620ea530850b4fbab0`, docs/specs/cubic-bezier-easing/{SPEC,BRIEF}.md.
- Candidate identity: `cubic-bezier-easing-20261101-r1`; the delivery manifest identifies exact bytes. This document does not assert a public candidate commit or deployment.
- All nine original acceptance aspects remain required. Author checks are not independent scores. No acceptance, merge or release is claimed.
- No license is selected by the fixed repository baseline. Public readability, if later granted, is not a new reuse license. No third-party code or assets were added.

## Reproduce

Node.js 24 or later; author used v24.22.1. No npm install is required. Run from this directory:

```sh
npm test
npm run check
npm run build
npm run preview
```

`test` runs the pure core/controller and restricted local delivery tests. Its delivery case performs two fresh deterministic builds. `check` validates syntax, the runtime source's Chinese line comments, closed sinks, bilingual documents and the zero-dependency package. `build` copies only eight allowlisted files to `dist/` and creates `dist/build-manifest.json`; it replaces only this tool's reproducible dist directory. No timestamps, private input or test sources enter runtime. `preview` serves the fixed dist whitelist at http://127.0.0.1:4173/ (English /en/index.html); stop with Ctrl+C. This is loopback, not deployment. HTTP headers enforce the full CSP, including frame-ancestors. The HTML meta policy also restricts script/style/network in static previews; meta cannot enforce frame-ancestors. A hosting platform must preserve the header policy rather than assume meta alone does so.

The managed QA preview uses the official shared preview service, not a second manually launched server. Its service headers and viewport controls are not represented as the product server's verified headers. See AUTHOR-CHECK.md for actual evidence and limitations.

## Architecture and safe extension

- `src/core.mjs`: strict descriptor-based schema, integer-thousandths parsing, BigInt polynomial and fixed40-round inverse, exact half-away percentage format, frozen samples/polyline/CSS.
- `src/controller.mjs`: injected clock/RAF/clipboard/deadline/visibility and three epochs. No DOM, storage or network. Pending OS clipboard writes cannot be retracted; only this page's UI authority is cancelled.
- `src/app.mjs`: safe text/SVG adapter, native form/radio controls, focus transfer and lifecycle listeners. No raw value enters HTML, CSS, URLs or SVG geometry.
- `src/boot.mjs`: required BigInt/SVG/RAF capability gate before importing the numeric module. Missing matchMedia leaves the local reduce-motion control usable and explains the missing system preference.
- `src/messages.mjs`, the two HTML pages and `style.css`: complete bilingual wording, fixed accessible layout and no decoration animation.
- `test/`: independent 80-round de Casteljau reference; deterministic literal fixtures; bounded controllable clocks. These do not impersonate native playback, clipboard or assistive technology.

### Independent minimal FAQ extension / 最小雙語 FAQ 擴充

In an isolated copy, record the manifest. Add one matching `<details><summary>…</summary><p>…</p></details>` inside each page's `section.faq`, before its closing tag. Supply genuine Traditional Chinese and English wording; do not alter the calculator, page language, IDs, or imported modules. Add a specific Chinese HTML comment to each new line. Run `npm run check` and `npm run build`, then read both questions and expand them through the normal page UI. Record what you actually observed. Restore both HTML files from the untouched candidate copy, rebuild, and compare every manifest entry. The extension copy is not the candidate and must not be published as it. No independent extension is claimed by this author.

在隔離副本先記 manifest；於兩頁 FAQ 加一組對應繁中／英文問答，保留語意與每行中文註解。執行 check/build，以正常頁面展開閱讀後，從未改候選還原兩頁並重建，逐檔核回原 bytes。不要修改核心或把測試副本交作候選。

## Rollback

Keep an untouched full candidate copy and its manifest before editing. To discard a QA extension, restore only the files your diff proves you changed; preserve unrelated/newer work. Rebuild this tool's dist, compare every file against the original manifest, and stop if identities differ. This is the first private production candidate: there is no prior deployed Cubic product to roll back. Nothing here automatically changes another tool, the Labs catalog, a deployment or a user's stored data.

## Constraints

Time is not the parametric variable t. x controls lie in [0,1], y in [-1,2]; negative/overshooting progress is preserved. CSS does not include duration or make an element animate by itself. Reload/language navigation restores defaults; edits/clear/hidden/pagehide invalidate results and pending UI callbacks. Clear affects only current synthetic page inputs. See the fixed specification for exact contracts and AUTHOR-CHECK.md for untested necessary observations.
