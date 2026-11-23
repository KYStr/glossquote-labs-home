# Debt Payoff Planner （債務清償規劃）— VERIFICATION

- Candidate: branch `muse/debt-payoff-planner-production-20261121`,
  draft PR #TBD (https://github.com/KYStr/glossquote-labs-home/pull/TBD),
  base `codex/initial-publication`. PR head SHA is read back with
  `gh pr view` after the final push and recorded in the parent report;
  this file's commit is part of that head.
- Spec: `spec-debt-payoff-planner-20261121`, spec PR #376, head
  `c35ca05f598cb091d3aaa1bccdd534d70c649274`.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/debt-payoff-planner/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)

## Results

- Tests: `node --test` — 53 pass, 0 fail (14 core fixtures: 13
  verbatim deep-equal + `treads-water` asserted on its partial
  literal plus the two pinned properties, see SPEC §7; the
  independent re-derivation simulator; boundary/grammar/capacity/
  duplicate/schema/tie-break/600-month-cap hand-derived cases;
  report byte-exact cases; site contract; 3 controller fixture
  flows plus generation-guard units).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `4bc295b693adf603b0bc2b12b96767ea4a078bc60aad7d59d496d39e6124bc16`.
- Build 2 hash: identical
  `4bc295b693adf603b0bc2b12b96767ea4a078bc60aad7d59d496d39e6124bc16`
  (manifests diffed: identical). Two preview builds byte-identical.
- Generated-preview check:
  `node scripts/check-generated.mjs --mode preview` — passed
  (9 files, hashes exact, bilingual metadata present, worker source
  matches fixed bytes).
- Serve smoke test (`node scripts/serve.mjs` on 127.0.0.1:4173):
  GET `/` 200 text/html, GET `/en/` 200, HEAD `/` 200 with the SPEC
  CSP + nosniff + no-referrer + Permissions-Policy headers, missing
  page 404, traversal attempt 404, POST 405. Server stopped after
  the check.

## NOT_RUN (not verified by this builder)

- Real-browser gates (Chrome / Edge, both languages, keyboard,
  320 px, real 200% zoom, reduced motion, touch targets, contrast,
  Blob download bytes, Worker behaviour): no isolated browser
  available to this subagent. Node/DOM checks do not stand in for
  browser evidence.
- Network / Storage gates (zero work requests, storage, URL, console,
  offline calculation, service worker): NOT_RUN for the same reason.
- Formal HTTPS / SEO gates (production canonical, hreflang, sitemap,
  robots.txt, headers on the approved origin): NOT_RUN — no
  production origin is approved for this tool.

## Next owner

Independent (non-author) reviewer: verify this same PR head against
the SPEC's nine aspects, run the browser / Network / Storage gates,
and fill in the NOT_RUN items above. Do not merge or publish.
