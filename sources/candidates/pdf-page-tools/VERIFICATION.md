# Verification — PDF Page Tools: Merge, Split, Extract and Rotate

## Fixed source

- SPEC: `spec-pdf-page-tools-v1`, `KYStr/glossquote-labs-home`,
  `docs/specs/pdf-page-tools/SPEC.md` at commit
  `8b5927312de2410de298f43f7f6fbe05184597da` (head of spec PR #28),
  13,787 bytes, SHA-256
  `61dabc568cbda32880a811dc27f2cf648143b3b9643aa6d36d6e0d959d8cfaf6`.
  The committed file was verified byte-identical to the author's
  draft before building.
- BRIEF commit: `ee3dc7d4d65e0435bac2b4be0acb8c2024a217a1`.
- Mode: build-first under the owner's 2026-11-02 directive; registry
  registration/submission held for the bulk-review phase
  (see `PRODUCTION-STATUS.md`). Candidate = this repository's
  production-branch head, frozen in `CANDIDATE-MANIFEST.json`.
- Environment: Node v24.22.1, zero npm dependencies. The one vendored
  file (pdf-lib 1.17.1 ESM, 523,417 bytes, SHA-256
  `72c052d97b4d5d9fa6cdbdcb7ad709f03d4ddb1122390cb3afeba4d88651d969`)
  is pinned in `THIRD-PARTY.md` and re-verified by the project check
  on every run.

## Evidence RUN

- `node --test`: **25/25 pass** (10 core, 7 engine, 8 controller),
  ~0.6 s of test time.
  - Core: header probe at the 1024-byte boundary; size/page/file
    limits at and one over; inspected-fact mapping (encrypted,
    corrupt, zero pages); the full range grammar (singles, ranges,
    open ranges, spaces, split order, extract listed order) and every
    error class with its token; naming sanitiser fixtures (CJK,
    spaces, path stripping, 100-char truncation, sanitises-to-empty);
    output names for every mode and group shape; rotation sum
    normalisation; all four plan builders.
  - Engine (fixtures generated in-memory by the committed
    `test/fixtures.mjs` — labelled colour pages A = 5, B = 3, a
    pre-rotated file, an encryption-dictionary file, a truncated
    file): every SPEC section 7 round trip — merge A+B ⇒ 8 pages with
    labels read back in order A-1..A-5, B-1..B-3; split `2-3,5`
    per-group ⇒ files of 2 and 1 pages with the right labels; extract
    `5,1-2` ⇒ order 5,1,2; rotate page 2 by 90 twice ⇒ 180;
    pre-rotated (90) + 90 ⇒ 180 total; fixed Producer read back from
    outputs; structural determinism of a repeated operation.
  - Controller (DOM shim, labelled as such; real engine and real
    fixture bytes): merge flow end-to-end (plan text, one download,
    8 pages), error-list behaviour for encrypted/corrupt/non-PDF with
    the specific reasons, split per-group downloads with plan names
    and verified contents, range errors tied to the input blocking
    generation, rotate plan sample, start-over clearing, and a hostile
    file name rendering as text.
- `node scripts/check.mjs`: **PASS** — structure, CSP meta, forbidden
  capability scan (vendored file exempted from the scan and instead
  pinned by SHA-256 + byte size), bilingual page/id parity, DOM-access
  guard on core and engine, and the SPEC naming/split/extract fixtures
  re-asserted independently of the test suite.
- Preview build: two consecutive builds byte-identical; combined
  dist listing SHA-256
  `1c8412ea9c120b13043e66f013b75482cd5561a260b43624181ad2029723e5be`.
- Loopback HTTP probes: zh page 200; the vendored library served
  byte-exact (523,417 bytes, SHA-256 matches THIRD-PARTY.md); house
  CSP/security headers; missing file 404, path traversal 403,
  POST 405.

## Evidence NOT_RUN (never fabricated)

- All real-browser items: the SPEC section 7 GUI pass (full flows in
  both languages, error-list behaviour in a real UI, keyboard
  reordering, a 200-page responsiveness note), the section 3
  no-freeze-over-1s bound and the section 5 10-second 200 MB
  validation bound on a mid-range laptop, and the section 6
  compatibility matrix (outputs opening without repair warnings in
  Chrome/Firefox viewers, Adobe Acrobat Reader, macOS Preview). No
  browser binary or reference reader exists in this environment.
  Outputs are verified programmatically by re-opening them with the
  vendored library, which is engine evidence, not reader evidence.
- Drag-and-drop and drag-reorder in a real browser (the buttons are
  the guaranteed path and are shim-tested; drag handlers are present
  but unexercised).
- Deployment of any kind (none authorised).

## Interpretation notes for the bulk review

- pdf-lib stamps its own Producer at document creation and would
  re-stamp it on load with metadata updates enabled. The engine sets
  the SPEC's fixed Producer after `PDFDocument.create()` and always
  loads with `updateMetadata: false`; both behaviours were probed
  against the vendored build before being relied on. Rotate outputs
  are built as fresh documents (copy all pages, then rotate) so every
  mode has identical provenance.
- The range grammar's duplicate rule: the SPEC names duplicated pages
  as an error for extract mode and overlaps for split mode; rotate
  mode is silent. Rotate applies the duplicate error too, because
  rotating one page twice in a single operation would otherwise be
  ambiguous. Recorded here for the bulk review to rule on.
- The encrypted test fixture is a minimal hand-assembled PDF whose
  trailer carries a Standard encryption dictionary (filler strings);
  it exercises the "parser reports encryption" path the SPEC defines,
  and is labelled as such in `test/fixtures.mjs`. It is not a real
  encrypted document.
- Generation is chunked between outputs at the controller level
  (progress note updated, event loop yielded); a single very large
  merge remains one library call internally, so the section 3
  responsiveness bound at maximum size stays NOT_RUN above rather
  than claimed.
- The project check's DOM guard matches member access on the two
  globals rather than the bare word "document", because the pure core
  must contain the SPEC-mandated fallback output name `document`.
