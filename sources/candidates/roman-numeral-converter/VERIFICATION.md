# Verification — Roman Numeral Converter production candidate

Author-side verification record for registry task
`labs-roman-numeral-converter-cloud-production-20261102` (claim
`muse-roman-prod-claim-20261102T014230Z-f6`), fixed to specification
`spec-roman-numeral-converter-v1`:

- SPEC: `KYStr/glossquote-labs-home` commit
  `c05654dccf95b9f130ad82b9e4e92ec75c82201c`,
  `docs/specs/roman-numeral-converter/SPEC.md`, 13,384 bytes,
  SHA256 `ec151e610c35145cea6103eeab403cb2102f3f3adb9aa17da88f2421a8d58e66`.
- BRIEF: same repository, commit `b0df31918a45adf4c34434e6a84762ce4554a413`,
  `docs/specs/roman-numeral-converter/BRIEF.md`.
- Environment: Node v24.22.1, Linux, 2026-11-02. Zero npm dependencies;
  nothing was installed.
- Maker's recorded input choices (inside the SPEC's limits): the integer
  field is not trimmed and its length check runs before the digit check;
  the Roman field is trimmed of ASCII whitespace and uppercased with an
  ASCII-only mapping so positions never shift under Unicode casing;
  Roman error precedence is empty (neutral), over-length, first invalid
  character with position, loose-value range, then non-canonical. Copy
  buttons copy exactly the field's displayed value, and are enabled only
  in a fully valid, current state.

## Checks actually run (RUN)

1. `npm run check` — PASS. House structure/safety/metadata audit:
   required paths, package contract, forbidden-token scan (no DOM HTML
   sinks, no storage, no network APIs in the product code, no
   eval/Function; the SPEC-required clipboard API is the one deliberate
   exception and is not scanned as a violation), exact preview head
   metadata for both pages, element-id parity, every
   controller-referenced id present, greedy table data identical to
   SPEC section 4, i18n error-code parity, and every error code emitted
   by the core has a message in both languages.
2. `npm test` — 24 tests, 24 pass, 0 fail, ~1.0 s (SPEC budget: full
   core suite including the exhaustive loop under 60 s). Coverage
   includes: all 21 conversion fixtures listed in SPEC section 4 in
   both directions (the SPEC narrative says "twenty"; its list contains
   21 and all 21 are tested); all sixteen invalid fixtures rejected
   with the exact loose value and canonical form (MMMM separately as
   out-of-range with loose 4000); the exhaustive property for every
   integer 1–3999 (generate → loose-parse returns the integer, the
   section 4 validity predicate holds, length ≤ 15, breakdown trace
   sums to the integer and joins to the generated string);
   normalisation (`mcmxciv` and padded input yield 1994; interior space
   is the position-named error); integer grammar (`007` → 7 with the
   leading-zero flag, `0` → no-zero error, `4000` → ceiling error,
   `12a` → non-digit error naming `a` at position 3, 5 digits → length
   error); breakdowns (1994 = M+CM+XC+IV; 3888 has the maximal 15-group
   trace); the greedy table itself; SEO/head assertions including the
   complete thirteen-entry reference table and the clock-face IIII note
   on both pages; scaffold contract; HTTP behaviour of the preview
   server; build reproducibility and production refusal.
3. Preview build — `node scripts/build.mjs` run twice in this tree; the
   8 dist files are byte-identical across both runs (SHA256 list in
   CANDIDATE-MANIFEST.json under `previewBuild`). Production build
   (`--production --site-url https://example.com/`) refuses with exit 1:
   no production site URL has been approved for this tool.
4. HTTP probes against the built `dist/` served by the project's own
   hardened server: all 8 assets return 200 with the exact build
   hashes and the full house security headers (CSP with
   `connect-src 'none'`, nosniff, no-referrer, no-store). Root `/` →
   404, missing file → 404, encoded traversal → 403, POST → 405,
   HEAD → 200 with empty body.
5. Controller wiring harness — the real `public/js/app.mjs` executed in
   Node against a minimal DOM shim whose elements are derived from the
   real `public/index.html`. 32/32 assertions pass: activation and the
   SPEC section 3 initial state (1994 = MCMXCIV, breakdown
   M/CM/XC/IV, total 1994, copy enabled); integer edits recompute the
   Roman field and breakdown (2026 → MMXXVI); `007` → VII with the
   leading-zero note shown verbatim; `0` produces the no-zero error,
   freezes the Roman field at VII, shows the out-of-date marker and
   disables copy; lowercase `ic` produces the teaching error naming
   loose value 99 and canonical XCIX with the integer field frozen;
   `mcmxciv` normalises to 1994 and clears the error state; `MMMM`
   names loose value 4000 as out of range with the valid state frozen;
   emptying the Roman field is neutral (integer and breakdown clear,
   no error, no stale marker, copy disabled); a `<` character is named
   in the error as inert text with the valid state frozen; a copy click
   without a clipboard API announces the manual-copy fallback as text.
   This harness is a Node shim, NOT a browser; it verifies wiring and
   rendered text only. Clipboard contents in a real browser were
   therefore not verified.
6. Source audit for privacy/security: no network calls, no storage
   APIs, no URL/history writes in the product code (enforced by the
   check scan in item 1); typed characters reach the page only via
   textContent, including inside error messages; no external resources
   besides the approved same-language home anchors and the approved
   unit-converter anchor.

## Explicitly NOT_RUN

- Real-browser rendering and interaction (Chrome/Edge/Firefox/Safari),
  including the SPEC section 7 GUI tests (fixtures typed through the
  real UI in both languages, stale behaviour observed in a browser,
  copy buttons verified against real clipboard contents): no browser
  binary exists in this environment (checked: no
  chromium/firefox/puppeteer/playwright).
- Native viewports, 200% zoom reflow, real devices and touch.
- IME composition behaviour in the fields.
- BFCache / back-forward behaviour in a real browser (state lives only
  in the DOM fields; reload restores the SPEC defaults by design).
- Screen-reader or other assistive-technology sessions; contrast ratios
  were not measured with a colour tool (the palette is inherited
  unchanged from the published GlossQuote design tokens).
- Browser handler timing (the shim harness is not a timing
  measurement). Core timing is covered by the test-suite duration
  above, including the exhaustive 3,999-value loop.
- Production deployment, production CSP via `_headers`, and production
  SEO metadata: no production origin is approved; the production build
  refuses by design.

Nothing in this file claims acceptance. Independent review of the fixed
candidate commit is a separate step by a non-author reviewer.
