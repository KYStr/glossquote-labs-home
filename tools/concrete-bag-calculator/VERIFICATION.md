# Verification — Concrete Bag Calculator (build-first candidate)

Environment: Node v24.22.1, Linux, no dependencies installed
(zero-dependency tool). All commands run in
`tools/concrete-bag-calculator/`. Sources: fixed spec candidate
`f02756da51344f143425657d3bcefc478e1da521` (spec task
`labs-concrete-bag-calculator-spec-20261109`, draft spec PR #152);
implementation base `codex/initial-publication` @
`15f20a7afa234e8a9dc1d607a88379f89cd5656c`. The spec fixtures are
vendored verbatim at `test/fixtures.json` (SHA-256
`6ae00aba1f36834f2f931a5dbd269a3c73c2d0afde8b418dde8a5d979aed4fa9`)
because the spec PR is not merged into the base branch.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 34 tests, 0 fail |
| `npm run check` | PASS — files, package contract, core fields/shape fields/defaults/yields/example vs vendored fixtures, bilingual metadata, the pinned FAQ and fixed strings, syntax incl. worker concatenation, forbidden-capability scan, core purity |
| `npm run build:preview` (run twice) | PASS — byte-identical: `BUILD-MANIFEST.json` and the full dist-preview SHA-256 tree unchanged between runs |
| `npm run check:generated:preview` | PASS — 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes |
| Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 43199 --dir dist-preview`) | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown (34)

- `test/core.test.mjs` (20): the 7 literal core fixtures from
  fixtures.json, deep-equal against the product's `run` (slab with
  default waste, footing ×2 at 5%, cylinder π pipeline, waste
  crossing, decimal-cm half-up display, RANGE on thickness 0 and on
  count 1000); hand-derived extras — the waste-crossing slab at
  waste 0% (bags 12/8/6 per the AUTHOR-CHECK ratios), an
  exact-yield-multiple case (adjusted volume exactly 1250 × yield40
  = 625 × yield80 by the 2^9 · 3^4 · 127^3 factorization, so those
  two counts land exactly with no ceiling bump), the legal endpoints
  together (10000 cm dimensions, count 999, waste 100%), the exact
  0.0005 m³ display tie rounding up, the bag40 ≥ bag60 ≥ bag80
  ordering property, other-shape fields ignored even when invalid
  (both directions), SCHEMA classes (null, array, missing, extra,
  wrong type, accessor), ENUM before everything, cross-field and
  per-field validation order, grammar rejects (leading zeros, signs,
  spaces, exponent, full-width digits, lone surrogate), just-outside
  range edges, and result value types (volume strings, integer
  counts/bags).
- `test/controller.test.mjs` (12): the 3 literal controller fixtures
  verbatim (state-dirty-error, state-cancel-late, state-replace-late)
  via a fake worker with controllable completion, checking the
  fixtures' `resultAvailable`, `draft`, and `error` checkpoints; plus
  edit-during-busy, editing a field the current shape does not use
  still revoking the result, run-while-busy replacement, cancel
  no-op, worker error → WORKER_ERROR, createWorker throw →
  WORKER_ERROR, loadExample (fills fixture case 1, waits for manual
  run), reset from ready restoring the SPEC defaults, and edit from
  empty/error.
- `test/site.test.mjs` (2): both pages' lang/title/description/h1,
  preview noindex, no canonical/hreflang, relative language link,
  same-language home link, draft-loss note, the fixed results note,
  pinned FAQ answers, results heading, all control/error ids, and no
  download link artifact (the SPEC gives this tool no download or
  export).

### Loopback probe

Served `dist-preview/` on 127.0.0.1:43199 (ephemeral, loopback only):

- `GET /` → 200, `<title>混凝土用量計算機｜Gloss Tools</title>`
- `GET /en/` → 200, `<title>Concrete Bag Calculator | Gloss Tools</title>`
- `GET /js/app.js`, `GET /js/worker-source.js`,
  `GET /js/core/concrete.mjs`, `GET /styles/app.css`,
  `GET /robots.txt` → 200
- `GET /../../package.json` (path-as-is traversal) → 404
- `GET /nope.html` → 404
- HTML responses carry the SPEC's CSP (`default-src 'none'; …
  worker-src 'blob:'; …`) and `X-Robots-Tag: noindex, nofollow`
  headers.

### Embedded worker source (Node harness)

Imported `WORKER_SOURCE` from the built
`dist-preview/js/worker-source.js`, wrote it to a temp module,
installed a fake `self`, and invoked the handler: the
`slab-default-waste` snapshot returned generation 7 with the exact
fixture result (1.200 / 1.320 / 1.726 m³·yd³, bags 156/104/78); the
`error-count-range` snapshot returned the pinned
`{code:"RANGE", path:"/count"}` error. This exercises the exact bytes
the page turns into a module Worker; it does not replace a real
browser Worker check (still NOT_RUN below).

## Build manifest (preview)

`BUILD-MANIFEST.json` — 9 files. SHA-256 highlights:

- `index.html` — `40b75ca3e9404cb92775e26906aa0b6de52d00629eb0bbcea8c2a6390ff1c5b3`
- `en/index.html` — `c2cb7645480b5b96200b9f5531e697f3ec0220293b5df010c83a1643072400a2`
- `js/core/concrete.mjs` — `caeb3d017694f07b54e1abb4ddb3fa5d47e46892d59e028481baa80bbb5f6943`
- `js/worker-source.js` — `d6f06a6c4f23d7a59d977db443fe57a5c2add1b15c75d83cdbe51aed822f11cd`
- `styles/app.css` — `7d68fd0fef612cfc0e5c91e1c9a6aaecf6cb609938ef69c5f44a926a61b084a4`

## Spec errata candidates

None. Every literal fixture reproduces from the SPEC's stated rules;
see HANDOFF.md for the exact-multiple construction note.

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both
  languages, including the live module Worker created from a Blob
  URL, keyboard-only flow, focus movement on error, 320 px reflow,
  real 200% zoom, reduced motion, and touch targets — no isolated
  browser mechanism was used.
- Measured contrast ratios and assistive-technology checks.
- Network/Storage observation in a real browser profile
  (zero-request, storage, cookie, service-worker checks).
- Real-device checks.
- Production build (`--mode production` is refused: no approved
  origin), deployment, catalog integration, and the independent
  nine-aspect review (pending by design in build-first mode; all
  nine aspects remain null / NOT_RUN).

## Next owner

Independent reviewer, after the parent verifies the PR head.
