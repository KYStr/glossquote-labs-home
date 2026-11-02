# sleep-cycle-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/sleep-cycle-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no sleep-cycle planner exists; neighbours (date calculator — calendar days, focus timer — live countdown, metronome — audio clicks) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script during drafting, not asserted from memory: S1 (07:00 wake, latency 15 → 21:45 / 23:15 previous evening, 00:45 / 02:15 same morning), S2 (23:00 bedtime → 03:45 / 05:15 / 06:45 / 08:15, all next morning), S3 (zero latency at 06:30 → 21:30 / 23:00 / 00:30 / 02:00), using mathematical modulo on minutes; the maximum raw value in the bed direction (2039) was checked to stay below 2880, so a single day-label distinction suffices.
- Latency is specified strictly outside the cycles and both durations (sleep, time in bed) are always shown — the two numbers a user most often confuses can never be silently merged.
- Honesty is specified as testable text rules: the 90-minute average and its variability are stated, stage-specific outcome claims ("wake refreshed", "light sleep") are forbidden, and the only permitted claim is the arithmetic one.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are round clock times; no real person's schedule or data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
