# Blood Pressure Checker （血壓分級）— VERIFICATION

- Candidate: branch `muse/blood-pressure-checker-production-20261121`
  (PR number and head SHA filled below after push + `gh pr view` readback).
- Spec: `spec-blood-pressure-checker-20261121`, spec PR #368, head
  `f8a034e4c1bd81c3c21cb7fb221c0bb6fec8f683`.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/blood-pressure-checker/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)

## Results

- Tests: `node --test` — 50 pass, 0 fail (17 core fixtures: 16
  verbatim deep-equal + `decimal-systolic` asserted separately under
  the SPEC's capacity-first order, see errata 3 in HANDOFF.md;
  3 controller fixture flows; boundary/grammar/range/cross-field/
  schema hand-derived cases; report byte-exact cases; site contract).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `b4ca8266cff0191c8b039fca22f6c5443cc009c68c77bae5b6ad8fa484319eba`.
- Build 2 hash: identical
  `b4ca8266cff0191c8b039fca22f6c5443cc009c68c77bae5b6ad8fa484319eba`
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
