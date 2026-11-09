# Verification — Heart Rate Zones Calculator (build-first candidate)

Environment: Node v24.22.1, Linux, no dependencies installed
(zero-dependency tool). All commands run in `tools/heart-rate-zones/`.
Sources: fixed spec candidate `2a21f1a0ebde740d0874f62ccd50435517532cc9`
(spec task `labs-heart-rate-zones-spec-20261109`, draft spec PR #149);
implementation base `codex/initial-publication` @
`b7ffa5a133ac7a2b3221d0807e61c2c3faa48442`. The spec fixtures are
vendored verbatim at `test/fixtures.json` (SHA-256
`2d2a85de501a470e1811b77b4532ffc23a96b9c13760e3c2434077b4f6b68f45`)
because the spec PR is not merged into the base branch.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 33 tests, 0 fail |
| `npm run check` | PASS — files, package contract, core ranges/defaults/example vs vendored fixtures, bilingual metadata, the pinned zone-name table and fixed strings, syntax incl. worker concatenation, forbidden-capability scan, core purity |
| `npm run build:preview` (run twice) | PASS — byte-identical: `BUILD-MANIFEST.json` unchanged between runs (diff clean) |
| `npm run check:generated:preview` | PASS — 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes |
| Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 43177 --dir dist-preview`) | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown (33)

- `test/core.test.mjs` (20): the 7 literal core fixtures from
  fixtures.json, deep-equal against the product's `run` (Tanaka
  fractional rounding, Karvonen basic, measured override, override
  only, RESTING_NOT_BELOW_MAX, RANGE, EMPTY); hand-derived endpoints
  (age 100; measured 230 with resting 120; measured 100 with resting
  30) and the second Tanaka-.5 age (45 → 177); a zone-continuity
  invariant sweep over every legal age (10–100) and every measured
  value (100–230, with Karvonen) asserting zone k's high + 1 = zone
  k+1's low and Z5's high = used; resting == used (error) vs
  resting == used − 1 (success, reserve 1) on both sides; SCHEMA
  classes (null, array, missing, extra, wrong type, accessor);
  validation order across fields (age → measuredMaxHr → restingHr),
  within a field (capacity before grammar), and per-field before
  cross-field (an invalid restingHr beats the cross-field EMPTY);
  a filled-but-invalid age errors even beside a measured maximum;
  grammar rejects (leading zeros, signs, spaces, decimals, exponent,
  full-width and Arabic-Indic digits); "0" is grammatical but RANGE;
  just-outside range edges for every bound; no floats anywhere in any
  fixture result.
- `test/controller.test.mjs` (11): the 3 literal controller fixtures
  verbatim (state-dirty-error, state-cancel-late, state-replace-late)
  via a fake worker with controllable completion, checking the
  fixtures' `resultVisible` checkpoints, drafts, and errors; plus
  edit-during-busy, run-while-busy replacement, cancel no-op, worker
  error → WORKER_ERROR, createWorker throw → WORKER_ERROR,
  loadExample (fills fixture case 1, waits for manual run), reset from
  success, and edit from empty/error.
- `test/site.test.mjs` (2): both pages' lang/title/description/h1,
  preview noindex, no canonical/hreflang, relative language link,
  same-language home link, draft-loss note, the fixed disclaimer
  verbatim, pinned FAQ answers, results heading, all control/error
  ids, and no download link artifact (the SPEC gives this tool no
  download or copy button).

### Loopback probe

Served `dist-preview/` on 127.0.0.1:43177 (ephemeral, loopback only):

- `GET /` → 200, `<title>心率區間計算機｜Gloss Tools</title>`
- `GET /en/` → 200, `<title>Heart Rate Zones Calculator | Gloss Tools</title>`
- `GET /js/app.js`, `GET /js/worker-source.js`, `GET /styles/app.css`,
  `GET /robots.txt` → 200
- `GET /../../package.json` (path-as-is traversal) → 404
- `GET /nope.html` → 404
- HTML responses carry the pinned CSP and `X-Robots-Tag: noindex,
  nofollow` headers.

### Embedded worker source (Node harness)

Imported `WORKER_SOURCE` from the built `dist-preview/js/worker-source.js`,
wrote it to a temp module, installed a fake `self`, and invoked the
handler: the `karvonen-basic` snapshot (age 40, resting 60) returned
generation 7 with used 180 and Karvonen Z5 high 180; the
`resting-not-below-max` snapshot returned the pinned
RESTING_NOT_BELOW_MAX error. This exercises the exact bytes the page
turns into a module Worker; it does not replace a real browser Worker
check (still NOT_RUN below).

## Build manifest (preview)

`BUILD-MANIFEST.json` — 9 files. SHA-256 highlights:

- `index.html` — `0b0bba76d284a42b184e627dc1a4b9da396b931b4f523033c4ce2cf3aa8025d0`
- `en/index.html` — `b7de5b3ae243c6bf4c3b0ea1c36e1be7f72b00cbb4290f57b527338f3f30818d`
- `js/core/zones.mjs` — `01ff8dfeb43bc8aea4330d09b0920358c4e03bca74b061bd8ce8a9f33e75f842`
- `js/worker-source.js` — `93ad641c693e56c994ce37c4d3ec0cfdcbe821b1e3bc7cb36a09fd02b02180b9`
- `styles/app.css` — `643f9be6295547dee33a93e33ef10a309aed6a7a2cba2a2a42ef94ba1fb84578`

## Spec errata candidates

None. Every literal fixture reproduces from the SPEC's stated integer
formulas, including the Tanaka half-up case (age 35 → 183.5 → 184)
and the Karvonen .5 boundaries in `override-only` (67.5→68, 94.5→95,
121.5→122).

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both
  languages, including the live module Worker created from a Blob URL,
  keyboard-only flow, focus movement on error, 320 px reflow, real
  200% zoom, reduced motion, and touch targets — no isolated browser
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
