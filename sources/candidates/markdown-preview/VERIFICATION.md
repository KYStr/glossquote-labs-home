# Verification — Markdown Preview and HTML Export

Build-first candidate (owner directive 2026-11-02: build everything
first, review in bulk afterwards). Registry production registration and
submission are held for the bulk-review phase; see
`PRODUCTION-STATUS.md`. Nothing here is merged, deployed, published or
catalogued.

## Fixed source

- SPEC: `docs/specs/markdown-preview/SPEC.md` in
  `KYStr/glossquote-labs-home` at commit
  `7766505e7b641f02a8f56077942a592347b433e2` (SHA-256
  `e2117d6c6300abcbb502c0e478f5a22399fd25e9bf38607753375bdf079a184f`).
- Environment: Node v24.22.1, zero npm dependencies. The renderer is
  implemented in-repo (no vendored Markdown library), as the SPEC
  mandates.

## Evidence RUN

- **Test suite: 18/18 pass** (`npm test`, node:test):
  - All seven normative SPEC fixtures reproduce exactly (ATX heading,
    intraword underscores literal, strong + strikethrough, table
    alignment, escaped script, blocked javascript: link text-only,
    task-list checkbox).
  - Block constructs: heading levels and closing sequences, fenced
    code (backtick and tilde, unclosed fence), thematic breaks,
    blockquotes (including a heading inside), ordered lists with
    `start`, nested lists, loose lists.
  - Deviations verified as behaviour: setext line stays a paragraph,
    collapsed and shortcut reference links render literally, bare URLs
    are not autolinked, undefined references render as source text.
  - Inline constructs: emphasis nesting (`a *b **c** d* e`), `***`
    ordering, code spans with multiple backtick runs, escapes, hard
    breaks (two spaces and backslash), soft breaks, inline/reference
    links (case-insensitive ids), images with plain-text alt,
    http/https/mailto autolinks, single `~` literal.
  - Entities: the named set and numeric references pass through;
    other `&name;` sequences render literally.
  - Hostile suite: script blocks, inline event attributes,
    mixed-case and tab-obfuscated `javascript:` schemes, `data:`
    links and images, `vbscript:`, and a title attribute-breakout
    attempt — every output is inert (no live tag carries a handler;
    blocked constructs render as text only).
  - Tables: short rows padded, extra cells dropped, escaped pipes.
  - Counts: code-point source characters (astral characters count
    once); CJK-aware rendered words (ideographs/kana/hangul count
    individually, plus non-CJK runs).
  - Export: document structure, first-heading title, frozen-clock
    filename `markdown-20261102-090503.html`, byte determinism across
    repeated builds of the document.
  - Stress: 10,000 unmatched `[` and 5,000 emphasis openers complete
    in well under the asserted bound (~80 ms measured locally); the
    bracket scan short-circuits after the first unterminated scan.
  - Controller (Node DOM shim, honestly a shim — not a browser):
    initial hint + disabled export, debounced render, counts, copy of
    exactly the preview string, export via a frozen clock, the
    200,001-character freeze state (banner with the live count,
    preview frozen at the last valid render, copy/export disabled,
    recovery on shortening), sample load with the inline
    confirm-before-replace click, clear, and proportional scroll sync
    on/off.
- **Project check: PASS** (`npm run check`) — required structure,
  package/wrangler identity, CSP and head parity between the language
  pages, identical element-id sets, forbidden-capability token scan,
  core purity, every normative fixture re-asserted inside the check,
  i18n key parity. Two check settings deviate from the house template
  by SPEC design and are documented in the check file header: the
  page CSP permits http/https/data images (SPEC section 2: the
  browser loads draft image URLs), and the controller's single
  innerHTML assignment is asserted as exactly one site instead of
  being forbidden (SPEC section 4 mandates assigning the core's
  escaped string; the hostile fixtures prove the property).
- **Build reproducibility**: two consecutive preview builds produce a
  byte-identical dist (combined sorted listing SHA-256
  `94355aabb39b4897912f03f53f2db4b7e2f54b405c8531fc8c8859d136c93c49`);
  production build is refused by design (no approved site URL).
- **HTTP probes** against the locally served built dist: all pages and
  assets return 200 with byte-exact bodies (probe hash equals file
  hash) and the house security headers; missing path 404; path
  traversal 404 without disclosure; POST 405; HEAD 200. Note: the
  local preview server sends the standard house header CSP
  (`img-src 'self'`), which is stricter than this tool's page-level
  CSP for draft images; that only affects the local preview, not the
  shipped markup.

## Evidence NOT_RUN (never fabricated)

- All real-browser rendering and interaction (no browser binary exists
  in this environment): typing/scroll-sync/export-opened-standalone in
  a live browser, exported file opened from file:// across browsers,
  native viewports, keyboard-only completion in a real browser,
  assistive technology, and the SPEC's 300 ms render bound measured on
  a mid-range laptop (the core stress fixtures run locally in ~80 ms
  under Node, which is not the browser measurement). Controller
  behaviour above was exercised only under the Node DOM shim.

## Interpretation notes for the bulk review

- **Tab handling**: the SPEC expands tabs "in indentation" for block
  structure. The core expands only the leading indentation run of
  each line; tabs inside content stay literal — this is what lets a
  tab-obfuscated scheme inside a link destination reach the scheme
  check and be blocked, and keeps tabs inside code blocks verbatim.
- **Bare destination scanning**: only a space or newline ends a bare
  link destination, so tab/control characters remain in the token for
  the de-obfuscating scheme check (SPEC section 4) instead of
  silently splitting the destination.
- **Reference definitions inside a paragraph**: a definition line is
  consumed without splitting the surrounding paragraph (the line
  produces no output and no break), matching the SPEC's "definitions
  produce no output"; definitions inside fenced code are not
  harvested.
- **Blockquote/list lazy continuation** follows the SPEC's rule (a
  non-prefixed plain line joins the current paragraph); block nesting
  depth is capped at 100 as a stack-safety bound, far beyond any
  realistic document.
- **Table body rows** end at a blank line or a line that starts
  another block, per the SPEC; a row line without any `|` is treated
  as a one-cell row (padded), consistent with the stated
  padding rule.
