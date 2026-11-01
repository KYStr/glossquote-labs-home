# Rational Arithmetic Workbench — independent document completeness review

Independent nonauthor review, 2026-11-01 UTC. The reviewer did not author the specification, author check or product. Conclusion: all eight documentary areas are true; no remaining blocking document defect. This is not product quality acceptance or a registry readiness event.

## Exact public candidate
- `BRIEF.md`: 2246 bytes; SHA256 `143ae6906a59a3a81e6afe7ce8eaffa1d6ce2668c0409d448aa1a5fe15b2697a`.
- `AUTHOR-CHECK.md`: 4135 bytes; SHA256 `716de5480e22ab6662122fd1172496c8d8b812d2634ed01dc06f769f647feb45`.
- `SPEC.md`: 16172 bytes; SHA256 `1e3891cbd9ae2a97eb066ad6faba03f4a86acd54ea755295e1c41aab343055b2`.

The full original BRIEF/SPEC and the author's public check were read. Public cleaning was independently compared with the reviewed original; SPEC sections 3–7 are byte-identical. Remaining differences remove internal author tracking, private evidence wording and unrelated refusal-path detail, retaining the prohibition on bypassing action refusals. Scope, equations, fixtures, nine acceptance aspects, thresholds, mandatory checks and NOT_RUN limitations were not weakened. Public hashes above replace the private candidate references for this review.

## Findings and affected closure
F1 CLOSED: the timing fixture description now correctly names two 12-digit numerators (999999999999) and two 13-digit denominators (1000000000000). The numeric fixture, algorithms and timing protocol did not change. Reversing only the version/descriptor change restored the exact original reviewed hashes; unchanged arithmetic was not repeated.

## Independent arithmetic
An independent documentary worksheet used Python Fraction on original raw numerator/denominator pairs to derive values independently. A separate normalized cross-product calculation checks each documented unreduced N/D and gcd; signed mixed form checked from quotient/remainder. Fifteen successful rows cover all14 numbered fixtures including both signs of7/3. Division by zero separately rejects. All values/pairs/gcd/mixed representations match, including normalization BEFORE arithmetic,0/-999,negative divisor,zero result,10^24 product,1/10^24 and fixture14 G=2000000000000. The result may legitimately exceed the inputcap.

The magnitude bound2*10^24 and25decimaldigits hold. Positive Euclidean inputs at this scale have a worst-case Fibonacci scale around116 steps, safely below256guard; this is bounded reasoning, not a runtime performance result. ECMAScript2025BigInt primary source was consulted in this review batch: https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-bigint-objects . Exact arithmetic and noNumber magnitude are consistent.

## All eight areas
|Area|Assessment|Evidence|
|---|---|---|
|goal|true|§1 gives exact two-fraction operation and explainable1/6+1/3/zero-divisor outcomes without teaching certification.|
|scope|true|§2 excludes free expressions,units/rounding/files/clipboard and distinguishes domain calculators/Integer Representation; current admission dedup still required.|
|userFlow|true|§3 defaults,all-field validation order,error focus,dividezero association,atomic success,dirty clearing,reset/language/BFCache/unsupported states.|
|inputsOutputs|true|§4 fixedschema/raw18units/ASCIIgrammar/ranges;denominatorzero/signedzero;positive normalizeddenominators;preciseunreducedpair/gcd/canonical/mixed/summaryserialization.|
|implementation|true|§5 boundedBigInt/core/controller/staticpages,explicitfuturecommands,zero dependencies,safe sinks,CSP/headercontract. No claim planned files already exist.|
|acceptance|true|§6 nine unchanged dimensions/independent methods/evidence/anchors;each>=90plus mandatory checks;nullunobserved,criticaldefectsblock.|
|tests|true|§7 otherwise complete raw/minmax/state/language/native/privacy/keyboard/contrast/lifecycle matrix and exact timer endpoints,warmups,20sequentialvalidtrials,invalidretention. The v0.2 correction identifies two 12-digit numerators and two 13-digit denominators; F1 is closed.|
|handoff|true|§8 fixed GitHub/publicsource andnonauthorreview before readiness,legalproductionclaim,draftPR/hash/evidence and no deploymentauthority.|


## Evidence limits and next gates
All product implementation/core/controller/unit/build/browser/native/accessibility/security/privacy/network/storage/performance execution remains NOT_RUN; all nine product scores are null. Independent integer/Fraction worksheet calculations validate document examples only, not an implemented product. Author checks are not substituted for this independent review. Unchanged calculations were not rerun for public cleaning.

This technical review retains the original complete review conclusions and the affected closure without publishing internal paths or coordination records. Visible de-duplication evidence is scoped and dated, not proof that no unseen work exists. Fresh registry/owner/source checks, fixed GitHub preservation, lawful spec registration and independent readiness recording remain separate gates. Future production requires a valid allowed executor and claim/readback; same-candidate independent product assessment is still required. No deployment, catalog publication, merge, cost or credential authority is conferred.
