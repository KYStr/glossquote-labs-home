# Freelance Rate Calculator （接案費率試算）— VERIFICATION

- Candidate: branch `muse/freelance-rate-calculator-production-20261121`,
  draft PR #414 (https://github.com/KYStr/glossquote-labs-home/pull/414),
  base `codex/initial-publication`. PR head SHA is read back with
  `gh pr view` after the final push and recorded in the parent report;
  this file's commit is part of that head.
- Spec: `spec-freelance-rate-calculator-20261121`, spec PR #374, head
  `468c6cd604644154701002a52c3d6949c3f726a0`.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/freelance-rate-calculator/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)

## Results

- Tests: `node --test` — 51 pass, 0 fail (14 core fixtures verbatim
  deep-equal; independent scaled-integer re-derivation of all 8
  success fixtures; unrounded-exact-value proof case; half-up 0.5 /
  0.49 boundaries; range endpoints and just-outside values;
  integer/decimal grammar; EMPTY / INPUT_LIMIT / UNICODE; field
  order; SCHEMA; timezone invariance; 3 controller fixture flows;
  controller unit cases; report byte-exact cases; site contract).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `eee7693392113c34fe887e9ca2eff0847cb7da3fa23989853515a3e4f4fa0e74`.
- Build 2 hash: identical
  `eee7693392113c34fe887e9ca2eff0847cb7da3fa23989853515a3e4f4fa0e74`
  (manifests diffed: identical). Two preview builds byte-identical.
- Generated-preview check:
  `node scripts/check-generated.mjs --mode preview` — passed
  (9 files, hashes exact, worker source matches fixed bytes).
- Serve smoke test (`node scripts/serve.mjs` on 127.0.0.1:4173):
  GET `/` 200 text/html, GET `/en/` 200, HEAD `/` 200 with the SPEC
  CSP + nosniff + no-referrer + Permissions-Policy headers and
  X-Robots-Tag noindex, missing page 404, traversal attempt 404,
  POST 405, `js/worker-source.js` 200. Server stopped after the
  check.

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
