# Red Envelope Guide — verification record

Environment: Node v24.22.1, Linux, zero dependencies. All commands run in
`tools/red-envelope-guide/`.

## Fixed inputs

- Spec candidate `131169738d7f451345fd13d88dc0f81866a648c4`
  (`spec-red-envelope-guide-20261109`, draft PR #160).
- Vendored `test/fixtures.json` is byte-identical to the spec candidate's
  `docs/specs/red-envelope-guide/fixtures.json`:
  SHA-256 `129d043a414813001db852377a86029a9786c253e61aefe5ac31b4ab8d503881`
  (verified against the spec workdir copy before building).

## Independent recomputation (before product code)

All nine success fixtures and every table cell were recomputed with a
scratch implementation written directly from the SPEC's stated rules
(Python, exact fractions). Result: four success fixtures and all four
error fixtures agree verbatim; **five success fixtures conflict with the
SPEC's own validity predicate** (see the errata candidate below). An
invariant sweep over all 100 reachable inputs (every table cell ×
party sizes × attending) confirmed that under the stated predicate every
result's three amounts are valid and `rangeLow ≤ recommended ≤ rangeHigh`
always holds; the same sweep is encoded as a product test.

## Commands and results

- `npm test` — **69/69 pass, 0 fail** (Node v24.22.1): the verbatim
  fixtures (4 success + 4 error core, 3 controller), the 5 errata cases
  asserted against rule-derived values, all 28 table cells hand-derived
  （婚禮 12、彌月 4、喬遷 4、長輩 3、晚輩 5), extra-attendee and
  not-attending derivations, predicate literals (including the ≥10,000
  thousands rule at 10,000 / 12,000 / 14,000 / 44,000), snap boundary
  behaviour, the full validation-order matrix (SCHEMA/TYPE/INPUT_LIMIT/
  UNICODE/ENUM/INTEGER_FORMAT/RANGE/EMPTY/NOT_APPLICABLE and their
  precedence), the 100-input invariant sweep, and report byte/SHA-256
  cases.
- `npm run check` — **passed**: files, package contract, core
  fields/limits/defaults/example, tier increments, the SPEC-pinned
  bilingual strings in the app and pages, syntax of every shipped script,
  worker concatenation parses, forbidden-capability scan, core purity.
- `npm run build:preview` run twice — the two `dist-preview/` trees
  (9 files) and `BUILD-MANIFEST.json` compared by SHA-256: **byte-identical**.
- `npm run check:generated:preview` — **passed**: manifest hashes exact,
  bilingual preview metadata present, embedded worker source equals the
  fixed core + handler bytes, robots.txt denies all.
- Loopback HTTP probe — `node scripts/serve.mjs --host 127.0.0.1
  --port 49399 --dir dist-preview`: `GET /` → 200 with title
  「紅包金額指南｜Gloss Tools」; `GET /en/` → 200 with title
  "Red Envelope Guide | Gloss Tools"; HTML responses carry the pinned
  CSP (`worker-src 'blob:'`, `connect-src 'none'`, …), `X-Robots-Tag:
  noindex, nofollow`, and `X-Content-Type-Options: nosniff`; a missing
  path returns 404 and a `../package.json` traversal attempt returns 404;
  `GET /js/worker-source.js` → 200.
- The built embedded worker source (`dist-preview/js/worker-source.js`)
  was executed in Node with a fake `self`: the wedding-basic snapshot
  returned the exact fixture result, and the funeral snapshot returned
  the pinned ENUM error. This exercises the exact shipped bytes; it does
  not replace a real-browser Worker check (NOT_RUN below).

## Spec errata candidates

**Errata 1 (substantive): the validity predicate vs five fixtures.**
SPEC §inputsOutputs rule 2 defines a valid amount's decimal string as
containing no digit `4`, which makes every 4xxx amount invalid. Five
fixture expectations treat NT$4,200 / NT$4,600 as valid, while the same
fixtures treat NT$4,000 / NT$4,800 as invalid:

| Case | Fixture value(s) | Rule-derived (implemented) |
| --- | --- | --- |
| `wedding-midpoint-tie` | rangeHigh 4,200 | 3,800 (snapDown steps over 4,100–4,000 to 3,800) |
| `wedding-avoid-four` | rangeHigh 4,600, recommended 4,200 | rangeHigh 3,800, recommended 3,800 |
| `wedding-not-attending` | rangeHigh 4,200 | 3,800 |
| `wedding-extra-attendees` | rangeLow 4,600 | 5,000 (snapUp from 4,600) |
| `full-month-relative` | recommended 4,600 | 5,000 (midpoint 4,600 snaps nearest up) |

The SPEC §tests prose for `wedding-avoid-four` repeats the fixture
assumption (snapUp(4,000) = 4,200), so the conflict is internal to the
SPEC document set. No alternative reading satisfies both sides (a
hundreds-digit-only rule would make 4,000 and 4,800 valid, contradicting
that fixture's own stated range). Per the build rule, the implementation
follows the SPEC's stated predicate; the spec reviewer/coordinator needs
to decide whether the predicate or the five fixtures should be corrected.

No other errata candidates. All remaining fixtures, the applicability
matrix, the 60% integer form, and the snap definitions reproduce exactly.

## NOT_RUN (explicit)

- Real-browser checks (Chrome/Edge, both languages): example load, typed
  input, occasion switching with field disabling, error focus,
  edit-after-success revocation, cancel, reset, Blob download byte
  comparison, 1280×800 and 320 CSS px layouts, real 200% zoom, reduced
  motion, keyboard order, contrast measurement.
- Real-device checks (physical phone/tablet).
- Network/Storage observation in a clean isolated browser profile
  (zero work requests, storage/cookie/service-worker inspection, offline
  computation after load).
- Production build and formal HTTPS/SEO gate: refused by design — no
  production origin is approved for this tool; the candidate carries
  noindex and no canonical/hreflang, per the SPEC.
- Native OS file/download dialogs (manual only).

## Next owner

Independent reviewer against the fixed candidate commit (see HANDOFF.md),
including a decision on errata candidate 1.
