# Handoff: Tap Tempo （點按節拍 BPM 偵測）

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec source: `docs/specs/tap-tempo/` (BRIEF.md, SPEC.md, fixtures.json,
  AUTHOR-CHECK.md) at spec candidate commit
  `c4383d24d8bf188d22e75a021ac50cdcf0bff3fe`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/162 (draft)
- Spec task id: `labs-tap-tempo-spec-20261109`
- Implementation base: `40b82fed10d2a68e9b93caf2c6a203850e2fd4cc`
  (tip of `codex/initial-publication` at fetch time)
- Scope: only `tools/tap-tempo/` was added. No registry or coordination
  commands were run; submission is the coordinator's step.

## What was built

A bilingual (zh-Hant default, English mirror) tap-tempo tool that turns a
sequence of millisecond tap timestamps into a BPM reading, implementing
the SPEC exactly:

- `public/js/core/tempo.mjs` — pure core: `run({ taps })` with the pinned
  validation order (strict schema with own-data-property reads, capacity
  512 before the element scan, then INTEGER_FORMAT → RANGE →
  NON_MONOTONIC left to right), segment reset on intervals strictly over
  2000 ms with the post-gap tap kept as the new segment's first tap, the
  last at most 8 segment intervals as the statistics set, median-first
  statistics, and output-only half-up rounding computed with BigInt
  integer formulas (BPM and mean are always derived from the exact
  interval, never from the rounded display value). Also
  `parseImportText` (the pinned import grammar), `formatReading`
  (display strings assembled from the rounded digit values) and
  `serializeReport` (canonical compact JSON, keys sorted by UTF-16 code
  units recursively, one trailing LF, 2,097,152-byte OUTPUT_LIMIT).
- `public/js/controller.mjs` — the flow state machine (empty / tapping /
  dirty / busy / success / error / cancelled) with macrotask-scheduled
  evaluation and a generation counter so late completions are discarded;
  controller-side dropping of same-millisecond taps and keyboard repeats
  so the core's strict-increase contract is never tripped by real input;
  undo recomputes from the remaining taps; reset clears everything.
- `public/js/app.js` — DOM wiring using textContent/value only: the big
  tap button (pointerdown capture with click suppression; Space/Enter via
  native activation), `performance.now()` timestamps rounded to the
  millisecond, readings rendered in the pinned order with the hints
  (never a fake 0), the import disclosure with the pinned bilingual error
  text, row annotation and focus-on-failed-submit, and the fixed-name
  report download (`tap-tempo-report.json`, Blob URL revoked within 30 s
  or on invalidation, `pagehide` cleanup).
- Pages follow the Gloss Tools design baseline (paper/ink tokens,
  wide/narrow layouts) and the SPEC's preview conventions: noindex pages,
  no canonical, no hreflang, no sitemap; language links are relative
  paths carrying the draft-loss note; same-language home links `../../`
  and `../../en/`. The preview server sends the SPEC-pinned restrictive
  CSP with no worker source.
- `test/` — all 17 core fixtures and all 4 controller fixtures replayed
  verbatim from a vendored copy of the spec's `fixtures.json`, plus
  hand-derived boundary tests (1999/2000/2001 ms reset edges, multiple
  resets, window order, 512-tap cap, RANGE before NON_MONOTONIC on the
  same element, schema variants, import-text errors, canonical report
  bytes, OUTPUT_LIMIT, display-string formats).

## Recorded interpretations (SPEC wins)

- The SPEC forbids a background Worker for this tool (§5: O(n) work,
  macrotask + generation instead), so — unlike some sibling tools —
  there is no embedded worker source and the CSP carries no worker-src.
- The SPEC's preview rules override the handbook's generic canonical /
  hreflang wording: the candidate carries neither.
- The spec PR is not yet merged into `codex/initial-publication`, so
  `docs/specs/tap-tempo/` does not exist in this checkout. The tests
  therefore import a byte-identical vendored copy at
  `test/fixtures.json` (SHA-256
  `d4db571e5137c721a2922d265e6a215fe575ad6afd2b95f984a71574d1e84a31`,
  verified equal to the spec candidate's file) instead of the usual
  `../../../docs/specs/<slug>/fixtures.json` path.
- `dist-preview/` and `BUILD-MANIFEST.json` are committed with the tool,
  matching the run-3 house practice for production candidates.

## Next owner

The coordinator: verify the PR head against the candidate commit and run
the registry submission for the production task when the spec review
flow calls for it. Independent review must re-run the acceptance
criteria from the SPEC, including the real-device/browser checks listed
as NOT_RUN in VERIFICATION.md.
