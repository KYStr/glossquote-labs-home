# Storage Unit Estimator （倉儲空間估算）— Production HANDOFF

- Spec: `spec-storage-unit-estimator-20261121`, draft spec PR #382
  (base `codex/initial-publication`, head
  `34b2ea5fa6065fe0883e87dae6961f19c80de22f`, OPEN at build time).
  Registry rev 1757 (per parent task).
- Spec source (fixed): `docs/specs/storage-unit-estimator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `ad67d39f7af13ce2d2b7722336f265a19ccadec68810b2f4f5d47b4e003d9738`,
  verified against the spec PR head via the GitHub API).
- Production target: `tools/storage-unit-estimator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/storage-unit-estimator-production-20261121`, base
  `codex/initial-publication` (head at build time
  `8c2652671012498891e7f7afe02fdca3f154aa64`). Build-first (no registry
  production registration in this run, per the run-6 production mode:
  build + draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (third wave, parent
  orchestrator session ccb9ee27-adc8-876d-2287-aaf2c4fe6bd4). User
  confirmed continuation four times on 2026-11-23 (14:31, 14:33:56,
  14:58:49, 15:04:46); the same execution-risk prompt class that
  stopped the first production wave at clone/fetch re-appeared during
  this build (on the `find` read of the run-5 exemplar directory, on
  the clone, and on the `process.poll` read) and was continued past
  under that authorization — glossquote-repo content only, no other
  content, credentials, outbound sends, or deletion involved. The
  authorization was re-confirmed in the alignment synthesis update
  received during this build (same-class prompts no longer stop work
  within this run; only a different kind of risk does).

## What was built

- Pure core `public/js/core/storage-unit-estimator.mjs`: `run(input)`
  validates in the SPEC order (row count first, then per row in
  itemId, quantity, lengthCm, widthCm, heightCm order; per field
  capacity INPUT_LIMIT → surrogate UNICODE → EMPTY → grammar
  INTEGER_FORMAT → RANGE/ENUM), computes with exact integer
  hundredths of a m³ (no binary floating point in any volume math),
  and returns the fixture-shaped result `{rows,totalM3,allowanceM3,
  requiredM3,unitId,unitLabelFt,floorAreaM2,floorAreaPing,capacityM3,
  unitsNeeded,fillPct,fits}`. The pinned 21-item volume table
  (furniture 12 / appliances 6 / boxes 3) and the pinned 6-unit size
  table (5×5 to 10×30 ft, 8 ft high) are stored as integer
  hundredths. requiredM3 = totalM3 × 1.25 and allowanceM3 =
  totalM3 × 25% are exact rationals, half-up rounded to 2 decimals
  only for display; the unit recommendation compares the UNROUNDED
  required volume against the pinned capacities; fillPct is half-up
  to 1 decimal from the unrounded required volume. Fixed report
  `storage-unit-estimator-report.json` (canonical JSON, UTF-16 key
  order, one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft `{items: [...]}` /
  generation / state machine (empty, dirty, busy, success, error,
  cancelled) with a module Worker created from the fixed worker
  source; late replies are dropped, never resurrected. Edits replace
  the whole items array and are compared by value, so an unchanged
  re-render never flips the state to dirty.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, disclaimer in both languages, preview noindex, no
  canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note. The item list is a dynamic row list
  (add row, remove per row, 30-row cap with note, custom rows reveal
  length/width/height inputs); overflow results show a text + symbol
  (⚠) prompt naming the number of largest units suggested.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

None. All 21 pinned item volumes re-derive from their typical
dimensions (half-up to 2 decimals), all 6 unit capacities re-derive
both from ft × 0.3048 and from cu ft, and all 16 literal fixture
expectations (13 core + 3 controller) pass verbatim against the
implementation. Two interpretation points (not spec errors, recorded
so the reviewer can confirm the reading):

1. **SCHEMA field/row attribution for shape errors.** The SPEC pins
   `field,row=null` for the input object as a whole, and pins
   field/row for the enumerated validation failures, but does not pin
   the attribution for a malformed `items` value or a malformed row.
   The implementation uses `field="items", row=null` when `items`
   is not an array, `field=null, row=<row>` when a row is not a plain
   object, and `field=<offending field>, row=<row>` for a missing /
   wrong-typed / extra field inside a row.
2. **Leading zeros in quantity/dimensions.** The SPEC requires an
   ASCII decimal integer string with no blank / sign / decimal /
   exponent, and does not forbid leading zeros. The implementation
   accepts `"01"` as 1 (it is an ASCII decimal integer string).
3. **Source paths.** The SPEC implementation section names
   `src/core.mjs`, `src/controller.mjs`, `src/app.mjs`; the build
   follows the task brief / house format instead
   (`public/js/core/*.mjs`, `public/js/controller.mjs`,
   `public/js/app.js`), as in the run-5/6 sibling tools.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.
