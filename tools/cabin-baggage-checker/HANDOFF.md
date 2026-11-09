# Handoff — Cabin Baggage Checker （手提行李規定檢查） production

## Fixed spec source

- Spec task id: `labs-cabin-baggage-checker-spec-20261109`
- Spec candidate commit: `92a5d5d91e84796517238b33f189365bf98c3853`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/169
- Spec id: `spec-cabin-baggage-checker-20261109`
- Fixtures vendored verbatim into `test/fixtures.json`
  (SHA-256 `6df72c871163ad4330fe4741d26ccc45ac53a1a7d96b237e66cace30c8993cc7`,
  byte-identical to the spec author's copy): 9 core cases + 3 controller cases.

## Base

- Branch base: `codex/initial-publication` at
  `c08e3243f0257f80fa512d15b1c37fcbeb6ef962`
- Production branch: `muse/cabin-baggage-checker-production-20261109`
- Scope: only `tools/cabin-baggage-checker/` was created or modified.

## What was built

A bilingual (zh-Hant default + en) static tool that checks one cabin bag
(plus an optional personal item) against the six carriers' published
economy-class (international) carry-on rules as verified on 2026-11-09:

- `public/js/core/baggage.mjs` — pure core. Integer-tenths arithmetic
  only; sides sorted descending and compared side-by-side per carrier;
  weight modes `main` (EVA, China Airlines — 7 kg main bag only) and
  `total` (STARLUX 7 kg combined; Tigerair Taiwan, ANA, JAL 10 kg
  combined); personal-item limits `40×30×10` (EVA, STARLUX),
  `40×30×15` (China Airlines), `40×30×20` (ANA), and `null` —
  unpublished, status `notSpecified`, never invented, never failing the
  carrier (Tigerair Taiwan, JAL). The "sum of sides ≤ 115 cm"
  alternative rule is a disclosed SPEC non-goal and is not implemented.
  Strict own-data input shape, the SPEC's fixed validation order and
  error codes (SCHEMA / INPUT_LIMIT / UNICODE / EMPTY / DECIMAL_FORMAT /
  RANGE / ENUM / DUPLICATE), and the fixed report serializer
  (`cabin-baggage-report.json`, canonical compact JSON, keys sorted by
  UTF-16 code units, one trailing LF, 2,097,152-byte cap).
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled); late worker replies are
  dropped by generation + state check, never resurrected.
- `public/js/worker-handler.mjs` — fixed worker message fragment; the
  build concatenates core + handler into the embedded `WORKER_SOURCE`.
- `public/js/app.js` — DOM wiring, textContent/value only; checkbox
  group for the six carriers (collected in table order); per-airline
  result rows with limits, margins, weight mode and personal-item
  status; the pinned bilingual disclaimer is shown in full under every
  result; the report download is created only on explicit click and its
  object URL is revoked after 30 s or on invalidation.
- `public/index.html`, `public/en/index.html` — pinned titles,
  descriptions, labels, buttons, method disclosure and FAQ; preview
  noindex/nofollow, no canonical/hreflang/sitemap, relative
  same-language home and language links.
- `scripts/{build,serve,check,check-generated}.mjs` — reproducible
  preview build (committed `dist-preview/` + `BUILD-MANIFEST.json`),
  loopback-only serve with the SPEC CSP, source contract check,
  generated-output check.
- `test/{core,controller,report,site}.test.mjs` — 55 tests.

## Mode and deviations

- Build-first mode, per the run coordinator's instruction for this
  batch: no registry/coordination claim was made for this production
  task, and nothing here is accepted, merged, or published. The next
  step is the independent bulk review of the fixed candidate.
- File layout follows the repo handbook contract
  (`public/js/core/*.mjs`, `public/js/controller.mjs`,
  `public/js/app.js`) rather than the SPEC's `src/` sketch names; the
  module split (pure core / controller / DOM app) is unchanged.
- Where the SPEC is silent on the JS-level shape of a `buildReport`
  failure for a non-object argument, the core returns
  `{ok:false, error:{code:"INTERNAL", field:null, row:null}}`; the
  SPEC-pinned success format and the OUTPUT_LIMIT behaviour are
  implemented exactly.
- No spec-errata candidates were found: every fixture expectation
  agrees with the SPEC's stated rules, and the rules table in the core
  is deep-checked against the SPEC table by `scripts/check.mjs`.
