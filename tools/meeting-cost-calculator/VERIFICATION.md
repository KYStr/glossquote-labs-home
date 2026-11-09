# Verification — Meeting Cost Calculator (build-first candidate)

Environment: Node v24.22.1, Linux VM, 2026-11-09. All commands run from
`tools/meeting-cost-calculator/`.

## Commands and results

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` (`node --test`) | 0 | 31 tests, 31 pass, 0 fail (~0.9 s) |
| `npm run check` | 0 | all static checks passed (13 required files, 6 public files) |
| `npm run build:preview` (run 1) | 0 | 6 files written to `dist/preview/` |
| `npm run build:preview` (run 2) | 0 | tree hash identical to run 1 (see below) |
| `npm run check:generated:preview` | 0 | `dist/preview/` matches `public/` byte for byte (6 files) |

Build byte-identity: SHA-256 over the sorted per-file SHA-256 list of
`dist/preview/` was `6e761a2df0928fa67dc5d38a693d8671f3250eb799f2d3a75f38056e7d25eb8d`
after both runs — byte-identical output. The build test in the suite
(`test/build.test.mjs`) re-verifies this on every `npm test`.

## Test coverage (expected values hand-derived from the SPEC, not generated)

- Fixtures M1–M5 exactly (SPEC section 4): M1's burn $270.00/h, $4.50/min,
  $202.50 total and both breakdown rows ($45.00/$135.00, $33.75/$67.50);
  M2's preset fill 33.65 with burn $134.60 and total $67.30; M3's timer
  readings ($45.00 at 600 s, $6.75 at 90 s, a pause spanning a fake jump to
  10,090 s adding nothing, $7.50 at 100 s after resume); M4's $800.00;
  M5's $2.78 single-rounding case; the section 3 initial state ($200.00).
- Preset fills: all four annual figures map to the SPEC rates
  (19.23 / 33.65 / 52.88 / 86.54), and a filled rate re-parses as a plain
  typed rate with the identical value.
- Timer state machine on the fake clock: start/pause/resume/reset,
  double-start not restarting the interval, exact accumulation across
  three running intervals, pause freezing without creep, reset while
  running, elapsed crossing one hour ($270.00 at 3,600,000 ms for M1's
  roster), `H:MM:SS` formatting with unbounded hours (100:00:00).
- Drift property: hand-computed checkpoints at irregular elapsed times
  (1,300 / 2,900 / 4,700 / 7,900 / 12,300 / 100,000 ms) all equal the exact
  formula; the naive per-second rounded-increment total ($3.00 over 100 s)
  is shown to differ from the exact $2.78.
- Validation: every refusal in SPEC sections 2/4 — headcount 1/100
  accepted, 0/101/2.5 refused; rate 0 and 100,000 accepted, negative,
  100,000.01 and three-decimal rates refused; duration 1 and 1,440 minutes
  accepted, 0 and 1,441 refused (24 h with minutes > 0 refused); rosters
  of one and five groups accepted, zero and six refused; a blank rate is a
  per-group error state.
- Breakdown rounding: two groups of one person at 0.01 for 30 minutes —
  displayed subtotals 0.01 + 0.01 against a displayed total of 0.01 (the
  SPEC's independent-rounding case; the rounding note is on the page).
- Scaffolding: both pages' lang/title/description/noindex/canonical/
  hreflang/home-link markers; the repricing note, 2080 divisor note and
  rounding note present in both languages; no external resources; core
  imports in plain Node with no DOM.

## HTTP probe (loopback, `scripts/serve.mjs`, port 4179)

- `GET /` → 200, 7,367 bytes, `lang="zh-Hant"`
- `GET /en/` → 200, 7,654 bytes, `lang="en"`
- `GET /js/app.js` → 200; `GET /js/core/calculator.mjs` → 200
- `GET /nope.html` → 404
- Server stopped after the probe.

## Spec errata candidates

None. Every printed fixture (M1–M5) and every preset fill was re-derived
from the SPEC's own formulas during implementation and agrees with them;
the breakdown-subtotals-may-differ-by-one-cent behaviour is a rule the
SPEC states explicitly, not a contradiction.

## NOT_RUN (blocking for acceptance; must be completed by the reviewer)

- Real-browser rendering and interaction (fixtures entered through the
  real UI in both languages and both modes; a real ~65-second timer run
  compared against the formula within one display cent; mode switching
  with state preserved; a mid-run roster edit repricing per the stated
  rule; stale-state behaviour on an invalid rate while the timer runs).
- Real devices / touch, native viewports, 200% zoom.
- Assistive technology and keyboard-only end-to-end flow; live-region
  behaviour in a real screen reader.
- Measured contrast (normal text 4.5:1, large text and controls 3:1).
- Browser network/storage observation in a live page (source contains no
  network or storage calls, but that is not live evidence).
- Deployment and any public URL.

## Status

Build-first candidate. Not accepted, not published, not deployed.
Next owner: independent reviewer.
