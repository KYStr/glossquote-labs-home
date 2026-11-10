# Verification — Clothing Size Converter (build-first candidate)

> Historical author record for the original build. Results below apply to that fixed build.

Environment: Node v24.22.1, Linux, no dependencies installed
(zero-dependency tool). All commands run in
`tools/clothing-size-converter/`. Sources: fixed spec candidate
`ed41923a0c653a92b2602d0ed02deba873a42ec5` (spec
`spec-clothing-size-converter-20261109`, draft spec PR #228);
implementation base `codex/initial-publication` @
`db4b1f43f318635fcab0132832940adf97f5140a`. The spec fixtures are
vendored verbatim at `test/fixtures.json` (SHA-256
`b7a51ca26b46c9131898671efd962aacf0ef00fbf2cfef2b7b89454bc10ccb80`,
byte-identical to the spec candidate's file) because the spec PR is not
merged into the base branch.

## Pre-implementation check

Before any product code existed, all 18 literal core fixtures were
recomputed with an independent Python implementation of the SPEC's
stated rules (field-order validation with the pinned per-field
capacities, integer-millimetre half-open lookup, size-code
normalisation and per-system column search) — all 18 matched exactly,
including the boundary, below/above-range, and UNKNOWN_SIZE cases. No
fixture-vs-rule conflict was found.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 53 tests, 0 fail |
| `npm run check` | PASS — files, package contract, core fields/limits/enums/defaults/tables/example, pinned strings, pages, syntax, worker concatenation, capability scan, core purity |
| `npm run build:preview` (run twice) | PASS — byte-identical: `BUILD-MANIFEST.json` unchanged between runs (diff clean) |
| `npm run check:generated:preview` | PASS — 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes |
| Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 49401 --dir dist-preview`) | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown (53)

- `test/core.test.mjs` (34): the 18 literal core fixtures from
  fixtures.json, deep-equal against the product's `run` (measurement
  mid/boundary/decimal/below/above/chart-min, men's measurement, US/EU/
  JP/UK size lookups with letter and numeric `matchedBy`, UNKNOWN_SIZE,
  DECIMAL_FORMAT, RANGE, ENUM, SIZE_FORMAT); legal endpoints 50.0 and
  200.0 cm (field range) with just-outside RANGE cases (49.9, 200.1) and
  the grammar-beats-range distinction (99.55 is DECIMAL_FORMAT; a
  4-digit integer part is DECIMAL_FORMAT because the grammar caps it at
  3 digits, while 999 reaches RANGE); measurement grammar classes
  (leading zero, trailing dot, spaces, sign, exponent, full-width
  digits); integer presentation of whole-centimetre results; the
  half-open invariant swept over both tables (every row's low edge hits
  that row with `onBoundary`, 0.1 cm below each high edge stays in the
  row, the chart top edge is above-range, 0.1 cm below the chart is
  below-range); per-column code uniqueness in both tables; men's US 38
  and UK 38 hitting the same row; JP letter vs numeric columns matched
  separately; women's US numeric `0` as a real code; size grammar
  (leading zeros, spaces, symbols); men's all-null JP numeric column and
  women's-only LL returning UNKNOWN_SIZE for men; capacities before
  content in field order, including unused fields in both modes;
  unused-field content not validated; empty/enum ordering across fields;
  unpaired surrogates as UNICODE (a well-formed pair is not); the schema
  gate (null, array, string, missing/extra field, wrong types, and an
  accessor that is never read).
- `test/controller.test.mjs` (11): the 3 literal controller fixtures
  verbatim (state-dirty-error, state-cancel-late, state-replace-late)
  via a fake worker with controllable completion, checking states,
  drafts, errors, and `reportAvailable`; plus edit-during-busy
  termination and late-reply drop, run-while-busy replacement (the
  default empty draft then surfaces its EMPTY error on measurementCm),
  cancel no-op outside busy, worker error and createWorker throw →
  WORKER_ERROR, loadExample equals fixtures.json case 1 and runs to
  success, reset from success, and edit-from-empty / edit-from-error
  transitions.
- `test/report.test.mjs` (8): the women-measure-mid report as a
  hand-written canonical literal, byte-identical whether serialized
  from the run result or from the fixture's literal result object; a
  null JP letter serializing as JSON null; a size-mode result with
  sorted keys; a one-decimal measurement as a plain JSON number; an
  above-range result with a null row; insertion-order independence; an
  oversized result is OUTPUT_LIMIT with no text.

### Loopback probe

Served `dist-preview/` on 127.0.0.1:49401 (ephemeral, loopback only):

- `GET /` → 200, `<title>服飾尺寸換算｜Gloss Tools</title>`, pinned CSP,
  nosniff, and `X-Robots-Tag: noindex, nofollow` headers present
- `GET /en/` → 200; `GET /js/app.js`, `GET /js/worker-source.js`,
  `GET /styles/app.css` → 200
- `GET /nope.html` → 404; `GET /../../package.json` (path-as-is
  traversal) → 404; `HEAD /` → 200

### Embedded worker source (Node harness)

Imported `WORKER_SOURCE` from the built `dist-preview/js/worker-source.js`,
executed it with a fake `self`, and invoked the handler: the
women-measure-mid snapshot returned generation 7 with row 3 as the
fixture pins it, and the women-size-unknown snapshot returned the pinned
UNKNOWN_SIZE error. This exercises the exact bytes the page turns into
a module Worker; it does not replace a real browser Worker check (still
NOT_RUN below).

## Build manifest (preview)

`BUILD-MANIFEST.json` — 9 files. SHA-256 highlights:

- `index.html` — `f5fba6033105b9db3c513108186118850c866c927795350989a70c0d50370434`
- `en/index.html` — `d8b089dcd7315f3117430c1fbbc8b738f9a75d14af0becb2f3924cef0d466753`
- `js/core/clothing.mjs` — `5266920078c881bf7926625cd2b1eb138178b39e6829b70ec58dff00faaa91c5`
- `js/worker-source.js` — `67073c660c829d6f8c8e639b2a89200ad369d6678ca9955df6cccaea09294644`
- `styles/app.css` — `f12ff3c4df2b6345005440121b139940f97c48227903953f804692e54146b436`

## Spec-errata candidates

None. Every literal fixture reproduces from the SPEC's stated rules,
and every pinned value had a single reading (see HANDOFF.md §3).

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both
  languages, including the live module Worker created from a Blob URL,
  keyboard-only flow, focus movement on error, 320 px reflow, real 200%
  zoom, reduced motion, and touch targets — no isolated browser
  mechanism was used.
- Measured contrast ratios and assistive-technology checks.
- Network/Storage observation in a real browser profile (zero-request,
  storage, cookie, service-worker checks).
- Real-device checks.
- Production build (`--mode production` is refused: no approved
  origin), deployment, catalog integration, and the independent
  nine-aspect review (pending by design in build-first mode; all nine
  aspects remain null / NOT_RUN).

## Next owner

Independent reviewer, after the parent verifies the PR head.
