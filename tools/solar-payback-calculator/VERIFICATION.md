# Solar Payback Calculator （太陽能回本試算）— VERIFICATION

- Candidate: branch `muse/solar-payback-calculator-production-20261121`,
  draft PR (number recorded below after creation),
  base `codex/initial-publication`. PR head SHA is read back with
  `gh pr view` after the final push and recorded in the parent report;
  this file's commit is part of that head.
- Spec: `spec-solar-payback-calculator-20261121`, spec PR #403, head
  `31b1fbf5174698ef9176a1687e1eb68ad5e8ae70`.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/solar-payback-calculator/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)

## Results

- Tests: `node --test` — 54 pass, 0 fail (12 core fixtures verbatim
  deep-equal; 3 controller fixture flows; tariff band boundaries,
  roof boundaries, payback exactly-20.0 boundary, exact-decimal .5
  rounding (50 kWh × 1.15 = 57.5 → 58), negative .5 net rounding,
  range endpoints, grammar, decimal places, INPUT_LIMIT, field order,
  schema, rounded-output consistency, ping conversion, timezone
  invariance; report byte-exact cases; site contract).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `557cc003072f16682f95cb44a18c89e9fdef83838988907ef293d9c88da28781`.
- Build 2 hash: identical
  `557cc003072f16682f95cb44a18c89e9fdef83838988907ef293d9c88da28781`
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
- Serve smoke test (`node scripts/serve.mjs`, GET/HEAD, MIME, 404,
  traversal rejection): run 2026-11-23 against `dist-preview/` on
  127.0.0.1:4173 — GET `/` and `/en/` 200, HEAD 200 with the SPEC
  CSP, 404 for missing pages and traversal attempts, POST 405.
- Formal HTTPS / SEO gates (production canonical, hreflang, sitemap,
  robots.txt, headers on the approved origin): NOT_RUN — no
  production origin is approved for this tool.

## Next owner

Independent (non-author) reviewer: verify this same PR head against
the SPEC's nine aspects, run the browser / Network / Storage gates,
and fill in the NOT_RUN items above. Do not merge or publish.
