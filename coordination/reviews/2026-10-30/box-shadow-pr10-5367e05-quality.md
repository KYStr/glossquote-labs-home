# Box Shadow r4 independent affected quality review

Observed 2026-10-30 13:14–13:15:55 UTC. **Usability 92; eight other whole-aspect scores null. Revision for incomplete required evidence, not accepted.** The shared-help change removes a real source of repetition without hiding the full explanation. No new product defect was established in this bounded observation.

## Candidate and reviewer independence

- Product [PR 10](https://github.com/KYStr/glossquote-labs-home/pull/10), fixed commit `5367e057eb5fa88a263678685dc767fd1fd5c580`, `tools/box-shadow-builder/`.
- Rubric is section 6 of [the fixed specification](https://github.com/KYStr/glossquote-labs-home/blob/ee9683cb60a4823e14768a26e24b782f59c6acac/docs/specs/box-shadow-builder/SPEC.md). All nine aspects and the necessary checks remain required. Scores are not test counts or an average.
- I wrote the specification, not the product. I have read implementation and used earlier versions. This is informed, independent-of-the-product-author assessment, **not blind first use**, a novice study, or human OS interaction.
- The submitted author verification was read but is not my UI evidence. I operated normal controls in the existing managed Chrome CDP surface and personally inspected screenshots. Read-only DOM inspection supplemented visible observations; no application state, handler, clock, permission or completion flag was changed.
- Viewport was 1180 × 757 CSS pixels, device-pixel ratio 1. Exact browser and OS versions remain unknown. No runner version is substituted, and no restricted browser-internal route was retried.
- The official managed preview used an isolated exact copy at `http://127.0.0.1:4173/`. It was stopped and status read back stopped at 13:15:55. No deployment, source edit, dependency installation, technical suite, clean build, clipboard operation or download was performed in this r4 observation.

## Identity and scope of the change

The three changed runtime files were independently read at the fixed public commit and matched to the preview copy. The remaining four matched the independently verified r3 bytes. Dist manifest SHA-256 is `f179a6962c18b0ddea941de8a639d39897164f3c55b843782d6137e6771f34de`.

| Runtime file | Bytes | SHA-256 | Compared with r3 |
| --- | ---: | --- | --- |
| index.html | 3130 | 0888485575f1c848830fb3cb03e08de52cb61b65a568fb8b644d8f042efe1666 | Changed |
| en/index.html | 3135 | 7364b9dad606c4629072b8685bd436ebf53a22713d523aa146e2828d85b7a10a | Changed |
| app.mjs | 8998 | 80d89c35cdff71c2848e2ee348413d299deec12c3a2745b0ef90a17de6afe8ce | Changed |
| styles.css | 5344 | 27e87dddc97ea58f7b0532a347d3c61ee3285fa3d55f386a0e8d06b8ef98e3c8 | Exact |
| core.mjs | 4809 | 3197da7eda67c6a02f14f0e727858636636d04abbc4859f2e004ce733d65bc28 | Exact |
| controller.mjs | 5414 | e25d07adee9591f4ab4dc383e83fdd2376d7ca79f5c5640eefff3eb3dc7adea1 | Exact |
| i18n.mjs | 6774 | 116b7170502308049754b5c673065b55366c4e75949709763931beab91d1c302 | Exact |

The independently read diff moves the complete geometry explanation into one paragraph before the form, replaces each repeated long mode hint with the short outer/inset label pair, and links each mode control to both its local hint and that shared paragraph. The conditional mode-error description also includes the shared explanation. The two HTML files remove the redundant explanation at the bottom. Other app handlers, serializer, controller, translations and styles are unchanged. This is the basis for a **bounded evidence mapping**, not a claim that all r4 behavior was freshly exercised.

## New normal UI evidence

All inputs were synthetic.

1. **Shared Chinese explanation and four layers.** The complete paragraph was visibly present once before the form: offset direction, blur, spread, positive inset direction, ordering within one drawing plane and the outer/inset plane distinction were retained. Each layer showed only the short local “外陰影 / 內陰影” hint. Three normal Add operations reached four layers, focused each new HEX field in sequence, then disabled Add.
2. **Relationships and visual readability.** All four mode controls referenced their own short hint and `geometry-help`; read-only DOM inspection resolved both actual elements for every control. The personally viewed full-page image showed four readable cards with no overlap at the stated viewport. This proves visible content and DOM linkage, **not actual screen-reader announcement**.
3. **First error and repair.** Generate with blank colors focused `layer-2-hex` and displayed the layer-1 six-digit-HEX correction in Chinese. I entered `#112233`, `#336699`, `#FF0000`, `#0000FF`, retained x0/y8/blur16/spread0/opacity25, selected inset on the fourth layer, and generated normally. The summary and read-only CSS contained those four layers.
4. **Stable reorder.** Moving the fourth layer earlier kept focus on its stable `layer-5-hex` with `#0000FF`; the mode descriptions still resolved after reordering. A fresh Generate showed the ordered third inset-blue layer and fourth outer-red layer in both summary and CSS.
5. **Language interruption.** English navigation opened the normal discard dialog, initially focused Cancel and disabled generation/output actions. Cancel returned focus to the English link and retained the 267-character read-only CSS. Reopening and confirming navigated to the initial English page with one empty-color layer and no result.
6. **English affected path.** The complete English geometry paragraph was visibly present once above the form. After three Add operations, all four mode controls linked their local “Outer shadow / Inset shadow” hint and the complete shared explanation. Generate with blank HEX focused the first HEX and showed: “Layer 1 · Six-digit HEX color: Enter # followed by six hexadecimal digits, for example #112233.” The screenshot was personally inspected; no overlap or truncation was seen at the stated viewport.
7. **Remaining friction.** Removing the repeated long paragraph materially reduces reading repetition. A four-layer form still requires substantial vertical scrolling, and comparing later controls with the preview remains less convenient. No measured height reduction, timing study, mobile layout, zoom or assistive-technology claim is made.

The mode-error-only conditional branch was inspected in the diff but not forced by injected invalid state. It is not counted as normal UI coverage. No Copy or Download control was operated this round.

## Mapping prior evidence without relabeling it as a new run

My [r3 quality report](https://github.com/KYStr/glossquote-labs-home/blob/cc88f35742c61961707539a2eb2f3c15d1b74c13/coordination/reviews/2026-10-30/box-shadow-pr10-ca2a5e-quality.md) belongs to `ca2a5e194f538b50aca9f22b9d6c03367ebfb1bc`, not r4.

- **Geometry, order, transparency and output comprehension:** r3 normal UI observations cover offset direction, blur/spread, opaque and transparent results, outer/inset order and actual synthetic output. The corresponding core/controller/styles/i18n bytes and output handlers are unchanged; r4 additionally demonstrates four-layer generation, reorder and retained explanation. These historical observations remain labeled r3 and support the bounded usability judgment rather than a fresh r4 whole-functionality pass.
- **Recovery and language:** r3 error repair, deletion, clear cancellation/confirmation and language behavior remain historical. The affected r4 paths above supply fresh four-layer first-error focus, repair, reorder, language cancellation and initial English state.
- **Transfer:** r3's actual 225-byte download and synthetic clipboard readback remain r3 evidence only. The transfer code was not changed, but no r4 native transfer, MIME, suggested filename or rejection case is claimed.
- **Clean build:** a separate [non-author r3 clean-build report](https://github.com/KYStr/glossquote-labs-home/blob/5b12d305e183ef4309eac8f4e2be2a1b55820deb/coordination/reviews/2026-10-30/box-shadow-pr10-ca2a5e-clean-build.md) records a clean check/build for r3. It is not a r4 clean-build receipt and does not supply the documented non-author modification/restoration experiment.

## All nine aspects

`null` means insufficient evidence for the whole aspect, not zero or a pass. The same numerical usability result below is a new bounded judgment after the changed content was observed; it is not automatic score inheritance or a reward for a small patch.

| Aspect | Score | Evidence and remaining requirement |
| --- | ---: | --- |
| functionality | null | New normal r4 four-layer repair/generation/reorder and bilingual state observations are sound. Historical geometry/output evidence is mapped above. Full same-candidate output proof including native metadata remains incomplete. |
| boundaries | null | New cap4, first-error and repair observations add evidence. Complete independent endpoint/raw/schema/late-event coverage is not established by this narrow pass; no old test count becomes a score. |
| privacy | null | Fixed routes and language reset are visible. A complete actual network/storage/hidden audit is still absent. |
| security | null | No new security claim follows from shared explanatory text. Actual CSP, network, MIME, sinks and failure conditions remain incompletely verified. |
| usability | **92** | The newly observed shared explanation is easier to scan without losing geometry semantics. Normal four-layer repair, stable reorder and bilingual cancellation remain understandable and recoverable. Mapped unchanged r3 geometry/output comprehension supports this informed non-author assessment. Repetition is improved, but remaining four-layer scrolling and distant preview comparison justify retaining a conservative 92 rather than an automatic increase. This is not blind first use, mobile or accessibility certification. |
| accessibility | null | Four actual DOM description relationships and visible error focus are verified. Screen-reader output, complete keyboard/modal traversal,200% zoom,320px and forced-colors observations remain missing. |
| localization-seo | null | Complete shared guidance, local mode hints and first-HEX errors were observed in both languages. All failure states and formal public-site integration/SEO remain unverified. |
| toolchain-provenance | null | Fixed changed bytes and unchanged paths are documented. r3's separate clean-build evidence is version-limited; no new r4 clean build or independent documented extension/restoration was performed. |
| compatibility | null | This managed Chrome surface displayed the affected normal UI. Exact browser/OS version, native transfer rejection, genuine hidden/BFCache, narrow layout and capability-failure conditions remain unverified. |

## Decision and next responsibility

**Verdict revision; rubricComplete false; requiredChecksComplete false. No whole-product acceptance or new confirmed product bug.** The original product owner and claim remain unchanged.

The author/environment coordinator should supply the missing same-candidate evidence in an authorized identifiable browser and the necessary accessibility, privacy/security, transfer and extension/restoration conditions. Do not fill gaps with mock events, source-only assertions, changed browser permissions or an unrelated runner version. Any future source change requires its own exact submission and affected mapping. This review does not approve or merge the PR, deploy, or transfer ownership.

