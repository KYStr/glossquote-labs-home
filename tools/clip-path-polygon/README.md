# Polygon Clip Explorer — candidate r1

Fixed SPEC/BRIEF: KYStr/glossquote-labs-home `c3a135c4a5077ea4acc5a67688e280a480a04aa8`, docs/specs/clip-path-polygon/. Author evidence is distinct from independent product acceptance and deployment.

Three to twelve ordered vertices, exact hundredth-percent coordinates, BigInt topology and reduced fraction geometry. Native CSS clipped built-in pattern plus separate labeled schematic. Bilingual page, raw text retained, selectable CSS without clipboard. No dependencies, user files, storage or remote calculations.

## Reproduce
Node >=24 (author Node24.22.1), no npm install.
- `npm test`: core literals/state/schema plus actual local HTTP server test (build preview first for HTTP fixture).
- `npm run check`: syntax, translations, sinks and static input contracts.
- `npm run build:preview` then `npm run check:generated:preview`: exact nine files and SHA256 manifest.
- `npm run dev`: prebuilt dist, localhost4180 by default; official preview's explicit --port override is honored without changing host/allowlist.
- `npm run build:production` / `check:generated:production`: intentionally nonzero until separately approved origin is supplied. This candidate does not implement or claim production publication.

The committed public/index.html and public/en/index.html plus src/app.mjs are build inputs. scripts/pages.py is an optional authoring generator using standard Python only, not required by build/test/run; its inputs are src/texts.json and app-template.mjs. If changing translations or template, regenerate both pages and app together, then static checks and full affected UI. No external dependency or package download.

Core geometry uses exact integer predicates and fixed rejection precedence, never epsilon, pixel raster or browser hit-test. src/app-template.mjs is the DOM adapter; src/core.mjs has no browser APIs. scripts/serve.mjs reuses this author's earlier local server skeleton with this tool's exact allowlist/CSP and managed port support. Previewing dist on another managed static server is not a substitute for actual CSP enforcement evidence.

## Limitations
All nine independent product scores null. Necessary native T07–T11/T13 evidence remains partly or entirely NOT_RUN: calibrated reference dimensions, independent raster mask tolerance, actual network/storage/CSP probes, computed contrast, exact viewports, BFCache/IME and native timing. See full TEST-PLAN/AUTHOR-CHECK. Ordinary UI pictures are not pixel oracle verification.

## Revision r2 — affected correction
Reset now restores the preset selector to Rectangle as well as existing initial state. Author normal UI verified twelve→Apply→Generate→Reset, Chinese switch, dirty Concave L/800px/Diagonal→keyboard Reset, and repeated Reset at 2026-11-01 10:51 UTC. Core unchanged; static check/preview build/generated check passed. Original twenty core tests not rerun. All prior NOT_RUN limits remain; this is author evidence, not independent acceptance.
