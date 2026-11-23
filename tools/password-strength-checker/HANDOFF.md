# Password Strength Checker （密碼強度檢查）— Production HANDOFF

- Spec: `spec-password-strength-checker-20261121`, draft spec PR #393
  (base `codex/initial-publication`, head
  `55d35a4c9194c83f8e2cf63d60d8cfec4465d28f`, OPEN at build time).
  Registry rev 1812 (per parent task).
- Spec source (fixed): `docs/specs/password-strength-checker/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `145d047495902db7420f3419347b6426ba07b41c452a436ad64b6ecea3f01951`,
  verified against the spec PR head via `git show` on the fetched
  `pull/393/head` ref).
- Production target: `tools/password-strength-checker/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/password-strength-checker-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent, sixth wave (parent
  orchestrator session 6b3782f6-8d09-47e2-bb10-026c84df3fb8). User
  confirmed continuation four times on 2026-11-23 (14:31, 14:33:56,
  14:58:49, 15:04:46); the same execution-risk prompt class that
  stopped the first production wave at clone/fetch re-appeared
  during this build (on the `git clone` and again on the
  `git fetch` of the spec PR ref) and was continued past under that
  authorization — glossquote-repo content only, no other content,
  credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/password-strength.mjs`: `run(input)`
  validates in the SPEC order (capacity INPUT_LIMIT → surrogate
  UNICODE → EMPTY, code-point length, max 128), classifies
  characters into the five fixed classes (lowercase 26, uppercase
  26, digits 10, symbols 32, other 32), computes base entropy
  (length × log2(pool), half-up to 1 decimal), applies the frozen
  penalty table in the SPEC's fixed order (COMMON_PASSWORD −30 from
  the frozen 16, DICTIONARY_WORD −12 each for at most the first 2
  distinct words of the frozen 40, REPEAT_RUN −8, SEQUENCE −8,
  KEYBOARD_WALK −8 over the 4 frozen QWERTY rows, YEAR −6 for
  1900–2099, REPEATED_PATTERN −10, SHORT_LENGTH −10, SINGLE_CLASS
  −8; total capped at 40), final entropy max(0, base − total),
  bands (<28 / 28–35.9 / 36–59.9 / 60–79.9 / ≥80), and crack times
  from guesses = 2^finalEntropyBits at the two borrowed zxcvbn
  rates (online 10/s, offline 10¹⁰/s; zxcvbn itself not
  implemented, no leet decoding). The result never contains the
  password or any substring of it. Fixed report
  `password-strength-report.json` (canonical JSON, UTF-16 key order,
  one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, disclaimer in both languages, preview noindex, no
  canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note, show/hide password toggle. The
  band is shown as text plus a decorative bar (colour is never the
  only distinction). No copy-password button, by design; the
  example password literal appears nowhere in page text, notes, or
  evidence (only in the core EXAMPLE constant and the vendored
  fixtures).
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Final entropy is not 1-decimal after binary subtraction, contra
   SPEC §inputsOutputs step 5 ("已為 1 位小數").** In binary
   floating point, 72.1 − 18 = 54.099999999999994, but the fixture
   pins 54.1 (`dictionary-year`). The implementation re-rounds
   (base − total) half away from zero to 1 decimal place, matching
   the fixtures. Suggested fix: pin the re-rounding step in §5.
2. **Crack-time rendering is under-pinned in SPEC §6.** §6 says
   values are rounded half-up to 1 decimal but does not say whether
   the rendering uses the exact binary expansion or the
   shortest-repr decimal digits, nor that huge values render in
   full digits. The fixtures pin the shortest-repr rendering:
   `non-ascii` online is "12745199425239998000.0" (shortest-repr
   digits), not the exact binary expansion
   "12745199425239998464.0"; `passphrase-dictionary` online is
   "4416674826058268000000000000000000.0" (full digits, never
   exponential notation). The implementation formats the shortest
   round-trip decimal representation, rounded half-up to 1 decimal
   in decimal and rendered in plain notation. Suggested fix: pin
   this rendering rule in §6.
3. **§6 wording is self-contradictory on unit selection.** It first
   says values are rounded "後再選單位" (round, then choose the
   unit) and then says unit selection uses the unrounded seconds.
   The implementation follows the second clause (unit from
   unrounded seconds, value then rounded), which is also what the
   fixtures show. Suggested fix: delete the first clause.
4. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/password-strength-checker/`; the actual
   fixed spec used here lives in the run-6 spec workspace
   `build6/specs/password-strength-checker/docs/specs/password-strength-checker/`
   (same content, fixtures verified byte-identical against spec PR
   #393 head `55d35a4c…`). No content difference; only the path in
   the brief was stale.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.
