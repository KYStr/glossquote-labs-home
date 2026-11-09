# VERIFICATION — TV Viewing Distance Calculator

Environment: Node v24.22.1, Linux, workdir `tools/tv-viewing-distance/` on branch `muse/tv-viewing-distance-production-20261109` (base `15f20a7afa234e8a9dc1d607a88379f89cd5656c`).

## Commands run

- `npm test` — see results below.
- `npm run check` — see results below.
- `npm run build:preview` twice — byte-identical output verified by comparing the full sorted SHA-256 tree of `dist-preview/` plus `BUILD-MANIFEST.json` between runs.
- `npm run check:generated:preview` — manifest vs on-disk bytes, bilingual metadata, embedded worker source equals the fixed core + handler bytes, deny-all robots.txt.
- Loopback HTTP probe of the built preview on an ephemeral port: `GET /` → 200 with title 「電視尺寸與觀賞距離｜Gloss Tools」; `GET /en/` → 200 with "TV Viewing Distance Calculator | Gloss Tools"; missing path → 404; traversal refused; pinned CSP / nosniff / X-Robots-Tag headers present.
- Extra: the built embedded worker source was executed end-to-end in Node with a fake `self` (forward-55-fhd result reproduced through the real worker code path).

## Results

- `npm test`: **38/38 pass** (core 23 — all 10 literal SPEC fixtures deep-compared plus hand-derived boundary/fit-endpoint/invariant cases; controller 11 — all 3 SPEC controller fixtures via a controllable fake Worker; report 4 — canonical bytes + SHA-256 + OUTPUT_LIMIT).
- `npm run check`: pass (files, package contract, core fields/ranges/multipliers/defaults/example, vendored-fixtures SHA-256 pinned to the spec candidate, bilingual pages, syntax, worker concatenation, capability scan, core purity).
- `npm run build:preview` ×2: **byte-identical** (9 files; full sorted SHA-256 tree of `dist-preview/` and `BUILD-MANIFEST.json` equal across runs).
- `npm run check:generated:preview`: pass.
- Loopback probe (port 49387): `/` → 200 「電視尺寸與觀賞距離｜Gloss Tools」; `/en/` → 200 "TV Viewing Distance Calculator | Gloss Tools"; missing → 404; traversal → 404; `js/app.js` → 200; CSP (with `worker-src 'blob:'`), `nosniff` and `X-Robots-Tag: noindex, nofollow` headers present.
- Built worker source executed in Node with a fake `self`: `forward-55-fhd` result and the RANGE error path both reproduced through the real worker code path.

## Spec-errata candidates

None — every literal fixture agrees with the SPEC's stated rules.

## NOT_RUN

- Real-browser evidence (isolated Chrome/Edge, both languages): example load, typed input, error, edit-after-success, cancel, reset, Blob download byte check.
- 200% zoom, 320 CSS px layout, keyboard walk, reduced-motion, screen-reader pass.
- Browser Network/Storage audit (zero work requests, storage, URL, console) in a clean isolated profile.
- Real-device checks.
- Production build / HTTPS origin / SEO gate (no production origin configured; build refuses production mode).
- Independent nine-aspect review and acceptance (this is a build-first candidate only).
