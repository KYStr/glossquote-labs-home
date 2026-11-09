# CSS Specificity — independent documentary review v0.1

Reviewed 2026-11-02 UTC. **DOCUMENTARY PASS**: all eight completeness sections are satisfied; no blocking finding. The reviewer did not author, edit or contribute to this CSS specificity specification. This review is not product acceptance or a ready-stock declaration.

## Fixed public source binding
Repository: KYStr/glossquote-labs-home. Commit: `ab65e6f27697f6fe0c06767108baa85747204b68`. Directory: `docs/specs/css-specificity/`.

The reviewer personally fetched all three files at this immutable commit and verified their full UTF-8 bytes equal the reviewed originals. No technical revision or arithmetic rerun occurred during this binding.

| File | Bytes | SHA256 |
|---|---:|---|
| [BRIEF.md](https://github.com/KYStr/glossquote-labs-home/blob/ab65e6f27697f6fe0c06767108baa85747204b68/docs/specs/css-specificity/BRIEF.md) | 8320 | `a2378c127f828056be82cecb7148b3136b5cf03f67ed6f10b68fb50ad76e084f` |
| [SPEC.md](https://github.com/KYStr/glossquote-labs-home/blob/ab65e6f27697f6fe0c06767108baa85747204b68/docs/specs/css-specificity/SPEC.md) | 26596 | `ad346df046837b1ffe26790691e53e9e11bf22c6a673222b22bbbc075fd1c72c` |
| [AUTHOR-CHECK.md](https://github.com/KYStr/glossquote-labs-home/blob/ab65e6f27697f6fe0c06767108baa85747204b68/docs/specs/css-specificity/AUTHOR-CHECK.md) | 3471 | `50f1c77530b59643b74e0116205e8506b8080e229000894f39acb3bd5046da18` |

## Method and official scope
I read the complete specification package. I independently decomposed all18 fixtures into leaf counts and lexicographic choices, and manually indexed the stated span/error literals; I did not execute or import the author's worksheet, parser, product or browser matching. AUTHOR-CHECK was read as provenance only.

Official reference checked during the full review: [W3C Selectors4,22January2026 Working Draft](https://www.w3.org/TR/2026/WD-selectors-4-20260122/), especially sections4,15,16. Supported valid inputs follow ordered specificity components, strongest-argument replacement and zero-weight where. The restricted grammar and non-forgiving admission are expressly not a complete CSS validator. No normative claim that all CSS accepted by browsers is supported is made.

## Eight-section completeness
| Required section | Complete | Evidence |
|---|---|---|
| goal | true | Specificity education, two-selector comparison, no matching/cascade-winner claim; fixed baseline/admission. |
| scope | true | Closed ASCII grammar, finite pseudo allowlists and explicit exclusions; no nth-index exploration, native APIs, dependencies or owner transfer. |
| userFlow | true | Entry/defaults, Compare/error focus, edit invalidation, manual summary, Reset, language route interception and page lifecycle are finite and explicit. |
| inputsOutputs | true | Descriptor/schema checks, two-field precedence, raw/textarea normalization distinction, UTF16 offsets, stable results/tree/summaries and deterministic error rules. |
| implementation | true | Bounded scanner/parser and contribution tree, arithmetic bounds, pure/controller/DOM separation, build/server/artifact/CSP interfaces. |
| acceptance | true | Same nine admitted IDs in same order, each>=90 plus every mandatory condition, independent same-candidate evidence and null for unperformed checks. |
| tests | true | Unit, UI, privacy/security, accessibility, bilingual/build, finite lifecycle100cycles and two precise5+20timing fixtures; no fake execution. |
| handoff | true | Exact files/hash, independent review, public-source and readiness prerequisites, future production claim and candidate evidence, untouched owners. |

## Independent fixture derivations
All results below agree with the fixed SPEC, including the supplied pair comparisons.

| ID | Independent reasoning/result |
|---|---|
|S01|L ID1+class1=(1,1,0); R class2+type1=(0,2,1); left wins atA.|
|S02|Universal zero; div type1; right wins atC.|
|S03|Eleven classes remain(0,11,0); oneID(1,0,0) wins atA, no decimal carrying.|
|S04|ul/li/li giveC3, active/hidden giveB2: (0,2,3).|
|S05|max((0,1,0),(1,0,0),(0,0,1))=(1,0,0), not componentwise max.|
|S06|max((0,2,0),(1,0,1))=(1,0,1).|
|S07|where child hasID1,class1,type1 but parent zero; before addsC1: (0,0,1).|
|S08|section addsC1; is max(class1,where-zero) addsB1: (0,1,1).|
|S09|Outer where zeros inner is; external.b alone yields(0,1,0).|
|S10|class+hover giveB2; after givesC1: (0,2,1).|
|S11|TwoIDs; two repeated classes+attribute+focus giveB4; div givesC1: (2,4,1).|
|S12|Each hasoneclass,onetype: (0,1,1),equal/null.|
|S13|Tied is branches contribute oneID, external#z another: (2,0,0).|
|S14|Inner is givesB1; not max(inner,#x) gives(1,0,0); ASCIIcasefold changes no score.|
|S15|Innermost is givesB1; where zeros it; not and outer is preservezero; four activefunctions valid.|
|S16|Eight alternativeclass vectors tie, contributeonly(0,1,0).|
|S17|Whitespace/combinator zero, div and.a yield(0,1,1).|
|S18|Universalzero and first-letter give(0,0,1).|

Span check: S01 rawlength12, root[0,12), #card[0,5), .title[6,12). S05 rawlength14, function[0,14), branch ranges[4,6),[7,9),[10,13). S07 where ends16 and before occupies[16,24). S17 control-character rawlength12, first token2 and last token ends10; root[2,10) excludes finalspace/FF. Children retain local values under where; the explicit ignored-child annotation prevents summing those leaves directly into root. Root/compound/function wrappers and source-order children are coherent.

## Boundaries, diagnostics and cap audit
Schema precedes lengths; either overlength suppresses parsing, L wins only when both overlength. Otherwise each field independently uses whole-input unsupported-character scan before EMPTY/structural parse; output never contains partial analyses. Empty offset0; EOF offsets use raw.length. The named ordinary/exclusion examples and three extension cases were manually traced. In particular slash in `:is(.a,/bad)` is7; missing operand in `:is(.a,)` is7; `.a::before:hover` fails at10; `:not(*::before)` fails at6; repeated combinator in `div > > span` fails at6. Fifth nested is starts16; ninth branch comma27. These agree with the declared scan-first policy, not browser forgiving-list behavior.

Additional reasoning: `>div/` must report unsupported slash4 before leading-combinator syntax; `:is(.a,.b,)` reports missing branch at10; `*::before > .x` reports context at10; blankrecognizedwhitespace reportsEMPTY0. These follow the same rules without new functionality. Invalid arguments under where still fail despite zero contribution.

Length1024 bounds possible tokens/score components; each compound or leaf consumes syntax, no epsilon compound, and nesting<=4. The conservative2049node statement is compatible with a linear structural tree; proposed4096guard cannot reject a legal bounded input. Dense512*.a yields1024units,B512. Structural511*`* ` plus`*` yields1023units,512compounds,zero. The timing definition does not falsely claim either shape is global worstcase. Both use fivecompletedwarmups,20sequentialvalidsamples, handlerentry→nextpost-DOMrAF,each<=100ms with environment/raw samples and no discarding validslowresults.

## Nine-criteria executability and limitations
All nine registered directions are retained. Functionality/boundaries have literal deterministic expectations; privacy requires actual Network/Storage, security actual CSP rather than static-only inference; usability requires nonauthor first-use observations; accessibility fixes keyboard/focus/contrast thresholds,200%zoom and320/768/1440reflow; localization includes raw/semantic preservation and preview/production metadata distinction; toolchain includes reproduciblebuilds and exactrestoration; compatibility names actual engines and separates unavailable secondengine. The mandatory primary checks are finite and may remain blocked if capabilities are absent; absence is not a documentary contradiction and never grants an inferred90.

Nonblocking observations: the BRIEF retains admission-stage future wording intentionally; this is compatible with its fixed historical role and the new complete SPEC. Ordinary pseudo names are case-insensitive for interpretation; public AST has no name field, so future implementers should not add extra AST fields simply to expose normalized names. Kind/spans already make the prescribed tree and scoring unambiguous; no scoring or mandatory-contract change is requested.

Blocking findings: none. No author revision required for documentary completeness.

## Unperformed work and revision boundary
All product checks remain **NOT_RUN** and every product dimension score **null**. No product implementation, build execution, GUI, privacy, CSP enforcement, accessibility or browser timing result is established by documentary reasoning. Product implementation, independent acceptance, merge and deployment remain separate. Any technical change to the bound author documents requires affected independent review; this report does not automatically cover later bytes.
