# aspect-ratio-calculator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/aspect-ratio-calculator/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no ratio simplification/solving tool exists; neighbours (print size — DPI/physical units, box fit — placement geometry, image resizer — file transformation) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Every fixture was re-derived during drafting: 1920×1080 → 16:9 (gcd 120), 1366×768 → 683:384 with decimal difference 0.0009 from 16:9 (computed 0.000868, displayed to 4 places), 2560×1080 → 64:27 with the 21:9 difference 0.0370 correctly above the note threshold, 2.39:1 → 239:100 with height 100000/239 ≈ 418.41, 21:9 → 7:3 with height 3000/7 ≈ 428.57, 1.85:1 → 37:20 (gcd 50).
- The honesty rule — a computed ratio is never snapped to a preset, and "close to" carries the exact difference — is normative in section 4 and pinned by fixtures 2 and 3, not left as UI taste.
- Exactness is contractual: simplification and solving are integer/BigInt rational work; floating point appears only in the final display decimals, so implementations cannot drift at the input caps.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are standard resolutions and ratios; no user data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
