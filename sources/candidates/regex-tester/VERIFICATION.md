# Verification — Regex Tester and Replacer

## Fixed source

- SPEC: `spec-regex-tester-v1`, `KYStr/glossquote-labs-home`,
  `docs/specs/regex-tester/SPEC.md` at commit
  `dc74fafb8cba88a635b6f9623648f33e54290afd` (head of spec PR #29),
  13,811 bytes, SHA-256
  `61bdba934ae3e1200e0d67b84211711adc3e080cedd1a9a31444650448bd06a2`.
  The committed file was verified byte-identical to the author's draft
  before building. (The wave brief transcribed this commit with a
  different suffix; the hash above is the one that resolves on GitHub
  and whose tree was actually read.)
- BRIEF commit: `d3751d8f3d3e5d9ae78b194cc12415f6e509e93b`.
- Mode: build-first under the owner's 2026-11-02 directive; registry
  registration/submission held for the bulk-review phase
  (see `PRODUCTION-STATUS.md`). Candidate = this repository's
  production-branch head, frozen in `CANDIDATE-MANIFEST.json`.
- Environment: Node v24.22.1, zero npm dependencies.

## Evidence RUN

- `node --test`: **35/35 pass** (26 core, 9 controller), ~0.5 s.
  - Core: every SPEC section 4 worked fixture verbatim (date indices in
    both unit systems and groups; named group; zero-width lookahead at
    units 1 and 3; the replace fixture with count 1; `a{2,1}` surfacing
    the engine SyntaxError); flag assembly order; the zero-width
    advance rule incl. matches at end of text; sticky early stop; no-g
    single search; the 1,000-match cap (partial labelling, and exactly
    1,000 reported complete); astral index conversion incl. the
    mid-surrogate slice definition; each flag's isolated effect;
    non-participating (null) vs empty ("") groups; substitution edges
    ($$, $&, $`, $', $10 with ten groups vs one group, $12/$21 fallback,
    $99/$0 literals, $<name> known and unknown, $` per-match prefixes,
    trailing $); replace honours g off/on; limits as coded errors
    counted in code points; measured timing rounded to whole ms; the
    four presets.
  - Controller (DOM shim, labelled as such): initial state, the date
    fixture through the UI with selection scroll, error state distinct
    from no-matches with the engine message shown, zero-width caret
    markers, markup in the text rendering inert, presets filling
    pattern+text only, replace preview + count + unknown-group error +
    clipboard copy, clear resetting to the initial state, the cap
    notice in the footer.
- `node scripts/check.mjs`: **PASS** — structure, CSP meta, forbidden
  capability scan (no innerHTML/storage/network/history paths; only
  clipboard writes permitted), bilingual page/id parity, core-is-DOM-free
  assertion, and the SPEC fixtures re-asserted independently of the
  test suite.
- Preview build: two consecutive builds byte-identical; combined
  dist listing SHA-256
  `39502c8a3fe51761de8ee9c58c361de9d27a7bafeb1377a287d05904e00c98f9`.
- Loopback HTTP probes against `scripts/serve.mjs`: zh and en pages
  200 with bodies byte-equal to the sources; house security headers
  (CSP with `connect-src 'none'`, nosniff, no-referrer, no-store);
  `/` 404 by server design, missing file 404, path traversal 403,
  POST 405, HEAD handled by the same code path.

## Evidence NOT_RUN (never fabricated)

- All real-browser items: the SPEC section 7 GUI pass (fixtures through
  the real UI in both languages, highlight alignment after an emoji,
  error-state screenshot, keyboard-only completion) and the section 5
  200 ms bound on a mid-range laptop. No browser binary exists in this
  environment; controller behaviour is covered only through the
  labelled DOM-shim tests above.
- Measured contrast, assistive-technology behaviour, real-device touch
  and viewport behaviour, IME, BFCache.
- Deployment of any kind (none authorised).

## Interpretation notes for the bulk review

- **The wave brief's feature summary differed from the SPEC** (it
  mentioned `d`/`v` flags, a pattern-explanation tree, a
  1,000,000-step engine budget with manual run, and seeded benchmark
  defaults). The SPEC — the normative contract — has none of these:
  flags are `g i m s u y`, and section 3 explicitly *forbids* a
  "timeout" or "safe mode" claim because a JavaScript regex cannot be
  interrupted. The build follows the SPEC on every one of these points.
- Replace mode when the enumeration hits the 1,000-match cap: the SPEC
  pins the cap and the partial labelling for match enumeration but
  does not name a replace behaviour. Building a "result" from a
  partial enumeration would silently produce text the count cannot
  describe, so `runReplace` raises the coded error
  `MATCH_LIMIT_REACHED` and the result pane shows the cap state
  instead. Recorded here for the bulk review to rule on.
- Named-group numbering is derived by a small pattern scanner
  (escapes and character classes honoured); the engine's SyntaxError
  remains the only validity contract, and the scanner's fixtures are
  in the test suite.
