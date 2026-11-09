# metronome — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/metronome/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no metronome or audio scheduler exists; nearest neighbours (focus timer, TTS reader) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- The accuracy contract is architectural, not aspirational: event times accumulate from the previous scheduled time on the audio clock (never recomputed from currentTime or timer counts), and the fake-clock tests include a timer-jitter case that must produce identical event times.
- The click-duration cap (50 ms) is derived, not arbitrary: at the extreme setting (240 BPM, 4 subdivisions) event spacing is 62.5 ms, and the SPEC shows the inequality.
- Hidden-tab behaviour is specified honestly — skip past events, resume in phase, no catch-up burst, and a user-facing notice that the browser may have paused audio — instead of promising background playback the platform can revoke.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- No user data of any kind is involved; fixtures are synthetic timing grids.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
