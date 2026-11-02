# meeting-cost-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/meeting-cost-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no meeting-cost tool exists; neighbours (bill splitter — divides a known total, work hours calculator — one person's payroll hours, fuel cost calculator — trip fuel with a secondary split) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script during drafting, not asserted from memory: M1 (3 @ 60 + 2 @ 45 → burn 270, 45 min → 202.50, $4.50/min, per-person 45.00/33.75), M2 (70,000 ÷ 2080 = 33.6538… → preset fill 33.65; 4 people, 30 min → 67.30), M3 (timer at burn 270: 600 s → 45.00, 90 s → 6.75, post-pause 100 s → 7.50), M4 (100/h × 8 h → 800.00), M5 (100/h × 100 s = 2.777… → 2.78), using exact rational arithmetic (Fraction). The remaining preset fills (19.23 / 52.88 / 86.54) were computed the same way.
- The timer is specified as elapsed-only state over an injected monotonic clock, with cost always recomputed from total elapsed — per-tick money accumulation is explicitly forbidden and a drift test is specified to catch it. Mid-meeting rate edits re-price the whole elapsed time, and that rule is required to be printed where the roster is edited.
- Presets are labelled illustrative and become ordinary editable rates after filling; no salary data about any real person is asserted anywhere.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures use round invented rates and headcounts; no real meeting or person's pay is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
