# Annual Leave Calculator — Production Handoff

## Fixed source

- Spec task: `labs-annual-leave-calculator-spec-20261109`
- Spec document: `spec-annual-leave-calculator-20261109`, fixed at commit
  `09e041d14f8d1635b1a1d84098396a407854c558`
  (`docs/specs/annual-leave-calculator/` — BRIEF.md, SPEC.md, fixtures.json,
  AUTHOR-CHECK.md)
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/134
- Production base: `codex/initial-publication` @
  `d8fff696252049a720117d9f2b02c0f1b9fc73b2` (fetched fresh at build start)
- Scope: only `tools/annual-leave-calculator/` was created or modified.
- Mode: build-first. No registry/coordination commands were run by the
  builder; registration/submission is the parent coordinator's step.

## What was built

A bilingual (zh-Hant default, English) static tool that computes statutory
annual leave under Article 38 of Taiwan's Labor Standards Act (version
effective 2017-01-01), exactly per the fixed SPEC:

- `public/js/core/core.mjs` — pure `run(input)`: strict schema checks
  (unknown/missing/wrong-type/accessor → SCHEMA), per-field validation in
  the pinned order (capacity INPUT_LIMIT → lone-surrogate UNICODE → EMPTY →
  DATE_FORMAT/INTEGER_FORMAT → INVALID_DATE → RANGE), cross-field
  DATE_ORDER then used-days-vs-entitlement RANGE, and the full derivation
  (tenure days/years/months, stage, entitlement, remaining days, current
  period window, next grant) using integer days-from-civil arithmetic only.
  Feb 29 starts use the Feb 28 anniversary in non-leap years.
- `public/js/core/messages.mjs` — the SPEC's pinned bilingual error/stage/
  Feb-29 strings verbatim, plus status strings from the SPEC user flow.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled); work settles on a later
  macrotask and only the current generation may settle, so cancelled or
  replaced work can never resurrect a stale result.
- `public/js/app.js` — DOM wiring with textContent/value only; field errors
  linked via aria-describedby/aria-errormessage; focus moves to the first
  error field only after a failed submit; "Use today" fills the reference
  date with the current Asia/Taipei calendar day; load-example fills the
  first fixture case and waits for a manual run; reset restores the blank
  draft and focuses the start-date field; pagehide discards pending work
  and a bfcache restore resets the tool.
- `public/index.html`, `public/en/index.html` — pinned titles, H1s and
  descriptions; statutory table, legal basis and the three pinned FAQs as
  static content; preview noindex; no production canonical/hreflang;
  same-language home links via `../../`; path-only language links with a
  draft-loss warning beside them.
- `scripts/build.mjs` (`--mode preview` → `dist-preview/`, allowlist copy,
  symlink/dotfile refusal), `scripts/check.mjs` (syntax, zero-dependency
  and script contract, forbidden network/storage/injection sinks in
  public sources, page invariants), `scripts/check-generated.mjs`
  (rebuild-and-compare SHA-256 trees), `scripts/serve.mjs`
  (`--host/--port/--dir` loopback server; GET/HEAD only, correct MIME,
  404s, traversal/symlink refusal, no directory listing; CSP per SPEC,
  nosniff, no-referrer, X-Robots-Tag noindex, Permissions-Policy denying
  camera/microphone/geolocation).
- `test/` — the SPEC fixtures copied verbatim to `test/fixtures.json`
  (13 core + 3 controller cases, all deep-compared), plus boundary,
  validation-order, schema, HTML, build-reproducibility and serve tests.

## Deviations

- Layout naming: SPEC §implementation sketches `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs`; the repo's IMPLEMENTATION-CHECKLIST
  file contract (and the production brief) fix the layout as
  `public/js/core/*.mjs`, `public/js/app.js`, `scripts/`, `test/`. The
  checklist layout was followed. Behaviour, module responsibilities and
  gates are otherwise exactly as the SPEC pins them (the SPEC's own gate
  commands `node --test`, `node scripts/check.mjs`,
  `node scripts/build.mjs --mode preview` and
  `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`
  all work as written).
- No functional deviations. No spec errata candidates: every fixture's
  expected value agreed with the SPEC's stated rules as implemented.

## Next owner

An independent (non-author) reviewer re-checks this fixed candidate commit
against the SPEC's nine predeclared aspects; see VERIFICATION.md for the
author-side evidence and the explicit NOT_RUN list.
