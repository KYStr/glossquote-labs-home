# Stopwatch with Laps — verification record

Environment: Node v24.22.1, Linux VM, no network use by the product or
the tests. All commands run from `tools/stopwatch-laps/`.

## Commands and results

- `npm test` — exit 0. 21 tests passed, 0 failed.
  - `test/format.test.mjs` (4): SPEC L2 fixtures, hour boundary at
    exactly 3,600,000 ms, truncation-never-rounds, CSV seconds format.
  - `test/stopwatch.test.mjs` (17): fixtures L1 (laps/statistics/sum),
    L3 (pause), L4 (ties), L5 (byte-exact CSV); sum-invariant property
    test over 200 scripted pseudo-random split sequences including
    repeated splits (zero laps); state-machine refusals in idle/paused;
    multiple segments summing exactly across a 10,000,000 ms pause;
    reset from running and paused; single-lap statistics; exact
    rational average (split_n / n = 100.5) with truncating display;
    in-progress lap excluded from statistics; split truncation of
    fractional elapsed; hour-boundary display; 500-lap bound with the
    501st press refused (`lap-limit`) while timing continues.
  - Expected values are derived from the SPEC fixtures and
    hand-computed cases, never from the implementation's own output.
- `npm run check` — exit 0. File contract complete; package is ESM,
  Node >=24, zero dependencies; core modules contain no DOM, network,
  storage or clock reads (`Date.now`/`performance` absent by scan);
  `MAX_LAPS = 500` appears once as the auditable constant; app layer
  uses textContent only (no `innerHTML`/`eval`); both pages carry
  lang, noindex, canonical, hreflang (zh-Hant/en/x-default), title,
  description, h1, a `../../` same-language home link, and no external
  resources.
- `npm run build:preview` run twice — exit 0 both times; the two
  output trees are byte-identical (SHA-256 compared for every file).
- `npm run check:generated:preview` — exit 0: the committed `preview/`
  tree matches a fresh build byte for byte (6 files).
- Loopback HTTP probe — `node scripts/serve.mjs` on 127.0.0.1:4173,
  then `curl`: `GET /` -> 200 (zh-Hant page), `GET /en/` -> 200
  (English page), server stopped afterwards.

## Spec errata candidates

None found. Every printed fixture (L1–L5) agrees with the SPEC's own
rules as implemented. One judgement call, recorded for the reviewer:
SPEC section 4 defines the display format for whole-millisecond
durations; the average lap is an exact rational (e.g. 100.5 ms) and
its display floors the value before formatting, which is identical to
truncating the rational at centisecond level, so no rule had to be
bent.

## NOT_RUN (not verified by this build)

- Real-browser rendering and interaction, including the SPEC section 7
  real run (~65 s with two laps compared against a reference clock),
  keyboard-only flow in a browser, and CSV download byte-compare in a
  browser.
- Real timing accuracy against a reference clock (only fake-clock /
  injected-timestamp arithmetic is tested).
- Real devices and touch input; mobile-width layout in a real browser.
- Assistive technology behaviour (screen-reader announcements).
- Measured colour contrast of the shipped styles.
- Deployment of any kind (preview is noindex; nothing was published).
