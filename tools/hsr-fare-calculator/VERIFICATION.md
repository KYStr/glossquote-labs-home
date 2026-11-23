# HSR Fare Calculator （高鐵票價試算）— VERIFICATION

- Candidate: branch `muse/hsr-fare-calculator-production-20261121`,
  draft PR #430 (https://github.com/KYStr/glossquote-labs-home/pull/430),
  base `codex/initial-publication`. PR head SHA is read back with
  `gh pr view` after the final push and recorded in the parent report;
  this file's commit is part of that head.
- Spec: `spec-hsr-fare-calculator-20261121`, spec PR #389, head
  `9c9beb8e4a9a186ef4193d476bc41002fb9b81ae` (OPEN, read back with
  `gh pr view` at build time), registry rev 1792 (per the parent
  task). The vendored `test/fixtures.json` was verified byte-identical
  against that head via the GitHub API (SHA-256
  `c8890da6bd89bd1ce4f49775e0e220cbea80dc4cd3020ed3cb452a09903514a9`).
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/hsr-fare-calculator/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)
- `node scripts/serve.mjs` on 127.0.0.1:4173 — smoke test below

## Results

- Tests: `node --test` — 55 pass, 0 fail (17 core fixtures verbatim
  deep-equal; hand-derived discount cases, direction/distance,
  quantity endpoints/grammar/capacity/surrogate/empty, enum
  case-sensitivity, field and cross-field order, 66-pair table
  invariants, discounted-fare invariants, schema, timezone
  byte-identity; 3 controller fixture flows + 9 controller unit
  tests; 5 report byte-exact cases; 7 site-contract tests).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `3f2df5c4405362193a276694aed7abad842309740962c7b8ce0ecd7e06ac242a`.
- Build 2 hash: identical
  `3f2df5c4405362193a276694aed7abad842309740962c7b8ce0ecd7e06ac242a`
  (manifests diffed: identical). Two preview builds byte-identical.
- Generated-preview check:
  `node scripts/check-generated.mjs --mode preview` — passed
  (9 files, hashes exact, worker source matches fixed bytes).
- Serve smoke test (`node scripts/serve.mjs` on 127.0.0.1:4173):
  GET `/` 200 text/html, GET `/en/` 200, HEAD `/` 200 with the SPEC
  CSP + nosniff + no-referrer + Permissions-Policy + X-Robots-Tag
  noindex, missing page 404, traversal attempt 404, POST 405,
  GET `/js/worker-source.js` 200. Server stopped after the check.

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
and confirm the errata candidates in HANDOFF.md with the spec
author. Do not merge or publish from this draft PR.
