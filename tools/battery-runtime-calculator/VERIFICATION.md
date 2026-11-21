# Battery Runtime Calculator — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/battery-runtime-calculator/`.

## Fixed inputs

- Spec candidate `13ccc1ccb1d24ca1ec70b1912ad25c65521aa2e9`
  (`spec-battery-runtime-calculator-20261109`, draft PR #253).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/battery-runtime-calculator/fixtures.json`:
  SHA-256 `1f5ffad64a8f75839f67402b7d4b93059b2d44407b1273b6d81ab910ff7255fc`
  (verified against the spec candidate commit before building).

- Production base: `codex/initial-publication` at
  `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a` (FETCH_HEAD when the
  production branch was created, 2026-11-21).

## Commands and results

- `npm test` — **64/64 pass, 0 fail** (Node v24.22.1): the 28 literal
  core fixtures and 3 controller fixtures deep-compared against
  `test/fixtures.json`, plus hand-derived boundary/validation/property
  cases (schema accessor rejection and bad shapes, ENUM before
  field-set before type, INPUT_LIMIT before grammar, decimal/integer
  grammar including `.5`, `5.`, `1e3`, `+5`, ` 5`, leading zeros
  `007` / `00.50`, raw limits exactly at the legal maximums, zero
  capacity/voltage RANGE, seriesCount `0` RANGE, lone surrogates,
  fixed validation order in every mode, an exact half-up tie at
  12.345 Wh, solve capacity ceiled from the unrounded exact energy,
  per-fixture invariants (minutes part 0–59, split from a single
  total), the pack energy invariant, and the solve never-short /
  never-overshoot-by-a-full-mAh property) and the report-serialization
  cases. Every hand-derived expected value was also recomputed
  independently with Python `fractions.Fraction` before the tests
  were run; all agreed, and the 18 successful fixtures were
  independently recomputed the same way (0 mismatches).
- `npm run check` — **passed**: files, package contract, core
  fields/limits/defaults/example, the pinned bilingual strings in the
  app and pages, the pinned disclaimer, DoD note, solve note and FAQ
  in both languages, syntax of every shipped script, worker
  concatenation parses, forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared by SHA-256:
  **byte-identical**.
- `npm run check:generated:preview` — **passed**: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49321 --dir dist-preview`: `GET /` → 200 with title
  「電池續航計算｜Gloss Tools」; `GET /en/` → 200 with title
  "Battery Runtime Calculator | Gloss Tools"; HTML responses carry the pinned
  CSP (`worker-src 'blob:'`, `connect-src 'none'`, …), `X-Robots-Tag:
  noindex, nofollow`, and `X-Content-Type-Options: nosniff`; a missing
  path returns 404 and a `../package.json` traversal attempt returns
  404; `GET /js/worker-source.js` → 200.

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): example load, typed
  input, mode switching, error focus, edit-after-success revocation,
  cancel, reset, Blob download byte comparison, 1280×800 and 320 CSS px
  layouts, real 200% zoom, reduced motion, keyboard order, contrast
  measurement.
- Real-device checks (physical phone/tablet).
- Network/Storage observation in a clean isolated browser profile
  (zero work requests, storage/cookie/service-worker inspection,
  offline computation after load).
- Production build and formal HTTPS/SEO gate: refused by design — no
  production origin is approved for this tool; the candidate carries
  noindex and no canonical/hreflang, per the SPEC.
- Native OS file/download dialogs (manual only).

## Spec errata candidates

None found. Every fixture expected value was reproduced from the SPEC's
stated rules (exact rational arithmetic, per-step single half-up
rounding, infinite status, solve ceiling from the unrounded value)
without exception, and the AUTHOR-CHECK correction (depth of discharge
replaces the concept note's efficiency input as the single ratio
coefficient; no current (A) load input; Peukert explicitly out of
scope) is honoured throughout the product.

## Known limitations

- `requiredCapacityMah` and `runtimeTotalMinutes` are returned as JS
  numbers. At the extreme corners of the legal ranges the exact
  integer can exceed 2^53 and the returned number is the nearest
  double, not the exact integer; all realistic inputs — including
  every fixture and every legal-maximum case in the tests — are exact.
  See HANDOFF.md.
