# HTTP Status Lookup — Verification

## Fixed source

- Spec: `spec-http-status-lookup-20261121`, draft spec PR #400
  (head `32869608c658f3785a1fea6134fe5d03a688b37a`), registry rev 1847.
- Base branch: `codex/initial-publication` (base HEAD at build time
  `8c265267` — "coordination: submit
  labs-image-file-size-calculator-spec-20261121").
- Production branch: `muse/http-status-lookup-production-20261121`.
- Fixtures SHA-256:
  `efe43e2f90d2d039995247b0544d63c08991ea5cd29d35042a3c4ab475a1c55f`
  (17 core + 3 controller cases, vendored verbatim).

## Results

- `node --test`: **57 passed / 57 total, 0 fail** (Node v24.22.1).
  Covers all 17 literal core fixtures (full deep equal), all 3
  controller fixtures, an independent hand transcription of all 64
  [code, reason, reference] pairs, unassigned sampling in every
  class, boundary/grammar/capacity/surrogate/schema cases, the
  404 + 418 report literals (byte-for-byte vs. an independent Python
  canonicalizer), and both pages (metadata, FAQ, 64-row table
  matched to the core table row for row).
- `node scripts/check.mjs`: **passed** (files, package contract,
  fixtures hash, core fields/defaults/capacity/example, categories,
  unassigned strings/ranges, 64-row table spot checks, pages,
  syntax, worker concatenation, capability scan, core purity).
- `node scripts/build.mjs --mode preview` run 1: 9 files written to
  `dist-preview/`; BUILD-MANIFEST.json SHA-256
  `9a845e28294304fa17336298836e199b72afe7df8514f9e7cb31e9e7bc13d86e`.
- `node scripts/build.mjs --mode preview` run 2: same 9 files;
  BUILD-MANIFEST.json SHA-256 identical
  (`9a845e28294304fa17336298836e199b72afe7df8514f9e7cb31e9e7bc13d86e`),
  `diff` of the two manifests empty — **byte-identical**.
- `node scripts/check-generated.mjs --mode preview`: **passed**
  (9 files, hashes exact, bilingual metadata, worker source matches
  fixed bytes; not production).
- Serve smoke test (`node scripts/serve.mjs --host 127.0.0.1 --port
  4173 --dir dist-preview`): `/` 200 text/html, `/en/index.html`
  200, HEAD 200 with CSP `default-src 'none'; script-src 'self';
  style-src 'self'; worker-src blob:; ...`, `/nope.html` 404,
  `/../../etc/passwd` 404, `/js/worker-source.js` 200, served root
  page contains 64 `data-code=` rows. Server stopped afterwards.
- Draft PR: (filled in after push — see below).
- PR head SHA (read back with `gh pr view`): (filled in after push).

## Environment

- Node v24.22.1 (`node --version`).
- Commands run from `tools/http-status-lookup/` in the
  `muse/http-status-lookup-production-20261121` clone.

## NOT_RUN

- Real-browser checks (Chrome/Edge, both languages, keyboard,
  320 px, 200% zoom, reduced motion, touch targets, contrast).
- Network/Storage zero-request observation in a clean isolated
  profile.
- Native file-picker / OS download dialog.
- Production HTTPS/SEO (canonical, hreflang, sitemap, robots.txt);
  preview build only, no production origin approved.

## Next owner

Independent reviewer (not the builder): verify this candidate
commit/PR head against the SPEC's nine acceptance facets.
