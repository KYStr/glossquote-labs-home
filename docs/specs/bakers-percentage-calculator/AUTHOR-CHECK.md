# bakers-percentage-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/bakers-percentage-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no baker's-percentage tool exists; the neighbour recipe-scaler multiplies a finished recipe by servings with no flour basis, differing as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script with exact decimal arithmetic during drafting: K1 (840 × p/168 → 500/325/10/5), K2 (600 × p/100, total 1,008.0), K3 (weights → 100.0/65.0/2.0, hydration 65.0), K4 (850 × p/170 → 400/100/350), K5 (500 × 100/163 = 306.748… → 306.7; 500 × 63/163 = 193.251… → 193.3; displayed sum exactly 500.0).
- The anti-renormalisation invariant is deliberate: bakers' formulas are defined on flour = 100, so an implementation that quietly rescales a broken formula would misrepresent the user's recipe; the spec freezes and explains instead.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures use a generic published-style formula (flour/water/salt/yeast); no real bakery's formula is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
