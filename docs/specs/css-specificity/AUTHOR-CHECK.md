# CSS Selector Specificity Comparator — author documentary check v0.1

Scope: this is a complete specification package, not product source, product tests or an independent review. The original fixed admission BRIEF is c0862991b4fe5bcff370e375da8ebe86a3507cf3, docs/specs/css-specificity/BRIEF.md; Node24+ zero-dependency baseline README is26525d5f6380915ea95dde879dec769442db0d95. No additional package/library, deployment, workflow or permission is assumed.

## Actual checks
- Read fixed official W3C Selectors4 (22January2026 Working Draft), especially specificity and grammar/errorhandling. Distinguish standard scoring on supported valid syntax from the deliberately smaller input language and non-forgiving admission policy. No browser matching or CSS injection is needed or permitted in the planned tool.
- Checked all eight SPEC sections and exact nine fixed BRIEF criteria; author has not marked any product aspect90 or documentready. Compared known tool functions and excluded unrelated existing ownership.
- Manually decomposed S01–18. Separately checked16 named vector derivations using elementary integer tuple sums and lexicographic max, plus7 literal span/index assertions and the two timing fixture lengths. This is document arithmetic/string indexing, not execution of a future parser/product and not nonauthor evidence.
- Corrected S17's root end offset before handoff: raw12units, root `[2,10)`; trailing space and FF are excluded. The original draft's11 was an author typo, not a change to grammar.
- The documentary worksheet first stopped with a Python TypeError from applying max twice to a scalar in its S15 expression; corrected that worksheet to explicit zero-vector reasoning and reran it. No product test or external operation was involved. Final assertions passed; do not call that a producttest PASS.
- S05 exact spans: outer[0,14), alternatives[4,6),[7,9),[10,13). S07 where[0,16), pseudo-element[16,24); child local(1,1,1), ignored parentcontribution(0,0,0), total(0,0,1). Branch9 commaoffset27; fifth function colonoffset16.
- Timing fixtures deliberately separate maximum raw length from a structural stress shape:512×`.a` is1024units/(0,512,0);511×`* ` plus`*` is1023units/(0,0,0). Both require their own5warmup+20valid browser samples later; no timing has been performed.

## Author verification limits
No parser/UI/controller/build implementation exists from this spec task. npm test/check/build, normalbrowser flow, raw native textarea behavior, timing,100cycles, contrast, zoom/reflow, keyboard, privacyNetwork/Storage, actual CSPheaders/enforcement, lifecycle and independent first-use are all NOT_RUN. No package install, native automation or private user input was used. No current scores: all nine null. The future production maintainer must perform the fixed tests rather than treating this author's documentary work as their execution receipt.

## Required independent review
A noncontributor must independently verify grammar consistency, unsupported-versus-invalid language, error ordering/offsets, tree spans, elementaryvectors, finite implementation/testing contracts and all eight completeness sections. Any changes need a fixed new candidate/diff, affected review and immutable binding before readiness. The author may fix findings but cannot provide INDEPENDENT-REVIEW or selfmarkready. This document is safe for the same scoped specification PR; private coordination receipts are not part of the public package.
