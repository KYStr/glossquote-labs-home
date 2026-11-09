# MAINT-6-READBACK — independent review

## Verdict

**Revision required** for PR #161 at fixed candidate commit ebd19f9c8a7f6f8dd6078b602ccb133b632fe2f8. This is a four-aspect maintenance review of archive integrity, routing, repair instructions and preservation. It is not acceptance of any of the six products.

PR #161 is open and draft, unmerged, head ebd19f9c8a7f6f8dd6078b602ccb133b632fe2f8; GitHub reports mergeable: false. At readback there were no submitted reviews. The six changed files were read at that exact head. The latest remote registry is revision 1267, blob 33a945ad22875c1bb0b14c7b4c9a5e28810ac7da.

## Scores

| Required aspect | Score | Finding |
| --- | ---: | --- |
| archive-integrity | 100 | Pass. Both local ZIPs have identical bytes and the expected SHA-256; CRC, manifest, payload hash and safe path checks passed. |
| owner-routing | 94 | Pass with an access limitation. Local owner routes and cloud access failures are distinguished; notices exist on the four original PRs. These notices do not prove cloud authors read or acted on them. |
| repair-contract | 86 | Fail. The six rows give fixed sources, requested corrections, scope, checks and stop conditions, but R11/R12 continuation still says their specs are currently reserved and must be marked ready before resuming. The latest registry says both specs are consumed, and R12 is already working under its original claim. |
| preservation | 98 | Pass. Owner/claim references remain intact; source migration, coordination and product acceptance are kept separate. Requested model/thinking are recorded as settings, backend identity stays unverified, and no product acceptance or deployment is claimed. |

The review cannot be accepted because repair-contract is below 90. Update that current continuation instruction at its owning task, submit a new fixed candidate commit and review the new candidate. Keep the historical r1155 media review as provenance; it accurately records its own snapshot.

## Evidence

### Archive and manifest

Read-only verifier command:

~~~
python .runs/central-archive-reissue-2026-11-09/independent-review/verify-archives.py
exit code: 0
~~~

Both archives were 18,477,085 bytes with SHA-256 825dbe6e3d3b6937edbe7e2c65573df0c4fcc6d7dce3262370ce99f859860140, byte-for-byte identical. Each had 5,500 ZIP entries; testzip() returned no CRC failure. The embedded 1,141,858-byte MANIFEST.json SHA-256 was 8413f278466bc3c616ab0d3d677aff23b25a971dbbecbfabcad79e698d15a8a3; all 5,499 listed payloads matched declared bytes and SHA-256 with exact archive closure at source commit b9590e3ab912cfe23f6d83354400ec6c0e5bf0b9. Path checks found zero unsafe paths, exact duplicates, Windows case-fold collisions, file/directory collisions, directory entries, or symlink/reparse entries.

The archive reissue receipt and primary verification record match these results. Local readability does not establish recipient-side transport; the candidate correctly leaves reupload access NOT_VERIFIED_BY_RECIPIENT.

### Owner routing and current state

The latest registry read from KYStr/glossquote-labs-home on codex/initial-publication is revision 1267/blob 33a945ad22875c1bb0b14c7b4c9a5e28810ac7da.

- R11 labs-11-video-to-audio retains actor local-codex:01a12398-eeee-71e2-ab1e-162d7c8b1c0c and claim migration-11-adopt-1793224718800; registry status is blocked.
- R12 labs-12-audio-transcription retains actor local-codex:01a12398-f45b-72d1-8690-66d3b6b7e93e and claim migration-12-adopt-1793225004019; registry status is working.
- The same registry records both media specs as consumed by their original task/claim. R12 has not passed any product acceptance gate.
- The maintenance task labs-unblock-six-and-archive-20261109 is reviewing under root-claim-unblock-six-20261109, submitted against this exact candidate; acceptance remains null.

R11 PR #175 is open/draft at 543a14bd1ef6e605e1d5323663813312c21ef5ff. Its M1 scope is source migration and reproducible runtime preparation. Its PR report says product acceptance, release authorization, complete T02, native/browser evidence and deployment are still false/NOT_RUN. This M1 is not product acceptance.

The routing record documents successful local dispatch/replies for R11 and R12, failed cloud sends with thread not found, and no readable original factory thread. The new REVIEWER-ENTRY.md identifies the user-provided external review conversation separately: sending the public source entry there is not evidence that a cloud maker received the task. GitHub comments on the four original PRs are durable notices, not maker acknowledgement or repair execution. The current PRs remain open/draft at these heads:

- Word Frequency #1 — 180dcb19d56416da352e26405955aaba69a09acc; minimum-count denominator defect remains held.
- TTS #1 — 45164104bdc713fc352ea37dfe5a5509d5d9864d; local-only voice behavior remains held.
- Fluid Typography #40 — 1e7a28b214542e6ed095338fe9b05d6955d76023; independent English static entry remains required.
- SVG to PNG #99 — af98d8ca9b4df2365f7991c512e178ac788d3708; sanitizer URL counterexamples remain held.

Current registry retains Fluid Typography's production task in revision under its original owner/claim. Word Frequency, TTS and SVG have spec task owners but no formal production task/claim in this snapshot. These notices do not prove the cloud authors read or acted on them.

### Repair-contract defect and media specification evidence

BLOCKED-SIX.md still says R11/R12 specs are currently reserved and asks a non-author to mark them ready/consumed before the original owners resume. That is stale against r1267: both specs are consumed by the existing production claims; R12 is already working. This instruction can misdirect owners and must be corrected without changing ownership, scopes or acceptance gates.

The fixed media review and source-readback explicitly bind their historical review to registry r1155/blob 3167007db754e13f737705cf1ec463a8bd64a61c, where the specs were reserved. The fixed SPEC blobs are c3f00c61cb30f17f62689b424c9d37c109ca3b67 and a90e45493cecdf9b26086c99c689b42583c3810c. The review covers the eight document-readiness sections and calls out inaccessible relative HANDOFF links and fixed substitute references. It explicitly leaves media, browser, native and product checks NOT_RUN. Historical document readiness and current consumed status do not imply product acceptance.

### Preservation and NOT_RUN

The candidate records requested gpt-6.1-sol/max separately from NOT_INDEPENDENTLY_VERIFIED backend identity, zero browser/native UI operations, original owner/claims and no product acceptance. I did not use local browser/native UI, keyboard, clipboard, IME, native dialogs, credentials or persistent settings.

Still unverified: recipient access to the resent archive; original cloud-maker receipt/response; media runtime behavior; complete browser/native, OS-memory, Network/Storage and device gates; product acceptance; deployment; external user review.

## References

- [PR #161](https://github.com/KYStr/glossquote-labs-home/pull/161)
- [Fixed candidate BLOCKED-SIX](https://github.com/KYStr/glossquote-labs-home/blob/ebd19f9c8a7f6f8dd6078b602ccb133b632fe2f8/docs/repairs/2026-11-09/BLOCKED-SIX.md)
- [Archive receipt](https://github.com/KYStr/glossquote-labs-home/blob/ebd19f9c8a7f6f8dd6078b602ccb133b632fe2f8/docs/repairs/2026-11-09/ARCHIVE-REUPLOAD.json)
- [Owner-routing evidence](https://github.com/KYStr/glossquote-labs-home/blob/ebd19f9c8a7f6f8dd6078b602ccb133b632fe2f8/docs/repairs/2026-11-09/OWNER-ROUTING.json)
- [Reviewer entry](https://github.com/KYStr/glossquote-labs-home/blob/ebd19f9c8a7f6f8dd6078b602ccb133b632fe2f8/docs/repairs/2026-11-09/REVIEWER-ENTRY.md)
- [Historical media review](https://github.com/KYStr/glossquote-labs-home/blob/ebd19f9c8a7f6f8dd6078b602ccb133b632fe2f8/docs/repairs/2026-11-09/media-spec-review/REVIEW.md)
- [Historical source readback](https://github.com/KYStr/glossquote-labs-home/blob/ebd19f9c8a7f6f8dd6078b602ccb133b632fe2f8/docs/repairs/2026-11-09/media-spec-review/SOURCE-READBACK.json)
- [R11 M1 PR #175](https://github.com/KYStr/glossquote-labs-home/pull/175)

