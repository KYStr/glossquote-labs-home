# Verification — Moving Box Estimator (build-first candidate)

Environment: Node v24.22.1, Linux, no dependencies installed
(zero-dependency tool). All commands run in `tools/moving-box-estimator/`.
Sources: fixed spec candidate `a536732ba0512afc595c924b242ee220211bf7ed`
(spec task `labs-moving-box-estimator-spec-20261109`, draft spec PR #156);
implementation base `codex/initial-publication` @
`6a56a115e6bbc1208712c74c855906ce3729e2e3`. The spec fixtures are
vendored verbatim at `test/fixtures.json` (SHA-256
`5a0b48e0c2a1ad90724e601b346acab59ae40810311f8800d54e9b030eda6896`)
because the spec PR is not merged into the base branch.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 32 tests, 0 fail (core 19, controller 11, site 2) |
| `npm run check` | PASS — files, package contract, core tables/defaults/example vs vendored fixtures, bilingual metadata and pinned strings, syntax incl. worker concatenation, forbidden-capability scan, core purity |
| `npm run build:preview` (run twice) | PASS — byte-identical |
| `npm run check:generated:preview` | PASS — manifest hashes exact, bilingual metadata present, worker source matches fixed bytes, robots.txt denies all |
| Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 38245 --dir dist-preview`) | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown

- `test/core.test.mjs`: the 8 literal core fixtures from fixtures.json,
  deep-equal against the product's `run` (base split rounding with the
  remainder to large, adders before the uplift, the +20% uplift, the
  fragile packing-paper extra roll, ENUM and SCHEMA first errors); the
  hand-derived five-home-type base table with all toggles off; an
  invariant sweep over all 5 home types × all 32 toggle combinations
  deep-compared against an independently formulated recomputation from
  the SPEC prose (ceiling percentages) plus the small + medium + large
  = totalBoxes invariant; validation classes and order (extra/missing
  field, accessor rejected as SCHEMA, wrong types in field order, type
  checks preceding the homeType value checks, lone surrogate →
  UNICODE, empty → EMPTY, 70,000-character home type → INPUT_LIMIT);
  the report bytes compared against a hand-written canonical literal
  (UTF-16-sorted keys, compact, one trailing LF) with its SHA-256, and
  key-order independence of the serializer.
- `test/controller.test.mjs`: the 3 literal controller fixtures
  verbatim (state-dirty-error, state-cancel-late, state-replace-late)
  via a fake worker with controllable completion, checking the
  fixtures' `reportAvailable` checkpoints, drafts, and errors; plus
  edit-during-busy, run-while-busy replacement, cancel no-op, worker
  error → WORKER_ERROR, createWorker throw → WORKER_ERROR,
  loadExample (fills fixture case 1, waits for manual run), reset from
  success, and edit from empty/error.
- `test/site.test.mjs`: both pages' lang/title/description/h1, preview
  noindex, no canonical/hreflang, relative language link, same-language
  home link, draft-loss note, the fixed estimate note verbatim, pinned
  FAQ answers, per-option addition hints, results heading, all
  control/error ids, the five home-type radio values, and the download
  button.

### Embedded worker source (Node harness)

Imported `WORKER_SOURCE` from the built `dist-preview/js/worker-source.js`,
wrote it to a temp module, installed a fake `self`, and invoked the
handler: the `two-bedroom-books-kitchen` snapshot returned generation 3
with totalBoxes 54 and boxes 20/26/8, and the `five-bedroom` snapshot
returned the pinned ENUM error. This exercises the exact bytes the page
turns into a module Worker; it does not replace a real browser Worker
check (still NOT_RUN below).

### Loopback probe

Served `dist-preview/` on 127.0.0.1:38245 (ephemeral, loopback only):

- `GET /` → 200, `<title>搬家紙箱估算｜Gloss Tools</title>`
- `GET /en/` → 200, `<title>Moving Box Estimator | Gloss Tools</title>`
- `GET /js/app.js`, `GET /js/worker-source.js`, `GET /styles/app.css`,
  `GET /robots.txt` → 200
- `GET /../../package.json` (path-as-is traversal) → not served
- `GET /nope.html` → 404
- HTML responses carry the pinned CSP and `X-Robots-Tag: noindex,
  nofollow` headers.

## Build manifest (preview)

`BUILD-MANIFEST.json` — 9 files. SHA-256 prefixes:

- `index.html` — `52d05d636044`, `en/index.html` — `cd65d5b125ca`
- `js/core/boxes.mjs` — `5103e51f22c0`, `js/worker-source.js` — `7408c642bb96`
- `styles/app.css` — `c5d3cb9fe9d8`

## Spec errata candidates

None. Every literal fixture reproduces from the SPEC's stated integer
formulas, including the four-bedroom all-options total of 124 with the
⌈103/5⌉ = 21 uplift and the studio split remainder going to large.

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both
  languages, including the live module Worker created from a Blob URL,
  the native download dialog, keyboard-only flow, focus movement on
  error, 320 px reflow, real 200% zoom, reduced motion, and touch
  targets — no isolated browser mechanism was used.
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
