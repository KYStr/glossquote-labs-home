# Option Matrix — independent specification review

## Decision: revision required

This is a document-completeness review of the fixed specification candidate, not a product test or a product quality score. One narrowly scoped acceptance-contract inconsistency must be corrected before this specification can be marked ready. The other seven required sections have been read and their stated coverage is present. No implementation, native browser, download, performance, Network/Storage, accessibility certification, deployment or production acceptance is claimed.

- Review date: 2026-10-30 (UTC).
- Candidate: [`9ea93e018312f8b0d9cc18b43a4744845214631c`](https://github.com/KYStr/glossquote-labs-home/commit/9ea93e018312f8b0d9cc18b43a4744845214631c), [draft PR #4](https://github.com/KYStr/glossquote-labs-home/pull/4).
- [Specification](https://github.com/KYStr/glossquote-labs-home/blob/9ea93e018312f8b0d9cc18b43a4744845214631c/docs/specs/option-matrix/SPEC.md): 28,455 UTF-8 bytes; SHA-256 `a10858bbc144ddf2a1df1b2deae39ff105a3ed2f55f734a3e52547a3f488f1bd`.
- [Author check](https://github.com/KYStr/glossquote-labs-home/blob/9ea93e018312f8b0d9cc18b43a4744845214631c/docs/specs/option-matrix/AUTHOR-CHECK.md): 3,367 UTF-8 bytes; SHA-256 `ff6c7841aec8fa6ebd014daeae552a0cb9fba4da1e2ae9bc8f183624cd2fa22c`.
- Both files were independently fetched and hashed. The reviewer did not author or modify either candidate file. This report is separate evidence; it does not change the submitted candidate.

## Eight required sections

| Section | Finding and independently checked evidence |
| --- | --- |
| goal | **Coverage present.** §1, lines 10–16 identifies the intended maintainer, the problem of missing/repeated combinations, a finite deterministic Cartesian product and explicit non-goals. Enumeration is not represented as execution of tests or proof of business validity. |
| scope | **Coverage present.** §2, lines 18–41 compares input, operation and output, not merely names. The five cited existing specifications were fetched and their relevant product contracts read: CSV workbench projects existing records; template merge substitutes existing CSV rows into templates; random groups allocates roster members once; decision matrix ranks existing alternatives; list compare performs set-style comparison. None performs this proposed enumeration. The current catalog remains the cited blob, with 56 entries. Registry revision 288 really contains 72 tasks and 69 reserved specs; revision 298 adds this spec task/draft without a competing Option Matrix implementation. The finding is limited to this reconciled inventory, not a search of private projects. |
| userFlow | **Coverage present.** §3, lines 43–62 defines initial empty fields, a hand-checkable 2×2 journey, explicit generation, 50-row pages, edit/IME invalidation, stale-callback isolation, reordering, destructive confirmations, cancel/Escape preservation, clear/example differences, hidden-page cancellation and blank BFCache restoration. It distinguishes handing a download to the browser from OS save completion. |
| inputsOutputs | **Coverage present.** §4, lines 64–123 fixes raw UTF-16, code-point, UTF-8, count and product limits; line ending and empty-line behavior; duplicate and Unicode rules; stable UI versus output IDs; JSON keys/indent/LF and CSV quoting/CRLF; conservative CSV blocking with unchanged JSON; bounded output, download lease and manual-selection fallback. The 2×3 and 2,000/3,000 examples are mathematically consistent. Legal row count is correctly not a promise that maximum-length values fit the separate output-byte cap. |
| implementation | **Coverage present.** §5, lines 125–153 gives independently testable input/product/export/session/download modules, immutable data, mixed-radix enumeration, bounded batches and a shared deadline, no-dependency static architecture, safe text rendering, no data egress/persistence, bilingual semantics, desktop accessibility checks, and preview/production separation. Timer limits are not misrepresented as hard real-time guarantees. |
| acceptance | **Revision required: R1 below.** §6, lines 155–169 retains all nine future product aspects and differentiates actual native evidence from controlled tests and NOT_RUN. However, line 162 literally requires product-count endpoints ±1, which cannot be exercised end-to-end at the upper limit using the permitted dimensions. This must be made executable without weakening the other capacity checks. |
| tests | **Coverage present, subject to the acceptance correction.** §7, lines 171–199 supplies literal enumeration, order/schema/Unicode/serialization cases, stale-operation and export-resource checks, strict-build negatives, and separate B01–B07 native journeys. T03 correctly uses legal factors for 2,000 and 3,000; B01 uses 5×12=60, yielding a 50-row first page and a 10-row final page. Neither is a product PASS. The R1 correction should explicitly align the product-count fixtures with §6. |
| handoff | **Coverage present.** §8, lines 201–224 requires the same fixed candidate, a non-author review, same-ID revision on defects, separate future production ownership, full nine-aspect acceptance, exact evidence and explicit stopping conditions. Fixed brief, baseline README, catalog, inventory and five comparison references were readable. No production origin, deployment, new service or fee is assigned by this specification. |

The nine future product aspects remain: functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance and compatibility. Their product scores remain **null / NOT_RUN**. Section coverage in this report is not a substitute for those future observations.

## R1 — unreachable product-count ±1 fixtures

**Location:** SPEC §6 `boundaries`, line 162, read together with §4.1 lines 72–78 and §7 T03 line 179.

The public input permits at most six dimensions, each with 1–12 options. It cannot produce 1,999 or 2,001 rows. Every factor 1–12 has prime factors only in {2, 3, 5, 7, 11}; 1,999 is not such a product, and 2,001 = 3 × 23 × 29.

An independent finite calculation started with S={1} and repeated S = S ∪ {s×k: s∈S, k∈1..12} six times. Its results were:

| Row count | Reachable from legal counts? | Six-dimension witness where applicable |
| --- | --- | --- |
| 1,980 | Yes; nearest reachable value below 2,000 | 1×1×2×9×10×11 |
| 1,999 | No | — |
| 2,000 | Yes | 1×1×2×10×10×10 |
| 2,001 | No | — |
| 2,016 | Yes; nearest reachable value above 2,000 | 1×1×2×7×12×12 |

This is a mathematical check of the specification, not a run of nonexistent product code.

**Required narrow correction:** retain every raw-length, code-point, byte, dimension-count and option-count boundary requirement. Specify reachable product-count values below/at/above the cap, for example 1,980/2,000/2,016 with the factor lists above. An isolated arithmetic-guard test may additionally use artificial integers, but must be labeled as such and not counted as a legal end-to-end input. Keep the existing 3,000 rejection example if useful.

Revise the same `spec-option-matrix-v1`; do not create another inventory item. Submit the new fixed candidate and corresponding author check. Re-review can be limited to the changed requirements, their agreement with the tests, exact candidate linkage and verification that unaffected sections remain unchanged.

## Non-blocking implementation observation

§4.2 and T08 consistently specify a 10-second lease preserved across editing but revoked immediately on confirmed clear/pagehide. That is an explicit contract, not an internal contradiction. Early clear can shorten the browser-handoff grace period; this review does not establish a native download failure or silently replace that contract. The implementation evidence should accurately state this boundary and must not claim that initiating a download proves completed OS persistence.

## Release boundary

Do not mark this candidate ready until R1 is resolved and independently checked. Keep the specification draft and unconsumed meanwhile. This report does not approve or merge PR #4, change the original owner, score a game or product, modify the catalog, or authorize deployment.
