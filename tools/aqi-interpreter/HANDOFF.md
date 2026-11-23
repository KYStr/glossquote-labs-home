# AQI Interpreter （空氣品質解讀）— Production HANDOFF

- Spec: `spec-aqi-interpreter-20261121`, draft spec PR #391
  (base `codex/initial-publication`, head
  `79cb2002f7a10a1eeec1e0bde27d1a56e7d00586`, OPEN at build time).
  Registry rev 1802 (per parent task).
- Spec source (fixed): `docs/specs/aqi-interpreter/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `1e72c214fa0d924ba2ee04ba74615fd34f6ebf93eeec9932044fed9c864e2d46`,
  verified against the spec fixtures file supplied with the task).
- Production target: `tools/aqi-interpreter/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/aqi-interpreter-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent, fifth production wave
  (parent orchestrator session 58ebf0c9-f5c0-f7c7-7215-56a897566aa8).
  User confirmed continuation four times on 2026-11-23 (14:31,
  14:33:56, 14:58:49, 15:04:46); the same execution-risk prompt class
  that stopped the first production wave at clone/fetch re-appeared
  during this build (twice: on a plain `ls` directory listing, and
  again on the successful `git clone` result) and was continued past
  under that authorization — glossquote-repo content only, no other
  content, credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/aqi-interpreter.mjs`: `run(input)`
  validates in the SPEC order (SCHEMA → mode/system ENUM → mode
  cross-field SCHEMA → capacity INPUT_LIMIT → surrogate UNICODE →
  EMPTY → grammar INTEGER_FORMAT/DECIMAL_FORMAT/ENUM → RANGE, rows
  in order, then DUPLICATE at the later row). Concentrations are
  normalized by decimal-string arithmetic only (Taiwan half-up, US
  truncate, pinned precision per pollutant); interpolation is exact
  rational arithmetic on milli-unit BigInts, rounded half-up to an
  integer sub-index; the maximum sub-index is the AQI, ties broken
  by the fixed pollutant order PM2.5, PM10, O3-8h, O3-1h, CO, SO2,
  NO2. Above the table top, PM2.5/PM10/O3-1h/CO/NO2 cap at 500 with
  ABOVE_TABLE_TOP; O3-8h above 0.200 ppm and SO2 1h above 304 ppb
  are undefined (SPEC notes 2 and 3) and the row is skipped, and all
  rows skipped is UNDEFINED_BAND. The pinned six-level table (names,
  colours, hexes — purple #99004C — health impact and both advice
  texts in both languages) and the pinned disclaimer are exported
  from the core. Fixed report `aqi-interpreter-report.json`
  (canonical JSON, UTF-16 key order, one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected. Rows are deep-copied on edit and
  on state reads so the app and the controller never share a rows
  array by reference.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, disclaimer in both languages, preview noindex, no
  canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note. The level is shown as a large text
  name plus a colour swatch carrying the hex, never by colour alone.
  Mode switching clears the other mode's inputs so a run can never
  fail the cross-mode SCHEMA rule; pollutant selects disable options
  already used in another row (the core still enforces DUPLICATE).
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Fixture vs SPEC order: `aqi-decimal` ("42.5") expects
   `INTEGER_FORMAT`, but the SPEC's pinned validation order is
   capacity → surrogate → grammar, and "42.5" is four raw units
   against a three-unit limit.** The implementation follows the SPEC
   text (`INPUT_LIMIT`); the fixture's decimal-rejection purpose is
   covered by the three-unit value "1.5" in the tests. Suggested fix:
   change the fixture input to "1.5" (or revise the SPEC order).
2. **SPEC tests section says "18 個字面核心案例", but
   `fixtures.json` contains 19 core cases and 3 controller cases
   (22 total), matching AUTHOR-CHECK.md ("19 筆字面核心案例").**
   The implementation tests all 19 literal core cases. Suggested
   fix: correct the count in SPEC §tests to 19.
3. **SPEC §inputsOutputs step 5 lists the SO2 1h table-top rule
   only by the note-3 reference, while the §5 breakpoint table
   still prints SO2 rows for 201–300 / 301–400 / 401–500 (305–604,
   605–804, 805–1004).** Those rows are 24-hour SO2 values, not
   1-hour values, and the tool only accepts SO2 1h — the
   implementation follows step 5 (SO2 1h above 304 ppb is
   SKIPPED_UNDEFINED, verified by the SPEC's own "SO2 304／305"
   test list). No code change needed; a clarifying footnote in the
   table would prevent a future builder from interpolating the
   305–1004 rows as 1-hour values.

## Interpretation notes (SPEC silent; choices recorded, not spec changes)

- AQI integers and concentration integer parts use the run-6 house
  grammar: no leading zeros (`"035"`, `"007"` → INTEGER_FORMAT /
  DECIMAL_FORMAT); a decimal point requires 1–6 digits after it
  (`"1."`, `".5"` → DECIMAL_FORMAT).
- `rows` collection errors use row null (house pattern): 0 rows →
  EMPTY, 8 rows → ROW_LIMIT. A malformed row (non-object, wrong
  keys, non-string fields, accessor) → SCHEMA with field and row
  null, per the SPEC's general SCHEMA rule. Within a row the
  pollutant is validated before the value (key order); per-row
  errors precede the DUPLICATE check (SPEC steps 1 then 2).
- The absolute concentration cap is checked on the raw value, not
  the normalized one, so US truncation cannot hide an over-cap raw
  value (e.g. US PM2.5 "999.95" → RANGE, although it would truncate
  to 999.9).
- The result's `healthImpact` / `adviceGeneral` / `adviceSensitive`
  carry the Chinese text exactly as the fixtures pin; the English
  page renders the English text from the same pinned `LEVELS` table
  by level (same pattern as the run-6 blood-pressure tool).
- Mode switching clears the other mode's inputs (direct mode keeps
  rows `[]`; concentration mode keeps aqi `""`), so the draft can
  never fail the cross-mode SCHEMA rule after a switch.

## Independent verification done by this builder

- All 19 literal core fixture values were re-derived with an
  independent Python `Decimal` implementation (same formula, same
  tables, same rounding rules) before coding; every numeric
  expectation matched, including the two-system contrast (TW 72 vs
  US 71 for PM2.5 20.0) and the 125.5 → 126 half-up case.
- Extra boundary probes verified the same way and covered by tests:
  PM2.5 12.5 → 51, 500.4 → 500, 500.5 → above-top (TW); 325.4 →
  500, 325.5 → above-top (US); O3-8h 0.200 → 300, 0.201 →
  undefined; SO2 304 → 200, 305 → undefined (both systems); O3-1h
  TW 0.101 → 101, US 0.125 → 101, US 0.124 → undefined; TW/US
  rounding contrasts (PM2.5 20.05 → 20.1/20.0, O3-8h 0.0785/0.0789,
  CO 4.45/4.49, PM10 30.4/30.5/54.5); all seven pollutants at once
  (max 129, dominant O3-1h); partial skip + above-top notice order.
- Report literals were derived with a separate Python canonicalizer
  (sorted keys, compact separators, one trailing LF): direct-good
  345 bytes, pm25-tw-20 551 bytes in JS serialization (Python
  prints the concentration as `20.0`, JS as `20`; see the test
  comment), above-top 839 bytes.

## Next owner

Independent (non-author) reviewer: verify this same PR head against
the SPEC's nine aspects, run the browser / Network / Storage gates,
and rule on the three errata candidates above.
