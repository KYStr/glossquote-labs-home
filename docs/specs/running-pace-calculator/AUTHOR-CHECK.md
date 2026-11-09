# running-pace-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/running-pace-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no pace/time/distance solver exists; neighbours (metronome — musical tempo, date calculator, focus timer, work hours, event timeline) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script during drafting, not asserted from memory: fixture A pace 5:30/km and 8:51/mile (330 × 1.609344 = 531.08 s), fixture B 6329.25 s → 1:45:29, fixture C exactly 35.00 km, the 10.5 km split table (finish cumulative 57:45, final segment 2:45), and the four Riegel predictions from 2700 s at 10 km (1295.01 / 2700 / 5957.29 / 12420.54 s → 21:35 / 45:00 / 1:39:17 / 3:27:01 with paces 4:19 / 4:30 / 4:42 / 4:54 per km).
- The split-rounding rule is deliberately defined on displayed cumulatives, so the printed table is exactly self-consistent; the alternative (rounding exact segment durations independently) can make printed rows contradict the printed total and is explicitly not what the SPEC requires.
- Riegel is fenced: fixed exponent 1.06, four fixed target distances, no extrapolation beyond the marathon, and a mandatory assumptions block; predictions are presented as estimates everywhere they appear.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are round invented running performances; no real person's data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
