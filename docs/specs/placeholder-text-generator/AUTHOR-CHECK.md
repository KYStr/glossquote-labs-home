# placeholder-text-generator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/placeholder-text-generator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no placeholder/filler generator exists; neighbours (text workbench — transforms user text, word frequency — analysis, password generator — CSPRNG secrets, the deliberate opposite of a seeded reproducible PRNG) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- The PRNG fixtures were computed from the section 4 formula during drafting (seed 42 draws listed to 6 decimals), and the algorithm micro-fixture was derived from those exact draws (length 11 from 0.601104; first picks beta/delta/gamma/alpha/gamma from the micro pool), so an independent implementer can verify their mulberry32 before touching the pools.
- The Latin pool is deliberately NOT recited as authority in the SPEC: the contract requires the canonical-passage data file with count + checksum audit tests, the same treatment the barcode specification gives its pattern table, because a from-memory word list inside the document would be an unverifiable error source.
- Two honesty rules are contractual: output is a pure function of visible settings (same seed → byte-identical text, anywhere), and the non-meaning label is persistent and non-dismissible in both UI languages; the zh words unit is refused with its reason rather than faked.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- The Latin source passage is public domain; the zh pool is to be authored neutral sentences, reviewed as data at production. No user data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
