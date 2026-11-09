# SVG Dash Cycle Explorer

Single horizontal native SVG line, exact integer dash intervals and an inert manually selectable snippet. Traditional Chinese and English. Positive offsets advance the cycle; negative offsets delay it. Odd lists repeat once. Solid mode preserves inactive raw dash/offset input and revalidates it when reenabled.

## Fixed source
SPEC and BRIEF: KYStr/glossquote-labs-home commit fa3685b2dab979f5afb84d127c82864c2040cbb6, docs/specs/svg-dash-cycle/. Homepage baseline26525d5f6380915ea95dde879dec769442db0d95. Native rendering is separate from exact interval arithmetic; source preservation is not acceptance or deployment.

## Reproduce
Node24 or newer, no dependencies or installation:
```
npm test
npm run build:preview
npm run check
npm run check:generated:preview
npm run dev
```
The fixed dev server binds127.0.0.1:4180. Build emits noindex dist with a deterministic SHA256 build manifest. `npm run build:production` deliberately fails because no production origin is configured; no host URL is invented. Do not treat a managed static QA server as verification of the dev server's response headers.

## Boundaries
Length1–400;1–8integer dash entries1–100;offset−1000–1000. Rawcap12before ASCIItrim. No arbitrary SVG, curves, zero segments, caps, transforms, animation, uploaded files, clipboard API, downloads or storage. The snippet's fixed English accessibility label is intentional and language-invariant; the on-page SVG accessible label is localized. Presentation attributes come only from validated numbers and fixed names, not parsed snippet HTML.

## Rollback and verification
Rebuild dist from this fixed source. On a later candidate regression, return to the prior preserved source commit in a new reviewed commit; do not rewrite history or replace another owner's files. Original independent nine-aspect rubric remains intact. AUTHOR-CHECK distinguishes author observations from NOT_RUN; no independent scores are claimed here.
