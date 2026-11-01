# Integer-rate Frame Timecode Calculator — independent document completeness review

Independent nonauthor full review2026-11-01; public binding2026-11-01T08:29:32Z. Reviewer did not author this specification, author check or product. All eight documentary areas true; no remaining blocking document finding. This is not product quality acceptance or a registry event.

## Exact public documents
- `BRIEF.md`: 3819 bytes; SHA256 `f5c667c69fdf6fcf34426ef3d79025dcbb264936b795f6e0398b2dce66891df6`.
- `SPEC.md`: 17242 bytes; SHA256 `f76f694b6439ca881d2794e790ca203450a6b4c284c3f7fa3ccb2599ce06856b`.
- `AUTHOR-CHECK.md`: 3699 bytes; SHA256 `fd54151aafb12668f7f3f6bb69e10e8975626805f8aaca0cf45bef64cadd8553`.

## Full review and cleaning evidence
Full BRIEF/SPEC and new AUTHOR-CHECK were read. Actual cleaning differences were inspected: only documentary/private framing and internal tracking were removed, with a BRIEF heading repair. SPEC sections3–7 are byte-identical to the independently reviewed versions. No equations, fixtures, controls, acceptance dimensions, thresholds, required tests or NOT_RUN boundaries were weakened. No author review statement substitutes for the independent evidence here.

## Findings
F1 CLOSED in v0.2. Three source/offset controls are explicitly native text inputs; raw received .value is retained, valueAsNumber/blur reformatting/silent maxlength filtering are forbidden. Browser single-line CR/LF removal is distinguished from core-only ASCII trimming. Section7 verifies these paths. Removing only the three corrective paragraphs and reverting version labels restores the original reviewed hashes; algorithms and fixtures were unchanged. No unchanged arithmetic rerun.

## Independent documentary calculations
Independent integer-weighted h/m/s/frame and quotient/remainder calculations confirm five positive fixture rows and all five rates' day maxima/offset limits. At25fps1499+1 becomes1500/00:01:00:00; at30fps111694−4 becomes111690, exact seconds55847/15 and3723. Other cases independently checked by exact domain inequalities: source cannot be rescued by offset, max+1 overflows, frame0−1 underflows, FF24 differs at24/25fps, and rate change reinterprets literal input rather than preserving elapsed time. Intermediate magnitudes remain below10368000, safely exact as integers. No media or browser execution was inferred.

## Eight-area assessment
|Area|Result|Evidence|
|---|---|---|
|goal|true|§1: Concrete frame-carry and exact-seconds outcome, no media synchronization claim.|
|scope|true|§2: Five integer rates, no fractional/drop-frame/media/SRT/timezone scope; dated functional distinctions and fresh admission checks.|
|userFlow|true|§3: Explicit calculation, inactive literal preservation, dirty/error/reset/rate/mode/language/lifecycle; F1 raw transport now closed.|
|inputsOutputs|true|§4: Closed schema/16-unit gates/exact ASCII/ranges, independent source/shift validity, quotient format/fraction/terminal-LF serialization.|
|implementation|true|§5: Constant-size bounded core/controller/static pages, safe text sinks, zero dependencies and future commands/CSP/headers.|
|acceptance|true|§6: All nine aspects, methods/expected/evidence and independent>=90 plus mandatory gates; unknown=null.|
|tests|true|§7: Exact fixtures/endpoints/negative raw cases, F1 native/core distinction, state/keyboard/contrast/privacy/security and defined5warmup+20 sequential rAF timing.|
|handoff|true|§8: Fixed source/independent review/legal registration before readiness, own permitted claim before production, candidate hashes and explicit limits.|

## Primary sources
[Adobe XMP Timecode](https://developer.adobe.com/xmp/docs/xmp-namespaces/xmp-data-types/timecode/) confirms format/rate distinctions; this specification intentionally narrows them to its five integer rates and does not claim full SMPTE/XMP interchange.

## Limits and subsequent gates
All product/core/controller/unit/build/browser/native/AT/security/privacy/network/storage/performance execution is NOT_RUN; all nine product scores null. Timing contracts define handler entry to next-rAF callback, not physical paint; valid slow trials fail and interrupted trials are retained invalid. Missing resources remain explicit, not substituted by CPU calculations. No unchanged arithmetic was rerun for cleaning.

Visible de-duplication evidence remains scoped and dated; unseen outside work is not certified absent. Fresh source/registry/owner checks, fixed GitHub preservation, author registration and original nonauthor readiness are separate requirements. Future production requires allowed executor and unique claim/readback. Same-candidate product assessment, merge, catalog publication and deployment remain separate; this document grants no costs, credential changes or publication beyond its authorized source scope.
