# qr-code-maker — author documentary check

Author: cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory (Muse). This is the author's own documentary check only; it is not an independent review, assigns no scores, and does not mark the specification ready.

## Fixed sources and functional boundaries
- BRIEF: KYStr/glossquote-labs-home commit 1c979c2b27d68682b98cf8cb35c109e3fb14ca85, docs/specs/qr-code-maker/BRIEF.md.
- Task: labs-qr-code-maker-spec-20261102, registered at registry revision 516, claimed (claimId muse-qr-claim-20261101T174759Z-3bbc0, revision 517, workMayStart true), started at revision 518.
- Boundary re-checked against the catalog (47 published / 9 draft), all 88 registered spec titles and 99 task titles at admission: no QR or barcode generator exists; nearest neighbours (label printing, image-to-PDF, URL inspection, Base64 text codec) differ in input, operation and output as documented in SPEC section 2.

## Author checks and limits
- All eight sections present and cross-consistent: goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff.
- Capacity figures stated in section 4 (byte-mode, version 40: L 2,953 / M 2,331 / Q 1,663 / H 1,273 bytes) are the ISO/IEC 18004 byte-mode maxima; version-group character-count widths (8/16/16 bits) and the WIFI payload grammar, field order and five-character escaping set were re-read against the sources named in the SPEC before writing.
- Deterministic requirements are stated normatively (smallest version, lowest-index mask tie-break, no PNG timestamps, byte-identical SVG) so two independent implementations can be compared exactly.
- Worked examples in section 4 are marked as normative fixtures for the future production test suite; they were derived from the stated rules, not from running an implementation.
- Product implementation does not exist yet: all product tests, GUI checks, decoding round-trips and aspect scores are NOT_RUN / null. Nothing here claims readiness, acceptance, deployment or publication.

## Public subset and production handoff
- This specification uses only synthetic example payloads; the worked Wi-Fi example uses invented credentials (SSID "A;B") and instructs that real credentials must never be used as fixtures.
- Production requires a separate registered task, explicit allowedExecutors, a unique claim with readback, and a non-author independent review of this document (eight-section gate) before any mark-spec-ready.
