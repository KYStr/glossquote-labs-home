# Air Purifier Calculator （空氣清淨機選型試算）— Production HANDOFF

- Spec: `spec-air-purifier-calculator-20261121`, draft spec PR #383
  (base `codex/initial-publication`, head
  `4e73cb25b91e9f016310f1898de4b610c2c60ff7`, OPEN at build time).
  Registry rev 1762 (per parent task).
- Spec source (fixed): `docs/specs/air-purifier-calculator/` at the
  spec PR head above — `SPEC.md` (8 sections), `BRIEF.md`,
  `fixtures.json`, `AUTHOR-CHECK.md`. `test/fixtures.json` in this
  tool is a byte-identical vendored copy (SHA-256
  `fa705954fe1c368073402a6e1904f57b4e0dabf134698b5268ef124f83476fd1`,
  verified against the spec PR head via the GitHub API).
- Production target: `tools/air-purifier-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/air-purifier-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent, fourth wave (parent
  orchestrator session 5f578d5f-a6c4-f32d-f85b-e1030165fc05). User
  confirmed continuation four times on 2026-11-23 (14:31, 14:33:56,
  14:58:49, 15:04:46); the same execution-risk prompt class that
  stopped the first production wave at clone/fetch re-appeared
  during this build (on clone, directory reads, and git/gh calls)
  and was continued past under that authorization — glossquote-repo
  content only, no other content, credentials, outbound sends, or
  deletion involved.

## What was built

- Pure core `public/js/core/air-purifier.mjs`: `run(input)` validates
  in the SPEC order (shape SCHEMA, then per field in
  areaValue → areaUnit → ceilingHeightM → targetAch →
  purifierCadrCfm order: capacity INPUT_LIMIT → surrogate UNICODE
  → EMPTY → grammar DECIMAL_FORMAT / INTEGER_FORMAT / ENUM →
  RANGE), derives the AHAM sizing with exact BigInt decimal
  arithmetic (no binary floating point anywhere: required smoke
  CADR = ceil(volume × ACH / 60); suggested room = CADR × 1.55;
  defaults ceiling 2.8 m, ACH 5.0, unit m2; ping × 3.3058), and
  returns the fixture-shaped result with `owned` null or the
  adequacy check `{cadrCfm, ahamRoomSqft, ahamRoomM2, ach,
  adequate, shortfallCfm}`. Fixed report
  `air-purifier-report.json` (canonical JSON, UTF-16 key order,
  one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions,
  h1, the four FAQ answers, the sizing-only disclaimer in both
  languages, the AHAM rule explanation (2/3 vs 1.55, ceiling
  scaling, m³/h conversion, marketing coverage), preview noindex,
  no canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note. Owned-purifier results show
  adequacy in words ("足夠" / "不足，缺 N CFM"), not colour alone.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Validation-order sentence vs shape check.** SPEC
   inputsOutputs says "先容量、再 schema／缺內容、再該欄文法、再
   範圍" — capacity before schema. Capacity cannot be measured on
   a missing, mistyped, or accessor field, so the implementation
   checks shape (SCHEMA) first, then per-field capacity →
   surrogate → empty → grammar → range (the run-5/6 house
   pattern, also used by the sibling run-6 builds). No fixture
   distinguishes the two readings (all three error fixtures have
   complete valid shapes); the SPEC sentence should be clarified.
2. **areaValue range depends on a later field.** The areaValue
   range is defined on the converted m² area, but the conversion
   needs areaUnit, which is validated after areaValue. The SPEC
   pins no behaviour for an invalid unit combined with an
   out-of-range area. The implementation converts with "ping"
   only when the unit is exactly "ping" and otherwise falls back
   to m², so areaValue's RANGE is decided before areaUnit's ENUM,
   preserving the SPEC's field order (tested: areaValue "0" +
   areaUnit "bogus" → RANGE areaValue).
3. **The binary-float counter-example does not reproduce.** SPEC
   §inputsOutputs rule 4 and AUTHOR-CHECK claim binary floating
   point gives 57.3 for 37 × 1.55. In Node, 37 × 1.55 in IEEE-754
   double is slightly *above* 57.35, so naive JS rounding
   (`(37*1.55).toFixed(1)`, `Math.round(37*1.55*10)/10`) also gives
   57.4. The general point stands — binary float does mis-round
   decimal halves (the classic `(2.675).toFixed(2) === "2.67"`,
   verified in Node and asserted in the tests) — and the core
   still uses exact decimal arithmetic, so the product is correct;
   only the stated counter-example is inaccurate and should be
   replaced (e.g. with 2.675) or reworded.
4. **targetAch decimal places: which error code?** The SPEC pins
   targetAch as "1.0–10.0，小數至多 1 位" but never states the
   code for a value with 2 decimal places. The implementation
   treats it as DECIMAL_FORMAT (a grammar-level violation, like
   areaValue's 4-place limit); if the reviewer wants RANGE, the
   SPEC must say so. Tested: "5.25" → DECIMAL_FORMAT targetAch.
5. **ceilingHeightM has no pinned decimal-place limit.** The SPEC
   pins place limits for areaValue (4) and targetAch (1) but none
   for ceilingHeightM; the 8 ft fixture uses "2.4384" (4 places).
   The implementation accepts any number of fractional digits in
   its grammar. If a limit is intended, the SPEC must pin it.
6. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/air-purifier-calculator/`; the actual
   fixed spec used here lives in the run-6 spec workspace
   `build6/specs/air-purifier-calculator/docs/specs/air-purifier-calculator/`
   (same content, verified byte-identical fixtures against spec PR
   #383 head `4e73cb25…`). No content difference; only the path in
   the brief was stale.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.
