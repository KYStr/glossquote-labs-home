# Storage Unit Estimator （倉儲空間估算）— VERIFICATION

- Candidate: branch `muse/storage-unit-estimator-production-20261121`,
  draft PR (number read back with `gh pr view` after the final push
  and recorded in the parent report),
  base `codex/initial-publication` (head at build time
  `8c2652671012498891e7f7afe02fdca3f154aa64`). PR head SHA is read back
  with `gh pr view` after the final push and recorded in the parent
  report; this file's commit is part of that head.
- Spec: `spec-storage-unit-estimator-20261121`, spec PR #382, head
  `34b2ea5fa6065fe0883e87dae6961f19c80de22f`.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/storage-unit-estimator/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)

## Results

- Tests: `node --test` — 53 pass, 0 fail (13 core fixtures verbatim
  deep-equal; 3 controller fixture flows; boundary/grammar/range/
  schema hand-derived cases; independent re-derivation of all 21
  item volumes and all 6 unit capacities both ways; report byte-exact
  cases; site contract).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `872fd843df6d590759826a2cca5f349bdc4453da9cc1ce7cb831b591a39d4a40`.
- Build 2 hash: identical
  `872fd843df6d590759826a2cca5f349bdc4453da9cc1ce7cb831b591a39d4a40`
  (manifests diffed: identical). Two preview builds byte-identical.
- Generated-preview check:
  `node scripts/check-generated.mjs --mode preview` — passed
  (files, hashes exact, worker source matches fixed bytes).
- Serve smoke test (`node scripts/serve.mjs` on 127.0.0.1:4173):
  GET `/` 200 text/html, GET `/en/` 200, HEAD `/` 200 with the SPEC
  CSP + nosniff + no-referrer + Permissions-Policy headers, missing
  page 404, traversal attempt 404, POST 405. Server stopped after
  the check.

## NOT_RUN (not verified by this builder)

- Real-browser gates (Chrome / Edge, both languages, keyboard,
  320 px, real 200% zoom, reduced motion, touch targets, contrast):
  no isolated browser available to this subagent. Node/DOM checks do
  not stand in for browser evidence.
- Network / Storage gates (zero work requests, storage, URL, console,
  offline calculation, service worker): NOT_RUN for the same reason.
- Formal HTTPS / SEO gates (production canonical, hreflang, sitemap,
  robots.txt, headers on the approved origin): NOT_RUN — no
  production origin is approved for this tool.

## Next owner

Independent (non-author) reviewer: verify this same PR head against
the SPEC's nine aspects, run the browser / Network / Storage gates,
and fill in the NOT_RUN items above. Do not merge or publish.
