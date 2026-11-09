# html-entity-tools — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/html-entity-tools/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no HTML entity converter exists; nearest neighbours (text workbench, base64 codec) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- The two deliberate narrowings are stated normatively rather than buried: named references require the semicolon (legacy semicolon-less forms stay literal), and the table must be the complete vendored WHATWG set with a build-time count/checksum verification — a hand-typed subset is defined as a defect.
- Numeric edge behaviour follows the HTML Standard exactly (0, surrogates and >U+10FFFF → U+FFFD; the 0x80–0x9F C1 remap), and every lossy application must appear in the change list with its rule name, so the tool can never silently alter text.
- The missing-semicolon numeric case is browser-compatible (convert, but flag the row) — chosen deliberately over strict rejection, and the fixture set pins it.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are constructed strings; no user content is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
