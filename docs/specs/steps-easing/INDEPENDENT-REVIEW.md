# CSS Steps Easing Explorer — Independent specification review
Observed 2026-11-01 03:01–03:03 UTC. Verdict: DOCUMENT COMPLETENESS CONFIRMED; no blocking finding in this fixed candidate. Not product acceptance or formal registry readiness.

## Identity / fixed source
Reviewed by a non-author independent reviewer; the reviewer did not author or modify the three candidate source documents.
Repository KYStr/glossquote-labs-home, branch codex/steps-easing-spec-20261101, commit02b075fe26804dfe2325f7306b823afb32cf4e44, directory docs/specs/steps-easing/.
BRIEF7277B SHA2563a810b38ddabe4e03338536f6afbb6ca34a21270fb692c2a8b921ea1d3206c8c.
SPEC29066B SHA2564c5fdd6b9f4d389d72e424e4a9654a248ffcf24f596dbc1928076acbaf0e6bc5.
AUTHOR-CHECK3077B SHA2569f88378981572574b3891ae819dc6acbdad6b17eeafe733743436c963f845a00.
All three source documents were read at the immutable commit above and their bytes verified.

## Eight areas
|Area|Result and falsifiable document evidence|
|---|---|
|goal|Complete §1: author selects count/position, compares exact boundary sides and obtains CSS; success does not depend on playback.|
|scope|Complete §1: N1–100, four modes, unit domain, decimal/exact modes; optional brief playback explicitly omitted; no expansion into animation phase simulation or other owner's product.|
|userFlow|Complete §2: initial state, Generate/error focus, independent raw preservation, boundary bootstrap k0, discard k on N/mode changes, retained k for position/before, dirty clearing, Reset/examples/language/page lifecycle.|
|inputsOutputs|Complete §3: closed own-data schema, lexical lengths/grammar/ranges, integer k, exact reduced p/y, percentage rounding, canonical explicit CSS; inactive decimal text retained but ignored in boundary mode.|
|implementation|Complete §4: bounded rational core, view isolation, all boundary rows and interval segments, exact build/preview contract and five-asset allowlist, safe sinks, headers/CSP/server bounds.|
|acceptance|Complete §6: all nine IDs match registered task; necessary desktop/native/security/privacy evidence remains required, no averages or invented scores.|
|tests|Complete §5: S01–16 literals, T01–11 finite pure/state/UI/lifecycle/security/toolchain/native/timing requirements with recorded environment and NOT_RUN limitations.|
|handoff|Complete §8: immutable four-document lineage, original-author correction, independent review, separate registration/readiness, matching PR needed for task submit; product claim separate.|

## Challenged mathematical / UI details
An independent rational calculation crosscheck was performed without using the author script or future product code. S01–S16 documented expected values agree. This is document arithmetic only.
- Before decrement applies only at integral p*N, followed by scoped clamping. At p0 all before=true outputs are0; p1 before=true end/start/none/both are3/4,1,1,4/5 for N4. No rule falsely forces all endpoints to1.
- Exact1/3 at N3 differs from decimal0.333333; decimal0.333334 lies above the boundary. Selector mode retains rational k/N, never imports display rounding.
- N1 jump-none rejects before division. N1 end/start/both and N100 none/both boundary rows agree; N100,both,p0.505 gives51/101.
- Bootstrap is executable: boundary selector disabled until successful Generate using k0, then k0..N options; N/mode changes discard stale options, before/position preserve valid k. There is no circular dependency requiring a disabled selector before bootstrap.
- Hollow/filled marks explicitly represent before=true/false, not extrapolated left/right limits. Equal marks coalesce; dashed connectors are explanatory, not intermediate outputs; complete101-row table avoids relying on dense N100 glyphs.
- CSS excludes p/before; output explicit jump-end intentionally differs from CSSOM default serialization. Unit-domain scope makes both clamps legitimate.

Semantic crosscheck: W3C CSS Easing Functions Level1 dated 2023-02-13 §2.3.1 and §2.4, https://www.w3.org/TR/2023/CRD-css-easing-1-20230213/. The reference algorithm and scoped contract agree; app canonical output is distinguished from CSSOM serialization. Reference is not browser certification.

## Native-phase boundary / nonblocking implementation note
§5 fixes normal direction, single iteration, delay0, duration1000ms, paused timeline and explicit currentTime samples. Nonboundary samples avoid step ambiguity. At250ms, future tester must record timing configuration plus currentTime/getComputedTiming evidence sufficient to establish active forward phase; do not invent a public phase or before-flag setter, and do not derive phase solely from output being expected. No native run occurred here. If phase cannot be demonstrated, that required observation remains NOT_RUN as specified, blocking complete product acceptance rather than excusing it. This is already accommodated by the document, so not a specification-change request.
Likewise CSP diagram operation, native selection/focus, real navigation/BFCache, network/storage and 20 finite render timings require actual future evidence; a source check cannot satisfy them.

## Nine required aspects
functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility all preserved with their referenced tests. Every current product score=null and evidence=NOT_RUN. No product/build/browser/native/accessibility/security/performance tests were run. No test count converted into90.

## Conclusion and limits
No blocking specification defect was found in the eight areas at the identified source commit. This is independent document-completeness evidence, not product acceptance, a numerical quality score, deployment approval, or a claim that the future native checks have run. The three source documents must remain byte-identical when this report is added; any later substantive change requires an affected review tied to the changed candidate.
