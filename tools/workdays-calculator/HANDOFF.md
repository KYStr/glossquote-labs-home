# Workdays Calculator — Production Handoff

## Fixed source

- Spec document: `spec-workdays-calculator-20261109`, fixed at commit
  `eb84069e2726fd311a7df0e733377153dd869a87`
  (`docs/specs/workdays-calculator/` — BRIEF.md, SPEC.md, fixtures.json,
  AUTHOR-CHECK.md)
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/225
- Production base: `codex/initial-publication` @
  `328dee40ef0de631d7d50a443e5d5eb2e7668164` (fetched fresh at build start)
- Scope: only `tools/workdays-calculator/` was created or modified.
- Mode: build-first. No registry/coordination commands were run by the
  builder; registration/submission is the parent coordinator's step.

## What was built

A bilingual (zh-Hant default, English) static tool that counts business
days between two dates or steps N business days from a start date,
excluding Saturdays, Sundays, and a user-supplied holiday list, exactly
per the fixed SPEC:

- `public/js/core/core.mjs` — pure `run(input)`: mode pre-check (SCHEMA
  before ENUM before the exact field-set check), per-field validation in
  the pinned order (capacity INPUT_LIMIT → lone-surrogate UNICODE →
  EMPTY → DATE_FORMAT/INTEGER_FORMAT → INVALID_DATE → RANGE), holiday
  parsing in a single scan (blank lines skipped but row-counted, dedupe,
  ROW_LIMIT armed at the 401st non-blank line), and the pinned semantics
  in integer Julian Day Number arithmetic only (Fliegel–Van Flandern;
  weekday = (JDN + 1) mod 7): directed half-open counting (start
  excluded, end included; reversed ranges negate only the business-day
  count while the breakdown stays on the forward interval), whole-week
  decomposition for the unsigned interval, day-by-day business-day
  stepping for shift (days = 0 returns the start unchanged), and the
  fixed result shapes. Also exports the canonical report serializer
  (compact JSON, keys sorted by UTF-16 code units recursively, one
  trailing LF; the input's toJSON is never consulted).
- `public/js/core/messages.mjs` — the SPEC's pinned bilingual status
  strings ("Input changed. Run again.", "Working", "Cancelled. You can
  run again."), weekday names, and localized error strings; holiday
  errors carry their 1-based row as a prefix.
- `public/js/controller.mjs` — the five-field draft
  `{mode, startDate, endDate, days, holidays}` (reset restores the pinned
  default with `days: "5"`), projection to the core's four-field input
  per mode, and the generation-guarded state machine
  (empty/dirty/busy/success/error/cancelled); only the current
  generation may settle, so cancelled or replaced work can never
  resurrect a stale result or its download.
- `public/js/app.js` — DOM wiring with textContent/value only; mode
  radios swap the end-date/days fields and the run-button label without
  clearing shared fields; field errors linked via
  aria-describedby/aria-errormessage; focus moves to the first error
  field only after a failed submit; load-example fills the first
  fixture case (basic-week) and waits for a manual run; reset restores
  the default draft and focuses the mode switch; download builds
  `workdays-report.json` from the current snapshot only (2 MiB cap,
  Blob URL revoked within 30 s or as soon as the result is invalidated);
  pagehide discards pending work and a bfcache restore resets the tool.
- `public/index.html`, `public/en/index.html` — pinned titles, H1s and
  descriptions; the rules/limits section and the three pinned FAQs as
  static content; preview noindex; no production canonical/hreflang;
  same-language home links via `../../`; path-only language links with
  a draft-loss warning beside them.
- `scripts/build.mjs` (`--mode preview` → `dist-preview/`, allowlist
  copy, symlink/dotfile refusal), `scripts/check.mjs` (syntax,
  zero-dependency and script contract, forbidden network/storage/
  injection sinks in public sources, page invariants),
  `scripts/check-generated.mjs` (rebuild-and-compare SHA-256 trees),
  `scripts/serve.mjs` (`--host/--port/--dir` loopback server; GET/HEAD
  only, correct MIME, 404s, traversal/symlink refusal, no directory
  listing; the SPEC-pinned CSP including `worker-src 'blob:'`, nosniff,
  no-referrer, X-Robots-Tag noindex, Permissions-Policy denying
  camera/microphone/geolocation).
- `test/` — the SPEC fixtures copied byte-identically to
  `test/fixtures.json` (23 core + 3 controller cases, all
  deep-compared), plus composition-invariant, additivity/round-trip,
  boundary, schema, holiday-capacity, report-serialization, HTML,
  build-reproducibility and serve tests.

## Deviations

- Layout naming: SPEC §implementation sketches `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs`; the repo's
  IMPLEMENTATION-CHECKLIST file contract (and the production brief) fix
  the layout as `public/js/core/*.mjs`, `public/js/app.js`, `scripts/`,
  `test/`. The checklist layout was followed. Behaviour, module
  responsibilities and gates are otherwise exactly as the SPEC pins
  them (the SPEC's own gate commands `node --test`,
  `node scripts/check.mjs`, `node scripts/build.mjs --mode preview` and
  `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`
  all work as written).
- Worker transport: SPEC §implementation describes a module Worker
  created from a Blob of the fixed core source. Following this
  production line's established controller pattern, work instead
  settles through an injectable scheduler — a macrotask in the page and
  a hand-fired fake scheduler in the tests (mirroring the SPEC's own
  "fake Worker" controller fixtures) — with identical
  generation/cancellation semantics and identical fixture checkpoints.
  The page creates no Worker; the SPEC-pinned CSP (including
  `worker-src 'blob:'`) is still served verbatim.

## Spec errata candidates

1. **Substantive — the 400-line holiday cap conflicts with the
   4096-unit raw cap, and ROW_LIMIT is unreachable.** A non-blank
   holiday line must be a 10-unit date, so 400 valid lines need
   400×10 + 399 = 4,399 UTF-16 units — more than the pinned 4,096-unit
   whole-string capacity. The SPEC pins the whole-string capacity check
   *before* the per-line scan, so any all-date list of 373+ lines fails
   INPUT_LIMIT, the tests-section claim "假日恰 400 筆合法" can never
   hold, and the 401st line (ROW_LIMIT) can never be reached (reaching
   it requires 400 preceding valid lines, already over capacity). The
   implementation follows the normative pinned rules exactly as
   written (largest fittable all-date list: 372 lines, asserted in
   tests). Suggested spec fix: raise the holidays raw cap to at least
   4,399 units, or lower the line cap to 372.
2. **Minor — the days grammar as literally written accepts "-0".**
   The pinned regex `-?(0|[1-9][0-9]*)` matches "-0", while the same
   sentence's parenthetical and the tests section both pin "-0" as
   INTEGER_FORMAT. The implementation follows the pinned test
   behaviour: the grammar is applied with "-0" excluded
   (`^(0|-?[1-9][0-9]*)$`).

## Next owner

An independent (non-author) reviewer re-checks this fixed candidate
commit against the SPEC's nine predeclared aspects; see
VERIFICATION.md for the author-side evidence and the explicit NOT_RUN
list. The two errata candidates above are for the bulk spec review to
rule on; neither blocks this candidate, which implements the SPEC's
normative rules as written.
