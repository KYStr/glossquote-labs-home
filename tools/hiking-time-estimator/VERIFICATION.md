# Verification — Hiking Time Estimator (build-first candidate)

Environment: Node v24.22.1, Linux, no dependencies installed
(zero-dependency tool). All commands run in
`tools/hiking-time-estimator/`. Sources: fixed spec candidate
`c38663f3c8ef0fe752a5516b93e4984c4d148955` (spec id
`spec-hiking-time-estimator-20261121`, draft spec PR #371, registry
rev 1702); implementation base `codex/initial-publication` @
`8c2652671012498891e7f7afe02fdca3f154aa64`. The spec fixtures are
vendored verbatim at `test/fixtures.json` (SHA-256
`d63529eb7fc8a27c67cb786a9132b105cdcf3f63f5fb3c7aa29abe3452ac20d8`,
byte-identical to the spec candidate's file) because the spec PR is
not merged into the base branch.

## Pre-implementation check

Before any product code existed, an independent scratch implementation
(Python `fractions.Fraction`, `/tmp/hiking-scratch.py`, no shared code
with the product) of the SPEC's exact-rational model reproduced all 12
successful core fixtures value-for-value (12/12), and agreed with the
hand-derived half-up cases (exact 64.5 → 65 minutes; exact 7.5 → 8;
exact 7.4 → 7) and the gentle-descent floor at exactly 0 (1 km flat,
360 m gentle descent → 0:00, pace 0.0) that the test suite later
pinned. The shipped core then deep-compared green against the same
fixtures.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 44 tests, 0 fail |
| `npm run check` | PASS — files, package contract, core fields/limits/defaults/example, pages, descent options, syntax, worker concatenation, capability scan, core purity |
| `npm run build:preview` (run twice) | PASS — byte-identical: `BUILD-MANIFEST.json` SHA-256 `e902689f327eb67aa8096c7906db1f7e278941e4685d1dc952cf51f7af11439d` unchanged between runs, 9 files |
| `npm run check:generated:preview` | PASS — 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes |
| Core tests under `TZ=UTC`, `TZ=Asia/Taipei`, `TZ=Pacific/Kiritimati` | PASS — 31/31 under each timezone (determinism / timezone independence) |
| Loopback probe (`node scripts/serve.mjs --port 49412`) | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown (44)

- `test/core.test.mjs` (31): all 16 literal core fixtures from
  fixtures.json deep-compared against the core's `run`
  (classic-naismith 12 km / 600 m → 3:24, gentle/steep descent ±30
  min per 900 m, fractional inputs, half-minute rounding, the
  repeating-decimal descent adjustment, flat-only, minimum distance,
  maximum bounds 62:13, descent-type-ignored-when-zero, the
  gentle-descent floor at zero, the descent-type default, and the 4
  error fixtures DECIMAL_FORMAT / RANGE / INTEGER_FORMAT / ENUM);
  legal endpoints (distance 0.1/200 km, ascent/descent 0/10000 m, all
  three descent types, the empty-string defaults); just-outside values
  (0.09/200.01 km RANGE, ascent/descent −1 grammar, 10001 RANGE);
  grammar codes (too many decimals, trailing/leading dot, thousands
  comma, exponent, spaces, non-integer ascent/descent, unknown and
  case-mismatched descent type); EMPTY/INPUT_LIMIT/UNICODE preludes
  (descentM/descentType empty means the default, never EMPTY);
  first-error field order; hand-derived half-up cases at exact x.5
  totals (64.5 → 65, 7.5 → 8, 7.4 → 7); the gentle-descent floor at
  exactly 0 as a full hand-derived result; descent type having no
  effect at descent 0 and `none` ignoring descent; missing optional
  fields defaulting and missing required fields as SCHEMA; SCHEMA
  classes (null, string, array, extra key, wrong types, accessor
  never invoked); hostile strings as inert grammar failures; the
  property that every successful total is ≥ 0 with a matching
  `H:MM` display and pace ≥ 0; the report bytes for the worked
  example pinned as a literal string with matching SHA-256
  (`b2ef22911ab4c9b7d974afd864340efd31a69da218c74c6dd6db770a6b14c8ab`),
  and a hostile `toJSON` proven never to be called.
- `test/controller.test.mjs` (11): the 3 literal controller fixtures
  verbatim (state-dirty-error, state-cancel-late, state-replace-late)
  via a fake worker with controllable completion, checking the
  fixtures' `reportAvailable` checkpoints, drafts, and errors; plus
  edit-during-busy, run-while-busy replacement, cancel no-op, worker
  error → WORKER_ERROR, createWorker throw → WORKER_ERROR, loadExample
  (fills fixture case 1, waits for manual run), reset from success,
  and edit from empty/error.
- `test/site.test.mjs` (2): both pages' lang/title/description/h1,
  preview noindex, no canonical/hreflang, relative language link,
  same-language home link, draft-loss note, the estimate statement
  present in both the input and results areas, pinned FAQ answers,
  results heading, all control/error ids, the details list, and the
  download button.

### Loopback probe

Served `dist-preview/` on 127.0.0.1:49412 (ephemeral, loopback only):

- `GET /` → 200, `<title>登山時間預估｜Gloss Tools</title>`
- `GET /en/` → 200, `<title>Hiking Time Estimator | Gloss Tools</title>`
- `GET /js/app.js`, `GET /js/worker-source.js`, `GET /styles/app.css`,
  `GET /robots.txt` → 200
- `GET /nope.html` → 404; `GET /../../package.json` (path-as-is
  traversal) → 404
- HTML responses carry the SPEC CSP
  (`default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'blob:'; …`),
  `X-Content-Type-Options: nosniff`, `Permissions-Policy: camera=(),
  microphone=(), geolocation=()`, and `X-Robots-Tag: noindex, nofollow`.

### Embedded worker source (Node harness)

Imported `WORKER_SOURCE` from the built `dist-preview/js/worker-source.js`,
wrote it to a temp module, installed a fake `self`, and invoked the
handler: the classic example snapshot returned generation 7 with the
exact fixture result (`3:24`, 204 minutes), the `7.555` distance
snapshot returned the pinned DECIMAL_FORMAT error, and the
gentle-descent floor snapshot returned total `0:00` with pace 0.0.
This exercises the exact bytes the page turns into a module Worker;
it does not replace a real browser Worker check (still NOT_RUN below).

## Build manifest (preview)

`BUILD-MANIFEST.json` — SHA-256
`e902689f327eb67aa8096c7906db1f7e278941e4685d1dc952cf51f7af11439d`,
9 files: `index.html`, `en/index.html`, `js/app.js`,
`js/controller.mjs`, `js/core/hiking.mjs`, `js/worker-handler.mjs`,
`js/worker-source.js`, `robots.txt`, `styles/app.css`. Per-file
SHA-256 values are in the manifest itself; two consecutive builds
produced identical manifests and identical per-file hashes.

## Spec errata candidates

None. Every literal fixture reproduces from the SPEC's stated rules,
including the Naismith 5 km/h + 600 m/h base, the Langmuir gentle/steep
descent corrections, the 0 floor on the total, the half-up rounding
rules, and the Scarf 7.92 equivalent-flat-distance factor — all
confirmed by the independent scratch recalculation before the product
existed.

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
