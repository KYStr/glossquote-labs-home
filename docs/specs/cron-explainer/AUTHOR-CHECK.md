# cron-explainer — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/cron-explainer/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no cron tool exists; nearest neighbours (date calculator, meeting overlap) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- The day-matching rule is stated in its exact Vixie form (starred = field text begins with `*`, including `*/n`; OR only when both day fields are restricted), with a 16-row truth table required in tests, because this is the behaviour such tools most often get wrong.
- Fixtures were derived by hand from a verified calendar: 2026-10-30 is a Friday and 2026-11-02 the following Monday (weekend skip in the `*/15 9-17 * * 1-5` fixture); 2028 is a leap year for the February 29 fixture; the 4-year + 1-day window is sized to that leap cycle.
- The never-fires path is bounded and honest (window exhausted → report, with the DOM/month-length explanation), and the worst-case scan is given a hard iteration bound and a timing requirement.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures use only constructed schedules and dates; nothing operational is disclosed.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
