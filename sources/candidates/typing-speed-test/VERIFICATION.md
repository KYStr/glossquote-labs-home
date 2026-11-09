# Verification — Typing Speed Test (build-first candidate)

Mode: build-first under the owner's 2026-11-02 directive (see
`PRODUCTION-STATUS.md`). The registry production registration and
submission are held for the bulk-review phase; nothing here is merged,
deployed, published, or catalogued.

## Specification provenance

- SPEC: `docs/specs/typing-speed-test/SPEC.md` in
  `KYStr/glossquote-labs-home` at commit
  `892f3a2a6329d543ab6d158981ca57fa588ea53e` (spec PR #34 head),
  14,398 bytes, SHA-256
  `dfc15999cd2c0c54c1e1b6f31de29dd42be3e12ec1cbaf11995109eddfd9fb0e`.
- SPEC.md, AUTHOR-CHECK.md and BRIEF.md at that commit were fetched and
  verified byte-identical to the author's local drafts before building.
  BRIEF commit: `f8e44fc6a2feba1189095c858ec6a70021e7232e`.
- The build follows the SPEC wherever a summary could differ from it.

## Evidence RUN (Node v24.22.1, this environment)

- **Tests: 23/23 pass** (`node --test`, ~0.5 s) — 16 core + 7 controller
  (DOM shim, labelled as such).
  - Core: fixture (1) at display level exactly as the SPEC states
    (18/18 WPM, 100.0%) — see the defect note below for the raw value;
    fixture (2)'s numbers (T=50, 5 wrong, 60 s → 10/9, 90.0%) asserted
    through the scoring core; fixture (3) completion through the
    session machine (elapsed 20.0 s exactly); fixture (4) Chinese
    (netCPM 16, grossCPM 20, 80.0%, unit CPM); rounding pins (net 9.5 →
    10; accuracy 2/3 → 66.7%); positional poisoning and
    backspace-then-fix; session timing (starts on first commit, no
    lock at 29,999 ms, expiry lock at exactly 30,000 ms with the full
    duration used, post-lock input refused); over-length input
    refused; T=0 no-result state; review grouping (English word
    listed once, untyped words ignored, a mistyped space lists no
    word; Chinese character counts); every shipped passage validated
    against §4's content rules with a PASSAGES.md source line each;
    validator negative cases (length, double space, space in Chinese,
    non-CJK charset, non-BMP); deck draws without repetition until
    the set is exhausted.
  - Controller (DOM shim): initial render; completion through real
    input events at a fake monotonic clock (elapsed 20.0 s, net 387
    for the 645-character first passage, 100.0%); expiry through the
    interval tick (controls locked during the attempt, input locked
    after, full duration used); paste refused and explained; IME
    composition ignored until compositionend, which commits and
    starts the timer; a Chinese attempt renders CPM labels and its
    results region carries no WPM label (the shim aggregates the
    label elements the controller sets; full-page text audit is a
    real-browser item below); retry-same resets to a fresh setup.
- **Project check: PASS** (`node scripts/check.mjs`) — required paths,
  package/wrangler identity, zero dependencies, house page policy,
  the touch-keyboard note present in both pages, element-id parity,
  app-referenced ids present, pure core free of DOM references, i18n
  key parity, forbidden-capability token scan (this tool has no
  clipboard path at all), the passage contract re-validated through
  the core, and fixture (1) re-asserted.
- **Build: byte-identical across two builds** — combined dist listing
  SHA-256 `9fda3067dfa04b4dbc26054b85bf2ad5f3d0004c1fc2e4fc1efd363cdffdd1fb`;
  `checkReleaseOutput` confirms dist mirrors `public/` exactly.
  Production builds are refused by design (no approved site URL).
- **HTTP probes** against the project serve script (serves `public/`):
  `/index.html` 200 and `/en/index.html` 200, both byte-exact to the
  sources; `/` 404 (server design); missing file 404; `..` traversal
  403; POST 405; HEAD 200; house CSP/security headers present.

## Evidence NOT_RUN (honest gaps — no browser binary in this environment)

- All real-browser items: the §7 GUI pass (a scripted attempt through
  actual key events in a real input, countdown lock timing observed
  in a browser, results screenshotted in both UI languages),
  rendering at real viewports, real physical-keyboard behaviour, and
  IME composition with a real zhuyin or pinyin IME on desktop (the
  shim test exercises the controller's composition event handling
  only).
- The ≤150 ms lock-after-expiry bound as a browser measurement (the
  controller checks expiry on a 50 ms interval over the monotonic
  clock; the session machine's boundary behaviour is pinned in the
  core suite, but browser event-loop timing is NOT_RUN).
- Deployment, merge, and catalog publication: not performed (held for
  the bulk-review phase and separate approvals).

## Spec defects and interpretation notes

- **SPEC DEFECT (for bulk-review errata)** — §4 calls the fixture
  passage "The quick brown fox jumps over the lazy dog." a
  45-character passage; the quoted string has **44** characters,
  counted code point by code point. Consequences, all resolved in
  favour of the governing formulas with the fixture string kept
  verbatim:
  - Fixture (1): raw gross/net are 17.6 WPM, displaying as the
    SPEC's stated 18/18 at 100.0% — the stated results hold at
    display level.
  - Fixture (3): the SPEC states net 27 WPM; the formula over the
    true string gives (44/5)/(20/60) = 26.4 → **26**. The suite
    asserts 26.4/26 and this note records the difference.
  - Fixture (2) is internally separate: its T=50 cannot occur
    against the 45- (in fact 44-) character fixture passage, since
    input beyond the passage length is refused. Its numbers are
    asserted through the scoring core against a longer synthetic
    passage, where they hold exactly (10/9, 90.0%).
- Interpretation notes:
  1. A mistyped space lists no word in the English review: §4 defines
     a word as a maximal run *between* spaces, and the grouping
     follows that definition literally (pinned by a test).
  2. The Chinese-results WPM prohibition is enforced by construction:
     metric labels are chosen from the result's unit (CPM for Chinese
     passages in both UI languages), and the session result carries
     the unit from the passage, not the UI.
