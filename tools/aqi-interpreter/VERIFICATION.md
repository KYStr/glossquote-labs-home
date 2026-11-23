# AQI Interpreter （空氣品質解讀）— VERIFICATION

- Candidate: branch `muse/aqi-interpreter-production-20261121`,
  draft PR #431 (https://github.com/KYStr/glossquote-labs-home/pull/431),
  base `codex/initial-publication`. PR head SHA is read back with
  `gh pr view` after the final push and recorded in the parent report;
  this file's commit is part of that head.
- Spec: `spec-aqi-interpreter-20261121`, spec PR #391, head
  `79cb2002f7a10a1eeec1e0bde27d1a56e7d00586`, registry rev 1802.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/aqi-interpreter/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)

## Results

- Tests: `node --test` — 69 pass, 0 fail (19 core fixtures: 18
  verbatim deep-equal + `aqi-decimal` asserted separately under
  the SPEC's capacity-first order, see errata 1 in HANDOFF.md;
  3 controller fixture flows; level boundaries; breakpoint edges
  (PM2.5 12.4/12.5 TW, 9.0/9.1 US; table tops 500.4/500.5 TW,
  325.4/325.5 US; O3-8h 0.200/0.201; SO2 304/305 both systems;
  O3-1h 0.101 TW, 0.125/0.124 US; NO2 2049/2050, O3-1h 0.604/0.605);
  TW half-up vs US truncate rounding contrasts; zero concentrations;
  all-seven-pollutant case; partial skip + above-top notice order;
  monotonicity sweeps over all pollutants and both systems;
  grammar / capacity / surrogate / ENUM / range / duplicate / row
  count / schema hand-derived cases; timezone invariance; report
  byte-exact cases; site contract).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `beb2e07c0727ccf672bd44a486ad1b55d579a9b2799bed2141febc79fedd0020`.
- Build 2 hash: identical
  `beb2e07c0727ccf672bd44a486ad1b55d579a9b2799bed2141febc79fedd0020`
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
and rule on the three errata candidates in HANDOFF.md.
