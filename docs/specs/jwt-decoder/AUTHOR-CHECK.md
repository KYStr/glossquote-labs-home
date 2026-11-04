# jwt-decoder — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF and task identifiers are recorded in the registry events and the commit history for docs/specs/jwt-decoder/ (see the task's brief reference).
- Boundary re-checked against the catalog, all registered spec titles and task titles at admission: no JWT tool exists; nearest neighbours (UTF-8 Base64 codec, JSON workbench) differ as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- The fixture token was constructed by the author from a synthetic payload (issuer.example, sub user-1234) with a signature segment that is literally the base64url of the ASCII string "dummy-signature-for-fixture-only" (32 bytes) — not an HMAC and not any real credential; its iat/exp instants (2025-11-01T12:26:40Z / 13:26:40Z) were verified by decoding the finished token.
- The trust contract is pinned in normative language: banner before input, "not verified" caption adjacent to the time status, forbidden "valid token" wording with a locale string audit in the rubric and tests, and the exact-boundary rule (now == exp ⇒ EXPIRED) mirroring RFC 7519.
- Decoder strictness is specified beyond what `atob` provides (alphabet, padding placement, mod-4 rule, fatal UTF-8), with each failure named by part and position.
- Product implementation does not exist yet: all product tests, GUI checks and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- No real token, key or credential appears anywhere in the artefacts; production evidence rules repeat the synthetic-only requirement.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
