# CSS Grid Layout Planner — independent product-quality observation

## Decision and exact scope

**Revision required, not accepted.** This report reviews PR #11 product candidate `cdc9948c2349a4278f105fd007e00fbf5cd3ffc9`, against the nine product aspects in fixed specification `c38da35bd984b504bf69f1f9ba339f24857a3d2f`. The independently observed usability score is **88/100**. The other eight whole-aspect scores remain **null**, not zero or passing scores, because required evidence is incomplete. A reproducible result-summary omission is identified below; it is not a calculation defect.

The reviewer authored the specification but did not author or modify this product. This was informed use by a specification-familiar reviewer, **not blind first use**. Before and during the usability journey, the reviewer did not read product implementation code: runtime contents were fetched for exact byte comparison without implementation inspection; README, provenance, verification and author logs were read. No author pure suite or build was rerun to manufacture a quality score. The original production owner and claim are preserved.

- Candidate: [fixed source](https://github.com/KYStr/glossquote-labs-home/tree/cdc9948c2349a4278f105fd007e00fbf5cd3ffc9/tools/css-grid-layout-planner).
- Contract: [fixed complete specification](https://github.com/KYStr/glossquote-labs-home/blob/c38da35bd984b504bf69f1f9ba339f24857a3d2f/docs/specs/css-grid-layout-planner/SPEC.md).
- Author evidence, not independent credit: [VERIFICATION](https://github.com/KYStr/glossquote-labs-home/blob/cdc9948c2349a4278f105fd007e00fbf5cd3ffc9/tools/css-grid-layout-planner/VERIFICATION.md).
- Observation date: 2026-10-30. Same-candidate managed preview started at approximately 12:43 UTC; substantive normal UI observations 12:46–12:51 UTC; official preview stop and stopped readback at 12:52 UTC.
- Surface: managed desktop Chrome CDP. Exact browser version and OS are **unknown**; no runner version is substituted. Viewport 1180 × 757 CSS px; devicePixelRatio 1. Preview was the existing managed loopback origin, not a public deployment. No new server implementation, origin, permission, flag, dependency or deployment was introduced.

## Identity evidence

Seven runtime files from the fixed GitHub candidate were independently compared with the local public files and the existing dist files. All seven matched bytes and SHA-256. This is narrower than independently checking all 19 published source/test/evidence files. Existing dist manifest SHA-256:

`935bfa2d60f9d1af52418091acc2d2ef4e756356511c013260495ff99b0b5747`

| Runtime file | Bytes | SHA-256 |
| --- | ---: | --- |
| index.html | 5487 | d7969371c640301f4a10217114cf504ed40b4d2b9d3d40385add4582d3fe0a16 |
| en/index.html | 5486 | 19d0520aa111fbcc01fe334c446b2950af8f3f6602d74ae15d48485c46c4d4ae |
| styles.css | 3605 | 565897d4ea7c5f36445fec500d0a5159879d7517afdb2d90868af3a95dd5f7dc |
| core.mjs | 5688 | 0fb0ff95fcfb0cf03b7734e012198bbddbe9acef0850b4edda27fce6177d94c4 |
| controller.mjs | 5704 | 7b8eb25cad2307574d0a99fe9c155cddf081eca4ae5e6fca6ec9058c946d6301 |
| app.mjs | 10904 | f34b98ce99f0d8e3ba5bf3df10c7059f41c4d7f85f7155b810317e4a0bf88b7b |
| i18n.mjs | 5564 | 2e50b58bb86494a1f055e62f48cba44dd5c276388049cfd473b2384ba7309d96 |

Normal controls drove the observations. Read-only DOM inspection measured visible geometry, output values, focus and metadata. No handler was invoked directly, no application state or clock was injected, and no renderer was replaced.

## Reproducible issue: GRID-RESULT-SUMMARY-001

**Result dimensions/spans omitted; per-block cells unlabeled.**

1. Start the Chinese page from its initial state.
2. Manually enter specification example A: C3/R2/H80/G8; blocks (1,1,2,4), (2,1,3,2), (2,2,3,4), using the ordinary add/edit controls.
3. Generate.
4. Read the visible “位置與格數” result.
5. On English, load the visible example A control and generate; read “Positions and cells”.

Expected under §3.3: the result includes R×C, each block's starts/ends, row span and column span, plus occupied/empty totals. Cells should be understandable as cells rather than an unexplained numeral.

Observed Chinese:
- 使用格數: 6 · 空格數: 0
- 區塊 1 · 列起點 1 → 2 · 欄起點 1 → 4 · 3
- 區塊 2 · 列起點 2 → 3 · 欄起點 1 → 2 · 1
- 區塊 3 · 列起點 2 → 3 · 欄起點 2 → 4 · 2

Observed English:
- Occupied cells: 6 · Empty cells: 0
- Block 1 · Row start 1 → 2 · Column start 1 → 4 · 3
- Block 2 · Row start 2 → 3 · Column start 1 → 2 · 1
- Block 3 · Row start 2 → 3 · Column start 2 → 4 · 2

No result R×C or explicit per-block row/column span appeared; the trailing cells numbers had no labels. Input controls elsewhere are not a result-snapshot summary. Both the actual full-page view and DOM result text showed the omission. The product author subsequently confirmed there is no separate normal result entry exposing those values.

This does **not** invalidate the observed geometry or CSS math: example A rendered correctly and the downloaded bytes matched the independent literal. The defect is incomplete/ambiguous result information. Requested correction: render labeled result dimensions, row span, column span and cells from the same successful snapshot in both languages. Recheck normal A/B and changed/sorted results against the new fixed candidate; preserve this r1 evidence.

## Independent normal UI observations

### A: manual spanning layout and actual transfer

The reviewer did not use “載入例子 A” for the Chinese first journey. From the initial single block, edited its column end to 4; added block 2 and set row start/end 2/3; added block 3 and set row start/end 2/3 and column start/end 2/4; then explicitly generated.

No initial output was exposed before generating. After generation, occupied 6/empty 0 and the safe text structure were visible. Read-only relative rect measurements:
- stage 600 × 168;
- block 1: x0, y0, width600, height80;
- block 2: x0, y88, width194.65625, height80;
- block 3: x202.65625, y88, width397.34375, height80.

These agree with the independent §7.1 hand calculation within 1 CSS px, not with expected values derived from implementation.

The Chinese Copy CSS action actually completed; the reviewer read back the synthetic CSS from the browser clipboard. One Chinese download actually completed to a browser download artifact. Its 1034 bytes, 18 LF-terminated lines and SHA-256 were:

`cb0693497791adca1d43c7719499fddc2e6f34decb3439ac35e459bfc558c364`

That matches the fixed specification's complete literal expected CSS. The UI said the browser was asked to process the download and did not claim the file was saved. The new-download control became disabled and the visible status stated retention up to 30 seconds.

The download API exposed its saved artifact path, but not an independently observed suggested filename or MIME. Those properties are **not** certified here.

### Error recovery and retained download boundary

After that download, set gap to the raw string “00” and generate:
- gap received focus;
- the Chinese canonical-integer error appeared;
- previous preview, position result and textarea were cleared;
- copy/download were disabled;
- the existing download-retention message remained visible.

This is a real normal interaction, not a full lease-duration or delayed-callback proof. A later valid result had download enabled after ordinary elapsed time; no precise timer-boundary claim is made.

### B: leave cells empty and change source order

Removed block 3, changed block 1 to (1,1,2,2) and block 2 to (2,3,3,4), then generated. Occupied 2/empty 4:
- first rectangle (0,0,194.65625,80);
- second (405.328125,88,194.671875,80);
- stage 600 × 168.

The second rectangle was not auto-packed into the gap. Clicking block 2 “Move earlier” cleared the old result and focused the moved block's row-start field. After generating again, the same coordinate-shape set remained, with visible labels/source order reversed: item 1 at (405.328125,88), item 2 at (0,0). This supports the visible warning that source order and geometry are distinct.

### Overlap, adjacency and grid shrink

Changed the first record to coincide with the second:
- no result;
- message named blocks 1 and 2;
- focus went to block 2 row start.

Moved one block to the adjacent column and generated: valid. Then shrank columns to 1: the existing coordinates remained unchanged; generation rejected the now-out-of-range first block column start and focused it. There was no automatic moving or deletion. This is a selected normal overlap/adjacency/shrink observation, not the entire endpoint/pair/schema matrix.

### C: twelve blocks and tall stage

Confirmed Clear through its ordinary modal, set C6/R6/H160/G32 and added eleven records through the normal Add control, filling the first two rows of six single-cell blocks. Generate succeeded:
- Add was disabled at 12;
- occupied12/empty24;
- stage600×1120;
- all blocks height160; widths 73.328125 or73.34375;
- x positions 0,105.328125,210.65625,316,421.328125,526.65625;
- y positions 0 and192.

The local named preview region had clientHeight478 and scrollHeight1120, and accepted focus with a visible outline. One immediate PageDown observation still reported scrollTop0; it was not resolved into a reliable full keyboard-scroll test. It is **not** recorded as a keyboard-scroll pass or a confirmed defect.

### D: minimum layout

After normal Clear confirmation, set C1/R1/H24/G0 and generated using Enter. Stage and its sole block were 600×24. Changing gap to32 and regenerating kept the same outer dimensions, as required for a one-cell grid. This does not stand in for all numeric endpoint cases.

### Modal, language and English

On a valid result, the English language link opened a discard modal. Escape canceled and restored focus to English while preserving the result. Reopening and confirming navigated to the fixed English route, with initial C3/R2/H80/G8/one-block inputs and no output.

The English visible example-A control followed by Generate rendered the same measured geometry. The DOM-backed readonly CSS was saved and compared to the Chinese downloaded bytes: exactly1034bytes and the same cb069349…c364 SHA. This is **English DOM-output evidence, not an English download**.

English raw gap “ 8” remained untrimmed (read-only value inspection confirmed the leading space), produced the English canonical-integer error, focused gap and cleared results. Restoring8 and generating recovered.

Clear opened its named English modal with Cancel focused. Escape returned focus to Clear and retained the result. Tab/Shift+Tab endpoint sampling returned document-body focus in some samples rather than establishing a complete native focus cycle. Accordingly a complete focus-trap/background-inertness pass is not claimed. No injected focus or synthetic lifecycle event was used.

Visible English lang/title/description were coherent; robots was noindex,nofollow. Navigation and error states observed were translated. This is not verification of all exceptional translation keys, home-site integration or deployed SEO.

## Execution restriction, not a product bug

A later combined English copy/download observation was explicitly rejected by the execution environment before actions executed: it reported risk of overwriting the OS clipboard and initiating a download without explicit authorization. A subsequent normal readback showed the unchanged English initial one-block/no-result page, so that rejected batch did not establish English transfer results. It was not retried through another tool, route, clipboard mechanism or permission change.

Unaffected normal English generation and readonly DOM observation then continued. The earlier successful Chinese copy/download remains an actual completed observation. No English artifact or transfer success is inferred from it, the author's evidence, or equal DOM bytes.

## Nine-aspect assessment

Scores are independent judgments on the fixed rubric, not averages or percentages of tests. Null means insufficient evidence for the entire aspect. The usable normal journey does not justify a blanket90. The usability88 is a holistic assessment of task completion and observable friction, not a newly invented weighted rubric.

| Aspect | Score | Actual evidence and remaining limit |
| --- | ---: | --- |
| functionality | null | A–D actual normal UI/geometry, blank cells/order/errors and Chinese output transfer verified. Required result dimensions/spans missing; English actual transfer and filename/MIME remain unverified. |
| boundaries | null | Selected raw-format, overlap/adjacency, shrink, count/minimum controls observed. Full schema/descriptor/raw/endpoints/pair ordering, composition and late-event/lease matrix not independently completed. Author ten controlled groups are not native completion. |
| privacy | null | Fixed-route navigation and no raw in observed navigation. No full real Network/Storage/canary journey or source-dataflow audit; UI privacy statements are not proof. |
| security | null | No injection or hidden-state testing was substituted. Effective headers/CSP, hostile input with zero extra requests and sink/failure tracing are incomplete. Managed preview injected its own live-reload markup, so runtime file identity is not proof of hosting-policy identity. |
| usability | **88** | Informed non-product-author completed manual A, B, repair, sorting, 12-block and minimum flows, actual Chinese transfer and both-language cancellation/navigation without reading product implementation. Controls and honest invalidation/retention messages supported recovery. However the result omits required dimensions/spans and uses unexplained per-block numbers; range hints use symbolic rows/columns rather than current limits; the long 12-card form increases navigation burden. These concrete result-comprehension/friction issues keep the score below90, despite successful main tasks. Not blind-first-use or mobile certification. |
| accessibility | null | Labels, visible focus, selected Enter/Escape/modal/error focus and named local region observed. Complete keyboard traversal/trap/scroll,200%zoom,320CSSpx,forced-colors,contrast measurements and screenreader version/readout absent. |
| localization-seo | null | Normal Chinese/English navigation, errors, modal and equal CSS observed; all exceptional states and same-language home integration not completed. Preview noindex observed; formal origin/search indexing unknown. |
| toolchain-provenance | null | Exact runtime identity, README/provenance and author clean-check/build evidence read. No new non-author clean test/check/build plus genuine visible FAQ expansion/recovery in this pass. No score from author logs alone. |
| compatibility | null | Managed Chrome actual CSS geometry and Chinese copy/download; English normal DOM and selected keyboard actions observed. Exact browser/OS, true hidden/pagehide/BFCache, narrow layout and transfer-failure fallback remain unknown/not run. |

The console sample was dominated by a Chrome-extension metadata error, not an attributable product exception. It is not evidence that every product console/network state was clean. Other engines/mobile were not tested; no physical-phone requirement was invented.

## Follow-through

The original product author confirmed GRID-RESULT-SUMMARY-001 and is preparing a separate narrowly changed candidate. This report does not assess that unsubmitted revision or move the original candidate's scores. The existing candidate and original evidence remain unchanged.

For the next review: fix and normally observe the bilingual successful-snapshot summary; retain old-result invalidation/order behavior. Separately provide the specifically missing native, accessibility, privacy/security and non-author extension evidence. Do not use more pure tests or an updated README as substitutes for those observations. Only a later complete same-candidate nine-aspect evaluation may establish acceptance.
