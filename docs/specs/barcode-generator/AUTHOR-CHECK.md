# barcode-generator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/barcode-generator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no 1D barcode encoder exists; neighbours (offline QR code maker — 2D only, label printer — text layout only, print size — image dimensions only) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every arithmetic fixture was re-derived by script during drafting, not asserted from memory: the four Code 128 checksums (1, 44, 26, 62) and symbol traces, the EAN-13 weighted sum (83 → check 7) and second check fixture (978020137962 → 4), the UPC-A weighted sum (58 → check 2), and both complete 95-module strings generated from the L table with R = complement and G = reverse-of-R. The EAN-13 and UPC-A examples are the long-published reference codes 5901234123457 and 036000291452.
- The Code 128 pattern table is deliberately NOT recited in the SPEC beyond structure (107 entries, 11 modules, stop 13): the contract requires it as a vendored data file verified by count/width/checksum tests, because a from-memory transcription inside the document would be an unverifiable error source.
- The auto-switch rule is closed and deterministic (runs ≥4 in C, odd runs donate one digit to B, no trailing switch), so two conforming implementations emit identical symbol sequences; the checksum fixtures pin the rule at start, middle and end positions.
- Product implementation does not exist yet: all product tests, GUI checks, the physical scan test and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are standard reference codes and invented SKUs; no real product or user data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
