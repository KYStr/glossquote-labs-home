# fuel-cost-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/fuel-cost-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no trip fuel cost tool exists; neighbours (bill splitter — divides a known total, unit converter — single-value conversion, electricity cost calculator — appliance electricity) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script during drafting, not asserted from memory: F1 (250 km, 6.5 L/100km, $1.80/L → 16.25 L, $29.25, share-of-4 $7.31), F2 (100 miles, 40 MPG(US) → exactly 2.5 US gallons = 9.46352946 L, $9.00 at $3.60/gal), F3 (300 km at 15 km/L → 20.00 L, NT$610.00), F4 (200 miles, 50 MPG(UK) → exactly 4 Imperial gallons = 18.18436 L, £26.37), F5 ($10.00 split 3 ways → $3.33, exercising the cent-divergence note), using exact rational arithmetic (Fraction).
- Conversion constants are pinned as exact fractions in the SPEC: MPG(US) factor 112903/480 = 235.21458333…, MPG(UK) factor 56826125/201168 = 282.48093633…, both derived from the defining constants 1 mile = 1.609344 km, 1 US gallon = 3.785411784 L, 1 Imperial gallon = 4.54609 L; the share is specified from the exact total, never from the rounded display total.
- Honesty is specified as testable text rules: the currency selector is a symbol only (no exchange conversion), US/UK gallons are always country-labelled, and real-world consumption variance is stated.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are round invented trip figures; no real person's travel or spending data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
