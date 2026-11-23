# Barbell Plate Calculator （槓鈴配重）— VERIFICATION

- Spec: `spec-barbell-plate-calculator-20261121`, draft spec PR #373
  (base `codex/initial-publication`, head
  `f7c0d421cc5047de101383f241f6e0faa4fbe638`, OPEN at build time).
  Registry rev 1712 (per parent task).
- Spec source (fixed): `docs/specs/barbell-plate-calculator/` at the spec
  PR head above. `test/fixtures.json` is a byte-identical vendored
  copy (SHA-256
  `8c2ac601ad73b38f573fabdf99c3d18095b70674cda28e04bd6c74ed01d323fd`,
  verified against the spec PR head via the GitHub API).
- Production branch: `muse/barbell-plate-calculator-production-20261121`,
  base `codex/initial-publication` (base head `8c265267` at clone
  time). Build-first; no registry production registration.
- Environment: Node v24.22.1, no runtime dependencies, ESM.
  All commands below were run inside
  `tools/barbell-plate-calculator/` of the production clone.

## Commands and results (all exit 0 unless noted)

| Command | Result |
| --- | --- |
| `node --test` | 51 tests, 51 pass, 0 fail (14 literal core fixtures deep-equal, greedy re-derivation grid, boundary pins, invariants, grammar/range/EMPTY/INPUT_LIMIT/UNICODE/order/schema/formatKg/timezone tests; 12 controller tests incl. the 3 literal controller fixtures; 5 report tests incl. two independently derived byte literals; 6 site tests) |
| `node scripts/check.mjs` | PASS: files, package contract, fixtures hash, core fields/defaults/ranges/plates/example, pages, syntax, worker concatenation, capability scan, core purity |
| `node scripts/build.mjs --mode preview` (run 1) | Preview build: 9 files; BUILD-MANIFEST.json SHA-256 `873ee89e086ec508d883f2ee26edcc8bd2aa9b65de7da9298e0a35e3e8c4b9ff` |
| `node scripts/build.mjs --mode preview` (run 2) | Preview build: 9 files; BUILD-MANIFEST.json SHA-256 `873ee89e086ec508d883f2ee26edcc8bd2aa9b65de7da9298e0a35e3e8c4b9ff` — identical to run 1 (diff of the two manifests empty) |
| `node scripts/check-generated.mjs --mode preview` | PASS: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

Build manifest (mode preview, 9 files):

- `en/index.html` — 9605 bytes, SHA-256 `63e7f1f0daa4c4fc17688a5d6bfe5d3c1037522f8cb6b958678c555d340f8f38`
- `index.html` — 9454 bytes, SHA-256 `33e2e980262c27508588581cf1a7b8084e8f82995c8872f0436038cbf8ae60f8`
- `js/app.js` — 14553 bytes, SHA-256 `9bab6dfa0ffadcfa0d1e42c07af1e90a7d9e2dcc48317cdf78e2a86e23b115eb`
- `js/controller.mjs` — 5049 bytes, SHA-256 `53e274e84a7f40ee2377a9779ed9b5199fcc85ade484f905fc6516367f67eb9e`
- `js/core/barbell-plate-calculator.mjs` — 10994 bytes, SHA-256 `aee79a77c9ff18f4cb55abf2a83d43dc263f3abe0dd48bdb04a6e2f959d5e5cd`
- `js/worker-handler.mjs` — 806 bytes, SHA-256 `cc390a01f18c17edfb67e119c338d981a423b5abe7073284abc4f95440316c0e`
- `js/worker-source.js` — 12509 bytes, SHA-256 `dca0a3ccec744d6034eb8f74fb0f810e2965fc34e7b68894bdba813c9a5a5843`
- `robots.txt` — 26 bytes, SHA-256 `331ea9090db0c9f6f597bd9840fd5b171830f6e0b3ba1cb24dfa91f0c95aedc1`
- `styles/app.css` — 6894 bytes, SHA-256 `e3ddf034d75c4e8b75ba839cd9576371a4b04e427505e39983be29cf0b6fc29e`

Report literals verified byte for byte against independent
derivations (Python json, sorted keys, compact separators):

- exact-100kg report: 228 bytes.
- exact-87p5kg report: 288 bytes.

## NOT_RUN (not verified by this builder)

- Real isolated-browser checks (Chrome / Edge, both languages,
  keyboard, 320 px, 200% zoom, reduced motion, touch targets,
  Network / Storage zero-request observation, Blob download bytes,
  Worker behaviour in a real page): no isolated browser is available
  to this builder. Node/DOM-substitute checks must not be presented
  as browser evidence.
- Loopback serve smoke test (`node scripts/serve.mjs` + HTTP
  GET/HEAD): not run; the serve script is the house pattern and is
  syntax-checked by `node scripts/check.mjs`, but no live HTTP
  request was made.
- The nine-aspect independent review on the same PR head: for the
  reviewer, not this builder.

## Known limitations / next owner

- Errata candidates 1–4 are in HANDOFF.md; the spec was not changed.
- The production PR is a DRAFT and must not be merged or published
  by this builder. Next owner: the independent reviewer (not the
  author) verifies the same PR head against the nine aspects.
