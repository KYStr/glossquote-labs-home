# Handoff — tax-included-converter (production)

- Tool: `tools/tax-included-converter/` in `KYStr/glossquote-labs-home`
- Branch: `muse/tax-included-converter-production-20261109` (base `codex/initial-publication`)
- Spec (fixed source): commit `21410d31a0d51098e6bc71ede98cc36e9b841f72`, spec PR #242,
  `docs/specs/tax-included-converter/` (`SPEC.md`, `BRIEF.md`, `fixtures.json`
  25 cases, `AUTHOR-CHECK.md`), registry rev 1392
- Spec fixtures SHA-256: `6e15f67484f6fabadf1049e231c992a9720b66609782f79b320cdbd3f69e850b`
- Mode: build-first. No registry/coordination command was run. No merge,
  no publish. DRAFT PR only, for independent review.

## What was built

Single-amount two-way conversion (net→gross+tax, gross→net+tax) and
multi-line net mode (tax computed once on the subtotal, per-line tax sum
and difference shown), editable rate defaulting to Taiwan business tax
5%, all amounts whole NT dollars, exact BigInt rational arithmetic
(round half-up, applied once). Full bilingual zh-TW/en pages, worker
+ controller state machine (empty/dirty/busy/success/error/cancelled
with real Cancel), report download as canonical JSON, reproducible
preview build with manifest.

Files (only `tools/tax-included-converter/` was touched):

- `package.json` — Node >= 24, ESM, zero runtime dependencies
- `public/index.html`, `public/en/index.html` — bilingual UI, preview noindex
- `public/js/core/tax-included.mjs` — pure validation + algorithm
- `public/js/controller.mjs`, `public/js/worker-handler.mjs`, `public/js/app.js`
- `public/styles/tax-included.css`
- `scripts/{build,check,check-generated,serve}.mjs`
- `test/fixtures.json` (verbatim spec fixtures), `test/tax-included-{core,controller,report}.test.mjs`
- `HANDOFF.md`, `VERIFICATION.md`

## SPEC DEFECT — the delivered spec file is truncated (read first)

`SPEC.md` at the fixed source commit is 7,626 bytes and ends mid-sentence
in `inputsOutputs` (item 1 of the content-check list: "不是 `single` 或
`lines` 為" followed by a literal `...[truncated 9113 chars]` marker).
Sections implementation, acceptance, tests and handoff are absent, and
the content-check list stops after `mode`. This is a defect in the
source spec, not a builder error: the committed file itself contains the
truncation marker (verified with `od -c` on the last bytes).

What was done about it: the build follows the surviving SPEC text,
`fixtures.json` (all 22 core + 3 controller cases) and `AUTHOR-CHECK.md`
(which pins the formulas, the BigInt rational approach, the rate
grammar, the caps and the error codes). The 14 success fixtures were
independently re-derived with Python `fractions.Fraction` before coding
(0 mismatches). Every rule that had to be supplied where the SPEC text
is missing is listed below as a builder-pinned decision for the
reviewer to confirm or correct; none of them contradicts any surviving
SPEC text or fixture.

## Builder-pinned decisions (SPEC text missing — reviewer to confirm)

1. Check order: schema gate, then `mode`, `ratePercent`, `basis`,
   `amount`, `lines` (the input's own key order); first error wins.
   Inactive-mode fields receive only INPUT_LIMIT + UNICODE checks and
   are otherwise ignored (the run-5 pattern from the sibling tools).
2. Raw limits: `mode` 16 (SPEC-pinned); `ratePercent` 8, `basis` 16,
   `amount` 16, per-line amount 16 (builder-pinned; amounts are at most
   12 digits, the rate at most "100.00").
3. Rate: grammar `^[0-9]+(\.[0-9]{1,2})?$` → DECIMAL_FORMAT; range
   0 < P ≤ 10000 hundredths (0% and >100% → RANGE). Canonical result
   rate drops trailing zeros ("5.50" → "5.5", fixture-pinned).
4. `basis`/`amount` null in single mode → EMPTY on that field;
   non-`net`/`gross` basis → ENUM.
5. Lines mode: null or empty list → EMPTY on `lines`; >20 rows →
   ROW_LIMIT on `lines`; per-row errors name field `amount` with the
   1-based row; subtotal over 999,999,999,999 → RANGE on `lines`.
6. Worker failure → `error` state with fixed `WORKER_ERROR` (the SPEC
   has no `unavailable` state; it pins INTERNAL/WORKER_ERROR for
   resource/worker failures).
7. Estimate disclaimer and FAQ text are builder-authored from the
   SPEC's scope/goal (the SPEC's tests section, which the userFlow
   cites for the disclaimer wording, is in the truncated part).
   Disclaimer: tax computed once on the total per VAT Act §14,
   estimates only, not an issued/filed invoice.
8. No draft persistence: the SPEC pins the draft to the current page
   ("切換語言或離頁會失去草稿"), so the app passes no storage adapter
   to the controller (unlike sibling tools that persist drafts). The
   controller still accepts an injected storage adapter for tests.
9. Edit from `empty` stays `empty` (no result to revoke); edit from
   success/error/cancelled/busy → `dirty` (busy terminates the worker).
   This follows the sibling-tool reading of the state table; the
   fixtures do not cover edit-from-empty.

## Spec-errata candidates

- **Errata 0 against the fixtures.** No fixture conflicts with the
  surviving normative text; all 22 core cases pass verbatim and the
  14 success cases were independently re-derived (0 mismatches).
- **Spec defect (not a fixture errata):** the truncated `SPEC.md`
  described above. The independent document reviewer should repair or
  re-issue the spec's missing sections (implementation, acceptance,
  tests, handoff, and the rest of the content-check list) and confirm
  the nine builder-pinned decisions.

## Verification

- `npm test`: 53/53 pass (22 fixture core + 18 hand-derived core +
  3 fixture controller + 7 hand controller + 3 report).
- `npm run check`: pass.
- `npm run build:preview` run twice: byte-identical
  (see VERIFICATION.md).
- `npm run check:generated:preview`: pass.
- Browser / real-device checks: NOT_RUN (no isolated-browser
  mechanism available to this builder).

## Known limitations

- Preview build only; no production origin is approved, so the
  canonical URLs are the pinned preview canonicals.
- The lines editor keeps at most 20 rows; the add-row button disables
  at 20.
- Mode switching remembers the inactive mode's values in page memory
  only; leaving the page loses both.

## Next owner

Independent reviewer: review this candidate commit against the fixed
spec, confirm or correct the nine builder-pinned decisions above, and
repair/re-issue the truncated SPEC.md. Do not merge or publish from
this PR.
