# CSS Box Model Sizing Explorer — candidate r1

Fixed [SPEC](https://github.com/KYStr/glossquote-labs-home/blob/fa3685b2dab979f5afb84d127c82864c2040cbb6/docs/specs/css-box-model-sizing/SPEC.md) and [BRIEF](https://github.com/KYStr/glossquote-labs-home/blob/fa3685b2dab979f5afb84d127c82864c2040cbb6/docs/specs/css-box-model-sizing/BRIEF.md). Source baseline README at 26525d5f6380915ea95dde879dec769442db0d95. This source document is author evidence, not an independent acceptance or deployment record.

## Run
Node >=24, native ESM, zero external dependencies; no install required.
```
npm test
npm run check
npm run build:preview
npm run check:generated:preview
npm run dev
```
Development defaults to http://127.0.0.1:4180; explicit --port may select the managed preview port, host remains loopback. Official Sites preview used 4173. Neither is production-origin evidence. Preview static output is dist (nine files), bilingual noindex. Production remains separately authorized; no inferred canonical deployment URL.

## Architecture and bounded input
src/core.mjs owns exact hundredth-pixel validation, independent-axis box formulas, canonical CSS and synchronous state. src/app-template.mjs + texts.json generate app.mjs via generate:pages; the same command generates both HTML entries. app.mjs renders one immutable snapshot to both modes, clears stale output on edit, preserves raw during language switches. Native empty div styling uses only validated fixed numeric properties. Separate SVG is explicitly a scaled schematic. Tests contain independent literal expected numbers, not generated expected results. No user HTML, external resources, persistence, URL input, clipboard API or service worker.

CSP deliberately includes style-src 'self' 'unsafe-inline' because the fixed spec requires validated numeric CSS property updates. This is not permission for arbitrary CSS. Other directives and no-referrer/nosniff are emitted in local response and dist/_headers; deployed enforcement is not claimed.

## Limits
NOT_RUN: calibrated native getBoundingClientRect/computed-style ≤1 CSS px matrix; exact 1366×768/1920×1080/320 CSS px viewport and DPR; browser Network/Storage/CSP enforcement inspection; measured contrast and complete assistive-technology audit; 100 native cycles/console audit; BFCache Back/Forward; five warm-up plus twenty performance.now→rAF trials; Firefox/mobile; production origin/metadata/deployment. DevTools restriction was respected, not bypassed through page evaluation. Node tests do not substitute these checks. All nine independent quality scores remain null.
