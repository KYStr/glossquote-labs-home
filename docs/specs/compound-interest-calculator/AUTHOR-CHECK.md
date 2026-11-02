# compound-interest-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/compound-interest-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no compound-growth or savings-goal tool exists; the neighbour (mortgage amortization) is the debt mirror with no goal inversion, as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was produced by running the pinned simulation during drafting, not by formula: growth fixture final 12,536.49 / interest 1,336.49 (the closed-form 12,536.50 differs by one cent and the SPEC names the simulation as governing), zero-rate 3,000.00, Goal A month 10 at 1,046.22, Goal B 1,000.00 at 0% and 946.19 at 12% with both minimality balances (12,000.05 / 11,999.92) verified, one cent less falling short in both cases.
- The required-contribution search is pinned as binary search over cents against the same simulation (with its upper-bound justification stated), so the answer is minimal by construction and checkable on the page — not a formula result rounded hopefully.
- Interest cents are decided by exact integer/decimal arithmetic (BigInt), explicitly because float products at the amount caps could flip a half-cent rounding.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are round invented amounts; no user financial data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
