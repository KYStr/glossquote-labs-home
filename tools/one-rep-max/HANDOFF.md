# Handoff: One-Rep Max Calculator （最大肌力 1RM 計算機）

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec source: `docs/specs/one-rep-max/` (BRIEF.md, SPEC.md,
  fixtures.json, AUTHOR-CHECK.md) at spec candidate commit
  `1514f57f9f70d1812df91aaa0826795042567858`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/148 (draft)
- Spec task id: `labs-one-rep-max-spec-20261109`
- Implementation base: `b7ffa5a133ac7a2b3221d0807e61c2c3faa48442`
  (tip of `codex/initial-publication` at fetch time)
- Scope: only `tools/one-rep-max/` was added. No registry or
  coordination commands were run; submission is the coordinator's step.

## What was built

A bilingual (zh-Hant default, English mirror) one-rep-max calculator
implementing the SPEC exactly:

- `public/js/core/one-rep-max.mjs` — pure core: `run({ weight, reps,
  unit })` with strict schema over own data properties (unknown /
  missing / wrong-type / accessor fields are SCHEMA), the pinned
  per-field validation order (weight → reps → unit; within a field
  INPUT_LIMIT → UNICODE → EMPTY → format/ENUM → RANGE), and exact
  rational arithmetic with BigInt throughout — the weight is held as
  hundredths, pounds convert with the exact definition
  1 lb = 0.45359237 kg, and no binary floating point enters the
  derivation. Epley `w(30+r)/30` and Brzycki `w·36/(37−r)` are computed
  unrounded; reps = 1 defines both estimates as the weight itself. The
  only rounding points are the pinned ones, all half-up: each formula
  estimate to one decimal, the headline result (the mean of the two
  unrounded estimates) to the nearest 0.5 kg step, and each
  percentage-table load from the ROUNDED headline result to the
  nearest 0.5 kg step. Also `messageFor` (the SPEC-pinned bilingual
  error table, field-specific for EMPTY and RANGE) and `formatKg`
  (display strings assembled from the rounded digits, always one
  decimal). There is deliberately no report/download: the SPEC states
  this tool has no export.
- `public/js/controller.mjs` — the flow state machine (empty / dirty /
  busy / success / error / cancelled) with macrotask-scheduled
  evaluation and a generation counter: editing terminates pending work
  and revokes the shown outcome immediately, cancel terminates the
  pending generation, `settle()` accepts only the currently pending
  generation so late completions are dropped, and reset restores the
  pinned default draft `{ weight: "", reps: "", unit: "kg" }`.
- `public/js/app.js` — DOM wiring using textContent/value only: the
  weight + unit field (kg/lb radio group) and reps field with visible
  labels, the primary Calculate action, Load example (fills
  100 / 5 / kg, marks the draft as an example, and waits for a manual
  run), Reset (restores defaults and focuses the weight field), Cancel
  while busy, per-field errors linked with aria-describedby /
  aria-errormessage, focus moved to the first error field only after a
  failed submit, the result summary followed by both formula estimates
  and the real percentage table (built with DOM nodes), the pinned
  disclaimer and the high-reps note when `highReps` is true, and
  generation invalidation on pagehide / bfcache restore.
- Pages follow the Gloss Tools design baseline (paper/ink tokens,
  wide/narrow layouts) and the SPEC's preview conventions: noindex
  pages, no canonical, no hreflang, no sitemap; language links are
  relative paths carrying the draft-loss note; same-language home
  links `../../` and `../../en/`. The preview server sends the
  SPEC-pinned restrictive CSP.
- `test/` — all 11 core fixtures and all 3 controller fixtures
  replayed verbatim from a vendored copy of the spec's
  `fixtures.json`, plus hand-derived tests (endpoints 1500 kg and
  1500.01, exact pound conversion at 1 rep including the unrounded
  102.05828325 kg case, grammar/validation-order matrices, schema
  variants including accessors, 0.5-step row invariants, display
  formatting, page metadata, and the pinned message table).

## Recorded interpretations (SPEC wins)

- The SPEC (§implementation) forbids a Worker for this tool — the
  calculation is O(1) and uses a generation counter plus a next-
  macrotask execution instead — so there is no worker source and the
  CSP carries no worker-src.
- The SPEC's preview rules override the handbook's generic canonical /
  hreflang wording: the candidate carries neither.
- The SPEC pins EMPTY messages only for weight and reps. A unit EMPTY
  error (unreachable from the radio-group UI) resolves through
  `messageFor` to the INTERNAL text; the error code/field returned by
  the core still follow the pinned validation order.
- Editing the draft from the pristine empty state keeps the state
  `empty` (there is no outcome to revoke); from every other state an
  edit moves to `dirty`, matching the SPEC's state table and all three
  controller fixtures.
- The spec PR is not yet merged into `codex/initial-publication`, so
  `docs/specs/one-rep-max/` does not exist in this checkout. The tests
  therefore import a byte-identical vendored copy at
  `test/fixtures.json` (SHA-256
  `b9f282ccb13579b4fdcfe5aa845b86de2d9aed559f782c068c3cf0375da3ca70`,
  verified equal to the spec candidate's file) instead of the usual
  `../../../docs/specs/<slug>/fixtures.json` path.
- `dist-preview/` and `BUILD-MANIFEST.json` are committed with the
  tool, matching the run-3/run-4 house practice for production
  candidates.

## Next owner

The coordinator: verify the PR head against the candidate commit and
run the registry submission for the production task when the spec
review flow calls for it. Independent review must re-run the
acceptance criteria from the SPEC, including the real-device/browser
checks listed as NOT_RUN in VERIFICATION.md.
