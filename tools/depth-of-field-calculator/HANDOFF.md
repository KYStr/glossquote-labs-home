# Depth of Field Calculator （景深計算）— Production HANDOFF

- Spec: `spec-depth-of-field-calculator-20261121`, draft spec PR #394
  (base `codex/initial-publication`, head
  `e6c526038f637195fd3d14499e74feb3966ba53a`, OPEN at build time).
  Registry rev 1817 (per parent task).
- Spec source (fixed): `docs/specs/depth-of-field-calculator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `eeddf8cdab6f801ca2049f5626369656973c11abad00338c78036490a1527b17`,
  verified against the spec PR head via the GitHub API; SPEC.md and
  BRIEF.md also verified byte-identical against the same head).
- Production target: `tools/depth-of-field-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/depth-of-field-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (parent orchestrator
  session f7819511-9880-43ed-ab0a-724c9e31c37e). User confirmed
  continuation four times on 2026-11-23 (14:31, 14:33:56, 14:58:49,
  15:04:46); the same execution-risk prompt class that stopped the
  first production wave at clone/fetch re-appeared during this build
  (on the initial `git clone`) and was continued past under that
  authorization — glossquote-repo content only, no other content,
  credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/depth-of-field.mjs`: `run(input)` validates
  in the SPEC order (capacity INPUT_LIMIT → EMPTY → DECIMAL_FORMAT →
  RANGE, in the field order focalLengthMm, aperture, focusDistanceM,
  sensor, cocMm; cocMm only for `custom`; then the cross-field
  focus-distance-greater-than-focal-length RANGE), then computes the
  pinned thin-lens formulas (H = f²/(N·c) + f; Dn = s(H−f)/(H+s−2f);
  Df = s(H−f)/(H−s), infinite when s ≥ H; DoF = Df − Dn from the
  unrounded values) with outputs in metres rounded half-up to 3
  decimals once, at output. The CoC table is the SPEC's literal
  d/1500 table (8 rows verbatim); the 44×33 digital medium format is
  not a table value and must use `custom`. Boundary comparisons use
  exact integer thousandths of a mm, so s == f and s == H are never
  decided by binary float noise. Fixed report
  `depth-of-field-report.json` (canonical JSON, UTF-16 key order,
  one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, preview noindex, no canonical/hreflang,
  same-language home links (`../../` / `../../en/`), draft-loss
  note, all nine sensor options with the pinned CoC values, and a
  distance table (hyperfocal / near / far / total DoF) instead of
  any colour cue. An infinite far limit is shown as the text
  「無限遠 / Infinity」, never as a large number.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **No UNICODE error code is defined, but the tests section asks for
   lone-surrogate cases.** The SPEC's error-code inventory is SCHEMA,
   INPUT_LIMIT, EMPTY, DECIMAL_FORMAT, RANGE, INTERNAL/WORKER_ERROR,
   OUTPUT_LIMIT; a lone surrogate is not a decimal digit, so it fails
   the DECIMAL_FORMAT grammar check. The implementation returns
   DECIMAL_FORMAT for a lone surrogate (pinned by a dedicated test).
   If the reviewer wants a distinct UNICODE code, the SPEC must add
   it and state its position in the validation order.
2. **The worked example (fixtures case 1) is identical to the SPEC
   defaults.** `loadExample` therefore fills exactly the default
   draft. This is not a defect — the example still demonstrates the
   load-and-run flow — but a reviewer wanting a visibly distinct
   example should pick a different case-1 input.
3. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/depth-of-field-calculator/`; the actual
   fixed spec used here lives in the run-6 spec workspace
   `build6/specs/depth-of-field-calculator/docs/specs/depth-of-field-calculator/`
   (same content, verified byte-identical SPEC.md, BRIEF.md and
   fixtures.json against spec PR #394 head `e6c52603…`). No content
   difference; only the path in the brief was stale.
4. **No other errata.** All 11 literal core fixtures match the
   implementation exactly under full deep-equal, and all 8 success
   fixtures were independently re-derived with a separate Decimal
   calculation (matching the AUTHOR-CHECK hand derivation as well).
   The 3 controller fixtures match the controller state machine
   exactly, including the draft snapshots in `state-cancel-late`.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.
