# Verification — QR Code Maker production candidate v0.1

Mode: **BUILD-FIRST** (see `PRODUCTION-STATUS.md`). The registry gate
experiment was run before building: the production task
`labs-qr-code-maker-cloud-production-20261102` was registered at
registry revision 791, but the claim was refused by the coordination
core with the verbatim error `SPEC_UNAVAILABLE` — "Production needs a
ready spec or the same previously consumed spec." — because
`spec-qr-code-maker-v1` is still a draft. No spec was marked ready and
nothing was forced; the registered task remains unclaimed for the
bulk-review phase.

SPEC: `spec-qr-code-maker-v1`, KYStr/glossquote-labs-home commit
`d47991b830fa775556d29e80a1d789bc77d7c508`, `docs/specs/qr-code-maker/SPEC.md`
(SHA-256 cf1100ab355fe49e0f8470aa0738548cc5f0aaffcdd2cfa3581aad2cec5f5ba6).

## Encoder correctness (authoring-time cross-validation)

The QR encoder was written in-repo from ISO/IEC 18004 and validated
against two independent implementations used at authoring time only
(neither is a runtime or test dependency at verification time):

- **Block-table derivation (segno 1.6.6):** for every (version 1–40 ×
  level L/M/Q/H), the data-codeword count was derived from segno's
  measured byte capacities, and the ECC block structure was confirmed
  by requiring this encoder's full module matrix to equal segno's for
  the maximum-capacity payload under all eight pinned masks —
  **160/160 identical**. The resulting table is `qr-tables.mjs`; the
  project check additionally proves every entry exactly fills its
  symbol's total codewords.
- **End-to-end fixtures (Nayuki qrcodegen):** 56 assorted payloads
  (HELLO at all levels, CJK, emoji, the normative Wi-Fi string, random
  and repeated-character payloads, exact-capacity payloads up to 2,953
  bytes at L) — version, auto-selected mask, and full matrix
  **56/56 identical** to this encoder. The HELLO matrices frozen in
  `test/fixtures/hello-matrices.json` come from this library, and the
  per-version byte capacities in `test/fixtures/capacities.json` from
  segno's measurements.
- **Known deviation, decided for ISO:** segno's padding routine adds a
  full zero codeword when the terminated bitstream already ends on a
  codeword boundary (its `8 - (length % 8)` lacks the outer modulo).
  SPEC section 4 states terminator, byte alignment and pad bytes
  "follow ISO/IEC 18004", and ISO adds zero padding bits in that case,
  so this encoder (like qrcodegen) follows ISO; fixtures were therefore
  frozen from qrcodegen rather than segno.

## Checks run

- `npm run check` — PASS (structure, house CSP/robots/hreflang heads,
  element-id parity, forbidden-token source audit, ECC table integrity
  and SPEC capacity endpoints, i18n parity between languages).
- `npm test` — **35/35 pass** in ≈2.6 s (Node v24.22.1): frozen HELLO
  matrices at L/M/Q/H module-by-module; SPEC capacity fixtures (2,954
  bytes at L → `CAPACITY_EXCEEDED`, limit 2,953; 2,953 bytes → v40);
  all 160 byte capacities against the independently measured table;
  Wi-Fi grammar (normative string, field order, omission, escaping,
  validation errors); UTF-8 counting; SVG determinism and structure;
  PNG CRC/Adler check values, chunk layout, zlib round trip and
  determinism; controller behaviour through a DOM shim (placeholder,
  live render, error state replacing the symbol, EC switching, Wi-Fi
  flow, clipboard copy, PNG/SVG downloads with frozen clock, contrast
  warning, margin/size clamps, clear).
- Build reproducibility: `npm run build` run twice — dist trees
  byte-identical (combined SHA-256 of the sorted file-hash listing
  `ae33d5aaad49c7cafd90153240d850230ee18aefd711bafecb231d50eaa70e23`).
- Local HTTP probes against the house preview server (serves
  `public/`, byte-identical to dist): `/index.html` 200 with the exact
  source hash; `/en/index.html` 200 with the exact source hash;
  `/` 404 (by server design; the banner names `/index.html`);
  missing file 404; path traversal 403; POST 405; HEAD 200; headers
  carry the house CSP (`connect-src 'none'`, `frame-ancestors 'none'`),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Cache-Control: no-store`.
- Source audit: the project check's forbidden-token scan covers
  `public/`, `scripts/`, `test/` — no storage, no network, no
  markup-insertion APIs. The single permitted exception is
  `navigator.clipboard.writeText`, mandated by SPEC section 3(g) and
  only invoked from the copy button's click handler; clipboard reading
  is forbidden by the check.

## NOT_RUN (honest gaps)

- Real-browser evidence does not exist in this environment (no browser
  binary): no rendered screenshots, no independent-decoder scan of a
  downloaded PNG/SVG in a browser, no keyboard-only walkthrough, no
  viewport/IME/BFCache checks. The controller tests above run against
  a DOM shim and are labelled as such; canvas painting there is
  stubbed, not rasterised.
- The SPEC section 7 GUI/evidence items (decode round trip with an
  independent reader in a browser, contrast-warning screenshots at
  2.9:1 vs 3.1:1, stale-symbol screenshot) remain for the bulk-review
  phase; the underlying behaviours are covered at core/shim level.
