# Life Insurance Calculator （壽險保額試算）— VERIFICATION

- Candidate: branch `muse/life-insurance-calculator-production-20261121`,
  draft PR (number read back with `gh pr view` after the final push
  and recorded in the parent report; this file's commit is part of
  that head), base `codex/initial-publication`.
- Spec: `spec-life-insurance-calculator-20261121`, spec PR #401, head
  `5b7ffce437d5f3dc16f2d75b3a0d03e2c5d0a8d9`.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/life-insurance-calculator/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)
- `node scripts/serve.mjs` smoke test on 127.0.0.1:4173 — (results below)

## Results

- Tests: `node --test` — 53 pass, 0 fail (15 core fixtures verbatim
  deep-equal; 13 hand-derived core cases: all-max totals,
  needsTotal == totalOffsets and +1, zero years/dependents,
  benchmark-not-feeding-recommendation, offset monotonicity, range
  endpoints, grammar, empty, INPUT_LIMIT order, lone surrogates,
  field order, schema, timezone invariance; 3 controller fixture
  flows; 9 controller unit cases; 6 report byte-exact cases; 7 site
  contract cases).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `e0ee7bb6cdfb0317d527b4be8d28cff2358e066aee2c4944594554a7f2d64159`.
- Build 2 hash: identical
  `e0ee7bb6cdfb0317d527b4be8d28cff2358e066aee2c4944594554a7f2d64159`
  (manifests diffed: identical). Two preview builds byte-identical.
- Generated-preview check:
  `node scripts/check-generated.mjs --mode preview` — passed
  (9 files, hashes exact, worker source matches fixed bytes).
- Serve smoke test (`node scripts/serve.mjs` on 127.0.0.1:4173):
  GET `/` 200 text/html, GET `/en/` 200, HEAD `/` 200 with the SPEC
  CSP + nosniff + no-referrer + Permissions-Policy headers,
  X-Robots-Tag noindex, nofollow; missing page 404, traversal
  attempt 404, POST 405, GET `/js/worker-source.js` 200. Server
  stopped after the check.

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
