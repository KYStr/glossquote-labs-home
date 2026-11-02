# electricity-cost-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/electricity-cost-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no electricity pricing tool exists; neighbours (subscription budget, unit price, compound interest, mortgage amortization) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script during drafting, not asserted from memory: F1 (90.000 kWh → NT$450.00), F2 (288.000 kWh → NT$1,296.00), F3 quantity case (36.000 kWh → US$10.80), F4 tiered (350.000 kWh splitting 120 / 180 / 50 across the bands with subtotals 360 / 720 / 250 = NT$1,330.00, average NT$53.20/day), F5 (¥2,790 at zero minor decimals), F6 (0.999 kWh × 3.333 = 3.329667 → NT$3.33 from the unrounded product).
- Money discipline is specified as compute-unrounded, round-once-at-display into minor units; the total is the rounded exact sum, not the sum of displayed subtotals, and the possible one-minor-unit display difference is declared in the formula note rather than hidden.
- The tiered limitation is normative wording, not a suggestion: the calculation treats the entered usage as the whole billed consumption, and the note must appear beside tiered results in both languages.
- Deliberately no built-in tariff table: rates go stale and differ by plan, so the user's own bill is the only rate source — the SPEC states this as a goal-level choice, and a reviewer should treat any shipped rate table as a defect.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are invented appliances with round wattages and rates; no real bill or user data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
