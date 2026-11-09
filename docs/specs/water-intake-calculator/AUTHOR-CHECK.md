# water-intake-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/water-intake-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no water-intake tool exists; the nearest health-adjacent neighbour bmi-tdee-calculator estimates energy/BMI under its own non-diagnosis framing, differing as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script with exact decimal arithmetic during drafting: W1 (2,100–2,450 ml; cups 8.4–9.8), W2 (2,800–3,150; 11.2–12.6), W3 ((1,800+350)×1.1 = 2,365; (2,100+350)×1.1 = 2,695; cups 9.46→9.5 and 10.78→10.8), W4 (4,312.5→4,313 and 4,812.5→4,813; cups 17.25→17.3 and 19.25→19.3 — both half-up cases verified).
- The medical-honesty constraints are structural, not decorative: condition inputs are excluded from scope, diagnosis language is banned by an audited string list, the disclaimer content is fixed and its placement specified, and a single-number presentation of the result is defined as a defect.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures use round invented body weights; no real person's health data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
