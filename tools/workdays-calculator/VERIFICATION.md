# Workdays Calculator — Author Verification

Environment: Node v24.22.1, Linux, zero npm dependencies (nothing installed).
All commands run inside `tools/workdays-calculator/`.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 64 tests, 0 failures |
| `npm run check` (`node scripts/check.mjs`) | PASS — "Project check passed." |
| `npm run build:preview` (`node scripts/build.mjs --mode preview`) | PASS — 8 static files into `dist-preview/` (run twice) |
| `npm run check:generated:preview` | PASS — "Generated preview matches a fresh rebuild." (byte-identical) |
| Loopback HTTP probe (serve on 127.0.0.1:4179) | PASS — `/index.html` 200 with title 「工作日計算機｜Gloss Tools」; `/en/index.html` 200 with title "Workdays Calculator \| Gloss Tools"; SPEC-pinned CSP served (including `worker-src 'blob:'`); `/../package.json` traversal → 404 |

## Test breakdown (64)

- `test/core.test.mjs` (46): all 23 literal SPEC core fixtures
  deep-compared against `run(input)`; JDN anchors (2000-01-01 =
  2451545, a Saturday; civil round trips); the pinned composition
  invariant evaluated for all 8 successful count fixtures
  (shift(start, count) = end whenever the end date is a business day,
  including the reversed-range case); additivity
  count(A,B)+count(B,C)=count(A,C) and antisymmetry with a holiday set;
  shift round trips for n ∈ {−3660, −10, −1, 0, 1, 10, 3660} with and
  without holidays; shift −3660 = −5124 calendar days landing on a
  Monday; date endpoints 1900-01-01/2100-12-31 accepted, 2101-01-01
  RANGE on both fields; 2000-02-29 (400 rule) valid; SCHEMA class
  (non-object, missing mode, non-string mode, extra field per mode,
  missing field, wrong type, accessor); INPUT_LIMIT/UNICODE before
  grammar; days grammar (`-0`, `007`, `00`, `+1`, `1e2`, spaces,
  decimals → INTEGER_FORMAT; empty → EMPTY; −3661 → RANGE); holiday
  rows (blank lines count toward row numbers, CR line → DATE_FORMAT
  row 1, out-of-range line → RANGE row 1, lone surrogate → UNICODE row
  null); the 400/401-line capacity interaction (see errata); holidays
  exactly 4096 units accepted, 4097 INPUT_LIMIT; hostile markup strings
  stay inert; the canonical report bytes for basic-week compared
  against a hand-written literal (sorted keys, one trailing LF), plus
  nested key sorting.
- `test/controller.test.mjs` (7): the 3 literal SPEC controller
  fixtures (state-dirty-error, state-cancel-late, state-replace-late)
  driven through a hand-fired fake scheduler; draft projection for
  both modes; edit-during-busy dropping the pending settle; mode
  switch invalidating a settled result while keeping shared fields;
  reset restoring the pinned default draft.
- `test/html.test.mjs` (6): pinned lang/title/H1/description on both
  pages, preview noindex with no production canonical/hreflang link
  elements and no external URLs, same-language home links and
  path-only language links, rules and the three pinned FAQs present,
  full control-id set.
- `test/build.test.mjs` (3): project check passes on the sources; two
  preview builds are byte-identical (sorted SHA-256 trees equal, 8
  files); non-preview build modes are refused.
- `test/serve.test.mjs` (2): both language pages, CSS and JS served
  with pinned MIME types and security headers (CSP `default-src
  'none'`, nosniff, no-referrer, X-Robots-Tag); HEAD returns headers
  only; unknown paths 404; plain and percent-encoded traversal
  refused; POST → 405.

## Spec errata candidates

Two, recorded in full in HANDOFF.md:

1. Substantive: the 400-line holiday cap is arithmetically
   incompatible with the 4096-unit raw cap under the pinned
   check order (400 valid lines need 4,399 units), so the
   tests-section expectation "exactly 400 lines is legal" cannot
   hold and ROW_LIMIT is unreachable. Implemented as written;
   the tests assert the normative outcome (INPUT_LIMIT) and the
   largest fittable list (372 lines).
2. Minor: the days grammar regex as literally written matches
   "-0", contradicting the SPEC's own parenthetical and test
   list; implemented per the pinned test behaviour ("-0" →
   INTEGER_FORMAT).

## NOT_RUN (explicit)

- Real-browser evidence in isolated Chrome and Edge (both languages,
  example/typing/error/edit-after-success/mode-switch/cancel/reset/
  download flows, 1280×800 and 320 CSS px, true 200% zoom, reduced
  motion, keyboard focus order, contrast measurement): NOT_RUN — no
  user-focus-safe isolated browser mechanism was available to this
  builder.
- Real-device (phone) checks: NOT_RUN.
- Screen-reader pass: NOT_RUN.
- Production HTTPS/SEO gate (self-canonical pair, reciprocal
  hreflang, x-default, robots.txt/sitemap, production origin):
  NOT_RUN — the planned origin is not configured; the candidate is
  preview-noindex by design.
- Registry submission, independent review, acceptance, merge and
  deployment: NOT_RUN — outside the builder's scope for this
  build-first task.
