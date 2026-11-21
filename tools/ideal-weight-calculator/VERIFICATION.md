# Ideal Weight Calculator — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/ideal-weight-calculator/`.

## Fixed inputs

- Spec candidate `6728a065fb23e257e518d8e3c40f003022061d62`
  (`spec-ideal-weight-calculator-20261109`, draft PR #239, registry rev 1380).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/ideal-weight-calculator/fixtures.json`:
  SHA-256 `daaef39bbe70217758eac5e35c876b997b6528b6d134a6a69a7d18d3ea889f17`
  (verified against the spec workdir copy before building; re-checked by
  `npm run check`).
- Before implementation, all seven successful core fixtures were
  reproduced with an independent exact-rational (Python `Fraction`)
  scratch calculation from the SPEC's stated rules; all matched,
  including the Hamwi pound-native conversions and the 53.465 → 53.5
  half-up boundary. The extra literals in `test/core.test.mjs` (leading
  zeros, grammar rejections, UNICODE classes, schema accessor rejection,
  the exact 5 ft base values, the exact report bytes) were derived with
  the same independent scratch calculation or written as literals from
  the SPEC text.
- Production base: `codex/initial-publication` at
  `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`.
- Production candidate: branch
  `muse/ideal-weight-calculator-production-20261109`, draft PR #346
  (https://github.com/KYStr/glossquote-labs-home/pull/346). Code commit
  `b9cab81bf2da05bded9490656045e8f121bc4266`; the PR head SHA after the
  docs-only follow-up commit is recorded in the builder's report.

## Commands and results

- `npm test` — **51/51 pass, 0 fail** (Node v24.22.1). The suite
  deep-compares all 16 literal core fixtures and all 3 controller
  fixtures against `test/fixtures.json`, plus hand-derived
  boundary/validation cases (legal endpoints 130.0/230.0, one step
  outside, INPUT_LIMIT before grammar/UNICODE, field-order precedence,
  schema accessor rejection, UNICODE surrogate/control/format classes,
  sex case/whitespace sensitivity, the exact 5 ft base values, the
  Hamwi pound-native 40.5 vs 40.8 distinction, the 53.465 half-up
  boundary), the report-serialization cases (exact canonical bytes,
  OUTPUT_LIMIT), and static page checks (both languages, pinned
  metadata, disclaimer, FAQ, formula rows and sources, element ids,
  worker-handler wiring, app.js result-row order).
- `npm run check` — passed: files, package contract, core
  limits/WHO bounds/BMI-22/formula constants/defaults/example/report
  contract, the SPEC-pinned bilingual strings in the app and pages
  (including the health disclaimer and all five FAQ pairs verbatim),
  fixtures identity and first-case reproduction, syntax of every shipped
  script, forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  and `BUILD-MANIFEST.json` compared by SHA-256: byte-identical.
- `npm run check:generated:preview` — passed: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.

## Spec errata candidates

0. No conflict between the SPEC normative text and the fixtures was
found during the build.

## NOT_RUN

- Real-browser checks: Chrome and Edge, both languages, real typing,
  error/reset/cancel/download flows, Worker execution in a browser,
  Blob download bytes, 320 px reflow, real 200% zoom, reduced motion,
  keyboard-only operation, focus handling, contrast measurement,
  Network/Storage zero-request verification. NOT_RUN — no
  isolated-browser mechanism is available to this builder
  (NOT_RUN_USER_FOCUS_INCIDENT does not apply: no browser was attempted).
- Production build / formal HTTPS / SEO checks (canonical, hreflang,
  sitemap, robots.txt/sitemap on the production origin, security
  headers on the live host). NOT_RUN — no production origin is approved
  for this tool.
- Serve smoke test (`node scripts/serve.mjs`) was not run with a live
  HTTP client; the server code follows the shared loopback-only template
  and is syntax-checked by `npm run check`. NOT_RUN as a live check.

## Known limitations

- The page's Worker is built from the preview build's embedded
  `dist-preview/js/worker-source.js`; the source tree's `public/js/`
  has no `worker-source.js` by design (it is generated). Running the
  source tree directly without building will fail the worker import;
  serve `dist-preview/` after `npm run build:preview`.
- Error-message wording is the builder's (the SPEC pins codes, not
  wording); both languages are checked for parity in `npm run check`.
