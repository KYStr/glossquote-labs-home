# Verification — JWT Decoder and Claims Inspector (build-first candidate)

Mode: build-first under the owner's 2026-11-02 directive (see
`PRODUCTION-STATUS.md`). The registry production registration and
submission are held for the bulk-review phase; nothing here is merged,
deployed, published, or catalogued.

## Specification provenance

- SPEC: `docs/specs/jwt-decoder/SPEC.md` in `KYStr/glossquote-labs-home`
  at commit `d9c60743424c414ce1399a46ed1842a5dfb8536e` (spec PR #33 head),
  15,089 bytes, SHA-256
  `94231f7b476c40106852f56de134e1b738abbbaf643de5ac4d3b9ef1678e5931`.
- SPEC.md, AUTHOR-CHECK.md and BRIEF.md at that commit were fetched and
  verified byte-identical to the author's local drafts before building.
  BRIEF commit: `a3e5e293b694364656ccdeafdd0ef7d57149630b`.
- The build follows the SPEC wherever a summary could differ from it.

## Evidence RUN (Node v24.22.1, this environment)

- **Tests: 22/22 pass** (`node --test`, ~0.25 s) — 14 core + 8 controller
  (DOM shim, labelled as such).
  - Core: the §4 fixture at both pinned clocks (13:00:00Z →
    WITHIN_STATED_WINDOW with exact header/payload pretty JSON,
    32-byte signature, exp relative phrase 26 minutes, iat 33 minutes;
    exactly at exp → EXPIRED); part counts 1/2/4/5 (JWE message)/6;
    empty header/payload errors; empty signature accepted at 0 bytes;
    size cap at 16,384 (passes the cap check) and 16,385 (TOO_LONG);
    interior whitespace; strict decoder sweep (`+`, `/`, misplaced `=`
    with part and position, mod-4-equals-1 lengths in header and
    signature); padding acceptance of 0/1/2 trailing `=` exactly when
    they complete the length; UTF-8 failure (`__4`); non-object JSON
    tops (array, string, number); invalid JSON; duplicate keys
    (last wins); the full time-status truth table (exp only, nbf only,
    both, neither, exp-at-now boundary, iat-only); non-NumericDate exp
    warning with no derived status; relative-phrase unit thresholds
    (59 s, 60 s, 7,199 s, 7,200 s, 172,799 s, 172,800 s); aud list
    count annotation; non-string alg flagged in the header summary.
  - Controller (DOM shim): initial empty state; fixture through the
    real input/debounce path at a pinned clock (status line, panes,
    8 claim rows, 32-byte signature line, exp annotation text); EXPIRED
    at the boundary clock; structural error announced with results
    hidden; pane copy writes exactly the displayed pretty JSON; clear
    empties field and results; empty-signature display; a
    markup-bearing claim value (`<img onerror>`) rendered as inert
    text in the claims table.
- **Project check: PASS** (`node scripts/check.mjs`) — required paths,
  package/wrangler identity, zero dependencies, house page policy
  (lang, robots, alternates, CSP, titles, home links), the banner and
  the fixed signature note present in both pages, element-id parity
  across languages, app-referenced ids present, pure core free of DOM
  references, i18n error/ui key parity, every core error code has a
  message in both languages, the forbidden-capability token scan, the
  §6 affirmation audit (no checkmark or genuineness wording in the
  shipped UI text; the SPEC-mandated negations "NOT verified" /
  "NOT YET VALID" / "is not a NumericDate" do not match the forbidden
  affirmation list), and the §4 fixture re-asserted through the core
  at both pinned clocks.
- **Build: byte-identical across two builds** — combined dist listing
  SHA-256 `543b59d39a85c822ee213f6d889499197923e77fc2f2c6f8b35edb360b42dc35`;
  `checkReleaseOutput` confirms dist mirrors `public/` exactly.
  Production builds are refused by design (no approved site URL).
- **HTTP probes** against the project serve script (serves `public/`):
  `/index.html` 200 and `/en/index.html` 200, both byte-exact to the
  sources; `/` 404 (server design); missing file 404; `..` traversal
  403; POST 405; HEAD 200; response headers carry the house CSP,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
  `Cache-Control: no-store`.

## Evidence NOT_RUN (honest gaps — no browser binary in this environment)

- All real-browser items: the §7 GUI pass (fixture through the real UI
  in both languages with screenshots, error-panel screenshots,
  keyboard-only completion), rendering and layout at real viewports,
  200% zoom, real devices/touch, IME behaviour, BFCache, assistive
  technology, measured contrast, and browser timing of the §5
  sub-50 ms decode bound (the Node core suite runs the fixture decode
  in ~0.25 s for all 22 tests together, which is not a browser
  measurement).
- The §6 usability comprehension check ("is this token genuine?" —
  expected answer: the tool cannot tell) requires a human participant
  and is NOT_RUN.
- Deployment, merge, and catalog publication: not performed (held for
  the bulk-review phase and separate approvals).

## Spec defects and interpretation notes

- **Spec defects found: none.** No fixture or rule in the SPEC
  contradicted another when exercised.
- Interpretation notes (recorded for bulk review):
  1. The 16,384-character cap is applied to the trimmed text — §4
     presents trimming before the cap, and the suite pins both sides
     of the boundary on trimmed input.
  2. §3 permits showing a decodable header inside the error panel as
     partial output; this candidate shows no partial decode on error
     (the permissive reading), so nothing incomplete is ever presented.
  3. The §6 "no valid-style affirmation" audit is implemented as a
     forbidden-affirmation list in `scripts/check.mjs`; wording the
     SPEC itself mandates ("NOT YET VALID", "Signature is not verified
     by this tool", "is not a NumericDate") is negation, not
     affirmation, and is not flagged.
