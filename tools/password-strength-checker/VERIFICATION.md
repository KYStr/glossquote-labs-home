# Password Strength Checker （密碼強度檢查）— VERIFICATION

- Candidate: branch `muse/password-strength-checker-production-20261121`,
  draft PR #437 (https://github.com/KYStr/glossquote-labs-home/pull/437),
  base `codex/initial-publication`. PR head SHA is read back with
  `gh pr view` after the final push and recorded in the parent report;
  this file's commit is part of that head.
- Spec: `spec-password-strength-checker-20261121`, spec PR #393, head
  `55d35a4c9194c83f8e2cf63d60d8cfec4465d28f`.
- Environment: Node v24.22.1, this VM, 2026-11-23.

## Commands run (all inside tools/password-strength-checker/)

- `node --test` — (results below)
- `node scripts/check.mjs` — (results below)
- `node scripts/build.mjs --mode preview` — run twice; hashes below
- `node scripts/check-generated.mjs --mode preview` — (results below)
- `node scripts/serve.mjs` on 127.0.0.1:4173 — smoke test below

## Results

- Tests: `node --test` — 52 pass, 0 fail (14 core fixtures verbatim
  deep-equal; band-boundary / dictionary-cap / repeat-run / year /
  repeated-pattern / crack-time-unit / class-order / space-as-other /
  128-code-point / lone-surrogate / schema / timezone hand-derived
  cases; 3 controller fixture flows; report byte-exact cases
  including the no-password-in-report check; site contract).
- Check: `node scripts/check.mjs` — passed (exit 0).
- Build 1 hash: `BUILD-MANIFEST.json` SHA-256
  `8f411ef1d71a8d76dce86def6135c714f47732da7ee2ca81d78aea7481b3b8f9`.
- Build 2 hash: identical
  `8f411ef1d71a8d76dce86def6135c714f47732da7ee2ca81d78aea7481b3b8f9`
  (manifests diffed: identical). Two preview builds byte-identical.
- Generated-preview check:
  `node scripts/check-generated.mjs --mode preview` — passed
  (9 files, hashes exact, worker source matches fixed bytes).
- Serve smoke test (`node scripts/serve.mjs` on 127.0.0.1:4173):
  GET `/` 200 text/html, GET `/en/` 200, GET `/js/app.js` 200
  text/javascript, HEAD `/` 200 with the SPEC CSP + nosniff +
  no-referrer + Permissions-Policy headers and X-Robots-Tag noindex,
  missing page 404, traversal attempt 404, POST 405. Server stopped
  after the check.

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
