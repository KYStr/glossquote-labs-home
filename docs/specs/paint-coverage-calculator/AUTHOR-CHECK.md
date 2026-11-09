# paint-coverage-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/paint-coverage-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no paint quantity tool exists; neighbours (tile estimator — discrete floor tiles, box fit — volume fitting, cut planner — sheet cuts) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script during drafting, not asserted from memory: P1 (4 × 5 × 2.8 m, 1 door + 2 windows → gross 50.40, net 44.91 m², 8.982 L, two 5 L cans, leftover displayed 1.02 from exact 1.018), P2 (ceiling on → 64.91 m², 12.982 L, 3 cans), P3 (3 × 3 × 2.5 m → exactly 3.00 L → exactly three 1 L cans, leftover 0.00), P5 (2.5 × 3 × 2.4 m, 1 window → 24.60 m², exactly 2.05 L, one 2.5 L can, leftover 0.45), using exact rational arithmetic (Fraction).
- The can rule is specified as the exact mathematical ceiling against exact litres, so an exactly divisible quantity never buys a phantom can (P3), and the leftover is specified from exact litres rather than from the displayed rounded litres.
- The deductions ≥ gross-wall case is an explicit computation error (P4), never a silent zero; the comparison is against gross wall area alone even when the ceiling is enabled.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are round invented room dimensions; no real person's home measurements are involved (the dimensions are generic examples, not surveyed data).
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
