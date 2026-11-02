# bmi-tdee-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/bmi-tdee-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no BMI/BMR/TDEE tool exists; neighbours are financial calculators sharing arithmetic only, as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script during drafting, not asserted from memory: M1 (BMI 22.857 → 22.9; BMR 1648.75 → 1649; TDEE 1979 / 2267 / 2556 / 2844 / 3133 from the unrounded BMR), F1 (BMR 1482.75 → 1483; moderate TDEE 2298), the six 200 cm boundary weights (18.5 / 25 / 30 / 35 / 40 land exactly on band edges and belong to the upper band; 73.9 kg = 18.475 displays 18.5 but is underweight), the imperial case (69 in = 175.26 cm; 154 lb = 69.8532 kg; BMI 22.7; BMR 1648.907 → 1649), and the 160 cm healthy range ([47.36, 64.0)).
- One drafting catch recorded honestly: a first healthy-range fixture at 170 cm hit a binary floating-point tie (72.25) whose display depends on representation, so the normative fixture uses 160 cm, whose bounds are exact; implementations are still told to round half away from zero on the mathematical value.
- Safety posture is specified as testable rules, not tone: no deficit/surplus figures anywhere, a non-dismissible not-medical-advice statement, WHO band names only, and a cross-cutting honesty gate in the rubric that caps usability below 90 if any eating target appears.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are round invented body measurements; no real person's data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
