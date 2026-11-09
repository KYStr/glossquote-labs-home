# subnet-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF: KYStr/glossquote-labs-home commit c2aa4073879ae127d9bce5705e2e3a3052fc2fda, docs/specs/subnet-calculator/BRIEF.md.
- Task: labs-subnet-calculator-spec-20261102 (registration/claim identifiers are recorded in the registry events for this task).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no subnet/network calculator exists; nearest neighbours (integer representation, unit converter) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every worked fixture was re-derived by hand before writing: /26 arithmetic (64 addresses, wildcard .63, usable 62), the RFC 3021 /31 branch, the /32 host route, the /0 exact totals (2^32 and 2^32−2), and the /24→/26 four-child split.
- Two judgement calls are pinned normatively: leading-zero octets are rejected (octal ambiguity) rather than guessed, and the classification is a fixed first-match table over the entered address with the classful label quarantined as "historical".
- IPv6 is excluded explicitly and must be signposted in the product; a v6 follow-up would be a separate specification.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixture addresses are RFC 5737 documentation ranges or RFC 1918 classroom examples only; no real network is described.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
