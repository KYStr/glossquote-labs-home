# Flex Shrink v0.2 — independent document review

Reviewed 2026-11-01 by a non-author. This is specification completeness and affected-correction review, not product execution, numerical quality scoring or browser certification.

## Fixed candidate

Repository: KYStr/glossquote-labs-home. Reviewed commit:67d6c53a4c244c373d07781cc64f8624e50137a2. Directory:docs/specs/flex-shrink/.

|File|Bytes|SHA-256|
|---|---:|---|
|BRIEF.md|6124|353f38df47d8afdc3dbf98b9270a575386f5707d31576ad5a09df0c6ef089b47|
|SPEC.md|29004|1fcc6ed9aa515babdfd0c9815ee905354351b2102608921ac091e54a57248d1c|
|AUTHOR-CHECK.md|3331|a80e1afea413d226bb36c92687d50adec51aee5753f79a9264bf992078062b72|

All three were independently fetched at this commit and checked byte-for-byte against the corrected author packet. The previous complete review covered v0.1 commit830daaa0936646b0ec29bacc2aea7c63eaf9b88e; the entire subsequent diff was inspected, not merely the author summary. BRIEF is unchanged historical admission context; current ownership/status is not inferred from its older wording.

## Findings and verified corrections

**F1 — no-growth trace contract:** v0.1 required F0 and initial freeze reasons in every result without defining those fields for the no-growth shortcut. v0.2 defines F0=C−sum(H), reason grow-zero for every item, and an empty rounds array. F11b independently gives H=[150,100,100], C400, F0/residual50, no shrink rounds. Requested bases remain separate from used widths. The correction closes the output ambiguity without changing shrink arithmetic.

**F2 — retained raw input:** v0.1 required visible invalid/overlong strings without fixing a compatible input-control/raw-state contract. v0.2 requires text controls with decimal inputmode and input.value snapshots, no numeric coercion or blur/success rewriting, and app-owned validation/submission. It distinguishes single-line CR/LF sanitization from pure-parser whitespace acceptance, and excludes composing Enter from generation. F17/F19 are synchronized. [HTML text-state sanitization](https://html.spec.whatwg.org/multipage/input.html#text-(type=text)-state-and-search-state-(type=search)) was independently consulted; the correction does not promise clipboard-byte preservation.

**F3 — reproducible/security interface:** v0.1 deferred concrete build/test/check and CSP/asset requirements. v0.2 adds fixed future command interfaces, output trees, file/module allowlist, loopback server, exact HTTP CSP and required direct-property-setter/blocking observations. The cited fixed baseline README/package.json were independently read and support the stated toolchain provenance. These are explicit requirements for a later implementation, not assertions that Flex product scripts or deployed headers exist. Production canonical origin remains approval-gated and must not be invented. [CSP3's dated style-src-attr section](https://www.w3.org/TR/2026/WD-CSP3-20261027/#style-src-attr) was consulted; runtime setter compatibility remains a required observation, not an assumed pass.

All three document findings are closed against the fixed v0.2 bytes. No remaining blocking document inconsistency was identified.

## Model and arithmetic

The reviewer read [CSS Flexbox, 14 October2025 CR Draft, sections4.5 and9.7](https://www.w3.org/TR/2025/CRD-css-flexbox-1-20251014/). Under the declared empty-item, explicit-minimum, zero-box-decoration subset, branch choice, initial freezes, preserved initial free space, scaled shrink factors and min-violation freezing agree with the reference. Automatic/intrinsic sizing is excluded rather than treated as zero.

F01–F15 widths and exact residuals were independently checked using direct rational equations separate from the author's algorithm. This is document arithmetic, not fifteen product tests. Unchanged cases were not rerun for v0.2. New F11b alone received affected arithmetic verification.

Key checks: F04 redistributes the remaining55 after freezing95; F05 freezes minimum80 above basis50 before allocation; F07 retains initial−150 and multiplies by remaining factor sum0.8, giving40/40 after90 freezes and residual−20; F15 has width3999/400 and residual−3/400 despite rounded width10.00. No rounded values feed the core or force the sum to the container.

D0 is explicitly bounded: only initially frozen items can supply the deficit when remaining active bases/minima are zero. F13 reports50/0/0 and overflow10. This limiting model convention still requires native evidence; it is not a claim that every browser degeneracy has been proven.

## Eight completeness areas

|Area|Complete|Evidence|
|---|---|---|
|Goal|true|Specific frontend explanation problem and finite edit/generate/inspect/select task.|
|Scope|true|3–6 empty items, explicit axis/box/units/ranges, grow/content/intrinsic exclusions and unknown-duplicate boundary.|
|User flow|true|Count/edit invalidation, examples/reset, errors/selection, bilingual state, focus and navigation; corrected raw-control contract.|
|Inputs/outputs|true|Closed grammar, exact fractions, deterministic requested CSS, full trace including corrected no-growth fields.|
|Implementation|true|Bounded rational loop, safe rendering, immutable output, fixed future toolchain/CSP/asset interfaces and unsupported-state behavior.|
|Acceptance|true|All nine original product dimensions retained with concrete evidence and per-candidate thresholds; scores remain null.|
|Tests|true|Independent arithmetic expectations, corrected F11b/F17/F19/F22, native tolerances, lexical/state/keyboard/reflow/contrast/privacy/performance plans.|
|Handoff|true|Fixed four-document candidate, reproducible interfaces, evidence/ownership/collision checks and distinct readiness/production gates.|

The native preview must remain empty and untransformed with labels outside. Requested CSS, exact numeric model and measured used widths are distinct. The documented desktop tolerance is not exact browser equality.

The desktop plan specifies installed Chromium/OS/viewport/zoom/device scale, both languages, keyboard/errors/manual selection, contrast pairs, narrow viewport/zoom, BFCache truthfulness, network/storage/permissions, and bounded timing. Other devices and assistive extensions do not substitute for missing required baseline evidence.

## Limits

No Flex product source, GUI, native CSS measurements, accessibility behavior, network/storage, build artifacts, performance or deployed site was executed or accepted by this review. Required runtime tests remain NOT_RUN; all nine product scores remain null. A Boolean document-completeness result is not90/100 or a PR approval.

This document does not create a registry readiness event, submit a task, transfer ownership, claim production, merge or deploy. Unknown unpublished local duplicates remain unknown and require current collision checks before production. Formal admission and a later separately authorized production claim remain distinct.
