# regex-tester — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF: KYStr/glossquote-labs-home commit d3751d8f3d3e5d9ae78b194cc12415f6e509e93b, docs/specs/regex-tester/BRIEF.md.
- Task: labs-regex-tester-spec-20261102 (registration/claim identifiers are recorded in the registry events for this task).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no regex tool exists; nearest neighbours (text diff, text workbench, JSON workbench) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Worked fixtures re-derived against ECMAScript semantics before writing: date-pattern group values and code-unit span (4–14) in "due 2026-11-02, …"; zero-width lookahead positions 1 and 3 in "ab b"; the replace fixture's GetSubstitution expansion.
- Two honesty rules are pinned: the ReDoS warning with no fake timeout promise, and the 1,000-match cap labelling partial results as partial. The error state (SyntaxError) is specified as distinct from a no-match result.
- Indices are specified in both UTF-16 code units and code points with the conversion defined, since conflating them is the most common real-world bug in such tools.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- All sample texts are synthetic; no real log line or address appears in the artefacts.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
