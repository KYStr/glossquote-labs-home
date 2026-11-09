# Verification — Card Sleeve Stock Fit

Candidate base: `codex/initial-publication` @
`c0a7fa3601da3de3d726f1c74d139395e40223f3`, branch
`muse/card-sleeve-fit-production-20261109`. Environment: Node v24.22.1,
offline, Linux. All commands run from `tools/card-sleeve-fit/`.

## Test results

- `npm test` — **53 pass / 0 fail** (node:test):
  - `test/fixtures.test.mjs` — all 8 literal SPEC cases verbatim
    (`reassign`, `short-stock`, `exact-fit`, `empty-stock`, `gap-order`,
    `duplicate-sleeve`, `dirty-after-edit`, `cancel-then-late`).
  - `test/validation.test.mjs` — SIZE (fires before field errors),
    SHAPE (unknown/missing keys at root and row), TYPE (non-objects,
    string numbers, floats, `-0`, unsafe integers), RANGE (every integer
    bound ±1, array lengths 0/9), name rules (NFC + U+0020 trim
    duplicates, case-sensitive names, 24/25 code points incl. 24 astral
    letters, first-char and rest-character rules), field-order precedence,
    DUPLICATE-before-ORDER, `parseTenths` / `parseIntField` /
    `formatTenths`.
  - `test/algorithm.test.mjs` — 3-card reassign chain (hand-derived),
    gap boundaries ±1 tenth, no-compatibility case, conservation +
    compatibility on a mixed case, max case (8×500 cards, 8×1000
    sleeves → covered 4000; nodes 18, arcs 160, augmentations ≤ 4000),
    determinism + no input mutation (incl. deep-frozen input), batched
    solver yield protocol (progress only at multiples of 4096; yield
    count = floor(steps/4096)).
  - `test/flow.test.mjs` — state machine: empty/dirty/busy/ready/error,
    busy re-submit ignored, wrong-runId settle ignored, cancel keeps the
    draft, blank submit (null draft → `TYPE` at root), invalid draft →
    core error, `fail()` for form-level errors (ignored while busy),
    precomputed-reply settle, stale error reply cannot overwrite ready,
    reset, load-example edit.
  - `test/worker.test.mjs` — worker protocol in Node with stubbed
    `globalThis` messaging: run → result with runId + solve reply,
    invalid input → error reply, cancel for a finished/unknown runId
    posts nothing, second run supersedes the first (each result keeps
    its runId), unknown messages ignored.
  - `test/scaffold.test.mjs` — package contract, HANDOFF/VERIFICATION
    records, preview robots.txt, SPEC-pinned titles/descriptions, app
    wiring (Worker, flow, pageshow, no innerHTML).
- `npm run check` — **pass** (package contract, bilingual page
  structure, core purity + forbidden-capability scan, worker contract,
  CSS remote-reference scan, all 8 fixture ids present, required files).
- `npm run build:preview` ×2 — **byte-identical** (8 files; aggregate
  SHA-256 of the sorted per-file hashes:
  `2e574573a0a8547634e82ae526069ab6e1f7ddfc9ec89dbc86ea36e224a6a1b1`).
- `npm run check:generated:preview` — **pass** (8 files identical
  between `public/` and `dist/`).
- Loopback HTTP probe (`scripts/serve.mjs` on 127.0.0.1:8324, serving
  `dist/`): `/` 200, `/en/` 200 with the SPEC-pinned titles,
  `js/app.js`, `js/worker.mjs`, `js/core/solve.mjs`, `styles/app.css`,
  `robots.txt` all 200; path traversal 404, unknown page 404; response
  headers observed: the SPEC's exact CSP
  (`default-src 'none'; script-src 'self'; style-src 'self'; img-src
  'self'; worker-src 'self'; connect-src 'none'; base-uri 'none';
  form-action 'none'; frame-ancestors 'none'; object-src 'none'`) and
  `X-Content-Type-Options: nosniff`. Server killed after the probe.

## Bounds measured

- Max case (8 cards × 500, 8 sleeves × 1000, all compatible): covered
  4000, 576 candidate steps, 8 augmentations, 18 nodes, 160 arcs.
- Adversarial ladders probed while building (triangular stock 501,
  ladder stock 499, mixed stocks): at most 1428 steps, 15
  augmentations. No valid input found produces more than 4096 candidate
  steps, so real runs finish inside the first worker batch; the
  inter-batch cancel path is implemented per SPEC but not triggerable by
  any valid input (see HANDOFF.md interpretation 6).

## Spec errata

None — all printed fixtures reproduce exactly from the SPEC's own rules.

## Bugs found and fixed during this build

1. Name-character regex `[\p{L}\p{M}\p{N} -_]` treated ` -_` as the
   range U+0020–U+005F, wrongly admitting `/` (and other punctuation)
   in names. Fixed to `[\p{L}\p{M}\p{N} _-]` (hyphen last); caught by
   the `A/B` validation test before any commit.
2. A validation test asserted the wrong field path for an out-of-range
   `w` (expected `/cards/0/h`); fixed the test to use `h: 3001`.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 CSS px, 200% zoom, reduced motion, focus order).
- Real devices/touch; assistive tech; measured contrast.
- In-browser worker execution (actual module Worker run, cancel,
  batch scheduling).
- Network/Storage audit (no fetch/storage in source; not observed live).
- Production HTTPS checks (needs a confirmed origin; preview only).
- Independent nine-aspect review.
