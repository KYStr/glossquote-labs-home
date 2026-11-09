# mortgage-amortization — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF: KYStr/glossquote-labs-home commit 365e901ed27cd6f0cae7a560f4f8586e32426544, docs/specs/mortgage-amortization/BRIEF.md.
- Task: labs-mortgage-amortization-spec-20261102, claimed by the author (claimId muse-mort-claim-20261101T175029Z-3064d) and started before drafting.
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no loan/amortization tool exists; nearest neighbours (subscription budget, bill splitter, unit price, grade target) differ in input model, recurrence and output as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- The section 4 worked fixture was derived by hand from the stated formulas before writing: annuity payment 40,803.45 for 120,000.00 at 12% over 3 months; monthly interest 1,200.00 / 803.97 / 403.97 under the stated round-half-up integer-cent rule; final adjusted payment 40,801.04; total interest 2,407.94. The zero-rate fixture is exact by construction.
- Money is specified as integer cents end-to-end with one explicit rounding rule, so independent implementations can be compared cent-for-cent; tranche, grace and prepayment interactions are each given a single normative rule.
- The planning-estimate disclaimer is required in both languages; no fixture uses a real person's loan data.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
