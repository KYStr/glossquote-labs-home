# Verification — CSS Selector Specificity Comparator (production candidate)

Fixed specification: `spec-css-specificity-20261102`, SPEC.md @
`d97c0f4e8cf13fc9a73db9350f20f746d7c3e9ec` (26,596 bytes, SHA-256
`ad346df046837b1ffe26790691e53e9e11bf22c6a673222b22bbbc075fd1c72c`) in
KYStr/glossquote-labs-home. Environment: Node v24.22.1, zero dependencies.
Candidate file hashes are in `CANDIDATE-MANIFEST.json` (same commit); the
candidate commit hash itself is recorded in the registry submission.

## Evidence RUN (author batch, this environment)

- **Unit/core tests — 34/34 pass** (`npm test`, ~1.8 s total):
  - `tests/core.test.mjs` 13/13: all S01–S18 fixtures with hard-coded
    triples; comparisons and firstDifference; exact summary strings; tree
    span literals for S01/S05/S07/S17; the full §3 error catalogue with exact
    codes and offsets (EMPTY, UNSUPPORTED_CHAR incl. scan-before-structure,
    UNSUPPORTED_NAME, UNSUPPORTED_CONTEXT, DEPTH@16, BRANCH_LIMIT@27,
    SYNTAX); length 1024 accepted / 1025 LENGTH with left-first precedence;
    one error per field across both fields; schema defenses (arrays, extra /
    missing / symbol keys, custom prototypes rejected; accessor getter never
    invoked; null-prototype record accepted); pseudo-name case folding;
    lexicographic (not componentwise) function maxima; ties never multiply;
    the two §7 stress inputs (512×`.a` → (0,512,0); 511×`* ` + `*` → 512
    compounds, (0,0,0)); direct core CR/LF retention and the closed
    whitespace set (VT/NBSP rejected as UNSUPPORTED_CHAR).
  - `tests/controller.test.mjs` 8/8: idle/dirty/result/invalid transitions,
    edit-clears-result, first-invalid-field focus target (L before R),
    identical-text distinct analyses, reset semantics, language-switch
    preservation of raw/result/errors/disclosure, pagehide clearing.
  - `tests/build.test.mjs` 3/3: two clean preview builds byte-identical with
    exactly the 10 allowlisted artifacts; preview is noindex with no
    fabricated canonical; production build without an origin, with an http
    origin, and with a path-bearing origin each exit nonzero and emit
    nothing; production build with `https://example.com` writes canonical /
    hreflang / sitemap and drops noindex.
  - `tests/serve.test.mjs` 2/2 (includes `check:generated:preview` PASS):
    the built `dist/` served on loopback returns both pages and assets with
    byte-exact bodies, the exact SPEC §5 CSP plus nosniff / no-referrer on
    every response; missing paths 404; traversal attempts never serve files
    outside `dist/`; POST 405; HEAD 200 with correct Content-Length and no
    body.
  - `tests/ui.test.mjs` 8/8 under a hand-written Node DOM shim (NOT a
    browser): initial render, compare rendering (exact summary text, prose,
    triples, contribution trees, `:where` annotation), edit-clears-result,
    error summary with focus to the first invalid field, repair/recovery,
    reset, unmodified language activation preserving raw text / result /
    disclosure state (a real app bug — pushState target taken after the
    language flip — was caught here and fixed), modified activation left to
    the browser, pagehide clearing.
- **Static check** — `npm run check`: CHECK PASS (required files, exact npm
  script interface, zero dependencies, forbidden API / selector-execution
  token scan over all runtime assets, core DOM-purity, CSP agreement between
  `src/_headers` and the preview server, zh/en text-key parity, every
  app-referenced element id present in both pages, textarea initial values
  equal to the controller constants, core smoke on the documented defaults).
- **Generated-output check** — `npm run check:generated:preview`: PASS
  (rebuild byte-identical to `dist/`, 10 files).
- **Production build refusal** — `node scripts/build.mjs --mode=production`
  without an approved origin exits nonzero and emits no `dist-production/`,
  as specified. No approved origin exists for this candidate, so no
  production artifacts were produced and none are claimed.

## Revision fix — independent review 2026-11-03 (local-codex, PRIMARY-REVIEW.md)

The review returned verdict `revision` with exactly two defects, both in
tests; the product calculator itself was not faulted. Fixed in this commit,
product behaviour unchanged, no assertion meaning changed beyond the two
prescribed fixes:

- **CSS-WIN-PATH** — `tests/build.test.mjs`: the `collect` helper used
  platform `path.relative`, producing backslash-separated index keys
  (`assets\app.mjs`, `en\index.html`) on Windows while the expected keys and
  downstream lookups use POSIX slashes. Fix: index keys are normalised to
  POSIX separators (`.split(path.sep).join('/')`). All existing byte / SEO /
  rejection-origin assertions preserved.
- **CSS-SERVE-NOT-RUN** — `tests/serve.test.mjs`: the suite used fixed port
  44217. Fix: the child server is spawned with `--port=0`; the test reads the
  actual address from the child's announced `serve: http://127.0.0.1:<port>/`
  line, confirms readiness with a `GET /` probe at that address, and closes
  only the child process it started (`server.kill()` in `after`); nothing is
  ever killed by port.

Re-run in this Linux environment (Node v24.22.1), all exit 0:
`npm test` **34/34 pass** (incl. the 2 serve tests, previously NOT_RUN in the
review), `npm run check` PASS, `npm run build:preview` twice byte-identical
(`diff -r` clean, 10 files), `npm run check:generated:preview` PASS.
Windows re-run is NOT_RUN here: this environment has no Windows host, and
the separator failure mode is removed by construction (keys are normalised
before any comparison). Windows confirmation belongs to the reviewer.

## Evidence NOT_RUN (explicit; nothing below is claimed)

- All real-browser rendering and interaction (no browser binary exists in
  this environment — checked): native Chrome/Edge/Firefox/Safari behaviour,
  exact viewports (320/768/1440 CSS px), 200% zoom and reflow, real
  keyboard-only flows in a browser, visible focus, screen readers and other
  assistive technology, measured colour contrast, IME, BFCache /
  history navigation in a real browser, and the §7 handler-to-next-frame
  timing protocol (5 warmups + 20 samples ≤ 100 ms) — the timing rows are
  therefore unverified, not passed.
- Real clipboard behaviour is not applicable (the tool has no clipboard
  API by design) and was not exercised.
- Privacy in a real browser (Network/Storage panels) — source audit and
  loopback server probes ran, but no browser network observation exists.
- Deployment, production-origin validation, merge, and catalog publication:
  not performed and not authorized by this submission.

Acceptance requires an independent non-author review of this fixed
candidate; the author does not mark this task accepted.
