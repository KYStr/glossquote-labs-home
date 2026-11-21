# Calories Burned Calculator — production handoff

## Fixed source

- Spec: `spec-calories-burned-calculator-20261109`, fixed at candidate commit
  `417937247273364d82476ff3eb7b8268c4cf7b4c` in
  `KYStr/glossquote-labs-home`, path `docs/specs/calories-burned-calculator/`
  (BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/237
- The spec was authored build-first in this run; this production was
  built directly against that fixed candidate. No registry/coordination
  commands were run by the builder; registration and independent review
  are the parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a` (fetched 2026-11-21).
- Scope of this candidate: only `tools/calories-burned-calculator/`.

## What was built

One exercise session's gross calories from body weight, duration and
activities from the pinned 2024 Adult Compendium MET table, using the
Compendium's own definition `kcal = MET × kg × hours`, with an optional
side-by-side comparison of up to three activities at the same weight and
duration.

- `public/js/core/table.mjs` — the §2.4 table as literal data (id, code,
  metTenths, both names), single-sourced: the selector, the reference
  table and the core read the same module.
- `public/js/core/calculate.mjs` — pure validation (§2.7 order: SCHEMA,
  then weight, duration, activities; capacity → Unicode → empty →
  grammar → range per field; ROW_LIMIT before element checks, element
  checks before DUPLICATE) and the exact integer computation (§2.5:
  `metTenths × weightHundredths × minutesTenths / 600000`, half away
  from zero decided exactly, total = sum of rounded rows).
- `public/js/core/report.mjs` — canonical JSON encoding (§3.3: keys
  sorted by UTF-16 code unit, no insignificant whitespace, one trailing
  LF) with the 2 MiB OUTPUT_LIMIT.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected compute +
  scheduler; the app's default scheduler delivers synchronously, and
  the generation guard drops late or duplicate deliveries. The last
  accepted result is kept separate from the current error, so a re-run
  with a now-invalid edit shows the new error while the previous result
  remains the last accepted one (§4.3). Editing after an error keeps
  the error until the next run (§4.2).
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  estimate disclaimer, FAQ, titles and descriptions; the activity
  selector is 14 checkboxes in table order (selection order, not table
  order, decides row order) and the MET reference table is rendered
  from the same table module; textContent/value only.
- `scripts/` — reproducible preview build (byte-identical across runs),
  static check, generated-output check, loopback-only serve.
- `test/` — core/controller/report tests. `test/fixtures.json` is a
  byte-identical vendored copy of the spec candidate's fixtures.json
  (SHA-256 in VERIFICATION.md) because the spec PR is not yet merged
  into the base branch, so the tests stay self-contained.

## Deviations from the SPEC

- The SPEC's §4.1 file list does not name a controller module; this
  candidate adds `public/js/controller.mjs` because §4.3 pins late/stale
  state rules that need a home outside the DOM layer. There is no
  worker module: §4.3 states the calculation is synchronous, so the
  controller's injected scheduler (synchronous by default, controllable
  in tests) is the pending-delivery seam instead of a Worker. Module
  responsibilities are otherwise exactly as §4.1 describes.
- The §2.8 error table lists an INPUT_LIMIT message for weight and for
  activity codes but none for durationMinutes. The app fills that gap
  with pattern-consistent strings ("運動時間最多 8 個字元。" /
  "Duration is limited to 8 characters."), following the weight row.
  This is a missing string, not a conflict with any normative text;
  the reviewer is asked to confirm the wording.
- The controller fixtures name steps (`runInitial`, `cancel`,
  `deliverLate`, `assertInitial`) without defining them; the test file
  documents the step semantics it implements, per §4.3.
- No other deviations. No spec-errata candidates were found: every
  fixture expected value follows from the SPEC's stated rules as
  implemented (all eight success fixtures were additionally reproduced
  against the §2.5 integer rule with an independent exact-rational
  evaluation before product code was written).

## MET table provenance (for the independent reviewer)

The shipped table was diffed against SPEC §2.4 and is identical in
content: 14 rows, same order, same ids, codes (as strings, leading
zeroes intact) and 2024 MET values — including the revised figures
(brisk walking 4.8 not 4.3, jogging 7.5 not 7.0, running 6 mph 9.3 not
9.8, Hatha yoga 2.3 not 2.5). No discrepancy was found in the table
itself. As AUTHOR-CHECK.md records, 8 of the 14 rows were confirmed
only indirectly (not read on the official pacompendium.com pages); the
table implements the SPEC exactly as written and was deliberately not
re-derived or "corrected" — the reviewer is asked to re-check those
eight rows against the official walking, running, bicycling and sports
category pages before acceptance.

## Next owner

Independent reviewer (not the author) against the fixed candidate
commit of the production PR: the nine predeclared aspects from the
SPEC's acceptance section, with real-browser evidence still NOT_RUN
(see VERIFICATION.md).
