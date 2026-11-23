# Deal Comparator （優惠比價）— VERIFICATION

- Candidate: branch `muse/deal-comparator-production-20261121`,
  draft PR #416 (https://github.com/KYStr/glossquote-labs-home/pull/416),
  base `codex/initial-publication`. PR head SHA is read back with
  `gh pr view` after the final push and recorded in the parent report;
  this file's commit is part of that head.
- Spec: `spec-deal-comparator-20261121`, spec PR #375, head
  `d96c5920128637f2b942b52c0fd11f771e7d25dc`.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/deal-comparator/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)

## Results

- Tests: `node --test` — 54 pass, 0 fail (13 core fixtures, all
  verbatim deep-equal; 3 controller fixture flows; boundary /
  grammar / range / cross-field / schema / capacity hand-derived
  cases; report byte-exact cases; site contract). The 13 core
  fixtures were additionally cross-checked before implementation
  with an independent Python `fractions.Fraction` script: 0
  mismatches.
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `5c8163987988e4f02eee4b18aeaa5639fe4d9859e8a2106ceacb4b22e82b4151`.
- Build 2 hash: identical
  `5c8163987988e4f02eee4b18aeaa5639fe4d9859e8a2106ceacb4b22e82b4151`
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
