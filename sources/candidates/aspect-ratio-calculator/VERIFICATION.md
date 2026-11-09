# Verification — Aspect Ratio Calculator production candidate

Author-side verification record for registry task
`labs-aspect-ratio-calculator-cloud-production-20261102` (claim
`muse-aspect-prod-claim-20261102T013530Z-b2`), fixed to specification
`spec-aspect-ratio-calculator-v1`:

- SPEC: `KYStr/glossquote-labs-home` commit
  `617030612c3525b3d78db008b4d5e700331d66dc`,
  `docs/specs/aspect-ratio-calculator/SPEC.md`, 12,528 bytes,
  SHA256 `476681cf3f9ada8a6f199c5032e163ce0aae8a6d988e6b5efd5d206a93a1e07e`.
- BRIEF: same repository, commit `0dc3f431928984909a5958fd027c9690c5dae78a`,
  `docs/specs/aspect-ratio-calculator/BRIEF.md`.
- Environment: Node v24.22.1, Linux, 2026-11-02. Zero npm dependencies;
  nothing was installed.
- Preset list implemented from the SPEC section 2(c) (which contains 4:5),
  not the BRIEF's variant list (which mentioned 21:9), following the
  readiness reviewer's instruction to implement the SPEC list.

## Checks actually run (RUN)

1. `npm run check` — PASS. House structure/safety/metadata audit:
   required paths, package contract, forbidden-token scan (no DOM HTML
   sinks, no storage, no network APIs, no eval/Function) over public,
   scripts and test sources, exact preview head metadata for both pages,
   element-id parity between pages, every controller-referenced id
   present, preset data identical to SPEC section 2(c), i18n error-code
   parity, and every error code emitted by the core has a message in both
   languages.
2. `npm test` — 35 tests, 35 pass, 0 fail, ~0.9 s (SPEC budget: core
   suite under 60 s). Coverage includes: all eight SPEC section 4
   fixtures exactly (simplified ratios, decimals, percentage, fractions,
   exact/close/no-note outcomes, including 1366×768 = 683:384 with
   "differs by 0.0009" and 2560×1080 = 64:27 with no note); section 7
   gcd sweep (equal, dividing, large coprime, cap corner 100000×99999);
   scaling cases (0.001, 2.390 trailing zeros); solving in both
   directions; display rounding half away from zero (0.625 → 0.63);
   the section 7(e) decimal given path (12.50 → "12.50 (25/2)"); the
   section 7(f) synthetic two-presets-within-0.01 selection; boundary
   refusals (100001, 4 decimal places, 0, negatives, commas, full-width
   digits); cap-corner BigInt exactness (10000 : 0.001 at width 100000 →
   1/100); SEO/head assertions; scaffold contract; HTTP behaviour of the
   preview server; build reproducibility and production refusal.
3. Preview build — `node scripts/build.mjs` run twice in this tree; the
   8 dist files are byte-identical across both runs (SHA256 list in
   CANDIDATE-MANIFEST.json under `previewBuild`). Production build
   (`--production --site-url https://example.com/`) refuses with exit 1:
   no production site URL has been approved for this tool.
4. HTTP probes against the built `dist/` served by the project's own
   hardened server (createStaticServer): all 8 assets return 200 with
   the exact build hashes, `Content-Security-Policy: default-src 'self';
   script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self';
   connect-src 'none'; object-src 'none'; base-uri 'none'; form-action
   'none'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: no-referrer`, `Cache-Control: no-store`. Root `/`
   → 404, missing file → 404, encoded traversal `/..%2fpackage.json` →
   403, POST → 405, HEAD → 200 with empty body.
5. Controller wiring harness — the real `public/js/app.mjs` executed in
   Node against a minimal DOM shim whose elements are derived from the
   real `public/index.html` (ids, values, checked/hidden/disabled
   attributes, preset data attributes). 30/30 assertions pass: JS
   activation enables the fieldset and hides the unsupported note; the
   SPEC section 3 initial state renders (16:9, 1.7778, 56.25%,
   "exactly" note in zh-Hant); typing 1366×768 renders 683:384 with the
   close note; an over-cap value shows the field error, freezes the last
   valid output and shows the out-of-date marker, then recovers; preset
   clicks fill Mode B (2.39:1 → solved "418.41 (100000/239)" with the
   carry-over button disabled and its reason visible; 16:9 at width
   1280 → 720 with carry-over enabled); carry-over writes 1280×720 into
   Mode A and switches panels; solve-for-width relabels the given field
   and solves 800 for 4:3 at height 600. This harness is a Node shim,
   NOT a browser; it verifies wiring and rendered text only.
6. Source audit for privacy/security: the runtime code contains no
   network calls, no storage APIs, no clipboard, no URL/history writes
   (enforced by the check scan in item 1); inputs are rendered only via
   textContent; there are no external resources besides the two approved
   same-language home anchors and the approved unit-converter anchor.

## Explicitly NOT_RUN

- Real-browser rendering and interaction (Chrome/Edge/Firefox/Safari),
  including native layout at any viewport, 200% zoom reflow, and
  cross-browser equality of outputs: no browser binary exists in this
  environment (checked: no chromium/firefox/puppeteer/playwright).
- Real-device and mobile-viewport checks; touch interaction.
- IME composition behaviour in the text fields.
- BFCache / back-forward behaviour in a real browser (the page keeps
  state only in DOM fields, and reload resets to defaults by design).
- Screen-reader or other assistive-technology sessions; contrast ratios
  were not measured with a colour tool (the palette is inherited
  unchanged from the published GlossQuote design tokens).
- Handler-to-rAF timing in a browser (the shim harness is not a timing
  measurement). Core arithmetic timing is covered by the test-suite
  duration above.
- Production deployment, production CSP via `_headers`, canonical/SEO
  production metadata: no production origin is approved; the production
  build refuses by design.

Nothing in this file claims acceptance. Independent review of the fixed
candidate commit is a separate step by a non-author reviewer.
