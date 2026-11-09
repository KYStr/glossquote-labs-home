# Stopwatch with Laps — production candidate handoff

## Fixed spec source

- Repository: `KYStr/glossquote-labs-home`
- Spec source commit (branch `codex/consolidate-20261109` head at build time):
  `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`
- Contract: `docs/specs/stopwatch-laps/SPEC.md` (blob
  `22b4bd63950949b5876572f3a3032a6079298401`), with
  `docs/specs/stopwatch-laps/BRIEF.md` (blob
  `b6bb6b686dff97232e9c13e398dbadec3c9f8ed5`). No `fixtures.json` exists
  for this spec; the normative fixtures are SPEC section 4 (L1–L5),
  reproduced exactly by the test suites.
- House format followed: `docs/IMPLEMENTATION-CHECKLIST.md` and
  `docs/SOURCE-LAYOUT.md` at the same commit.

## Scope

- Allowed scope: `tools/stopwatch-laps/` only. Nothing outside that
  directory was created or modified by this task, and no coordination
  registry writes were made.
- Layout: pure core in `public/js/core/` (state machine over injected
  monotonic timestamps; formatting; CSV), DOM wiring in
  `public/js/app.js` (the only place `performance.now()` is read),
  bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en), zero runtime dependencies.

## Mode and status

- Build-first mode: this candidate was produced ahead of the
  independent bulk review. It is **not accepted and not published**;
  no registry claim was registered for this build.
- SPEC section 8's own-repo handoff wording (candidate in a separate
  `KYStr/glossquote-labs-stopwatch` repository) is superseded by the
  2026-11-09 consolidation rules: new tools live in
  `tools/<slug>/` of `KYStr/glossquote-labs-home` and are delivered by
  branch + PR in this repository. This candidate follows the
  consolidation rules.
- Next owner: an independent reviewer (not the author), to score the
  nine aspects of SPEC section 6 against the fixed candidate commit,
  including the real-browser evidence listed as NOT_RUN in
  VERIFICATION.md.
