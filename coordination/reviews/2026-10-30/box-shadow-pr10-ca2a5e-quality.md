# Box Shadow r3 — independent product-quality observation

Observed: 2026-10-30 12:20–12:31 UTC. Decision: **revision / incomplete required evidence**, not a newly confirmed product bug and not accepted.

## Fixed scope and independence

- Product: [PR 10](https://github.com/KYStr/glossquote-labs-home/pull/10), fixed commit `ca2a5e194f538b50aca9f22b9d6c03367ebfb1bc`, `tools/box-shadow-builder/`.
- Specification: [ee9683cb60a4823e14768a26e24b782f59c6acac](https://github.com/KYStr/glossquote-labs-home/blob/ee9683cb60a4823e14768a26e24b782f59c6acac/docs/specs/box-shadow-builder/SPEC.md), SHA-256 `4befa00eed81e5510ffa1996f2fe26247514572de2277a902e8761a6de76ae6f`.
- The reviewer wrote the specification, **not this product**; the submitted product's owner/contributor is a different person/agent. This is an informed non-product-author review, **not blind first use**.
- Seven preview payload files were independently read from the fixed public commit and compared byte-for-byte with the isolated preview copy. No build, test-suite rerun, product edit, deployment, or dependency installation was performed.
- Official managed preview served the isolated copy at `http://127.0.0.1:4173/`. Normal controls were operated through the managed Chrome CDP browser; screenshots were personally inspected. This is automated normal UI use, not claimed human OS interaction.
- Exact browser version and OS version are **unknown**. Do not substitute a GitHub-runner version. The supplied browser surface did not provide a usable approved version readout; no alternate route around the earlier restricted browser-internal URL was used.
- The author confirmed no additional same-r3 native evidence for the missing conditions below. r1/r2 browser records and r3 controlled-clock tests are not promoted to r3 native evidence.
- Preview was stopped, and status read back stopped, at the end of the observation.

## Identity readback

| Runtime path | Bytes | SHA-256 |
|---|---:|---|
| index.html | 3125 | 0609a6c8195da20fb103e642b496d236c1a0b17a0ff92cc21797be8c6ac02a13 |
| en/index.html | 3130 | 9769765da2fa39d52c8f1eeb29be33cade07785bc1153d295d259a53f97f1b87 |
| styles.css | 5344 | 27e87dddc97ea58f7b0532a347d3c61ee3285fa3d55f386a0e8d06b8ef98e3c8 |
| core.mjs | 4809 | 3197da7eda67c6a02f14f0e727858636636d04abbc4859f2e004ce733d65bc28 |
| controller.mjs | 5414 | e25d07adee9591f4ab4dc383e83fdd2376d7ca79f5c5640eefff3eb3dc7adea1 |
| app.mjs | 8902 | f25ce9bf1037ddd293cc34e8bd6862645cad435647eb511cd13341437181ad89 |
| i18n.mjs | 6774 | 116b7170502308049754b5c673065b55366c4e75949709763931beab91d1c302 |

The author's dist manifest SHA is `c3a51ecc1dca9dbdfaf1b0fbacd390e4dfc441fbf2a5c7ab52c72acadd3d0bbf`. Identity checks are not quality points.

## Actual normal UI observations

All data below were synthetic review inputs, not user data. No hidden application-state writes or completion flags were used.

1. **Initial and correction (12:20):** Chinese page starts with one layer, empty HEX, no generated output. Generate focuses HEX and describes the error. Entering valid HEX recovers normally.
2. **Geometry (12:20–12:26):** B01 x12/y8/blur0/spread0/#112233/100 outer visibly projects right/down; x−12/y−8 reverses direction. Blur 0→16 visibly softens the edge; spread +12 expands, −12 contracts. All-zero/opacity0 produces valid CSS and a visible white card without a shadow; the explanation correctly distinguishes invisibility from failure.
3. **Order and planes (12:24–12:26):** Two opaque, equal-geometry outer layers, red then blue, show a red ring. Normal reorder changes it to blue and swaps complete CSS segments. The same two inset layers show blue then red after reorder. Positive x10/y10 inset with black/100 produces inside left/top bands; the same outer produces right/down projection. A later four-layer outer/inset mix shows the expected distinct planes. These are visual geometry observations, not pixel-exact renderer tests.
4. **Four-layer journey (12:27):** Add reaches four and disables Add. Layer 3 blur −1 gives a specific layer/field error, focuses `layer-5-blur`, and exposes no old CSS. Repair to16 clears invalid state. Moving the last blue layer to first keeps focus on its stable `layer-6-hex` and preserves all values. Generated summary and CSS retain four layers and normalized HEX. Deleting last, first, then last returns to one; focus follows the surviving index; one-layer Remove is disabled. A new single-layer result generates successfully.
5. **Actual output (12:20–12:21):** Normal Copy reports only API success, not an unconditional OS claim. The dedicated browser clipboard readback, performed only after this synthetic copy, equals the expected CSS. One normal browser download was received and independently read: **225 UTF-8 bytes**, SHA-256 `fff937e88c83850feb64da5fb4319161701be1add7d32c5aba006cd3aff15ae5`. It exactly matches the literal below. MIME and suggested filename were not independently exposed by the download interface; the UI label alone is not treated as proof of them.
6. **Lease and invalidation:** Immediately editing after that download removes the old result; generating new values restores a new result while Download stays disabled and the original lease message remains. After more than30 seconds it becomes enabled. This proves that observed UI interval, not exact timer timing, a URL-revoke audit, or OS-download cancellation. No second download was requested.
7. **Clear and focus (12:28):** Escape cancels the modal, preserves raw values and result, and returns focus to Clear. Reopen by keyboard, Tab to Confirm, Enter resets to one initial layer/empty HEX and focuses its HEX. During the modal, generation and output controls are disabled. No claim of complete screen-reader or focus-trap coverage.
8. **Language (12:28–12:30):** English-switch cancel preserves Chinese lang/title/result and returns focus to the trigger. Confirm navigates to the fixed English page with initial empty HEX. English error, correction, summary, modal and normal controls are readable. Identical raw default values yield **exactly equal CSS strings** in both languages, including the documented Chinese output comments. English lang/title/description/h1 and relative language link were inspected; no fabricated canonical URL is present.
9. **Keyboard and negative input:** Tab follows HEX→opacity→mode→Add→Generate; Enter operates Generate. The preview region is focusable and ArrowRight actually scrolls its local viewport from0 to40 (497px client width,640px content). A simultaneous x=+1 and HEX=</style> rejects x first, keeps raw +1 rather than clamping, focuses x and removes output; after x repair, HEX is rejected without echoing the hostile string in the message. This is not a network-security proof.
10. **Reload/history:** Normal reload resets English values/output. Normal navigate-away and Back also return to initial values/output. BFCache occurrence was not established, so that branch remains NOT_RUN.
11. **Visibility limit:** Opening a second managed tab left the first document's observed visibilityState **visible**, with its result intact. Therefore this action did not exercise hidden and is not counted as hidden PASS. No event was injected to fake that condition.
12. **Console limit:** Read diagnostics contained browser-extension metadata errors. They are not attributed to the product. No clean-console/CSP-effect/network claim is inferred.

Expected literal for the downloaded one-layer hard shadow (three lines, final LF):

```css
.shadow-card { /* 卡片陰影：固定類別，不含預覽輔助樣式 */
  box-shadow: 12px 8px 0px 0px rgba(17, 34, 51, 1); /* 有序陰影：數值已驗證，內外繪製平面不同 */
} /* 卡片陰影規則結束 */
```

Screenshots were viewed during the observations, not published as independently downloadable artifacts. A same-call screenshot briefly lagged the DOM update; a later separate screenshot confirmed the generated state. That transient observation is not reported as a product defect.

## Nine-aspect assessment

Scores are independent judgments against the fixed specification, not counts of green tests or a newly weighted rubric. **null means insufficient evidence for the whole aspect, not zero quality.**

| Aspect | Score | Actual assessment and remaining condition |
|---|---:|---|
| functionality | null | The normal one/two/four-layer, repair, order, inset and output journey above works. Full required output proof still lacks independently observed download MIME/suggested filename; no whole-aspect pass is claimed. |
| boundaries | null | Real UI verifies cap4/min1, opacity0, negative spread, one invalid blur, raw+1/HEX first error and invalidation. The author's pure tests and separate controlled-clock affected review are narrower evidence, not this review's complete independent endpoint/schema/late-event matrix. |
| privacy | null | Visible URLs retain only fixed routes; reload/history reset is observed. No complete real-browser network/storage/hidden audit was available, so the in-memory/no-transmission statement is not independently certified. |
| security | null | Normal hostile text is rejected before output and the preview behaves correctly. Effective CSP, network absence, fixed native MIME and all sink/failure boundaries have not been verified in the actual browser. Source scans cannot replace them. |
| usability | **92** | Informed non-product-author desktop use completed the specified editing/repair/order/plane/transparent/output tasks without a blocking interaction. Ranges, empty-state guidance, explicit generation, stable focus, honest copy/download language, destructive-action cancellation and bilingual explanations support comprehension and recovery. Minor friction: repeated long geometry text in every layer makes the four-layer form vertically lengthy; comparing distant layer controls with the preview requires scrolling. This is not blind novice or mobile usability, nor a substitute for accessibility. No new blocking usability defect was found. |
| accessibility | null | Partial keyboard/focus/error/modal/local-scroll evidence exists. Actual screen-reader sample, full keyboard traversal/focus trap,200% zoom,320 CSS px and forced-colors checks remain NOT_RUN. DOM roles do not substitute. |
| localization-seo | null | Both normal language flows and identical output are observed. All failure/status translations have not been exercised. Formal public-URL/SEO/homepage integration is not available in this standalone preview and remains explicitly deferred, not silently passed. |
| toolchain-provenance | null | Fixed runtime/source identity and existing README/PROVENANCE/verification were read. No independent clean-build plus documented modification/recovery experiment was performed in this quality pass. Earlier technical check counts are not a quality score. |
| compatibility | null | Native CSS, one real copy/readback, one real download and ordinary reload/history work in this managed Chrome surface. Exact browser/OS version, native copy rejection/fallback, genuine hidden and confirmed BFCache, narrower layout and unsupported-capability paths remain unverified. |

## Result and owners of next evidence

- **Required checks complete: false. Rubric complete: false. Acceptance: null. Verdict: revision for missing evidence.**
- This review does not reopen the already narrowly repaired copy-deadline issue, invent a new runtime bug, alter the candidate, or carry r2 self-tests into r3 quality scores.
- The original product maker retains the claim and candidate responsibility. Needed evidence: the same fixed candidate in an authorized identifiable desktop browser; native output metadata/permission-failure handling; real network/storage/CSP observations; screen reader and specified layout/zoom; genuine background/BFCache or an explicit still-unavailable record.
- Environment/access coordination owns providing supported observation capabilities. Do not install, alter browser flags, bypass restricted internal URLs, deploy, or substitute mocked events merely to fill these gaps.
- A different source commit requires a new submission and scoped re-evaluation. No PR approval/merge, deployment, catalog change, or ownership transfer is included.
