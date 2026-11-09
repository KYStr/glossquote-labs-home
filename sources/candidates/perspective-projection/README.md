# Perspective Projection Explorer

Candidate r1, 2026-11-01. Publication and acceptance status are tracked separately from these source documents.

## Fixed scope
Specification and brief: KYStr/glossquote-labs-home commit `7fac2b9ee33e99967f5cebe8c283ef6d66a327c6`, `docs/specs/perspective-projection/{SPEC,BRIEF}.md`.
A 200 × 120 CSS rectangle with rotateX/rotateY in ±60 degrees, fixed 500px perspective, independent parent perspective origin and fixed child rotation origin. Complete projected corner table, unclipped SVG schematic, clipped real CSS preview and canonical selectable CSS. Bilingual Chinese/English, no external assets, storage, network requests or clipboard API in application code.

## Reproduce
Node >=24; tested Node 24.22.1. No install step or dependencies.
`npm test`, `npm run check`, `npm run build`, `npm run preview`.
The local source server listens at 127.0.0.1:4180. Managed official preview uses `.openai/hosting.json` and `dist` on its own port; it is not evidence of source-server production headers.
Build outputs exactly five files in dist and a SHA256 BUILD-MANIFEST.json. Build clears dist first. Source HTTP server has strict routes, methods, host validation and security headers. HTTP unit evidence is not browser CSP enforcement or privacy evidence.

## Structure and safe extension
`src/core.js`: schema/parser, scalar projection, display, CSS serialization and immutable state. `src/app.js`: DOM adapter and diagrams. `src/app-template.js` and `src/texts.json`: two generated static documents/translations. `test/core.test.mjs`: independent matrix oracle plus state/boundary checks. `scripts/serve.mjs`: explicitly adapted from this author's earlier Steps source-server skeleton; no outside package.
To add explanatory content, change translation keys and both documents together, run check/build, verify both normal pages; do not broaden accepted input, geometry or CSS without revising the fixed contract. Never substitute projected AABB for four native zero-anchor reference points.

## Limits
See AUTHOR-CHECK and TEST-PLAN. All nine independent product scores remain null. Native geometry, CSP/network/storage, fixed viewports, computed contrast, BFCache and handler-to-rAF timing are NOT_RUN. No claims of full accessibility certification or cross-browser coverage.

## Revision r2 — affected correction
English help spacing corrected in five phrases (at 500px, are 200×120px, The 220×140px, within 24, general 3D). Projection core and CSS logic unchanged. Author normal English page visually checked 2026-11-01 10:50 UTC; check/build passed. No original math tests rerun. All prior NOT_RUN limits remain; this is author evidence, not independent acceptance.
