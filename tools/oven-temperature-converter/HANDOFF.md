# Handoff — Oven Temperature Converter （烤箱溫度換算）

Build-first production candidate. Not accepted, not published, not
deployed; an independent reviewer must verify this fixed candidate
against the nine predeclared aspects.

## Fixed specification source

- Spec task id: `labs-oven-temperature-converter-spec-20261109`
- Spec id: `spec-oven-temperature-converter-20261109`
- Spec candidate commit: `acfe72ccf073cb5fa8d55281aff8ae262215a24d`
- Draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/146
- Spec files read in full before building: `SPEC.md` (8 sections),
  `BRIEF.md`, `fixtures.json` (11 core + 3 controller cases),
  `AUTHOR-CHECK.md`, from
  `docs/specs/oven-temperature-converter/` at the candidate commit.
  The spec PR is not merged into this build's base, so the fixtures are
  vendored verbatim into `test/fixtures.mjs` with their provenance
  recorded in that file.

## Base and branch

- Base: `codex/initial-publication` at
  `b7ffa5a133ac7a2b3221d0807e61c2c3faa48442` (FETCH_HEAD recorded at
  build start, 2026-11-09).
- Branch: `muse/oven-temperature-converter-production-20261109`
- Scope: only `tools/oven-temperature-converter/` was created. No
  registry/coordination commands were run.

## What was built

- `public/js/core/convert.mjs` — pure synchronous core, zero imports.
  Strict schema validation in the SPEC's pinned order
  (SCHEMA → per-field INPUT_LIMIT/UNICODE → EMPTY/DECIMAL_FORMAT →
  ENUM → FAN_GAS → GAS_VALUE/RANGE) and the pinned conversion pipeline,
  computed with exact BigInt rationals: the fan adjustment is applied
  once, in the entered unit (−20 °C / −25 °F), before conversion; a Gas
  input's conventional °F is the chart's paired value, never the
  formula; the fan side and all non-gas inputs use the formula; Gas
  lookup uses the exact (unrounded) °C with ties taking the hotter row.
- `public/js/controller.mjs` — empty/dirty/busy/success/error/cancelled
  state machine. The snapshot runs on the next event-loop turn under a
  generation counter; edits, cancel, reset, replace and pagehide
  invalidate pending generations so late results are dropped. No Worker
  (the SPEC forbids faking async progress for this O(1) core).
- `public/js/app.js` — DOM wiring with safe APIs only
  (textContent/value/properties). Gas input disables the fan basis with
  an explanatory note; only a failed submission moves focus to the
  first error field.
- `public/index.html` / `public/en/index.html` — two static bilingual
  pages (zh-Hant default, en), each with the full static 12-row Gas
  Mark chart, the pinned titles/descriptions/FAQ, preview
  noindex metadata, the SPEC's CSP, and same-language home links
  (`../../` and `../../en/`). This tool has no download/export, per
  the SPEC.
- `public/js/i18n.mjs` — runtime status/error strings, key-parity
  checked; the pinned dirty/cancelled status strings are exact.
- `scripts/` — reproducible preview build (copies `public/` to
  `dist-preview/`), static check, generated-output check, loopback-only
  serve with traversal/symlink protection and preview security headers.
- `test/` — core tests deep-compare all 11 fixture core cases plus
  hand-derived chart-row, midpoint (11 values), boundary, exact-°C gas
  lookup and validation-order cases; controller tests replay the 3
  fixture state cases against a manually scheduled controller; HTML
  tests pin both pages' strings, ids and chart; build tests rebuild
  twice (byte-identical) and probe the loopback server over HTTP.

## Deviations

- None from the SPEC's rules, tables or strings. Two internal SPEC
  prose inconsistencies were found and are recorded as spec-errata
  candidates in `VERIFICATION.md`; the pinned table and the enumerated
  midpoint list (the operative data) were followed verbatim.

## Next owner

An independent (non-author) reviewer on this PR's head: verify the
nine aspects with evidence on this same candidate. Real-browser and
production gates are listed as NOT_RUN in `VERIFICATION.md`.
