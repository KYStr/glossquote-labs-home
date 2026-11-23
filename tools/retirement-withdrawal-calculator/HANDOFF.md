# Handoff — Retirement Withdrawal Calculator （退休提領計算）

Build-first production candidate. Not accepted, not merged, not published;
an independent reviewer must still score the nine predeclared aspects
against this fixed candidate.

## Fixed spec source

- Spec id: `spec-retirement-withdrawal-calculator-20261121`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/377
- Spec candidate commit: `e1cd772171e3463943ebd006e2352de1e69a42c8` (PR #377 head, read back via `gh pr view`)
- Spec registry rev: 1732
- Spec files: `docs/specs/retirement-withdrawal-calculator/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}`
- Pinned rules followed: depletion (withdrawal at year start, balance earns
  return, withdrawal grows with inflation from year 2, yearly amounts
  ROUND_HALF_UP to cents, 100-year cap); 4% rule target = annualSpending × 25;
  Bengen 1994 + Trinity 1998, 4% disclosed as a rounded simplification of
  the original SAFEMAX 4.15%.

## Base and scope

- Production base: `codex/initial-publication` @ `8c265267`
- Branch: `muse/retirement-withdrawal-calculator-production-20261121`
- Changed paths: only `tools/retirement-withdrawal-calculator/` (new directory).
  `dist-preview/` is a reproducible build artifact and is git-ignored.
- No registry/coordination commands were run by the builder (no production
  registration, per the run-5 mode).

## What was built

- `public/js/core/core.mjs` — pure core. Exact BigInt arithmetic in cents /
  hundredths of a percent; no Number math on money or rates. Two modes
  (`depletion` / `four-percent`) with the SPEC validation order (SCHEMA →
  mode → per-field INPUT_LIMIT → EMPTY → UNICODE → DECIMAL_FORMAT →
  DECIMAL_PLACES → RANGE, field order per mode); depletion simulation with
  W_n = ROUND_HALF_UP(W_1 × (1+i)^(n−1)) from the exact power once, partial
  final year with return 0.00, exact-depletion produces no zero partial row,
  `never` for zero withdrawal, `beyond-horizon` at 100 full years; 4% rule
  target/implied/shortfall/meetsRule (implied ≤ "4.00"); report
  serialization (compact JSON, keys sorted by UTF-16 code units recursively,
  one trailing LF, 2,097,152-byte cap → OUTPUT_LIMIT).
- `public/js/core/controller.mjs` — per-mode drafts (mode switch preserves
  each mode's inputs; reset restores the depletion defaults
  `{"mode":"depletion","portfolioValue":"","annualWithdrawal":"","returnRatePct":"5","inflationRatePct":"2"}`),
  generation state machine with the six flow states (empty / dirty / busy /
  success / error / cancelled); edits, mode changes, example loads, cancel
  and reset invalidate the old result and download immediately; late results
  from older generations are dropped; transport is injected.
- `public/js/app.js` + `public/js/worker-handler.mjs` — the build embeds
  the fixed core + handler source bytes into the built app; the page
  creates a module Worker from a Blob URL of that string, terminates it on
  cancel / edit / reset / replace / success / pagehide, and only creates
  the download Blob URL on an explicit click (revoked after 30 s or on
  invalidation). All rendering uses textContent/value. Yearly table is
  paginated 25 rows per page with keyboard-operable prev/next. Currency
  (NT$ / $ / ¥, default NT$) is display-only: it changes the shown label
  and thousands separators, never the calculation or the report.
- `public/index.html` (zh-Hant) and `public/en/index.html` — full static
  bilingual pages with the SPEC's fixed titles, descriptions, H1s,
  disclaimer verbatim, FAQ (three Q&As) and rules disclosure; candidate
  convention: robots noindex, no production canonical/hreflang, same-language
  `../../` home links.
- `public/styles/app.css` — shared paper/ink tokens, shared breakpoints
  (48rem / 75rem), two-layer focus treatment, 44 px targets, reduced-motion
  support, plus yearly-table and pagination styles.
- `scripts/build.mjs` (reproducible preview build with Worker-source
  embedding), `scripts/check.mjs` (syntax, zero-dependency manifest,
  forbidden sinks, page metadata incl. the fixed disclaimer, fixture
  coverage 15 core + 3 controller), `scripts/check-generated.mjs`
  (rebuild and byte-compare), `scripts/serve.mjs` (loopback-only static
  server with the SPEC CSP and security headers, traversal/symlink
  rejection, no logging).
- `test/` — 65 tests: all 15 core fixtures and 3 controller fixtures from
  the SPEC verbatim, plus hand-derived boundary/grammar/rounding/schema/
  surrogate cases (cross-checked with an independent Python Decimal
  calculation), fixture invariants (no negative end balance, withdrawals
  never decrease, removing inflation never shortens depletion), report byte
  and SHA-256 checks, page checks, build reproducibility, an end-to-end run
  of the embedded Worker source, app-level DOM/Worker tests (example,
  validation focus, Worker failures, late-result rejection, mode switch,
  100-row pagination), and a real-HTTP serve probe.

## Interpretation notes (SPEC silent — reviewer to confirm)

- Leading zeros (`007`, `00.5`) are rejected as DECIMAL_FORMAT, following
  the house canonical-decimal grammar used by the other tools. SPEC says
  "十進位字串" without addressing leading zeros; if they should be
  accepted, SPEC should say so.
- An invalid mode value returns `{code:"SCHEMA", field:"mode"}`; structural
  problems (missing/extra keys, non-string values, accessors) return
  `{code:"SCHEMA", field:null}`. SPEC pins the code but not the field.
- "每欄最多 16 單元" is read as UTF-16 code units (`String.length`).
- `"-0"` is accepted as zero (per the SPEC parenthetical); `"-5"` on a
  money field is grammar-valid and then RANGE (the minus is in the correct
  position, the value is out of range).
- ROUND_HALF_UP ties on negative returns round half away from zero
  (Decimal ROUND_HALF_UP semantics, as used by the spec author's Python
  generator). No fixture contains such a tie; a hand-derived tie case is
  covered in `test/core.test.mjs`.
- Reset focuses the mode group (the first source control), following the
  house template; SPEC says "聚焦首來源欄".

## Spec errata candidates

1. Leading-zero grammar gap (see above): SPEC's DECIMAL_FORMAT list does
   not say whether `007` / `00.5` are valid decimal strings. The builder
   rejected them; the spec should pin this either way. No fixture covers it.
2. None other found. All 15 core fixture values follow from the SPEC's
   stated rules; no fixture-versus-rule conflict was found (the SPEC's own
   rule — formula text wins over any printed example — was not needed).

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, mode switch,
  currency switch, cancel, reset, pagination, real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  https://retirement-withdrawal.glossquote.com (not yet configured).
