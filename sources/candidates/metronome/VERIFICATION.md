# Verification — WebAudio Metronome with Tap Tempo (build-first candidate)

Mode: build-first under the owner's 2026-11-02 directive (see
`PRODUCTION-STATUS.md`). The registry production registration and
submission are held for the bulk-review phase; nothing here is merged,
deployed, published, or catalogued.

## Specification provenance

- SPEC: `docs/specs/metronome/SPEC.md` in `KYStr/glossquote-labs-home`
  at commit `44c38dfaf95cbe7e61863cb3e6acb8a27f8fb57c` (spec PR #35 head),
  14,712 bytes, SHA-256
  `6a8aaf992cb67f9a195f580feb5203b700221d1ba2ffcb48bacdf9c926f1cce4`.
- SPEC.md, AUTHOR-CHECK.md and BRIEF.md at that commit were fetched and
  verified byte-identical to the author's local drafts before building.
  BRIEF commit: `a04e189da88b71c4b0b21693c45867ecdb664ba2`.
- The build follows the SPEC wherever a summary could differ from it.

## Evidence RUN (Node v24.22.1, this environment)

- **Tests: 15/15 pass** (`node --test`, ~0.5 s) — 10 core (fake clock)
  + 5 controller (DOM shim + fake audio engine, labelled as such).
  - Core: the §7 grid — at 120 BPM the first 20 beat times are
    exactly start + 0.06 + k × 0.5, with accent/beat kinds and bar
    positions; 30 BPM × subdivision 4 spacing is exactly 0.5 s with
    sub kinds and the fixed frequency table (1568/1046/784 Hz);
    jittered timer ticks (±20 ms patterns) produce event times
    identical to a regular run; change rules (a BPM change alters
    only events scheduled after it — horizon events keep their
    times); signature change to a shorter bar restarts at beat 1;
    tap tempo (500 ms intervals → 120; a 2.1 s gap restarts the run;
    a gap of exactly 2.0 s stays in the run → 30; 7 taps use only the
    last 6 intervals; clamping at 240); stop (silence called, no
    further events, restart begins at bar 1 beat 1 with start +
    0.06); hidden return (a 60 s clock jump yields at most one
    emitted event in the return tick — no catch-up burst — while the
    counter lands in phase at bar 32 beat 1 for the driven grid);
    gain mapping (accent/beat/sub = 1.0/0.7/0.4 × volume); BPM
    clamping; positionAt semantics.
  - Controller (fake engine): defaults (100 BPM, 4/4, accent on,
    volume 80%); start schedules clicks on the audio grid (first at
    start + 0.06, accent; 100 BPM spacing 0.6 s) and updates the
    button state; stop silences exactly once and no further clicks
    are scheduled; BPM controls clamp at 30/240 and stay in sync
    across slider/number/±; tap button applies the computed 120 BPM;
    signature (6/8) and subdivision (3) changes reach the scheduler.
- **Project check: PASS** (`node scripts/check.mjs`) — required paths,
  package/wrangler identity, zero dependencies, house page policy,
  the audio-clock / hidden-tab honesty note present in both pages,
  element-id parity, app-referenced ids present, pure core free of
  DOM references, i18n key parity, forbidden-capability token scan,
  and the scheduler contract re-asserted through the shipped core
  (120 BPM exact grid, accent identity, 500 ms tap case, 11-signature
  list, 50 ms click-duration cap).
- **Build: byte-identical across two builds** — combined dist listing
  SHA-256 `0c7dabe9c9a88bc90f6ebe2da05f52f06cc9d2d396ef89cd5b44f53855df21fb`;
  `checkReleaseOutput` confirms dist mirrors `public/` exactly.
  Production builds are refused by design (no approved site URL).
- **HTTP probes** against the project serve script (serves `public/`):
  `/index.html` 200 and `/en/index.html` 200, both byte-exact to the
  sources; `/` 404 (server design); missing file 404; `..` traversal
  403; POST 405; HEAD 200.

## Evidence NOT_RUN (honest gaps — no browser binary in this environment)

- The §7 real-browser accuracy evidence: a 60-second run at 120 BPM
  with rendered onsets measured within ±10 ms of the grid, including
  a main-thread stress interval — NOT_RUN (the fake-clock suite pins
  the scheduler model's exactness, which is the part this
  environment can prove; platform audio latency is not measurable
  here).
- All other real-browser items: actual WebAudio playback and click
  timbre, the visual indicator against real rAF, keyboard-only flow
  in a browser, hidden-tab behaviour in a real browser, Safari /
  Firefox WebAudio differences, and the §6 live tap-tempo trial
  (±2 BPM against a steadily tapped reference).
- Deployment, merge, and catalog publication: not performed (held
  for the bulk-review phase and separate approvals).

## Spec defects and interpretation notes

- **Spec defects found: none.** The scheduler arithmetic, the tap
  rules, and the stated fixtures agree with each other when
  exercised.
- Interpretation notes (recorded for bulk review):
  1. The beat-unit of a signature (4 vs 8) is display and labelling
     only: §4 defines beat spacing as 60 / BPM with no unit
     adjustment, and the core implements exactly that.
  2. Stop silences by stopping tracked sources and rebuilding the
     master gain in the adapter; the 100 ms silence bound of §4 is
     a real-browser measurement and stays NOT_RUN above — the
     mechanism (immediate stop + disconnect) is the part implemented
     and shim-tested.
  3. On hidden return, the skip loop advances the counter through
     missed events in a single tick; those iterations schedule
     nothing, so no burst can occur, at a bounded cost of one loop
     step per missed event.
