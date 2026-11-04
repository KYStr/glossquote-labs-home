# taiwan-invoice-prize-check — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF: KYStr/glossquote-labs-home commit 41fa945531a11f407ac3ccf4b33bc4d44744ed39, docs/specs/taiwan-invoice-prize-check/BRIEF.md.
- Task: labs-taiwan-invoice-prize-check-spec-20261102 (registration/claim identifiers are recorded in the registry events for this task).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no invoice/lottery checker exists; nearest neighbours (list compare, random groups) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Tier rules written as a single precedence order with the suffix-length table (k=8..3) and standard amounts （特別獎 10,000,000 / 特獎 2,000,000 / 頭獎 200,000 / 二獎 40,000 / 三獎 10,000 / 四獎 4,000 / 五獎 1,000 / 六獎 200) stated once in section 4 and referenced elsewhere.
- Every worked fixture was re-derived from the stated rules before writing (including 00002222 ⇒ 五獎 at k=4, and 55555007 ⇒ 六獎 via the additional set only). All fixture numbers are synthetic; none is presented as a real period's winning set.
- Quick mode is specified as an honesty contract: possible/cannot-win only, never a definite tier or amount.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
