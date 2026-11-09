# shoe-size-converter — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/shoe-size-converter/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no shoe-size tool exists; the neighbour unit-converter converts quantities by formula, differing as documented in SPEC section 2 — labels in offset systems are not quantities.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Fixture provenance, stated plainly: at drafting I fetched the Wikipedia "Shoe size" article (crawled copy dated 2026-10-07, accessed 2026-11-02) and transcribed the adult fixtures from its ISO/TS 19407 Mondopoint conversion table (Mondo 215–320, 22 rows): row 270 → EUR 42.5 / UK 9 / US men 10 / US women 11; row 265 → 41.5 / 8.5 / 9.5 / 10.5; row 245 → 38.5 / 6 / 7 / 8; row 280 → 44 / 10 / 11 / 12; row 215 → 34 / 2.5 / 3.5 / 4.5. D1–D5 follow from those rows and the round-up rule by arithmetic only. No fixture value comes from memory.
- Deliberate omission, also stated in the SPEC: no kids' label value is asserted anywhere, because I did not transcribe the children's tables during drafting; the SPEC routes kids data through the same source-transcription + count/checksum + reviewer spot-check gate at production, which is the honest path rather than inventing rows.
- The source article itself documents that sizing is not fully standardised and web tables often contain errors; the SPEC's provenance block and brand-variation note reflect that, and the round-up rule follows the ISO note quoted in the article (converted values round to the larger size).
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Fixtures are published conversion-table facts; no personal data is involved.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
