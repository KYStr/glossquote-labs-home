# Car Depreciation Calculator — verification

## Fixed source

- Spec: `spec-car-depreciation-calculator-20261109`, candidate commit
  `efad9c067e608d72b02078755e24357d5635b3b7`, draft spec PR
  https://github.com/KYStr/glossquote-labs-home/pull/250
  (BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md).
- `test/fixtures.json` is a byte-identical vendored copy of that
  candidate's fixtures.json.
  SHA-256: `524c6c91aac13f7318221b73d7cacb41d650fa5e2020fd7df9133b5fe09260df`
  (verified in `scripts/check.mjs`).
- Production base: `codex/initial-publication` at
  `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a` (fetched 2026-11-21).
- Candidate scope: only `tools/car-depreciation-calculator/`.
- Environment: Node v24.22.1, no dependencies installed (zero-dependency
  tool), `npm test` / `npm run check` / builds run in
  `tools/car-depreciation-calculator/`.

## Commands run and results (all exit 0 unless noted)

- `npm test` — exit 0. **50/50 tests pass**: 14 literal core fixtures
  (deep-equal against fixtures.json), 3 literal controller fixtures
  (fake worker), plus hand-derived boundary/validation/property tests
  (method/price/years/salvagePercent/rate/usefulLife/tableRates limits,
  schema cases, half-up .5 floor boundary, largest-price exactness,
  straight-line rounding, schedule invariants) and 5 report tests
  (canonical bytes incl. hand-written expected strings, null ratePercent,
  OUTPUT_LIMIT).
- `npm run check` — exit 0. Files, package contract (Node >=24, ESM,
  exact scripts, zero dependencies), core fields/limits/defaults/example,
  fixtures SHA-256, pinned bilingual strings, bilingual page metadata
  (lang/title/description/h1, noindex, no canonical/hreflang, relative
  language links, same-language home links, pinned disclosures + FAQ),
  script syntax, worker concatenation, forbidden-capability scan, core
  purity.
- `npm run build:preview` (twice) — exit 0 both times. **Byte-identical:
  yes.** The two `dist-preview/` trees compared with recursive diff
  (identical) and the two `BUILD-MANIFEST.json` files compared identical.
  9 files, manifest hashes exact.
- `npm run check:generated:preview` — exit 0. Generated preview verified:
  9 files, hashes exact, bilingual metadata present, worker source
  matches fixed bytes; not production.
- Loopback serve smoke test (not a browser test):
  `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`
  then curl: `/` 200 text/html, `/en/index.html` 200 text/html,
  `/js/worker-source.js` 200, `/nope.html` 404, `/../package.json`
  traversal 404.

## Errata candidates

- **0.** Every fixture expected value agrees with the SPEC's normative
  text as implemented; the AUTHOR-CHECK's independent re-derivation also
  agrees (14 core + 3 controller).

## NOT_RUN

- Real-browser checks (Chrome/Edge, both languages, keyboard, 320px,
  200% zoom, reduced motion, touch targets, Network/Storage zero-request
  verification, Blob download bytes): no isolated-browser mechanism is
  available to this builder; recorded as NOT_RUN, not passed.
- Real-device checks: NOT_RUN.
- Formal HTTPS/SEO (production canonical, hreflang, sitemap, robots.txt):
  NOT_RUN — preview only, no production origin approved.
- Independent review of the nine acceptance aspects against this
  candidate: NOT_RUN (next owner).

## Known limitations

- The preview build is preview-only; production mode is refused by
  `scripts/build.mjs` (no production origin approved).
- The SPEC's `floorReachedYear` note mentions `floorValue = price`; with
  the pinned salvage range (0–50%) that case is unreachable, so it is
  untestable by construction (see HANDOFF.md).
- The method-specific presence check (SCHEMA) runs as part of the
  method-specific field's step, after price/years/salvagePercent; no
  fixture covers a combined error, so that ordering choice is documented
  in HANDOFF.md for the reviewer.

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still to be collected.
