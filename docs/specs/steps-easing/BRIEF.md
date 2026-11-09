# CSS Steps Easing Explorer — admission brief

2026-11-01. One proposed specification-writing task, not a complete SPEC, claimed product or ready inventory. Product checks are NOT_RUN and all quality scores null.

## Goal and distinction

Help a frontend author understand which side of a discrete easing jump is used, distinguish four step positions, read exact endpoint/interior values, and obtain one deterministic CSS declaration. The normal task is choose interval count and jump position, Generate, inspect a staircase/table and a static progress marker, then manually select CSS. It does not need playback to be useful.

This is not the existing Cubic Bézier Explorer: its fixed SPEC at commit8553231a365de4eafb964f620ea530850b4fbab0, docs/specs/cubic-bezier-easing/SPEC.md explicitly excludes steps. Bézier solves a continuous control-point curve; this proposal explains discrete interval boundaries, integer validity, jump counts and the before flag. It does not replace that owner or extend that task. Transform-Origin concerns spatial transforms; Flex Shrink concerns width distribution; Gradient/Shadow/Grid concern visual styling/layout. No curve fitting, keyframe editor, sprite-sheet import, animation sequencing or general CSS parser is included.

## Proposed bounded contract

- Interval count N: ASCII integer1–100; jump-none additionally requires N>=2. A native select offers exactly jump-start, jump-end, jump-none and jump-both. The app cap100 is a scope decision, not a CSS limit. Text controls retain invalid raw strings; complete SPEC must fix grammar/length and single-line sanitization boundaries before implementation.
- Input progress p is within[0,1], up to six decimal places, plus exact boundary selection k/N for every integer k from0 through N. Exact rational boundary mode is necessary for N such as3; rounded decimal input must never masquerade as an exact jump point. A separate before-flag checkbox is an explicit mathematical input, not an inferred animation phase.
- Output: exact fraction and clearly rounded display, all boundary values for before=false/true, staircase with open/closed boundary markers and a text-table equivalent, static linear-versus-step progress markers, and `animation-timing-function: steps(N, POSITION);` with one final LF. This is app-authored explicit CSS, not a claim to reproduce CSSOM's omission of jump-end. Explain start/end aliases and step-start/step-end in help only; no arbitrary CSS import.
- Finite desktop demonstration is primarily static/manual: select endpoints or an interior boundary and compare both before states without motion. An optional single user-started2-second forward demonstration may be specified later, with reduced-motion disabling it and no autoplay/repeat; it must not be used as the numerical oracle. No reverse/alternate iterations, delay/fill simulation, domain extrapolation, composition of easing functions, audio, files, clipboard API, network input, persistence or remote dependencies.
- Generate validates a snapshot; edit invalidates results, error keeps raw, successful submission retains focus, first invalid field receives focus. Reset and bilingual switching need explicit state contracts in the full SPEC. Manual CSS selection remains usable with ordinary keyboard controls. Unknown unpublished local duplicates remain unknown; an observed owner collision stops admission, not a pretext to take over.

## Official reference and provisional expected observations

Use [CSS Easing Functions Level1, 13 February2023 CR Draft §2.3/2.3.1](https://www.w3.org/TR/2023/CRD-css-easing-1-20230213/#step-easing-functions), read2026-11-01. This draft is a semantic reference, not browser certification. Its before flag chooses the other side exactly at a boundary; output within the scoped unit interval is bounded. The complete SPEC must preserve that distinction using exact arithmetic rather than epsilon tests.

For N=4 and before=false, expected output at p=0,1/4,1 respectively: jump-end gives0,1/4,1; jump-start gives1/4,1/2,1; jump-none gives0,1/3,1; jump-both gives1/5,2/5,1. At p=1/4 with before=true these become0,1/4,0,1/5 respectively. N=1/jump-none is invalid, not silently changed to2. These are hand-derived document expectations, not executed product tests. A future independent reviewer must challenge endpoints, all four modes, non-boundary samples, N1/N2/N100 and exact boundary selection. Native CSS checks must separate animation phase/fill behavior from the explicit before-flag mathematical input; no invented browser flag control is promised.

## Fixed admission identifiers and scope

Proposed taskId: labs-steps-easing-spec-20261101. Proposed specId: spec-steps-easing-20261101. Repository KYStr/glossquote-labs-home; proposed branch codex/steps-easing-spec-20261101; documents under docs/specs/steps-easing/. Source baseline commit26525d5f6380915ea95dde879dec769442db0d95, README.md. allowedExecutors for specification writing only: [cloud-dot]. The registry, not this brief, determines actual author/owner/claim. No owner has been assigned by this document.

Admission sequence: preserve this BRIEF at a fixed GitHub commit, register one nonduplicate task with the following nine criteria, actual actor ACK plus CAS claim/readback, then write the full eight-section SPEC/author checks and obtain nonauthor review. No full specification or product work starts merely because this brief exists.

## Nine required future acceptance aspects

|ID|Required scope to be made executable in the full SPEC|
|---|---|
|functionality|Four jump positions, validity and exact boundary/before semantics; table/graph/markers/CSS from one snapshot.|
|boundaries|Closed bounded raw grammar, N1/jump-none, N100, exact versus decimal progress, endpoints, rounding, dirty/error/reset states.|
|privacy|Synthetic numeric inputs only; no upload, storage, URL state, telemetry, file or clipboard read/write; actual network/storage evidence later.|
|security|Bounded rational calculations, safe text/SVG/style sinks, fixed static assets/CSP and no arbitrary CSS/HTML execution.|
|usability|Nonauthor completes a normal desktop discrete-jump comparison, understands before flag and obtains CSS without reading source.|
|accessibility|Keyboard/focus/labels/errors, open/closed marker text equivalents, finite computed contrast/reflow/zoom, no motion dependency.|
|localization-seo|Complete Traditional Chinese/English help/status/errors; invariant numeric/CSS output; correct lang/head metadata and same-language links.|
|toolchain-provenance|Existing Node24+ zero-dependency baseline, reproducible future command/artifact interfaces, independent literal examples, exact version and handoff.|
|compatibility|Named available desktop browser, bounded native step comparisons and state/lifecycle observations; explicit untested extensions, no unresourced device gate.|

Full SPEC must cover goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff. Every future product aspect independently requires at least90 with same-candidate nonauthor evidence; untested required aspects stay null. Document readiness is a separate eight-area Boolean review. No product code, merge, deployment, workflow, cost, credentials or catalog change is authorized here.
