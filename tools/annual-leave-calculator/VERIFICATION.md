# Annual Leave Calculator — Author Verification

Environment: Node v24.22.1, Linux, zero npm dependencies (nothing installed).
All commands run inside `tools/annual-leave-calculator/`.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 43 tests, 0 failures |
| `npm run check` (`node scripts/check.mjs`) | PASS — "Project check passed." |
| `npm run build:preview` (`node scripts/build.mjs --mode preview`) | PASS — 8 static files into `dist-preview/` |
| build twice + `sha256sum` tree diff | PASS — byte-identical across two consecutive builds |
| `npm run check:generated:preview` | PASS — "Generated preview matches a fresh rebuild." |
| Loopback HTTP probe (serve on ephemeral port 38153) | PASS — `/index.html` 200 with title 「特休假計算機｜Gloss Tools」; `/en/index.html` 200 with title "Annual Leave Calculator \| Gloss Tools"; SPEC CSP present |

## Test breakdown (43)

- `test/core.test.mjs` (27): all 13 literal SPEC core fixtures deep-compared
  against `run(input)`; missing/null/empty usedDays equivalence; SCHEMA for
  non-object, unknown field, wrong type, missing field and accessor inputs;
  INPUT_LIMIT/UNICODE/EMPTY ordering; year 1899/2101 RANGE vs 1900/2100
  accepted; usedDays grammar (`03`, signs, decimals, spaces, full-width
  digits → INTEGER_FORMAT); 30 accepted / 31 RANGE; DATE_ORDER precedes the
  used-days cross-check; field errors precede cross-field errors; addMonths
  month-end clamping (2026-08-31 + 6 → 2027-02-28) including the derived
  six-month period start; anniv returning to Feb 29 in leap years;
  period-contains-reference invariant; used-days above a zero entitlement;
  hostile markup string stays inert (DATE_FORMAT).
- `test/controller.test.mjs` (5): the 3 literal SPEC controller fixtures
  (state-dirty-error, state-cancel-late, state-replace-late) driven through
  a hand-fired fake scheduler, plus edit-during-busy dropping the pending
  settle and reset restoring the blank draft.
- `test/html.test.mjs` (6): pinned lang/title/H1/description on both pages,
  preview noindex with no production canonical/hreflang link elements and
  no external URLs, same-language home links and path-only language links,
  statutory table/legal basis/FAQ presence, full control-id set.
- `test/build.test.mjs` (3): project check passes on the sources; two
  preview builds are byte-identical (sorted SHA-256 trees equal, 8 files);
  non-preview build modes are refused.
- `test/serve.test.mjs` (2): both language pages, CSS and JS served with
  pinned MIME types and security headers (CSP `default-src 'none'`,
  nosniff, no-referrer, X-Robots-Tag); HEAD returns headers only; unknown
  paths 404; plain and percent-encoded traversal refused; POST → 405.

## Spec errata candidates

None. All 13 core fixtures and all 3 controller fixtures matched the
SPEC's stated rules exactly as written; no fixture-versus-rule conflict
was found. (The `src/` vs `public/js/` layout naming alignment is recorded
in HANDOFF.md as a deviation note, not an errata candidate.)

## NOT_RUN (explicit)

- Real-browser evidence in isolated Chrome and Edge (both languages,
  example/typing/error/edit-after-success/cancel/reset/use-today flows,
  1280×800 and 320 CSS px, true 200% zoom, reduced motion, keyboard
  focus order, contrast measurement): NOT_RUN — no user-focus-safe
  isolated browser mechanism was available to this builder.
- Real-device (phone) checks: NOT_RUN.
- Screen-reader pass: NOT_RUN.
- Production HTTPS/SEO gate (self-canonical pair, reciprocal hreflang,
  x-default, robots.txt/sitemap, production origin): NOT_RUN — the
  planned origin is not configured; the candidate is preview-noindex by
  design.
- Registry submission, independent review, acceptance, merge and
  deployment: NOT_RUN — outside the builder's scope for this build-first
  task.
