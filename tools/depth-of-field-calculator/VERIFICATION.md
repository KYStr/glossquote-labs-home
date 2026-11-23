# Depth of Field Calculator （景深計算）— VERIFICATION

- Candidate: branch `muse/depth-of-field-calculator-production-20261121`,
  draft PR #433 (https://github.com/KYStr/glossquote-labs-home/pull/433),
  base `codex/initial-publication`. PR head SHA is read back with
  `gh pr view` after the final push and recorded in the parent report;
  this file's commit is part of that head.
- Spec: `spec-depth-of-field-calculator-20261121`, spec PR #394, head
  `e6c526038f637195fd3d14499e74feb3966ba53a`.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/depth-of-field-calculator/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)

## Results

- Tests: `node --test` — 51 pass, 0 fail (11 core fixtures, all
  verbatim deep-equal; 3 controller fixture flows; hyperfocal
  boundary s == H ± 1 mm, range endpoints, grammar, capacity,
  cross-field, sensor enum, CoC-table, schema, timezone-invariance
  hand-derived cases; report byte-exact cases; site contract).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `8a12230e5ed619706621f0eb6f8029d74bd5d298befee25521f2eee32b6a4342`.
- Build 2 hash: identical
  `8a12230e5ed619706621f0eb6f8029d74bd5d298befee25521f2eee32b6a4342`
  (manifests diffed: identical). Two preview builds byte-identical.
- Generated-preview check:
  `node scripts/check-generated.mjs --mode preview` — passed
  (9 files, hashes exact, worker source matches fixed bytes).
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
