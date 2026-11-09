# MAINT-6 fixed-candidate follow-up

## Verdict

Accepted for the four maintenance aspects only. This is not acceptance, release, or deployment of any of the six products.

Fixed candidate: PR #161, head `0c5033c3c83bb11a8be344cf0198426958f8a168`. The live PR is open, draft, and unmerged. Registry readback r1271/blob `38444a58c6911878f84284694847f58bdf8b95ef` has the task reviewing under the same root owner/claim, with this exact candidate submitted and acceptance still null.

## Candidate changes checked

- `BLOCKED-SIX.md` at blob `e12ad90da89eea5d66017d63673f4c8d343b30f6`: treats R11/R12 reserved status as historical; records their r1195 consumption by the original claims and directs owners to resume under those claims. The Word Frequency instructions distinguish the existing 2/3 row-threshold behavior from the SPEC wording, require an erratum, distinguish minCount UI/CSV rows from top-100 display truncation, and preserve simple C+S folding. TTS and SVG specification conflicts must be resolved and independently reviewed before production claims. R11/R12 M1 evidence remains preparation-only with the unpassed gates stated.
- `FORWARD-TO-AUTHORS.md` at blob `eb0f75a936f4f0c9594e9631949a2344fe40b8ca`: provides the scoped relay text. It explicitly says relay authorization does not mean an author received, acknowledged, claimed, or started the work.
- The other five candidate files match the prior fixed candidate byte-for-byte by Git blob: ARCHIVE-REUPLOAD `9ac82bfe85dfc6f88bb9a41cb925b477a45d38c5`; OWNER-ROUTING `16f98a475b731dfa4a01a2b9ee6941c0aa74fe3d`; REVIEWER-ENTRY `1cfdcb54066ad30aa682c54be4d71f03b5ba5b51`; media REVIEW `3e3c75c66f58ad746314e69d5f5f945f36c5454f`; SOURCE-READBACK `3932e2ca16789ebc536e3a6be6a54098f377730c`.

## Scores

| Required aspect | Score | Evidence |
| --- | ---: | --- |
| archive-integrity | 100 | Reused the prior verifier result for the unchanged archive inputs: `python .runs/central-archive-reissue-2026-11-09/independent-review/verify-archives.py`, exit 0. Both ZIPs are 18,477,085 bytes with SHA-256 `825dbe6e3d3b6937edbe7e2c65573df0c4fcc6d7dce3262370ce99f859860140`; 5,500 entries, CRC pass, 5,499 manifest payloads match, and no unsafe paths or collisions. No ZIP rerun was needed because the archive receipt blob is unchanged. |
| owner-routing | 95 | Original owners/claims remain intact. The existing route record distinguishes local owner continuation, inaccessible cloud threads, PR notices, and external reviewer delivery. The new relay document preserves the same distinction and does not claim author receipt. |
| repair-contract | 95 | Current consumed status and original-claim resume steps are accurate. RWF asks for SPEC correction rather than a code change unsupported by the current 2/3 behavior; TTS and SVG require their SPEC conflicts to be resolved before production work; checks, ownership boundaries, and stop conditions remain explicit. |
| preservation | 98 | Registry r1271 preserves the task owner/claim and shows no acceptance. R11/R12 remain with their original owners and consumed specs; M1 checkpoints identify missing product gates. The candidate does not claim product acceptance, deployment, or author receipt. |

The required maintenance checks are complete. Product runtime, browser/native/T02, recipient-side ZIP access, actual cloud-author receipt, and deployment remain NOT_RUN and are not counted as maintenance PASS.

## Readbacks

PR head and the seven changed filenames were read through the GitHub connector. The two changed documents were read at the exact candidate, and the five unchanged blobs were compared with the previous fixed candidate. Current registry r1271, original R11/R12 claims, consumed specs, and PR175/PR181 M1 heads were read back. The prior independent archive report is preserved at commit `e43ba5affaa5de90e13fc4b617e118cfb777e581`.
