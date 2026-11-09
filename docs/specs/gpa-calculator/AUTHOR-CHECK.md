# gpa-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/gpa-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no GPA tool exists; the neighbour grade-target computes the single score needed in one unfinished course, differing as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script with exact rational arithmetic during drafting, not asserted from memory: P1 (29.2/9 = 3.2444… → 3.24), P2 (24.0/6 = 4.00), P3 (12/6 = 2.00), P4 (13.3/4 = 3.325 exactly → half-up 3.33; the case was found by search, not invented), P5 (R = 3.60), P6 (R = 6.00 unreachable; max attainable 289.5/105 = 2.7571… → 2.76), P7 (R = −1.40 guaranteed; zero-point final 3.00).
- The solver's three-outcome classification, including the precedence and the C0 = 0 edge, is stated normatively so an implementation cannot present an above-maximum requirement as a plan.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures use invented course lists; no real student's record is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
