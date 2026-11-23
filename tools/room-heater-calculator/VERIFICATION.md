# Room Heater Calculator （暖氣功率試算）— VERIFICATION

- Candidate: branch `muse/room-heater-calculator-production-20261121`,
  draft PR TBD (to be recorded after creation; PR head SHA is read
  back with `gh pr view` after the final push and recorded in the
  parent report; this file's commit is part of that head),
  base `codex/initial-publication` (base head `8c265267` at clone time).
- Spec: `spec-room-heater-calculator-20261121`, spec PR #380, head
  `d1aa3f2a79444eac5104b66dba2b7ceec2c592df`.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/room-heater-calculator/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)

## Results

- Tests: `node --test` — 52 pass, 0 fail (14 core fixtures: 13
  verbatim deep-equal + `error-insulation-enum` asserted separately
  under the SPEC's capacity-first order, see errata 1 in HANDOFF.md;
  3 controller fixture flows; ping/m²/height boundary, multi-unit
  threshold, requiredWatts rounding, W/m², grammar, enum, empty,
  capacity, surrogate, field-order, schema hand-derived cases;
  report byte-exact cases; site contract).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `83b3a6b0ac7de55e6a9fb16522afd1c48d57697984f33196ac070e5b9584569a`.
- Build 2 hash: identical
  `83b3a6b0ac7de55e6a9fb16522afd1c48d57697984f33196ac070e5b9584569a`
  (manifests diffed: identical). Two preview builds byte-identical.
- Generated-preview check:
  `node scripts/check-generated.mjs --mode preview` — passed
  (9 files, hashes exact, bilingual metadata present, worker source
  matches fixed bytes).
- Serve smoke test (`node scripts/serve.mjs` on 127.0.0.1:4173/4174):
  GET `/` 200 text/html with h1 暖氣功率試算, GET `/en/index.html`
  200 with h1 Room Heater Calculator, HEAD `/` 200 with the SPEC
  CSP + nosniff + no-referrer + Permissions-Policy headers, missing
  page 404, traversal attempt 403, POST 405, GET `/js/app.js` 200
  text/javascript. Server stopped after the check.

## Notes

- The SPEC's Adax by Solaire W/m² source URL is cited by name only
  in the shipped pages, not as a literal URL: the static check
  forbids URL-scheme literals in shipped sources, and the full URL
  is recorded in the SPEC itself.
- The core was verified against the fixtures with an independent
  stringify-order check first: all 14 core values match; the only
  JSON-stringify difference was key order (deep equal passes).

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
