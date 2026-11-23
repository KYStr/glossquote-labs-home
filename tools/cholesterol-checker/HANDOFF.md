# Handoff — Cholesterol Checker （膽固醇分級）

Build-first production candidate. Not accepted, not merged, not published;
an independent reviewer must still score the nine predeclared aspects
against this fixed candidate.

## Fixed spec source

- Spec task id: `labs-cholesterol-checker-spec-20261121`
- Spec id: `spec-cholesterol-checker-20261121`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/369
- Spec files: `docs/specs/cholesterol-checker/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}` (registry rev 1697)
- Spec branch: `muse/spec-cholesterol-checker-20261121` @ `69f3b12b`

## Base and scope

- Production base: `codex/initial-publication` @ `8c265267`
- Branch: `muse/cholesterol-checker-production-20261121`
- Changed paths: only `tools/cholesterol-checker/` (new directory).
  `dist-preview/` is a reproducible build artifact and is git-ignored.
- No registry/coordination commands were run by the builder.

## What was built

- `public/js/core/core.mjs` — pure core. NCEP ATP III literal tables for
  total / LDL / HDL / triglycerides (left-closed intervals: a cut-point
  value belongs to the higher band); SPEC validation order per field in
  total → ldl → hdl → triglycerides order (capacity 5 chars → surrogate
  → EMPTY → INTEGER_FORMAT → RANGE 1–9999) with the fixed error
  codes/fields; `nonHdl = total − hdl` as plain integer subtraction
  (shown as-is when zero or negative, never graded); overall rank is the
  maximum item severity (0 → all-desirable, 1 → borderline, ≥2 →
  needs-attention); report serialization (compact JSON, keys sorted by
  UTF-16 code units recursively, one trailing LF, 2,097,152-byte cap →
  OUTPUT_LIMIT).
- `public/js/core/controller.mjs` — draft + generation state machine with
  the six flow states (empty / dirty / busy / success / error / cancelled);
  edits, example loads, cancel and reset invalidate the old result and
  download immediately; late results from older generations are dropped;
  transport is injected.
- `public/js/app.js` + `public/js/worker-handler.mjs` — the build embeds
  the fixed core + handler source bytes into the built app; the page
  creates a module Worker from a Blob URL of that string, terminates it on
  cancel / edit / reset / replace / success / pagehide, and only creates
  the download Blob URL on an explicit click (revoked after 30 s or on
  invalidation). All rendering uses textContent/value. The HDL protective
  note is shown only when the HDL band is `high`; the pinned disclaimer
  is static HTML above the results and in the footer.
- `public/index.html` (zh-Hant) and `public/en/index.html` — full static
  bilingual pages with the SPEC's fixed titles, descriptions, labels,
  the four FAQ answers and rules disclosure; candidate convention: robots
  noindex, no production canonical/hreflang; same-language home links use
  `../../`.
- `public/styles/app.css` — shared paper/ink tokens, shared breakpoints
  (48rem / 75rem), two-layer focus treatment, 44 px targets, reduced-motion
  support, plus disclaimer / classification-list / HDL-note styles.
- `scripts/build.mjs` (reproducible preview build with Worker-source
  embedding), `scripts/check.mjs` (syntax, zero-dependency manifest,
  forbidden sinks, page metadata, pinned-disclaimer verbatim check,
  fixture coverage), `scripts/check-generated.mjs` (rebuild and
  byte-compare), `scripts/serve.mjs` (loopback-only static server with
  the SPEC CSP and security headers, traversal/symlink rejection, no
  logging).
- `test/` — 64 tests: all 14 core fixtures and 3 controller fixtures from
  the SPEC verbatim, plus hand-derived cut-point ±1 coverage for every
  NCEP ATP III threshold, nonHdl zero/negative cases, grammar/capacity/
  field-order/schema/surrogate cases, report byte and SHA-256 checks,
  page checks, build reproducibility, an end-to-end run of the embedded
  Worker source, an HTTP serve probe, and built-app DOM tests (success,
  HDL note show/hide, validation focus, Worker failure modes, late-result
  rejection, zh rendering).

## Deviations

- File layout follows the handbook file contract
  (`public/js/core/*.mjs`, `public/js/app.js`) rather than the `src/*.mjs`
  names used descriptively in SPEC §implementation; every behaviour the
  SPEC pins (pure core, controller generations, fixed-source Worker,
  test-imported same core) is preserved.
- One spec errata candidate (wording only, no behaviour change): SPEC
  inputsOutputs §3 says nonHdl is "必為正整數" and in the same sentence
  that total − hdl "可能 ≤ 0". The operative rule ("若結果 ≤ 0，仍如實
  顯示該整數，不另報錯") is unambiguous and is what the build implements;
  see VERIFICATION.md.

## Next owner

Independent reviewer (not the author): score the nine aspects on the PR
head, with the NOT_RUN items in VERIFICATION.md still open.
