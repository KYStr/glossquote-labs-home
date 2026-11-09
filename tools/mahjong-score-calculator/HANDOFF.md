# Handoff — Mahjong Score Calculator （麻將台數計算機）

Build-first production candidate. Not accepted, not merged, not
published; the nine acceptance aspects await an independent reviewer
on this fixed candidate.

## Fixed spec source

- Spec task id: `labs-mahjong-score-calculator-spec-20261109`
- Spec id: `spec-mahjong-score-calculator-20261109`
- Spec candidate commit: `1afe86cfee8dc968298e8ec767b56fb4cd15f738`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/159
- Spec files were read from the author's workdir
  (`build4/specs/mahjong-score-calculator/docs/specs/mahjong-score-calculator/`):
  BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md.
- `test/fixtures.json` is vendored **verbatim** from that candidate
  (SHA-256 `b371a1317964ab5e6d904297759bdb9d49b021094ee9623d9f93c22d23caca55`,
  byte-identical) because spec PR #159 is not merged into the
  implementation base. All test expectations come from the SPEC and
  its fixtures, never from implementation output.

## Implementation base

- Branch base: `codex/initial-publication` @
  `6a56a115e6bbc1208712c74c855906ce3729e2e3` (FETCH_HEAD at checkout
  time).
- Implementation branch: `muse/mahjong-score-calculator-production-20261109`.
- Scope: only `tools/mahjong-score-calculator/` was added. No
  registry/coordination commands were run (build-first mode).

## What was built

- `public/js/core/mahjong.mjs` — the pure core: the fixed 30-code
  tai table for the one named rule set （台灣十六張．一般家庭場慣例
  v1), the pinned validation order (capacity → SCHEMA → ENUM →
  grammar/range → FLOWER_LIMIT → conflicts C1–C7), the interaction
  order E1–E8 (flush supersede, dragon subsumption, flower-set
  subsumption, win-method mismatch, 門清自摸合併 = 3 fixed), the
  derived kong lines, the dealer rule (1 + streak, winner first,
  then discarder on discard wins only), the cap applied to the
  total including dealer tai, integer-only payout math, and the
  canonical `mahjong-score-report.json` serializer (sorted keys,
  compact, one trailing LF, 2,097,152-byte OUTPUT_LIMIT).
- `public/js/controller.mjs` — generation-guarded draft controller
  (empty/dirty/busy/success/error/cancelled); edits, cancels, and
  resets revoke the old result and the report; late worker replies
  are dropped by generation.
- `public/js/app.js` + `public/js/worker-handler.mjs` — the page
  creates a module Worker from a Blob URL over the build-embedded
  fixed core + handler, so the worker runs the same tested `run`.
- Bilingual static pages (zh-Hant default, en) with the SPEC-pinned
  titles, descriptions, FAQs, all 24 selectable items grouped as the
  SPEC's userFlow orders them, override inputs beside the 8
  overridable items, the full state/error rendering, and the fixed
  report download on success only.

## Deviations and interpretations

- File layout follows the handbook contract (`public/js/core/*.mjs`,
  `public/js/app.js`, `public/js/controller.mjs`) rather than the
  SPEC §implementation sketch's `src/` names; no behaviour differs.
- Candidate pages carry no production canonical/hreflang/sitemap,
  per the SPEC's pinned preview convention (candidate noindex);
  the build refuses `--mode production`.
- Within the SCHEMA stage, checks run in the SPEC's top-level field
  order (presence/accessor, then unknown keys, then per-field
  types); the SPEC pins the stage order and the field paths but not
  the intra-stage order. No fixture outcome depends on it.
- `overrides` may be omitted (treated as `{}`), as the SPEC allows.

## Spec-errata candidates

None. All 10 literal core fixtures reproduce exactly from the
SPEC's stated rules, and every hand-derived boundary case agrees
with the SPEC text.

## Next owner

Independent reviewer: verify this candidate against the nine
predeclared acceptance aspects (real-browser evidence is NOT_RUN —
see VERIFICATION.md).
