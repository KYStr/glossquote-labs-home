# password-generator — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF: KYStr/glossquote-labs-home commit 343806b0068fba0193d6224d50c4d701acb0a5d0, docs/specs/password-generator/BRIEF.md.
- Task: labs-password-generator-spec-20261102 (registration/claim identifiers are recorded in the registry events for this task).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no password/passphrase tool exists; nearest neighbours (text redactor, random groups, text workbench) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Symbol set counted character by character: 26 symbols; combined maximum pool 88; exclude-ambiguous removals are exactly the five named characters.
- Worked entropy figures re-derived from the stated formulas: log2(88) ≈ 6.4594 (20 chars ⇒ 129.2 bits); log2(7776) ≈ 12.9248 (5 words ⇒ 64.6 bits); checker fixtures `password` ⇒ 37.6 − 20 = 17.6 and `Xq7!mZ2#` ⇒ 51.7 with no penalties. Both checker fixtures are synthetic strings created for this document.
- The sampler is specified as full-candidate redraw on a missing set (never insertion), with the rejection bound stated for arbitrary pool sizes; the 7,776-word list is a production artefact whose size and licence the production task must evidence — this specification fixes the size and entropy accounting, and does not itself ship the list.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- No real credential of any person was used in any fixture, example or evidence in these artefacts.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
