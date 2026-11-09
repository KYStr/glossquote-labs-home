# Binary Record Inspector — verification

Environment: Node v24.22.1, `KYStr/glossquote-labs-home`, branch
`muse/binary-record-inspector-production-20261109`, base
`codex/initial-publication` at `e078d80932b593f33d90e044d87249ad11e95836`.

## Commands and results (all exit 0)

- `npm test` — **38 pass / 0 fail** (core fixtures 7, hand-derived core
  boundaries/schema/serialization, controller fixtures 3, worker integration 1).
- `npm run check` — exit 0 (package contract, both HTML pages, forbidden
  capabilities, core purity, i18n metadata).
- `npm run build:preview` run twice — **byte-identical**. Aggregate SHA-256
  over the sorted per-file hashes of `dist-preview/`:
  `7bf99e6e0a54a45f5e15a2fad33e79e6464e4791e811791fddba97bea7321a81` on both runs.
- `npm run check:generated:preview` — exit 0 (file set matches, embedded
  Worker source is exactly core + worker-entry, generated HTML/CSS/JS
  byte-identical to `public/`).
- Loopback HTTP probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173
  --dir dist-preview`):
  - `/` 200 `text/html`, title `二進位記錄欄位檢視｜Gloss Tools`
  - `/en/index.html` 200 `text/html`, title `Binary Record Inspector | Gloss Tools`
  - `/js/app.js`, `/js/worker-source.js`, `/styles/app.css` all 200
  - missing page 404; path-traversal attempt 404
  - response headers include the SPEC CSP and `X-Robots-Tag: noindex, nofollow`

## Spec conformance checked

- All 7 literal core fixtures reproduce exactly by deep comparison against
  `docs/specs/binary-record-inspector/fixtures.json` (endian-and-sign,
  u64-precision, last-byte, i32-minimum, split-nibble, offset-oob, bad-type).
- All 3 controller fixtures reproduce exactly with a controllable fake Worker
  (state-dirty-error, state-cancel-late, state-replace-late).
- The embedded Worker bytes were executed end to end in a worker thread
  (test/worker.test.mjs) and returned the fixture results with the generation
  attached.
- Boundaries verified by hand-derived tests: 4,096 / 4,097 bytes, 64 / 65
  layout rows, 16,384 / 16,385 hex units, 4,096 / 4,097 layout units, offset
  exactly at the end, i64 minimum, u64 above the safe integer.
- Report serialization verified byte-for-byte against a hand-written canonical
  string (key order, trailing LF) and the 2 MB OUTPUT_LIMIT branch.

## Spec errata

**None.** Every printed fixture agrees with the SPEC's own rules on
independent re-derivation. Interpretation choices the SPEC leaves open are
recorded in HANDOFF.md (row-by-row validation order, whitespace-only inputs,
ROW_LIMIT row null, empty-draft state, file-field behavior, preview
canonical/hreflang omission per the SPEC's own preview rule).

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, two languages, keyboard,
  320 px, 200% zoom, reduced motion, touch targets).
- Real devices/touch, assistive technology, measured contrast of the tool UI.
- Network/Storage audit with a clean isolated profile.
- Blob download byte check in a real browser (the report bytes are verified
  in Node only).
- Deployment; formal HTTPS/SEO (production canonical, sitemap, robots.txt).
- Independent nine-aspect review (pending by design in build-first mode).
