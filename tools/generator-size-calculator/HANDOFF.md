# Handoff — Generator Size Calculator （發電機容量試算）

Build-first production candidate. Not accepted, not merged, not published;
an independent reviewer must still score the nine predeclared aspects
against this fixed candidate.

## Fixed spec source

- Spec task id: `spec-generator-size-calculator-20261121`
- Spec id: `spec-generator-size-calculator-20261121`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/385
- Spec candidate commit (PR head, read back 2026-11-23): `b2310876b59962a50dd43d4afdd53a3a80fe4cb7`
- Spec files: `docs/specs/generator-size-calculator/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}` at that commit
- Registry rev at handoff: 1772 (per the parent task; the builder ran no
  registry/coordination commands)

## Base and scope

- Production base: `codex/initial-publication` @ `8c2652671012498891e7f7afe02fdca3f154aa64`
- Branch: `muse/generator-size-calculator-production-20261121`
- Changed paths: only `tools/generator-size-calculator/` (new directory).
  `dist-preview/` is a reproducible build artifact and is git-ignored.
- No registry/coordination commands were run by the builder.

## What was built

- `public/js/core/core.mjs` — pure core. Exact integer arithmetic only
  (no floating point on operands or results): total running watts is the
  plain sum; the surge adds only the single largest starting increment
  (starting − running), first row wins a tie, null source when the max
  increment is 0; requiredRunningW = ceil(total × 5 ÷ 4); kVA tenths =
  ceil(W ÷ 80) (kVA = W ÷ 0.8 ÷ 1000 ceiled to 0.1), formatted with
  exactly one decimal; recommendedKva = max(requiredKva, peakKva);
  retail table 1.0–20.0 kVA, smallest table size at or above the
  recommendation, above 20.0 ceiled to 0.5 kVA and flagged oversize.
  SPEC validation order (SCHEMA → row count EMPTY/ROW_LIMIT → per-row
  name/runningWatts/startingWatts, each INPUT_LIMIT → EMPTY → UNICODE →
  INTEGER_FORMAT → RANGE → duplicate names → cross-field starting <
  running) with the fixed error codes/fields/rows; watts grammar is
  `0` or non-zero-leading integers (`007` invalid); running 1–20000 W,
  starting 1–30000 W; names 1–40 units, empty or all-whitespace is
  EMPTY, control chars or unpaired surrogates are UNICODE, duplicates
  compared exactly as entered (case-sensitive, untrimmed). The 12 Honda
  preset values are pinned verbatim. Report serialization (compact JSON,
  keys sorted by UTF-16 code units recursively, one trailing LF,
  2,097,152-byte cap → OUTPUT_LIMIT).
- `public/js/core/controller.mjs` — draft (appliance list) + generation
  state machine with the six flow states (empty / dirty / busy / success
  / error / cancelled); edits, example loads, row add/remove, cancel and
  reset invalidate the old result and download immediately; late results
  from older generations are dropped; transport is injected. Default
  draft is the SPEC default (Refrigerator 192/1200, Lights 100/100);
  the example is the first SPEC fixture (fridge-lights-tv).
- `public/js/app.js` + `public/js/worker-handler.mjs` — the build embeds
  the fixed core + handler source bytes into the built app; the page
  creates a module Worker from a Blob URL of that string, terminates it
  on cancel / edit / reset / replace / success / pagehide, and only
  creates the download Blob URL on an explicit click (revoked after 30 s
  or on invalidation). Rows are built dynamically (name / running /
  starting inputs, per-row Honda preset menu, per-row remove button,
  per-row error line); row edits never rebuild the rows, so focus is
  preserved. All rendering uses textContent/value. Errors show the row
  number, mark the offending field with aria-invalid/aria-errormessage,
  and focus the first error field on submit failure. Reset restores the
  SPEC default draft and focuses the first name field.
- `public/index.html` (zh-Hant) and `public/en/index.html` — full static
  bilingual pages with the SPEC's fixed titles, descriptions, labels,
  standing disclaimer, the three SPEC FAQs and rules disclosure;
  candidate convention: robots noindex, no production canonical/hreflang.
- `public/styles/app.css` — shared paper/ink tokens, shared breakpoints
  (48rem / 75rem), two-layer focus treatment, 44 px targets,
  reduced-motion support, plus appliance-row grid, preset select, result
  table and oversize-note styles.
- `scripts/build.mjs` (reproducible preview build with Worker-source
  embedding), `scripts/check.mjs` (syntax, zero-dependency manifest,
  forbidden sinks, page metadata, fixture coverage, 12-preset check),
  `scripts/check-generated.mjs` (rebuild and byte-compare),
  `scripts/serve.mjs` (loopback-only static server with the SPEC CSP and
  security headers, traversal/symlink rejection, no logging).
- `test/` — 62 tests: all 14 core fixtures and 3 controller fixtures
  from the SPEC verbatim, plus hand-derived boundary/grammar/capacity/
  surrogate/duplicate/cross-field/schema/preset/invariant cases, report
  byte and SHA-256 checks, page checks, build reproducibility, an
  end-to-end run of the embedded Worker source, a real-HTTP serve probe,
  and built-app DOM tests (example render with all result facts,
  validation focus on the right row, Worker failure recovery,
  late-result rejection, row add/remove and preset fill, both languages).

## Process note

- During `git clone` of the repo and a later `git status`, the
  environment raised execution-risk notices for glossquote repo content.
  Per the user's four informed confirmations on 2026-11-23 (14:31,
  14:33:56, 14:58:49, 15:04:46) covering exactly this class of prompt on
  glossquote repo clone/fetch/checkout/build/test work, the builder
  continued without stopping or re-asking. No other class of risk
  appeared.

## Spec errata candidates

1. Layout naming: the SPEC implementation section refers to `src/core.mjs`,
   `src/controller.mjs` and `src/app.mjs`, while the house layout fixed by
   `docs/IMPLEMENTATION-CHECKLIST.md` (and the parent build task) places
   the same modules under `public/js/core/` and `public/js/app.js`, as in
   the sibling tools. Built per the handbook/task layout; no functional
   impact. Suggest the SPEC be aligned to the handbook layout wording.
2. Surrogate-check scope (SPEC ambiguity, not a fixture conflict): the
   inputsOutputs preamble states the per-field check order as capacity,
   then surrogate, then grammar, while step 3's UNICODE clause is phrased
   for the name field only ("名稱含控制字元…或不成對 surrogate →
   UNICODE"). The build applies UNICODE to unpaired surrogates in the
   watts fields as well (following the generic preamble order); the
   alternative reading would report INTEGER_FORMAT for a lone surrogate
   in a watts field. No fixture covers this case. Suggest the SPEC pin
   the scope explicitly.
3. None found in the rules or fixtures: all 9 numeric core fixture
   values were independently recomputed (Python Fraction exact-rational
   arithmetic) and match the SPEC rules exactly, including the
   exact-20.0 table boundary (12800 W), the 20.1 oversize step (12801 W),
   the exact-tenth case (2320 W → 2.9 kVA) and the largest-only surge
   rule; all 14 core fixtures deep-equal.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, preset fill, row add/remove, error focus,
  edit-after-success, cancel, reset, real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  `https://generator-size-calculator.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.
