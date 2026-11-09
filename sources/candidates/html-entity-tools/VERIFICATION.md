# Verification — HTML Entity Encoder and Decoder (build-first candidate)

Mode: build-first under the owner's 2026-11-02 directive (see
`PRODUCTION-STATUS.md`). The registry production registration and
submission are held for the bulk-review phase; nothing here is merged,
deployed, published, or catalogued.

## Specification provenance

- SPEC: `docs/specs/html-entity-tools/SPEC.md` in
  `KYStr/glossquote-labs-home` at commit
  `5588122809da3823f7d443e15a832626327be121` (spec PR #37 head),
  13,830 bytes, SHA-256
  `14d20f778898c732828bab05a2608c04a02323e248eeb10c002237163602868d`.
- SPEC.md and AUTHOR-CHECK.md at that commit were fetched and
  verified byte-identical to the author's local drafts before
  building. BRIEF commit: `60b3765fad138dc583a81ba63a10abc23a9d0405`.
- The build follows the SPEC wherever a summary could differ from it.

## Noted SPEC imprecision (for bulk-review errata)

SPEC sections 2 and 5 call the vendored set "2,231 semicolon
forms". The official WHATWG `entities.json` (retrieved 2026-11-02,
SHA-256 in `PROVENANCE.md`) contains 2,231 entries in total, of
which 2,125 are semicolon forms and 106 are the legacy
semicolon-less duplicates (verified to map identically to their
semicolon counterparts). The table ships all 2,231 verbatim, exactly
as published; decoding only ever looks up semicolon-terminated
names per SPEC section 4, and the encoder's canonical-name map is
built from the semicolon forms only. The governing rules are
unaffected; only the section 2/5 label is imprecise.

## Evidence RUN (Node v24.22.1, this environment)

- **Tests: 24/24 pass** (`node --test`, ~0.3 s) — 16 core + 8
  controller (DOM shim with injected fakes, labelled as such).
  - Core: every SPEC section 4 fixture exactly (mandatory-five
    encode; `café —` in named, decimal and hex styles; `&notin;`
    vs `&not;`; `&notreal;` unresolved; `&#150;` C1 with its rule
    note; `&#xD800;` and `&#0;` replacement rules; `&amp;lt;` with
    the double-encoded hint; `Fish & Chips` untouched); the
    canonical-name rule (shortest wins — `ne` beats `NotEqual`;
    ties break lexicographically — `COPY` beats `copy`); the
    section 6 numeric boundary sweep (0, 0x7F, 0x80, 0x9F, 0xA0,
    0xD7FF, 0xD800, 0xDFFF, 0x10FFFF, 0x110000, hex forms); all 32
    C1 entries asserted against the Standard's mapping transcribed
    independently in the test data; named-table conformance (count
    2,231, semicolon forms 2,125, a 50-name sample spread across the
    alphabet verified against the official list, one two-code-point
    reference decoded in full); the unresolved taxonomy (unknown
    name, `&#xZZ;` and `&#;` as invalid numbers, bare `&` and
    semicolon-less legacy forms producing no entries); missing-
    semicolon numerics converting with the flag, including both
    notes together for `&#150`; change-list positions as code-point
    indices with an astral character before the reference; the
    encode→decode round-trip identity over a corpus mixing markup,
    entities, CJK and astral text in all four option combinations;
    and the 100,000-character cap (at cap converts, one over is
    refused with the count).
  - Controller (DOM shim): defaults (decode mode, encode options
    hidden, "no references found" state); debounced decode
    rendering output, both counts, and change rows (position,
    source, result with code point, localized rule note);
    unresolved rows with localized reasons and byte-exact unchanged
    output; the double-encoded hint and its decode-again action
    re-running on the output; encode mode following its options;
    over-cap refusal clearing the output; copy delivering the exact
    output text; and the 500-row display cap with the total kept in
    the summary while the conversion itself stays complete.
- **Project check: PASS** (`node scripts/check.mjs`) — required
  paths, package/wrangler identity, zero dependencies, house page
  policy, the not-a-sanitizer and semicolon-narrowing notes present
  in both pages, element-id parity, pure core files free of DOM
  references, i18n key parity, forbidden-capability token scan, the
  vendored table's entry count, semicolon-form count and checksum
  re-derived from the shipped module and matched against
  `PROVENANCE.md`, and the normative fixtures re-asserted through
  the shipped core.
- **Build: byte-identical across two builds** — combined dist
  listing SHA-256
  `864372eeee4b6b794e18640d60ef7a36ce0d59c524d4844234ed5264eedc1be2`;
  `checkReleaseOutput` confirms dist mirrors `public/` exactly.
  Production builds are refused by design (no approved site URL).
- **HTTP probes** against the project serve script: `/index.html`
  and `/en/index.html` 200 and byte-exact, the vendored entities
  module served byte-exact; `/` 404 by server design; missing path
  404; path traversal 403; POST 405; house headers present (CSP
  with `connect-src 'none'`, nosniff, no-referrer, no-store).
- **Independent-implementation cross-check** (authoring-time):
  Python's `html.unescape` — a separate implementation of the same
  Standard — was compared against the shipped decoder on 175
  semicolon-terminated references (every value 0–160, the
  surrogate/range boundaries, and named samples): **146 match
  exactly, including every SPEC section 4 fixture**. The 29
  differences are confined to C0 controls other than tab/LF/FF/CR,
  DEL, and the U+10FFFF noncharacter, where Python drops the
  character; SPEC section 4 explicitly prescribes the opposite
  ("Any other v (including other controls and noncharacters) is
  emitted as that code point"), so the implementation follows the
  SPEC. This divergence is recorded here for the bulk review
  rather than silently resolved.

## Evidence NOT_RUN (honest gaps)

- All real-browser items: the fixtures through the real UI in both
  languages, the SPEC section 6 browser-parser cross-check on a
  live test page (the Python cross-check above is an
  authoring-time substitute, not that check), the change-list
  display-cap behaviour in a browser, keyboard-only completion,
  screenshots, measured contrast, assistive technology, real
  devices, IME, BFCache. No browser binary exists in this
  environment; the controller tests run against a DOM shim and
  are labelled as such.
- Deployment of any kind (no approved origin exists).
