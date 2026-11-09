# Handoff — Shared Electricity Split （分租電費分攤）

## Fixed source

- Spec: `spec-shared-electricity-split-20261109`, task `labs-shared-electricity-split-spec-20261109`
- Spec candidate commit: `4b1c5422b3f8eef2a1b45c14d9997b53be13f799` (draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/143)
- The spec PR is not merged into this candidate's base, so the literal
  fixtures are vendored verbatim in `test/fixtures.mjs` (header notes the
  spec candidate commit); all test expectations come from that vendored
  copy, never from implementation output.
- Production base: `codex/initial-publication` @ `b7ffa5a133ac7a2b3221d0807e61c2c3faa48442`
- Scope of this candidate: only `tools/shared-electricity-split/`.
- Build-first mode: no registry/coordination commands were run for this
  production; independent review and registry submission are the parent
  coordinator's next steps.

## What was built

A bilingual (zh-Hant default, en) static tool that splits a known total
electricity bill across 2–10 rooms by submeter readings:

- `public/js/core/split.mjs` — pure validation + computation. Exact
  integer pipeline: readings in tenths of a kWh; common-area usage
  (total meter delta − rooms' sum) folded into each room's weight as
  `usage × N + common`; amounts allocated with the largest remainder
  method in BigInt so they always sum exactly to the bill; zero-weight
  falls back to an equal split. Validation follows the SPEC's fixed
  order (size → schema → totalBill → totalDelta → room count → per-room
  fields → duplicates → regression → total-delta-under) and returns the
  first error as `{code, field, row}`.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) with a Worker injected by
  the app; late or stale-generation replies are dropped.
- `public/js/worker-handler.mjs` — fragment concatenated after the core
  by the build into the fixed worker source; the page runs the same
  `run` the tests import, in a module Worker from a Blob URL.
- `public/js/app.js` — DOM wiring with dynamic room rows (add/remove
  within 2–10), per-field and per-row error slots, focus only after a
  failed submit, results table (common-share column only when a total
  meter delta was given), and the fixed-name report download
  (`shared-electricity-split-report.json`, canonical compact JSON + one
  trailing LF, 2,097,152-byte limit).
- `public/index.html`, `public/en/index.html` — static bilingual pages
  with the SPEC-pinned titles, descriptions, FAQ, and candidate rules
  (noindex, no canonical/hreflang, relative language links,
  same-language home links).
- `scripts/` — reproducible preview build (byte-identical across runs,
  BUILD-MANIFEST.json with per-file SHA-256), static check,
  generated-output check, loopback-only serve.
- `test/` — core tests (9 vendored literal fixtures deep-compared, plus
  boundary/error-order/invariant cases), controller tests (3 vendored
  controller fixtures plus generation/structure/failure cases), report
  serialization tests with hand-written expected bytes.

## Deviations from the SPEC

None. No fixture conflicted with a SPEC rule, and no spec-errata
candidates were found (see VERIFICATION.md).

## Next owner

Independent reviewer: verify this candidate head against the SPEC's
nine predeclared aspects; real-browser/real-device evidence is NOT_RUN
(see VERIFICATION.md) and must be gathered with an approved isolated
browser before acceptance.
