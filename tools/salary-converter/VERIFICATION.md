# Salary Converter — verification record

> Historical author record for the original build. Results below apply to that fixed build. See [repair verification](REPAIR-VERIFICATION.md) for this tool’s maintenance checks.

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/salary-converter/`.

## Fixed inputs

- Spec candidate `8b94c48c2b3673ab4525cd8c855eca5973e109d6`
  (`spec-salary-converter-20261109`, draft PR #224).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/salary-converter/fixtures.json`:
  SHA-256 `c272a04b7219d9dd1d928a6eb966f82074c52ac62ff09ef7709caeab3313c485`
  (verified against the spec workdir copy before building).

## Commands and results

- `npm test` — **42/42 pass, 0 fail** (Node v24.22.1): the 15 literal core
  fixtures and 3 controller fixtures deep-compared against
  `test/fixtures.json`, plus hand-derived boundary/validation/property
  cases (each basis cap at the limit and just above, the SPEC maximum
  output 10,799,998,920, bonus 24 / 24.0 valid and 24.1 RANGE, amount
  0.01 on the hourly basis, grammar rejections, capacity-before-grammar,
  schema accessor rejection, error precedence, annual round-trip, the
  NT$1 reconciliation invariant) and the report-serialization cases,
  including the SPEC's pinned case-1 canonical bytes.
- `npm run check` — **passed**: files, package contract, core
  fields/bases/limits/defaults/example, the SPEC-pinned bilingual strings
  in the app and both pages (error messages, convention and rounding
  disclosures, FAQ), syntax of every shipped script, worker
  concatenation parses, forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared recursively: **byte-identical**.
- `npm run check:generated:preview` — **passed**: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49231 --dir dist-preview`: `GET /` → 200 with title
  「薪資換算｜Gloss Tools」; `GET /en/` → 200 with title
  "Salary Converter | Gloss Tools"; HTML responses carry the pinned
  CSP (`worker-src 'blob:'`, `connect-src 'none'`, …), `X-Robots-Tag:
  noindex, nofollow`, and `X-Content-Type-Options: nosniff`; a missing
  path returns 404 and a `../package.json` traversal attempt returns 404;
  `GET /js/worker-source.js` → 200.

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): example load, typed
  input, basis segment switching, error focus, edit-after-success
  revocation, cancel, reset, Blob download byte comparison, 1280×800 and
  320 CSS px layouts, real 200% zoom, reduced motion, keyboard order,
  contrast measurement.
- Real-device checks (physical phone/tablet).
- Network/Storage observation in a clean isolated browser profile
  (zero work requests, storage/cookie/service-worker inspection, offline
  computation after load).
- Production build and formal HTTPS/SEO gate: refused by design — no
  production origin is approved for this tool; the candidate carries
  noindex and no canonical/hreflang, per the SPEC.
- Native OS file/download dialogs (manual only).

## Spec errata candidates

One: bonusMonths `24.55` — the SPEC tests section says DECIMAL_FORMAT,
but the normative capacity (4) plus check order (INPUT_LIMIT before
grammar) yields INPUT_LIMIT. Implemented per the normative rule; see
HANDOFF.md for the full statement.
