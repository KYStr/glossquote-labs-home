# Verification — Sunrise & Sunset Calculator (build-first candidate)

Environment: Node v24.22.1, Linux, no dependencies installed
(zero-dependency tool). All commands run in
`tools/sunrise-sunset-calculator/`. Sources: fixed spec candidate
`f1f14924fae8e114c9b8f8e0caeba72922c64d30` (spec task
`labs-sunrise-sunset-calculator-spec-20261109`, draft spec PR #164);
implementation base `codex/initial-publication` @
`c08e3243f0257f80fa512d15b1c37fcbeb6ef962`. The spec fixtures are
vendored verbatim at `test/fixtures.json` (SHA-256
`98fdcc4f8290e396756544360b687a6bd4c54fcd034b971811eb525cf350d98d`,
byte-identical to the spec candidate's file) because the spec PR is
not merged into the base branch.

## Pre-implementation check

Before any product code existed, an independent scratch implementation
of the SPEC's NOAA steps reproduced all 7 successful core fixtures
value-for-value (sunrise/noon/sunset, dayOffsets, day length, polar
statuses). The shipped core then deep-compared green against the same
fixtures in the test suite below.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 35 tests, 0 fail |
| `npm run check` | PASS — files, package contract, core fields/limits/defaults/example, pages, presets, syntax, worker concatenation, capability scan, core purity |
| `npm run build:preview` (run twice) | PASS — byte-identical: `BUILD-MANIFEST.json` unchanged between runs (diff clean), 9 files |
| `npm run check:generated:preview` | PASS — 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes |
| Core tests under `TZ=UTC`, `TZ=Asia/Taipei`, `TZ=America/New_York`, `TZ=Pacific/Kiritimati` | PASS — 22/22 under each timezone (determinism / timezone independence) |
| Loopback probe (`node scripts/serve.mjs --port 49393`) | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown (35)

- `test/core.test.mjs` (22): all 11 literal core fixtures from
  fixtures.json deep-compared against the core's `run` (Taipei solstice
  and autumn day, equator/Greenwich equinox, Tromsø polar night and
  polar day, Sydney solstice at +11:00, Reykjavík +14:00 day-offset
  wrap, EMPTY, DATE_FORMAT, latitude RANGE, OFFSET_FORMAT); legal
  endpoints (latitude ±89.9, longitude ±180, offsets −12:00/+14:00,
  dates 1900-01-01/2100-12-31, leap day 2028-02-29); just-outside
  values (89.91/90 RANGE, 180.0001 RANGE, +14:15 and −12:45 RANGE,
  +8:00 OFFSET_FORMAT, 1899/2101 RANGE, 2026-13-01 and 2026-02-29
  DATE_FORMAT); decimal grammar rejects (+ sign, spaces, exponent,
  leading zero, trailing dot, 5 decimal places); capacity before
  grammar and first-field-error order; SCHEMA classes (null, string,
  array, extra key, missing key, wrong types, accessor never invoked);
  unpaired surrogates → UNICODE; SPEC property checks (rounded
  sunrise ≤ noon ≤ sunset with dayOffsets applied, day length
  consistent within rounding, negated latitude on the opposite
  solstice keeps POLAR_DAY / POLAR_NIGHT symmetric); report bytes for a
  NORMAL and a POLAR result pinned as literal strings with matching
  SHA-256, and a hostile `toJSON` proven never to be called.
- `test/controller.test.mjs` (11): the 3 literal controller fixtures
  verbatim (state-dirty-error, state-cancel-late, state-replace-late)
  via a fake worker with controllable completion, checking the
  fixtures' `reportAvailable` checkpoints, drafts, and errors; plus
  edit-during-busy, run-while-busy replacement, cancel no-op, worker
  error → WORKER_ERROR, createWorker throw → WORKER_ERROR, loadExample
  (fills fixture case 1, waits for manual run), reset from success, and
  edit from empty/error.
- `test/site.test.mjs` (2): both pages' lang/title/description/h1,
  preview noindex, no canonical/hreflang, relative language link,
  same-language home link, draft-loss note, the fixed accuracy note
  verbatim, pinned FAQ answers, results heading, preset options, all
  control/error ids, and the download button.

### Loopback probe

Served `dist-preview/` on 127.0.0.1:49393 (ephemeral, loopback only):

- `GET /` → 200, `<title>日出日落時間計算｜Gloss Tools</title>`
- `GET /en/` → 200, `<title>Sunrise &amp; Sunset Calculator | Gloss Tools</title>`
- `GET /js/app.js`, `GET /js/worker-source.js`, `GET /styles/app.css`,
  `GET /robots.txt` → 200
- `GET /nope.html` → 404; `GET /../../package.json` (path-as-is
  traversal) → 404
- HTML responses carry the SPEC CSP
  (`default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'blob:'; …`),
  `X-Content-Type-Options: nosniff`, and `X-Robots-Tag: noindex, nofollow`.

### Embedded worker source (Node harness)

Imported `WORKER_SOURCE` from the built `dist-preview/js/worker-source.js`,
wrote it to a temp module, installed a fake `self`, and invoked the
handler: the `taipei-summer-solstice` snapshot returned generation 7
with the exact fixture result, and the latitude-89.95 snapshot
returned the pinned RANGE error. This exercises the exact bytes the
page turns into a module Worker; it does not replace a real browser
Worker check (still NOT_RUN below).

## Build manifest (preview)

`BUILD-MANIFEST.json` — 9 files: `index.html`, `en/index.html`,
`js/app.js`, `js/controller.mjs`, `js/core/sun.mjs`,
`js/worker-handler.mjs`, `js/worker-source.js`, `robots.txt`,
`styles/app.css`. Per-file SHA-256 values are in the manifest itself;
two consecutive builds produced identical manifests.

## Spec errata candidates

None. Every literal fixture reproduces from the SPEC's stated rules,
including the +14:00 offset wrap (solar noon and sunset on the next
day) and the polar statuses decided purely by the cosHa domain.

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both
  languages, including the live module Worker created from a Blob URL,
  keyboard-only flow, focus movement on error, 320 px reflow, real
  200% zoom, reduced motion, and touch targets — no isolated browser
  mechanism was used.
- Measured contrast ratios and assistive-technology checks.
- Network/Storage observation in a real browser profile (zero-request,
  storage, cookie, service-worker checks) and the native download
  dialog.
- Real-device checks.
- Production build (`--mode production` is refused: no approved
  origin), deployment, catalog integration, and the independent
  nine-aspect review (pending by design in build-first mode; all nine
  aspects remain null / NOT_RUN).

## Next owner

Independent reviewer, after the parent verifies the PR head.
