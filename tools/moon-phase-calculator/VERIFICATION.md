# Verification: Moon Phase Calculator （月相計算機）

Fixed spec source: task `labs-moon-phase-calculator-spec-20261109`,
spec candidate `a07fd30d844486b74683d38217d62781526033e9`, draft spec
PR https://github.com/KYStr/glossquote-labs-home/pull/166.
Implementation base: `c08e3243f0257f80fa512d15b1c37fcbeb6ef962`.
Environment: Node v24.22.1, zero runtime dependencies.

## Pre-implementation spec consistency check

Before writing the implementation, all 12 literal core **success**
fixtures were recomputed from the SPEC's stated rules (constants,
integer JDN algorithms, rounding, event-date rule) with an
independent scratch program: **12 match, 0 mismatch**. The SPEC's
rules and its fixtures are mutually consistent, including the tricky
pins: the reference epoch's age (29.4 displayed, illumination exactly
0), the segment-boundary case at age exactly S/16 (First Quarter,
illumination 50.0), the model-first-full case (2025-11-05, phase
window entered 0.1 days before the exact full moment), and the
2100-12-31 event overflow into 2101.

## Commands run and results

- `npm test` (`node --test`): **50 passed, 0 failed**
  - `test/core.test.mjs` — 32 tests: all 17 literal core fixtures
    deep-compared against the vendored `test/fixtures.json`, plus
    rule-derived cases (leap day 2000-02-29 full result; offset
    endpoints −12:00 and +14:00 full results; +05:45 quarter-hour
    offset; 1900-02-29 → INVALID_DATE; 2101-01-01 → RANGE; ±14:15 /
    −12:15 → RANGE; empty offset → EMPTY; DATE_FORMAT /
    OFFSET_FORMAT; INPUT_LIMIT before grammar on both fields;
    UNICODE lone surrogates; field order date-beats-offset; SCHEMA
    classes including an accessor that must never be invoked; an
    invariant sweep asserting the unrounded age stays in [0, S),
    phaseIndex 0–7, illumination 0–100, and date shapes across the
    full input range).
  - `test/controller.test.mjs` — 11 tests: the 3 literal controller
    fixtures (checkpoints on state / reportAvailable / draft /
    error) plus edit-during-busy, run-while-busy replacement,
    cancel no-op outside busy, worker-error → WORKER_ERROR,
    createWorker throwing, loadExample, reset-from-success, and
    edit-from-empty/error.
  - `test/report.test.mjs` — 5 tests: literal report bytes for the
    reference epoch (compact JSON, keys sorted by UTF-16 code
    units, exactly one trailing LF; SHA-256 and byte length
    asserted), live-run report equality with the same bytes, a
    full-moon report printing `100` for a whole illumination,
    non-plain results refused, and a result carrying a `toJSON`
    function refused without the function ever being invoked.
  - `test/site.test.mjs` — 2 tests: SPEC-pinned metadata, structure,
    FAQ answers, model note, offset-scope help, draft-loss note, all
    control/error ids including `download-btn`, and the `+08:00`
    default on both pages.
- Timezone independence: the full suite re-run under
  `TZ=UTC`, `TZ=Asia/Taipei`, `TZ=America/New_York`, and
  `TZ=Pacific/Kiritimati` — **50 passed, 0 failed** under each. The
  core constructs no `Date` at all (also enforced by
  `scripts/check.mjs`).
- `npm run check`: **passed** — required files, package contract,
  core constants / phase table / JDN endpoints / defaults / example
  equals fixtures case 1, page pins, syntax of every shipped script,
  worker concatenation parses, forbidden-capability scan, core
  purity.
- `npm run build:preview` run **twice**: `BUILD-MANIFEST.json` and
  the per-file SHA-256 listing of all 9 output files are
  **byte-identical** between the two runs.
- `npm run check:generated:preview`: **passed** — 9 files, hashes
  exact, bilingual metadata present, worker source matches the fixed
  source bytes.
- Loopback HTTP probe of the built preview
  (`node scripts/serve.mjs --port 49317`, then curl):
  `GET /` → 200 with `<title>月相計算機｜Gloss Tools</title>`;
  `GET /en/` → 200 with `<title>Moon Phase Calculator | Gloss
  Tools</title>`; `GET /../package.json` → 404;
  `GET /%2e%2e/package.json` → 404. Server stopped afterwards.
- Embedded worker execution: the built `dist-preview/js/worker-
  source.js` string was written out and imported as a module in Node
  with a stub `self`; a `{generation: 7, snapshot: {date:
  "2025-11-05", utcOffset: "+08:00"}}` message returned the
  model-first-full fixture result exactly (julianDay 2460985,
  ageDays 14.6, phaseIndex 4, 滿月 / Full Moon, illumination 100,
  next full 2025-11-05, next new 2025-11-20).

## Spec-errata candidates

**None.** The pre-implementation recomputation found the SPEC's
rules and fixtures fully consistent, and no fixture had to be
overridden during implementation. Recorded interpretations (SPEC
preview convention over the generic candidate template; handbook
`public/js/…` layout over the SPEC's `src/` sketch; report number
serialization via the platform JSON serializer on once-rounded
values) are documented in HANDOFF.md; none changes behaviour the
SPEC pins.

## NOT_RUN (explicit)

- Real-browser rendering and interaction (no browser was driven for
  this build; the pages were verified statically, over loopback
  HTTP, and through the embedded-worker execution above).
- Real-device checks (phone/tablet layout, touch, PWA behaviour).
- Browser Network/Storage audit in a live browser session.
- Production build — refused by design in `scripts/build.mjs`
  (the planned production origin is not configured); preview only.
- Independent nine-aspect review and registry submission — this is a
  build-first candidate; acceptance is a separate step by a
  different reviewer.
