# Transform Origin — independent normal-UI review R1

Reviewed candidate: `baca3449f006ad38d5f7e297d5dbd05fe98bf8c7`, `tools/transform-origin/`, PR21.
Specification: `9dad1e10e9158df9d405460b0370cbc45e6679d6`, `docs/specs/transform-origin/SPEC.md`.
Package manifest SHA256: `10ecabc52c8a0bd5f1217207f0372f988eda67f3267ca4ce04193ad2de2ffa45`.
Observed 2026-11-01 06:09–06:14 UTC. Independent reviewer did not author this product. Source implementation was not read before first ordinary UI use. Author tests were not rerun or counted as independent quality scores.

## Verdict: revision required

### R1 — overlapping and nearby diagram labels are not reliably readable
- Start from defaults (tx10, ty20, angle90, sx2, sy3, origin0/0; A TRS, B RTS). Change only sx to 0. Coincident P0/P1 and P2/P3 labels overprint; P1/P3 dominate while P0/P2 cannot be distinguished on the diagram. Numerical table entries remain available and consistent.
- Reset, choose B=SRT and change sx to -2. Nearby B endpoint labels crowd each other; lower labels touch the diagram boundary. Default origin O and A·P0 labels are also congested.
- Preserve geometry, matrix, expected values and CSS. Group coincident IDs or apply readable label placement; cover nearby labels as well as exact coincidence. A new fixed candidate requires affected visual reassessment. This finding is not a mathematical discrepancy.

## Positive bounded observations
The available desktop Chromium UI explains units, ranges, CSS list direction and the diagram/table relationship. Normal keyboard selection of TSR and SRT visibly changes matrices and CSS; editing origin X=50 preserves raw input and produces the expected origin adjustment. Invalid tx '-' clears geometry/results and copy controls; switching to English preserves input, order and error while translating the message. Reset restores defaults while retaining English. Raw '+0010.0' remains after blur while CSS is normalized. ty501 reports range failure without clamping; ty1.00 reports excess precision without rounding. Keyboard Tab/Space hides and restores comparison B while retaining SRT. Zero scale displays a degenerate warning and no filled transformed rectangle; negative scale displays a mirror warning and keeps original IDs. Focus is visibly outlined during the observed text-entry flow. Explicit Copy A reports 'CSS copied.'; clipboard bytes and denial recovery were not established by that status message.

## Eight required aspects and remaining evidence
No complete aspect score is issued from this partial evidence. All scores are null, not zero and not a passing score.

| Aspect | Score | Observed scope / unresolved requirement |
|---|---|---|
| math | null | Selected order/origin/zero/mirror outputs observed; full fixed expected cases and numeric boundaries not independently completed. |
| validation | null | Raw, unfinished sign, range, precision and recovery observed; all seven fields across all required invalid classes not completed. |
| css-output | null | Visible function order, units and normalization observed; complete exact-string/native HTML evidence and clipboard-byte verification outstanding. |
| visualization | null | Comparison, origin, tables and degenerate/mirror semantics observed; R1 is open. |
| interaction-a11y | null | Bounded normal keyboard, focus and bilingual state observed; complete assistive-technology, computed contrast and clipboard-denial evidence outstanding. |
| responsive-compatibility | null | Available desktop viewport only; exact 320/768/1440 CSS px, Firefox and complete 100%/200% matrix not independently established. |
| privacy-reliability | null | Repeated ordinary state/error recovery observed; complete runtime network/storage and injection evidence not established. |
| maintainability-performance | null | No architecture audit or hardware-qualified UI latency measurement in this blind first-use pass. |

Author-reported native 45-degree residual approximately 0.000778144 CSS px is not a 1e-6 pass; author mathematical units remain separate evidence. DevTools was unavailable under organizational policy and was not bypassed. Unexecuted native/runtime/accessibility/privacy/performance checks remain NOT_RUN. Fixing R1 does not close these unrelated missing requirements. This report does not accept the product, approve or merge PR21, or authorize deployment.

## R2 affected independent follow-up — 2026-11-01 06:21–06:23 UTC

Reviewed product candidate: `292e851ac04febd3d94707c49e2e058d27d68a96`, same PR21 and specification. Authored package manifest SHA256: `78489ec7545734eb3f954c6ab4be159dff8afb11f8bf1dc296f0b40831ab5c33`.
All 24 authored payloads were independently checked byte-for-byte against the fixed remote candidate and manifest before the normal local preview. This packaging check is not a product score.

**R1 closed in the affected observed desktop scenarios.** Independent normal UI observations confirmed:
- Default origin O and A·P0 labels are separately readable.
- Default values with sx=0 show legible A/B P0/P1 and P2/P3 groups rather than overprinted individual labels. Mathematical values and explicit degenerate warning remain.
- sx=sy=0 shows all four IDs in each panel's grouped label.
- Reset then B=SRT and sx=-2 produces distinct nearby B labels with visible lower margin.
- Entering tx '-' removes the new diagram and results; switching to English preserves the invalid raw value, error and selected order; Reset restores defaults and diagram while retaining English.

The affected observations did not reveal a regression. They are not a proof of every possible annotation arrangement, every viewport or all eight quality aspects. Unchanged author mathematical tests were not rerun. All eight complete-aspect scores remain null and requiredChecksComplete remains false. The original native 45-degree discrepancy and all outstanding required evidence above remain unresolved; no score, accepted verdict, merge or deployment follows from closing R1.

The original review above remains bound to baca3449; this follow-up alone is bound to 292e851. No old numeric score is carried forward, and no untested requirement is removed.


---

# Independent normal-UI review — Transform Origin r2

Product candidate: `292e851ac04febd3d94707c49e2e058d27d68a96`, `tools/transform-origin/`.
Specification: `9dad1e10e9158df9d405460b0370cbc45e6679d6`, `docs/specs/transform-origin/SPEC.md`.
Review performed 2026-11-01 06:26–06:38 UTC, independently of the product author. This continuation does not rerun or adopt the author's 29 tests. The later head `fa9ed2171ab5a30e9fd57db1d7c0f547b6c46d1c` differs from the product candidate only in INDEPENDENT-REVIEW.md (remote compare verified).

## Scope and decision
R1 (overlapping vertex/origin labels) remains CLOSED on r2. All legal ordinary-UI portions below were performed, rather than stopping at the affected-only review. No further blocking product defect was observed within this coverage. This is **not acceptance**: five aspects retain mandatory evidence gaps. No averaging or substitution of author tests is used.

| Fixed aspect | Score | Independent basis / remaining gap |
|---|---:|---|
| math | 94 | All six orders in both panels, center/outside origins, mirrored/zero scales, 45°, ±360°, legal large bounds: 14 scenarios, 112 displayed vertices. Independent point-by-point reverse-function arithmetic matched within 1e-6; maximum displayed error 3.559642323125445e-7. Matrix/origin/AABB outputs were also inspected. |
| validation | 95 | All seven fields: 105 invalid observations (12 grammar examples per field plus precision and both range violations), 35 valid raw/boundary observations, seven language/raw checks. Invalid input removed results and copy controls; correction recovered results. Raw leading signs/zeros and surrounding spaces persisted on blur while generated values normalized. |
| css-output | null | Visible CSS order/units/identity/normalization and static template are consistent; actual native HTML CSS geometry remains unverified to required tolerance. Author's reported 45° residual 0.000778144 is not a 1e-6 PASS. Clipboard success feedback is not an exact clipboard-byte readback. |
| visualization | 92 | Named vertices, A/B comparison, origin/AABB, mirroring and degenerate explanations observed; r2 coincident labels aggregate all IDs, near labels and O are distinguishable. Auto-fit does not change table coordinates. |
| interaction-a11y | null | 18-step keyboard sequence, reverse Tab, skip link then first input, native selects, B hide/show state, visible focus, bilingual raw/error recovery, keyboard reset/copy observed. Static labels/descriptions/error associations and 600 ms polite announcement present. Actual assistive announcement and clipboard refusal recovery not executed; stylesheet color calculation is not full computed-state contrast verification. |
| responsive-compatibility | null | Ordinary Chromium menu visibly confirmed 100% and 200%; at 200% text/fields/errors/results/copy remain usable with vertical scrolling and single-column result panels. Exact 320/768/1440 CSS-pixel matrix and Firefox remain untested. No real-phone gate added. |
| privacy-reliability | null | Repeated order changes, errors/corrections and six reset cycles recovered without observed crash. Static source uses textContent, finite enums, no fetch/storage/eval, and CSP connect-src none. This is not an independent runtime network/storage audit or clipboard-refusal exercise. |
| maintainability-performance | null | Pure math/validation module, separate label placement, shared LIMITS and bilingual dictionary, no external runtime dependencies, bounded four-vertex work observed in source. Readable separation is good; app/CSS are densely formatted. Required hardware-tagged UI latency measurement remains unexecuted. |

## Normal UI observations
- Invalid lexemes per field: empty, "-", ".5", "1.", "1e2", "NaN", "Infinity", "0x10", "12px", "1,5", fullwidth digit, Unicode minus; plus overprecision and both out-of-range values. Two concurrent invalid fields gave two errors and no stale copyable output.
- Valid cases per field: leading plus/zeros, negative zero with spaces, ordinary decimal with spaces, min and max. Values remained raw after leaving fields; valid output normalized.
- Keyboard progression: seven inputs, example, reset, A order, B order, show B, A table/CSS/copy, B table/CSS/copy. Skip link followed by Tab reaches tx. Reverse Tab from copy reaches its CSS region.
- At 200% normal browser zoom, invalid tx remains visible with an explanatory error and keyboard focus; corrected input restores outputs. Copy A by normal control/Return showed “CSS copied.” No inference about refusal or exact clipboard bytes.
- Six repeat edit/reset cycles retained focus on Reset and restored defaults/results. Chinese example restored default values; no claim is made about a live-announcement event captured before its debounce.
- Static palette luminance calculations for declared colors against declared light backgrounds found text minima: ink10.803, muted5.812, eyebrow5.865, error6.866, A6.512, B6.320. Focus orange4.716; input border3.758. These support the authored palette only, not every actual computed state.

## Unavailable evidence and limits
Organization policy explicitly blocks DevTools on this page. No alternate developer/runtime interface was used to bypass this. Normal browser menu zoom is separate and was used successfully. Firefox and calibrated viewport fixtures were unavailable in the current review. Author's native fixture result is retained as unresolved, not transformed into a math failure or a native PASS. Required evidence remains null until actually obtained under allowed resources.

## Follow-through
Preserve the same product bytes and original owner. Resolve or supply the specific missing native, compatibility, assistive/clipboard-refusal, privacy-runtime and latency evidence before acceptance. Additional review-only commits do not constitute a changed product. No merge, deployment, production edit, or acceptance is performed by this report.
