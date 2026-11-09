# markdown-preview — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF: KYStr/glossquote-labs-home commit 891be2f69466489ffe28a5913b0da249da656b7c, docs/specs/markdown-preview/BRIEF.md.
- Task: labs-markdown-preview-spec-20261102 (registration/claim identifiers are recorded in the registry events for this task).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no Markdown renderer exists; nearest neighbours (text workbench, template merge, base64 codec) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- The grammar is specified as a closed subset with an explicit, complete deviations list (setext, raw HTML, collapsed/shortcut reference links, bare autolinks) so two implementations can be compared fixture-by-fixture; sanitisation is stated as testable correctness properties with normative hostile fixtures that are synthetic strings.
- Safety design decision recorded: the preview uses one serialised HTML string from the pure core (single source of truth for preview, copy and export), with safety resting on the core's escaping and scheme whitelist, both pinned by mandatory tests.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
