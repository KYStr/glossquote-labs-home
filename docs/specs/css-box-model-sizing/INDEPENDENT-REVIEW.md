# CSS Box Model Sizing Explorer — independent document review v0.2

Reviewed 2026-11-01 UTC by a reviewer who did not author the specification or product. Conclusion: all eight documentary areas complete; no remaining blocking document finding. This is not product acceptance or a registry readiness event.

## Exact public candidate binding

Relative directory: `docs/specs/css-box-model-sizing/`. The following complete bytes were read and verified:

| File | Bytes | SHA-256 |
|---|---:|---|
| AUTHOR-CHECK.md | 3577 | `77bdf107c2fb851eaa0d2d4d1fc3ee5c261fbc4462fbace1c57267263eeecc84` |
| BRIEF.md | 4572 | `f1e976273e6c753c4c9b6345cc5021d5111927a11dfd454b2f27981cb1b75c5a` |
| SPEC.md | 20474 | `279f3fe985e33be282a4b78519ce286cd36cf059159f5687067d0ace0ecc551d` |

Publication must preserve these bytes. A fixed remote commit and exact readback are still required before a formal registry readiness operation.

## Eight-area completeness

| Area | Result | Evidence in SPEC |
|---|---|---|
| goal | true | §1 identifies the user problem and bounded successful outcome without invented user research. |
| scope | true | §2 distinguishes neighboring tools and excludes arbitrary input, unrelated features and ownership adoption. |
| userFlow | true | §3 defines defaults, edits, dirty/error/success, repeat, reset, focus and language behavior. |
| inputsOutputs | true | §4 fixes grammar, limits, exact derivation, canonical serialization and expected examples. |
| implementation | true | §5 specifies bounded pure logic, safe rendering, static assets, CSP and future command interfaces without claiming existing product code. |
| acceptance | true | §6 preserves all nine required product aspects, methods, evidence, per-aspect threshold and unknown/null treatment. |
| tests | true | §7 supplies independent examples, boundary/state/native checks and a finite reproducible timing protocol. |
| handoff | true | §8 distinguishes fixed sources, independent review, claims, readiness, product acceptance and publication. |

## Independent reasoning and findings

Ten independent axis/equality cases were derived using exact rational edge conservation. Content-box outer dimensions add both padding and border edges; border-box content is floored at zero, so an undersized declared dimension cannot erase edges. Defaults, unequal sides, zero declared size, equality and maximum bounds matched the documented expectations. The relevant [primary specification](https://www.w3.org/TR/2026/WD-css-sizing-3-20260904/#box-sizing) was consulted. This was documentary arithmetic, not execution of a product or browser.

F1 CLOSED: §7 now fixes handler-entry timing before validation through the next requestAnimationFrame after complete result DOM updates, foreground unthrottled conditions, a maximum-work fixture, five warmups and twenty sequential measured trials. All raw durations/environment and invalid interruptions must be retained; valid slow trials fail. This measures a presentation opportunity, not physical paint or GPU completion. Missing measurement remains NOT_RUN, not a substituted CPU result.



The affected v0.2 review verified the precise delta against the original reviewed draft; all unrelated contracts and original expected arithmetic remained unchanged. Unchanged arithmetic was not rerun to inflate evidence.

## Public-cleaning equivalence

The actual full diff between the reviewed v0.2 and these public files was inspected. SPEC §§3–7 are byte-identical. Changes remove internal author tracking/private receipt references and unrelated coordination wording, redirect provenance to AUTHOR-CHECK, and preserve the prohibition on bypassing refusals in generic terms. No technical formula, fixture, required aspect, threshold, unsupported limit or closed finding was weakened. AUTHOR-CHECK correctly distinguishes the author's documentary work from this independent conclusion.

## Limits and next gate

All product/unit/build/browser/native geometry, keyboard, contrast, privacy/network/storage, lifecycle and performance execution remains NOT_RUN; all nine product scores remain null. No product source was made or assessed here. This document does not claim production ownership, register a task, mark a spec ready, approve or merge a PR, deploy, change the catalog or authorize new dependencies/costs. Admission must refresh ownership/path conflicts; unknown unregistered work is not assumed absent. Formal document readiness, if warranted after fixed remote binding, belongs to the independent reviewer through the current registry core/CAS/readback process.
