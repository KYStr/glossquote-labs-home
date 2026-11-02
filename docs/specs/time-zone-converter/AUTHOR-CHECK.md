# time-zone-converter — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/time-zone-converter/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no IANA conversion tool exists; the neighbour meeting-overlap searches for a shared working window rather than converting an instant, differing as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived by script against the system tz database (Python zoneinfo) during drafting: Z1 (Taipei 09:00 → 01:00 UTC; New York previous-day 20:00 −05:00; London 01:00; Sydney 12:00 +11:00; Kathmandu 06:45 +05:45), Z2 (July New York 21:00 −04:00), Z3 (gap instant 07:30 UTC, resolved reading 03:30 EDT, Taipei 15:30), Z4 (earlier occurrence EDT → 05:30 UTC → Taipei 13:30). Zone list counted programmatically: exactly 40 names.
- The resolution rules follow the "compatible" disambiguation convention (gap → shift forward by the jump; overlap → earlier occurrence) and are stated as behaviour, with detection by round-tripping so no transition table is hardcoded in the future implementation.
- Fixtures describe the tz database as known at drafting; the SPEC's provenance rule covers future rule changes honestly instead of pretending permanence.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures use ordinary public civil-time facts; no personal data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
