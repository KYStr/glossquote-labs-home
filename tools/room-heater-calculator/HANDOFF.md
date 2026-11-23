# Room Heater Calculator （暖氣功率試算）— Production HANDOFF

- Spec: `spec-room-heater-calculator-20261121`, draft spec PR #380
  (base `codex/initial-publication`, head
  `d1aa3f2a79444eac5104b66dba2b7ceec2c592df`, OPEN at build time).
  Registry rev 1747 (per parent task).
- Spec source (fixed): `docs/specs/room-heater-calculator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`
  (17 cases), `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is
  a byte-identical vendored copy (SHA-256
  `6dc7bd747914a4830407d4f4107d90f8e346e975559351b5d415ed93f8290e6c`,
  verified against the spec PR head via `git show` on the fetched
  spec branch; `SPEC.md` bytes also match, SHA-256
  `5f4d31b29e1670c268768733662c865c4967ed54c1424c28324dcb16ef4f52a2`).
- Production target: `tools/room-heater-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/room-heater-calculator-production-20261121`, base
  `codex/initial-publication` (base head `8c265267` at clone time).
  Build-first (no registry production registration in this run, per
  the run-6 production mode: build + draft PR + parent verification
  + ledger).
- Builder: run-6 production builder subagent (third wave, parent
  orchestrator session ccb9ee27-adc8-876d-2287-aaf2c4fe6bd4). User
  confirmed continuation four times on 2026-11-23 (14:31, 14:33:56,
  14:58:49, 15:04:46); the same execution-risk prompt class that
  stopped the first production wave at clone/fetch re-appeared
  during this build (on the clone and on the spec-branch fetch) and
  was continued past under that authorization — glossquote-repo
  content only, no other content, credentials, outbound sends, or
  deletion involved.

## What was built

- Pure core `public/js/core/room-heater.mjs`: `run(input)` validates
  in the SPEC order (capacity INPUT_LIMIT → surrogate UNICODE →
  EMPTY → DECIMAL_FORMAT/ENUM → RANGE, field order area, areaUnit,
  ceilingHeight, insulation; the converted-area range is checked
  right after areaUnit is validated, since the conversion needs it,
  and before ceilingHeight), computes with exact BigInt rational
  arithmetic (no binary floating point anywhere in the wattage path;
  1 坪 = 400/121 m² exact), and returns the fixture-shaped result
  `{areaM2, volumeM3, wPerM2, rawWatts, requiredWatts,
  recommendedWatts, units}` (areaM2/volumeM3 2-decimal strings,
  rawWatts 1-decimal string, half-up, display-only; requiredWatts is
  the unrounded raw value rounded up to a multiple of 10). The
  pinned W/m² table (good 60 / average 80 / poor 130), the standard
  sizes, the 3000 W / 2000 W multi-unit rule, and the pinned
  multi-unit note are exported from the core and rendered by the UI.
  Fixed report `room-heater-calculator-report.json` (canonical JSON,
  UTF-16 key order, one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, the estimate note in both languages, preview noindex,
  no canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note. Multi-unit results (units > 1)
  show the pinned note in text, not colour alone. The Adax by
  Solaire W/m² source is cited by name in the pages; its URL is not
  repeated in the shipped sources (it is in the SPEC) so the
  forbidden-capability scan stays clean — see the note in
  VERIFICATION.md.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Fixture vs SPEC order: `error-insulation-enum` ("excellent")
   expects `ENUM`, but the SPEC's pinned validation order is
   capacity → surrogate → grammar, and "excellent" is nine raw units
   against the eight-unit cap.** The implementation follows the SPEC
   text (`INPUT_LIMIT`); the enum-rejection purpose is covered by
   the short invalid value "great" in the tests. Suggested fix:
   change the fixture input to "great" (or revise the SPEC cap /
   order). The other 13 core fixtures match the implementation
   exactly (deep equal).
2. **SPEC tests § count: "10 個字面核心案例（含 4 個錯誤案例）"**
   does not add up — the fixtures hold 10 success cases + 4 error
   cases = 14 core cases, plus 3 controller cases = 17 total.
   AUTHOR-CHECK.md already states the correct "14 筆字面核心案例".
   Suggested fix: "14 個字面核心案例（含 4 個錯誤案例）".
3. **SPEC implementation § paths: `src/core.mjs`,
   `src/controller.mjs`, `src/app.mjs`.** The house layout (per the
   parent task and the run-6 sibling tools) is
   `public/js/core/*.mjs`, `public/js/controller.mjs`,
   `public/js/app.js`. The implementation follows the house layout;
   the SPEC's `src/` paths are stale naming only, no behaviour
   difference.
4. **Minor: the worked example (fixtures case 1, standard-bedroom)
   is byte-identical to the SPEC defaults** (`area 10`, `m2`, `2.4`,
   `average`), so 「載入範例」 fills the same values as a fresh
   draft and is only visible via the example note. Suggested fix:
   pick a distinct example (e.g. `ping-good`) or note the overlap in
   the SPEC.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.
