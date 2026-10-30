# CSS Grid r2 independent result summary reassessment

## Decision

**GRID-RESULT-SUMMARY-001 is fixed in the observed normal flows. Product acceptance remains incomplete.** This is an affected quality reassessment of PR #11 candidate `7d662f6a2cf81d5df0cfab185fe0b9a14d2adccb`, not a new full product acceptance. All nine whole-aspect scores for this candidate remain **null**. The previous candidate's usability 88 remains historical; it is not silently transferred, increased or erased.

The reviewer authored the specification, but did not author or modify the product. The original normal journey was performed without reading product implementation. During this r2 intake, the PR response exposed the implementation diff before the affected observations. This round is therefore **implementation-familiar affected review**, not the specification's implementation-unread usability assessment and not blind first use. Useful repair evidence is retained without inventing a new usability score.

- [Fixed product candidate](https://github.com/KYStr/glossquote-labs-home/tree/7d662f6a2cf81d5df0cfab185fe0b9a14d2adccb/tools/css-grid-layout-planner)
- [Fixed nine-aspect specification](https://github.com/KYStr/glossquote-labs-home/blob/c38da35bd984b504bf69f1f9ba339f24857a3d2f/docs/specs/css-grid-layout-planner/SPEC.md)
- [Original independent r1 quality report](https://github.com/KYStr/glossquote-labs-home/blob/e384d6bf4bae342f140c9ed91e72e13f21240a9e/coordination/reviews/2026-10-30/css-grid-pr11-cdc9948-quality.md)
- [Author r2 verification](https://github.com/KYStr/glossquote-labs-home/blob/7d662f6a2cf81d5df0cfab185fe0b9a14d2adccb/tools/css-grid-layout-planner/VERIFICATION.md), read as author evidence, not independent credit.

## Exact identity and bounded difference

Seven preview runtime files were hashed. The two changed files were compared with their contents fetched from the fixed GitHub candidate. The remaining five matched the independently verified r1 runtime byte for byte. The r2 dist manifest SHA-256 is `d3a95f4b3f41205a698ca28151cfebbd4874a68d807024941c416e1f40702801`.

| File | Bytes | SHA-256 | Difference from r1 |
| --- | ---: | --- | --- |
| index.html | 5487 | d7969371c640301f4a10217114cf504ed40b4d2b9d3d40385add4582d3fe0a16 | identical |
| en/index.html | 5486 | 19d0520aa111fbcc01fe334c446b2950af8f3f6602d74ae15d48485c46c4d4ae | identical |
| styles.css | 3605 | 565897d4ea7c5f36445fec500d0a5159879d7517afdb2d90868af3a95dd5f7dc | identical |
| core.mjs | 5688 | 0fb0ff95fcfb0cf03b7734e012198bbddbe9acef0850b4edda27fce6177d94c4 | identical |
| controller.mjs | 5704 | 7b8eb25cad2307574d0a99fe9c155cddf081eca4ae5e6fca6ec9058c946d6301 | identical |
| app.mjs | 11026 | 185cfdf373fcda00dcabb2ebf958d94fbae595d647f8496fc7b2c7a3b74befa3 | one summary-rendering line |
| i18n.mjs | 5748 | 70510b7b616772d1c2375e68259f0f6fdff7f1276f8513bef4c0684404d23a62 | four added labels in each language |

The independent narrow diff inspection found that app.mjs adds grid dimensions and labeled row span, column span and cells, using the existing successful result snapshot. i18n.mjs adds only the corresponding four keys in Chinese and English. Other application lines and existing messages are unchanged. This supports a bounded mapping of prior evidence, not a claim that the entire product was rerun.

## New independent normal observations

Observations took place on 2026-10-30 at approximately 13:01:47–13:02:28 UTC on the existing managed desktop Chrome CDP surface and managed preview origin. Viewport was 1180 × 757 CSS px, DPR 1. Exact browser version and OS remain unknown; no GitHub runner identity is substituted.

The normal visible controls performed all state changes. Read-only DOM observations recorded visible summary text and error state; the final full-page image was personally inspected. No handler, clock or application state was injected. No author test suite or build was rerun. No clipboard, download, browser permission, flag or storage operation was performed in this reassessment.

### Chinese example A

From the normal initial page, load example A and generate. The result explicitly states:

- 網格（列 × 欄）: 2 × 3 · 使用格數: 6 · 空格數: 0
- Block 1: row 1→2, column 1→4, 列跨度 1, 欄跨度 3, 格數 3.
- Block 2: row 2→3, column 1→2, 列跨度 1, 欄跨度 1, 格數 1.
- Block 3: row 2→3, column 2→4, 列跨度 1, 欄跨度 2, 格數 2.

These agree with specification example A; they are not expected values derived from the product.

### Reorder and a different grid

Move block 3 earlier through its visible button. The old summary immediately becomes absent. Set rows to 3 and columns to 4, then generate:

- Grid 3 × 4; occupied 6; empty 6.
- Source-order spans/cells are now (1,3,3), (1,2,2), (1,1,1).
- The moved block retains its coordinates and becomes the second source record.

Change that second block's row end from 3 to 4, then generate:

- Its row bounds are 2→4 and column bounds 2→4.
- Explicit row span 2, column span 2, cells 4.
- Grid 3 × 4; occupied 8; empty 4.

This checks a non-example grid, both-axis spanning and reordered records rather than only the example's labels.

### English and error recovery

Use the normal language link and confirm discarding the current draft. English opens with initial values and no result. Load example A and generate:

- Grid (rows × columns): 2 × 3 · Occupied cells: 6 · Empty cells: 0.
- The three rows explicitly show Row span / Column span / Cells as 1/3/3, 1/1/1 and 1/2/2.

Shrink columns to 2 and generate:

- The summary is absent.
- The visible first error is “Block 1 · Column end: Outside the displayed range.”

Restore columns to 3 and generate. The labeled example A result returns. The full-page view shows the new labels legibly without visible clipping at the observed width. This is not a 320 CSS px, zoom or screen-reader assertion.

The official preview was stopped and its stopped status read back at 13:02:28 UTC. No active preview operation was retained.

## Historical evidence mapping without a false rerun

The r1 report remains the source for the following historical observations: manual example A construction, true A–D geometry, empty cells, ordering, overlap/adjacency and shrinking recovery, twelve normal additions, minimum layout, language cancel/confirm, and actual Chinese synthetic CSS transfer. Those observations were made on r1, not repeated wholesale on r2.

The five unchanged files and the narrow app/message diff provide specific support for the unchanged structure, styles, core computation, controller lifecycle and handlers. The new summary path itself was independently exercised above. This mapping does **not** establish a new r2 native export, accessibility, security, privacy or compatibility pass.

In particular:

- The r1 Chinese download was 1034 bytes with SHA-256 `cb0693497791adca1d43c7719499fddc2e6f34decb3439ac35e459bfc558c364`. It remains r1 evidence.
- The r1 English DOM output matched those bytes, but its combined Copy/download action was denied by the execution environment and was not executed or retried.
- No transfer was attempted on r2. Missing native filename/MIME and English transfer evidence remain missing, not product failures.
- Historical unresolved keyboard-scroll and modal-focus samples are neither passes nor confirmed bugs.
- Author controlled tests and build results are separately attributed; their counts are not quality points.

## All nine aspects and remaining evidence

| Aspect | r2 score | Evidence and remaining requirement |
| --- | --- | --- |
| functionality | null | New summary dimensions/spans/cells and normal clearing/recovery are verified. Historical A–D geometry is explicitly mapped, not relabeled as a new run. Complete same-candidate bilingual native transfer and filename/MIME evidence remain incomplete. |
| boundaries | null | New reorder, grid-size change, two-axis span, shrink error and recovery observations pass. Independent full schema/raw/endpoint/composition/late-event/lease matrix remains incomplete. |
| privacy | null | Normal language navigation is observed. No complete actual Network/Storage/canary/source-flow audit exists in this review. Visible privacy prose is not that audit. |
| security | null | No complete effective policy/headers, hostile-negative zero-request and sink/capability tracing evidence. Managed preview injection is not product source. |
| usability | null | Result comprehension is materially improved and the reported summary defect is fixed. This r2 reviewer has now read implementation, so the fixed implementation-unread condition is not met for a new whole-aspect score. Historical r1 88 is retained only on r1. Symbolic range hints and long repeated cards remain recorded friction, not new defects. |
| accessibility | null | The visible result is legible at the observed desktop width. Full keyboard/trap/scroll, 200% zoom, 320 CSS px, contrast and named-version assistive-technology observations remain missing. |
| localization-seo | null | New labels are present and understandable in both languages; normal English error recovery is verified. Complete exceptional-state coverage, home integration and formal deployment SEO remain unverified. |
| toolchain-provenance | null | Exact runtime identity and bounded changes are verified. This round adds no independent clean build or normal visible FAQ extension/restoration experiment. |
| compatibility | null | Same managed desktop surface handles the affected ordinary flows. Exact OS/browser version, real hidden/BFCache/narrow-page and transfer-failure fallback evidence remain missing. Other engines and mobile are not tested. |

No mean or aggregate score is calculated. rubricComplete and requiredChecksComplete remain false. The result is **revision / evidence incomplete**, not accepted. This does not request an invented code change merely to fill unobserved conditions.

## Responsibility and next conditions

The original product author retains ownership and claim. The author need not reapply the summary fix: this issue is independently closed for the observed r2 behavior.

The quality coordinator should provide an implementation-unread non-product-author reviewer for the fixed usability condition, retaining that person's honest specification familiarity. Required native/export, accessibility, privacy/security and tooling evidence can be added only within authorized, available resources. The denied English transfer operation remains stopped; this report is not authorization to retry it, change permissions or bypass its restriction.

Any subsequent candidate must be identified and affected differences checked again. There was no product edit, PR approval, merge, deployment or new service in this reassessment.
