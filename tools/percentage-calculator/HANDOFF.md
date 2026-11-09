# Handoff — Percentage Calculator （百分比計算機）

Build-first production candidate. Not accepted, not merged, not published;
an independent reviewer must still score the nine predeclared aspects
against this fixed candidate.

## Fixed spec source

- Spec task id: `labs-percentage-calculator-spec-20261109`
- Spec id: `spec-percentage-calculator-20261109`
- Spec candidate commit: `8dcea8e38aa4647e617db6c10a2d3d7ec7db247d`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/136
- Spec files: `docs/specs/percentage-calculator/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}` at that commit

## Base and scope

- Production base: `codex/initial-publication` @ `144a3b954b48c3c5096cf6a02ea9c694343d7b33`
- Branch: `muse/percentage-calculator-production-20261109`
- Changed paths: only `tools/percentage-calculator/` (new directory).
  `dist-preview/` is a reproducible build artifact and is git-ignored.
- No registry/coordination commands were run by the builder.

## What was built

- `public/js/core/core.mjs` — pure core. Exact BigInt-rational arithmetic;
  the three modes (`of` / `share` / `change`); SPEC validation order
  (SCHEMA → mode → first → second → division-by-zero) with the fixed error
  codes/fields; `value` rounded half away from zero at 10 decimals and
  `display` rounded from the exact rational at 2 decimals (never from
  `value`); `direction` from the exact sign of second − first; normalized
  echo; report serialization (compact JSON, keys sorted by UTF-16 code
  units recursively, one trailing LF, 2,097,152-byte cap → OUTPUT_LIMIT).
- `public/js/core/controller.mjs` — draft + generation state machine with
  the six flow states (empty / dirty / busy / success / error / cancelled);
  edits, mode changes, example loads, cancel and reset invalidate the old
  result and download immediately; late results from older generations are
  dropped; transport is injected.
- `public/js/app.js` + `public/js/worker-handler.mjs` — the build embeds
  the fixed core + handler source bytes into the built app; the page
  creates a module Worker from a Blob URL of that string, terminates it on
  cancel / edit / reset / replace / success / pagehide, and only creates
  the download Blob URL on an explicit click (revoked after 30 s or on
  invalidation). All rendering uses textContent/value.
- `public/index.html` (zh-Hant) and `public/en/index.html` — full static
  bilingual pages with the SPEC's fixed titles, descriptions, labels,
  sentence templates (rendered by the app), FAQ and rules disclosure;
  candidate convention: robots noindex, no production canonical/hreflang.
- `public/styles/app.css` — shared paper/ink tokens, shared breakpoints
  (48rem / 75rem), two-layer focus treatment, 44 px targets, reduced-motion
  support.
- `scripts/build.mjs` (reproducible preview build with Worker-source
  embedding), `scripts/check.mjs` (syntax, zero-dependency manifest,
  forbidden sinks, page metadata, fixture coverage),
  `scripts/check-generated.mjs` (rebuild and byte-compare),
  `scripts/serve.mjs` (loopback-only static server with the SPEC CSP and
  security headers, traversal/symlink rejection, no logging).
- `test/` — 44 tests: all 21 core fixtures and 3 controller fixtures from
  the SPEC verbatim, plus hand-derived boundary/grammar/zero/schema/
  surrogate cases, the display-not-from-value trap case, report byte and
  SHA-256 checks, page checks, build reproducibility, an end-to-end run of
  the embedded Worker source, and an HTTP serve probe.

## Deviations

- File layout follows the handbook file contract
  (`public/js/core/*.mjs`, `public/js/app.js`) rather than the `src/*.mjs`
  names used descriptively in SPEC §implementation; every behaviour the
  SPEC pins (pure core, controller generations, fixed-source Worker,
  test-imported same core) is preserved.
- No spec errata candidates: every fixture expectation was reproduced from
  the SPEC's stated rules exactly (see VERIFICATION.md).

## Next owner

Independent reviewer (not the author): score the nine aspects on the PR
head, with the NOT_RUN items in VERIFICATION.md still open.
