# Air Purifier Calculator （空氣清淨機選型試算）— VERIFICATION

- Candidate: branch `muse/air-purifier-calculator-production-20261121`,
  draft PR #425 (https://github.com/KYStr/glossquote-labs-home/pull/425),
  base `codex/initial-publication`. PR head SHA is read back with
  `gh pr view` after the final push and recorded in the parent report;
  this file's commit is part of that head.
- Spec: `spec-air-purifier-calculator-20261121`, spec PR #383, head
  `4e73cb25b91e9f016310f1898de4b610c2c60ff7`.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/air-purifier-calculator/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)

## Results

- Tests: `node --test` — 50 pass, 0 fail (15 core fixtures verbatim
  deep-equal; 2 controller fixture flows; hand-derived boundary /
  grammar / range / ping-conversion / 2/3-rule / half-up /
  schema / timezone cases; report byte-exact cases; site contract).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `2df224f50968e1d9aeb6662c490e648232a9a844d382b8af3d40de579a7267e4`.
- Build 2 hash: identical
  `2df224f50968e1d9aeb6662c490e648232a9a844d382b8af3d40de579a7267e4`
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
