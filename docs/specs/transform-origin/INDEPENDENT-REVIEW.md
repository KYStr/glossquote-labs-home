# Transform-Origin r2 — Independent document review

Review date: 2026-10-31. Reviewed by a non-author. Scope is specification completeness, mathematical examples and the sanitized document candidate, not an implemented product.

## Fixed reviewed files

| File | SHA-256 |
| --- | --- |
| BRIEF.md | 01f211fa0b9f539072e0d2f6bf221d3f4e7ee1442bc6c9f7f7c98885c94b7db2 |
| SPEC.md | 5f0f74089d68e0a6e26386b3f56b94c687cc3d8a47835690dc3082bf6056c40a |
| AUTHOR-CHECK.md | 41fd6cf165d72e6ef1f5b53b90e5b37f236acdf484a8abe153e39fd38a1122bd |

## Findings and correction

F1 identified a conflict between a number input control and the required signed raw-string grammar/preservation. Number-state sanitization cannot reliably retain the specified leading-plus and incomplete strings. The author corrected the design to text controls with decimal input hints, explicit full-string validation, unchanged raw state on blur/language switching, and matching accessibility and future regression requirements. The affected sections were re-reviewed and F1 is resolved in the document.

The relevant primary definitions are the [HTML Number state](https://html.spec.whatwg.org/multipage/input.html#number-state-(type=number)) and [valid floating-point grammar](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-floating-point-number). This is a specification finding, not a claim that a product bug was reproduced.

## Independent arithmetic and CSS semantics

The 14 fixed cases, 56 vertices and effective matrices were independently checked by subtracting the origin, applying the listed functions in reverse order to each point, and adding the origin back. Matrices were independently recovered from transformed basis points. Maximum vertex difference was 2.2737367544323206e-13, below the specified 1e-6 tolerance. The six permutations, center/exterior origins, negative and zero scale, ±360°, 45° and bounded extreme example agree. The reviewed JSON is preserved byte-for-byte in SPEC Appendix A; sanitization did not require repeating the unchanged calculation.

The multiplication order and origin sandwich agree with [CSS Transforms Level 1](https://www.w3.org/TR/css-transforms-1/). The draft correctly distinguishes a mathematical degenerate illustration from an actual non-invertible CSS element, which is not displayed. CSS output retains the original transform-function list rather than applying the origin twice. The fixed CSS example matches declaration order, units, spacing and final newline.

Six-decimal display rounding, negative-zero suppression and separation of displayed versus unrounded values are specified. Their future implementation still requires the planned tests; these document calculations do not validate native rendering.

## Document completeness

| Section | Finding |
| --- | --- |
| Goal | Specific audience, problem and expected educational outcome. |
| Scope | Fixed box, axes, permutations, shared inputs and exclusions. |
| User flow | Initial comparison, editing, invalidation, copy failure, reset and language behavior. |
| Inputs/outputs | Bounded grammar, precision, matrices, vertices, bounds and deterministic CSS; F1 corrected. |
| Implementation | Pure layers, transform equations, finite diagram framing and degeneracy semantics. |
| Acceptance | Eight separate future product dimensions with explicit untested states. |
| Tests | Independent expected values, invalid inputs, raw-preservation regressions and native observation requirements. |
| Handoff | Fixed-document review and separate ownership/registration gates before implementation. |

All eight sections contain sufficient specification content for this document review. No additional blocking document contradiction was found. Sanitized BRIEF/SPEC/AUTHOR-CHECK retain the reviewed technical scope, limits, equations, acceptance dimensions and expected values; embedded appendices avoid missing external example dependencies.

## Limits

No product was implemented or executed for this review. Native GUI, keyboard/accessibility, clipboard behavior, browser compatibility, performance, privacy/network behavior and deployment checks are NOT_RUN; product quality scores remain null. Document completeness is not product acceptance, registration readiness, ownership, permission to implement, merge or deploy. Required current duplicate checks and formal project admission remain separate.
