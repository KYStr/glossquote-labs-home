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
