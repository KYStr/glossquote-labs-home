# Verification — Password Generator and Strength Checker

Build-first candidate (owner directive 2026-11-02: build everything
first, review in bulk afterwards). Registry production registration and
submission are held for the bulk-review phase; see
`PRODUCTION-STATUS.md`. Nothing here is merged, deployed, published or
catalogued.

## Fixed source

- SPEC: `docs/specs/password-generator/SPEC.md` in
  `KYStr/glossquote-labs-home` at commit
  `fa4e701b9adee35ca363c421e26b1b08b4947217` (SHA-256
  `5e899fd15399315778e533c6dd55cd89f18aa4ea1e750a944e5f38ea40ffa8e2`),
  BRIEF at `343806b0068fba0193d6224d50c4d701acb0a5d0`.
- Environment: Node v24.22.1, zero npm dependencies.

## Evidence RUN

- **Test suite: 21/21 pass** (`npm test`, node:test, ~1 s):
  - Core: exact character sets and pool sizes (88 full; 25/24/8/26 with
    ambiguous exclusion, pool 83); sampler rejection at the bound for
    pools 88, 26 and 7,776 (two-byte draws); distribution sanity over a
    fixed SHA-256-chained byte fixture (26,000 draws, ±20% bounds);
    exact generated password from a known byte stream ("aA0!"×5,
    129.2 bits); whole-candidate redraw proven byte-for-byte (a
    letters-only candidate is discarded, output equals the second
    candidate exactly, 16 bytes consumed); redraw exhaustion after 100
    attempts; length/set validation errors.
  - Passphrases: zero-stream fixtures for plain / capitalised /
    trailing-digit / combined / no-separator forms with entropy
    64.6 / 66.9 / 67.9 / 70.3, 3-word form 38.8; word-count bounds.
  - Strength model: **both normative fixtures reproduce exactly** —
    `password` → base 37.6, dictionary −20, **17.6 very weak**;
    `Xq7!mZ2#` → pool 88, **51.7 fair**, no penalties. Constructed
    cases pin each penalty (repeat run, sequence, keyboard walk, year,
    short length), the dictionary cap (three distinct words still −40),
    the two-distinct case (−40), symbol-outside-set counting 32, and
    the non-ASCII +20 pool with a dictionary hit after the non-ASCII
    character. Check boundary: 1,024 characters accepted, 1,025 is an
    error.
  - Wordlist: exactly 7,776 unique entries in source order
    (first `abacus`, last `zoom`); the four hyphenated EFF entries are
    present verbatim; provenance file carries the source URL and the
    source file's SHA-256.
  - Controller (Node DOM shim, honestly a shim — not a browser):
    initial expected entropies 129.2 / 64.6; generate renders the exact
    item and announces bits only (never the secret); copy writes
    exactly the item string; passphrase shape; strength breakdown
    renders 17.6 with the dictionary label and **nowhere quotes the
    checked password**; show/hide toggle; wipe clears all three modes;
    with no `crypto.getRandomValues` the warning shows and generation
    is refused with the reason.
- **Project check: PASS** (`npm run check`) — required structure,
  package/wrangler identity, CSP and head parity between the two
  language pages, identical element-id sets, forbidden-capability
  token scan over all public/scripts/test sources (storage, network,
  eval, clipboard reading, `Math.random`, history writes), core purity
  (no DOM), wordlist size/uniqueness enforced, both normative strength
  fixtures re-asserted inside the check, i18n error-key parity with the
  core's error codes.
- **Build reproducibility**: two consecutive preview builds produce a
  byte-identical dist (combined sorted listing SHA-256
  `9b28c7064603019a2b8e27ecfb47336d991d9838e08596bae24e907ac2f586e6`);
  production build is refused by design (no approved site URL).
- **HTTP probes** against the locally served built dist: all pages and
  assets return 200 with byte-exact bodies (probe hash equals file
  hash), the full house security headers (CSP with `connect-src
  'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  no-referrer`, `Cache-Control: no-store`); missing path 404; path
  traversal 404 without disclosure; POST 405; HEAD 200.

## Evidence NOT_RUN (never fabricated)

- All real-browser rendering and interaction (no browser binary exists
  in this environment): generate/copy/wipe flows in a live browser,
  native viewports, 200% zoom, real devices/touch, IME behaviour,
  BFCache, assistive technology, measured contrast, browser timing
  (the SPEC's 100 ms generation / 20 ms re-check budgets), and
  deployment or production-origin verification. Controller behaviour
  above was exercised only under the Node DOM shim.

## Interpretation notes for the bulk review

- **Dictionary scan order**: the SPEC fixes the penalty (−20 per
  distinct word, max 2) but not the scan algorithm. The core scans
  left to right taking the longest matching bundled word (≥4) at each
  position and continuing after it — the reading under which the
  normative fixture holds (`password` counts exactly one word, not
  the overlapping `pass`/`word`). Documented in the core header.
- **Sampler for pools above 256**: the SPEC's rejection formula is
  stated for one byte; for the 7,776-word pool the core draws the
  smallest sufficient byte block (two bytes, bound
  ⌊65536/7776⌋×7776 = 62,208), the same rejection rule generalised.
  For pools ≤ 256 the formula is the SPEC's exactly. Fixtures pin
  both.
- **Wordlist wording**: the SPEC calls the bundled list "7,776 unique
  lowercase a–z words"; the canonical EFF list it fixes by size
  contains four hyphenated entries (`drop-down`, `felt-tip`,
  `t-shirt`, `yo-yo`). The list is shipped verbatim (altering it
  would change the artefact's identity and the dictionary set); the
  hyphenated entries are named in `WORDLIST-SOURCE.md` and pinned by
  a test. Flagged here for the bulk review rather than silently
  resolved.
- **Check scan exemption**: `scripts/check.mjs` exempts the wordlist
  data module from the forbidden-token scan (ordinary English words
  such as `fetch`, `medieval` and `window` false-positive it) and
  instead shape-checks it as data: a single frozen array export, no
  executable constructs, size and uniqueness asserted on import.
