# HANDOFF — Download Time Calculator （下載時間計算機）

Build-first production candidate. Not accepted, not merged, not
published; the nine acceptance aspects await an independent reviewer
on this fixed candidate.

## Fixed spec source

- Spec task id: `labs-download-time-calculator-spec-20261109`
- Spec candidate commit: `9d865432902652718d572d3f162518e640ae6268`
- Draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/167
- Spec files (BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md) read in
  full from
  `~/workspace/glossquote-factory/build4/specs/download-time-calculator/docs/specs/download-time-calculator/`;
  the spec PR is not merged into this candidate's base, so the spec's
  fixtures.json is vendored verbatim at `test/fixtures.json`
  (SHA-256 `84d0aa7ca55b0c26cf33b20097bb1823a6495ff1ced46e9f7076ebcc3e7dd374`,
  byte-identical to the spec candidate's file) and `scripts/check.mjs`
  pins its specId and case counts.

## Candidate

- Base: `codex/initial-publication` @ `c08e3243f0257f80fa512d15b1c37fcbeb6ef962`
  (the FETCH_HEAD tip recorded when the branch was created).
- Branch: `muse/download-time-calculator-production-20261109`
- Scope: only `tools/download-time-calculator/` added. No
  registry/coordination commands were run.

## What was built

- Pure core `public/js/core/download.mjs`: strict own-data schema
  (unknown/missing/wrong-type/accessor → SCHEMA, accessors never
  invoked), per-field validation in the SPEC's pinned order (field
  order sizeValue → sizeUnit → speedValue → speedUnit → efficiency →
  startTime; within a field INPUT_LIMIT → UNICODE → EMPTY → grammar →
  RANGE), SI and IEC size units as separate enum values (no
  unit-system toggle), exact BigInt rational arithmetic
  (num = sizeMilli × unitBytes × 800, den = speedMilli × speedUnitBits
  × efficiency), durationSeconds rounded half-up from the exact
  rational, finish time derived from the UNROUNDED duration (floor of
  whole seconds added to the start clock), duration text that never
  rolls into days, exact-decimal `sizeBytes`, and the canonical
  report serializer (UTF-16-sorted keys, compact, one trailing LF,
  2,097,152-byte OUTPUT_LIMIT, never calls an input's toJSON).
- Controller `public/js/controller.mjs`: the SPEC's six flow states
  with generation guarding (late replies dropped, never resurrected),
  blank startTime resolved to the local HH:MM in the posted snapshot
  only (the draft keeps the blank; the core only receives a concrete
  HH:MM), report availability tied exactly to the success state.
- App + bilingual static pages: SPEC-pinned titles, descriptions, FAQ
  answers, the six speed chips (fill-in shortcuts that set speedValue
  and speedUnit=Mbps as an ordinary draft edit), per-field localized
  errors with aria-describedby/aria-errormessage and first-error focus
  on submit failure, and the fixed `download-time-report.json`
  download (Blob URL created only on explicit click, revoked within
  30 s or on invalidation). Module Worker created from a Blob URL over
  the build-embedded fixed core + handler source.
- Preview build tooling per the handbook contract: reproducible
  `build:preview` (byte-identical across runs), `check`,
  `check:generated:preview`, loopback-only `serve.mjs` with the SPEC's
  CSP and noindex headers.

## Deviations and interpretations

- Directory naming follows `docs/IMPLEMENTATION-CHECKLIST.md`'s file
  contract (`public/js/core/*.mjs`, `public/js/app.js`) rather than
  the SPEC sketch's `src/` names; all behavioural requirements are
  implemented as specified.
- Candidate metadata follows the SPEC's pinned preview convention
  (noindex, no production canonical/hreflang/sitemap; the build
  refuses `--mode production`) over the generic template.

## Spec-errata candidates

One prose conflict, resolved in favour of the normative rules:

- SPEC §tests prose lists the boundary checks as "speedValue
  0.01／0.009（文法外）與 0（RANGE）" — calling 0.009 outside the
  grammar. But the normative field definition pins speedValue to the
  same grammar as sizeValue (`^(0|[1-9][0-9]*)(\.[0-9]{1,3})?$`, at
  most 3 decimals), which "0.009" satisfies, and the pinned
  validation order (grammar before RANGE) plus the range
  0.01 ≤ value then yield RANGE; the formula section's
  "speedMilli = value × 1000, the grammar guarantees at most 3
  decimals" reading also assumes 3-decimal speeds parse. The
  implementation follows the RULE: `speedValue: "0.009"` →
  `{code: "RANGE", field: "speedValue"}` (covered by a core test).
  Suggested spec fix: change the parenthetical to （RANGE） or state
  an explicit speed sub-grammar. Every literal fixture agrees with
  the rules; no fixture is affected. All 9 successful core fixtures
  were also recomputed independently (Python `Fraction`
  implementation of the SPEC's formulas) before product code existed
  and matched exactly, including the 8000/27-second efficiency case,
  the exact 1.5-second half-up tie, and the
  finish-from-unrounded-duration case.

## Next owner

Independent reviewer, after the parent verifies the PR head equals
the candidate commit.
