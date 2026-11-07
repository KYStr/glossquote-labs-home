# pregnancy-due-date-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/pregnancy-due-date-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no pregnancy dating tool exists; the nearest neighbour (date calculator — generic date arithmetic with no obstetric rules or medical labelling) differs as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script during drafting (Python datetime, civil-date arithmetic), not asserted from memory: D1 (LMP 2026-01-01, cycle 28 → EDD 2026-10-08; trimester boundaries 2026-04-08 / 2026-04-09 / 2026-07-15 / 2026-07-16), D2 (cycle 35 → 2026-10-15), D3 (conception 2026-01-15 → 2026-10-08, the cross-mode identity), D4 (scan 2026-03-05 at 9w2d → +215 days → 2026-10-06), D5 (LMP 2026-10-20, reference today 2026-11-02 → GA 13 days = 1w6d, EDD 2027-07-27), D6 (leap crossing: LMP 2027-11-15 → 2028-08-21).
- All three modes are specified to reduce to one EDD and one implied day zero, so gestational age and trimester outputs cannot diverge between modes; the beyond-42-weeks case is displayed with a note, never clamped.
- Honesty and privacy are specified as testable rules: the not-medical-advice notice is permanent, non-dismissible and bilingual; zero storage of any kind; dates never in URL/title. The author is not a clinician and this document asserts only the standard published conventions (280-day Naegele rule, 266-day conception offset, 14w/28w trimester boundaries) — it invents no medical guidance.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are round invented calendar dates; no real person's health information is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
