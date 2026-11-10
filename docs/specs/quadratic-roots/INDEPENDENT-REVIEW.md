# Exact Quadratic Roots — independent documentary review v0.2

Reviewed 2026-11-02 UTC by a nonauthor who did not contribute to the specification. **DOCUMENTARY PASS**: all eight completeness gates satisfied; no blocking finding. This is specification completeness only, not product execution, scoring or acceptance.

## Exact reviewed author documents

| Document | UTF-8 bytes | SHA256 |
|---|---:|---|
| BRIEF.md | 7378 | `42cce6864e6bc9271766afe6643ac779c9a9fe8e2576a6612cac769be597bec7` |
| SPEC.md | 26738 | `51bda7c8ddf478a503d8adaeb49799255d452c18443ada9243e497d58cd597df` |
| AUTHOR-CHECK.md | 4753 | `01a37529bd2af6ed98abccc08a9cbd78574ea7092c264b7c5394a3a66b766df6` |

Fixed admission [BRIEF](https://github.com/KYStr/glossquote-labs-home/blob/81c661cc655b5f5be77904e943a5ac34b977caa5/docs/specs/quadratic-roots/BRIEF.md). Source baseline: `26525d5f6380915ea95dde879dec769442db0d95`, README.md. All three author documents were personally fetched at fixed commit `8975cfd08afaf58a609b32ef06afa95b2c5b5903`, directory `docs/specs/quadratic-roots/`, and their full UTF-8 bytes matched these hashes and the affected-reviewed files.

The reviewer read the complete author package. The author's worksheet/results were not executed, imported or used as an independent oracle. Affected review: the entire author diff contains only the discriminant-sign wording correction in SPEC §7 and an appended editorial explanation in AUTHOR-CHECK; BRIEF is unchanged. Reversing that single SPEC phrase exactly reconstructs the original reviewed bytes. Algorithms, fixtures, bounds, states, nine criteria and mandatory checks are unchanged. Prior full arithmetic was not rerun.

## Sources and method
Read [OpenStax College Algebra2e §2.5](https://openstax.org/books/college-algebra-2e/pages/2-5-quadratic-equations) and [ECMAScript BigInt](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-bigint-type). The quadratic identity and exact integer primitive support the stated approach; bounded domain, serialization, UI behavior and admission policy are this specification's own design. No approximation, engineering-safety guarantee or complete symbolic algebra is implied.

The independent check uses prime factors with exponent parity, rather than executing the proposed repeated-square extraction or author worksheet. Rational cases use Fraction substitution. Irrational cases verify both polynomial coefficients and exact Vieta sum/product. Raw grammar/state/schema and serialization were manually reviewed as contracts, not tested application behavior.

## Eight documentary gates
| Gate | Complete | Evidence |
|---|---|---|
|goal|true|Educational exact real roots, discriminant interpretation and explicit nonengineering/nonmedical scope.|
|scope|true|Three bounded integer coefficients, nonzero a, four classifications; no complex/approximate/parser/graph/system scope. Functional boundary from existing rational/linear tools is explicit; unknown drafts remain unknown.|
|userFlow|true|Defaults, edit invalidation, explicit Solve/Enter, first-error focus versus success retention, all-state Reset, bilingual preservation, reload/BFCache and unsupported-feature behavior.|
|inputsOutputs|true|Closed ordinary-object/data-descriptor schema, UTF16 raw cap and ASCII trim/grammar, per-field ordering, signed normalization, root/verification model and canonical JSON text.|
|implementation|true|Exact bounded BigInt gcd/discriminant/square extraction, safe typed rendering, finite guard, module/script/artifact/static assets and CSP/bootstrap contracts.|
|acceptance|true|All nine admitted IDs/order preserved; required independent methods and original author's anchors explicit, each>=90 AND mandatory checks, unavailable evidence null. I add no rubric or product scores.|
|tests|true|18 exact fixtures, endpoint/adjacent/raw/schema matrix, full state/bilingual/privacy/native accessibility, deterministic builds, finite100cycles and5+20timing protocol.|
|handoff|true|Immutable source/files, author versus nonauthor separation, independent product evidence and NOT_RUN limits, future legal task/claim, no inferred publication/deployment.|

## Independent arithmetic findings
All18 fixture inputs, m, normalized tuples, D, classes and roots agree. Independent calculations used prime-exponent factorization and exact Fraction/integer arithmetic, not product code or author results.

|Fixture|Independent result|
|---|---|
|Q01|m1,D1, rational1,2.|
|Q02|m2, normalized(1,2,1),D0,repeated-1.|
|Q03|D8=2^3,k2,r2; roots(0±sqrt2)/1.|
|Q04|D24=2^3*3,k2,r6; roots(0±sqrt6)/2.|
|Q05|D-4,no-real,empty roots/null verification.|
|Q06|m-2,normalizedQ01,roots1,2 with distinct original tuple.|
|Q07|m3,normalized(1,0,0),D0,canonical0/1,multiplicity2.|
|Q08|D9,k3,r1; reduced roots-1,1/2.|
|Q09|D8;(-1±sqrt2)/1.|
|Q10|D24;(-3±sqrt6)/3.|
|Q11|D288=2^5*3^2,k12,r2; roots(0±6sqrt2)/1.|
|Q12|m10000,normalized(1,1,-1),D5;(-1±sqrt5)/2.|
|Q13|D499980001=37*97*139309, all exponent1; k1,r499980001;(-9999±sqrt499980001)/20000.|
|Q14|D-399960000,no-real.|
|Q15|D99999996=2^2*3*1667*4999; k2,r24999999;(-5000±sqrt24999999)/1.|
|Q16|m-1,normalizedQ03; original leading sign retained.|
|Q17|D0,repeated1/2.|
|Q18|D25,k5; rational-3,2.|

Q13 prime factors and Q15 remainder prove the stated square-free values; no floating oracle. Every checked rational substitution is exactly0. For radicals, A(p²+q²r)+Bps+Cs²=0 and q(2Ap+Bs)=0; the conjugates have sum -B/A and product C/A. Verification denominators Q04=4,Q10=9,Q13=400000000 and Q08=1,4 agree. D0 uses one root with multiplicity2, not two entries. No-real null fields are distinct from errors and do not imply absence of complex roots.

## Algorithm, bounds and representation
Signed gcd normalization preserves original=m*normalized, leading A>0 and primitive triple; D_original=m²*D_normalized, so sign/classes are preserved while numerical D can change. The distinction is explicit in UI and fixtures. Since |A|,|B|,|C|<=10000, the conservative interval[-400000000,500000000] is valid. No division used for normalization/root simplification is inexact.

Repeated square extraction preserves k²n=D. After each tested factor, its square cannot divide remaining n; divisions cannot create a missing smaller prime-square divisor. At termination f²>n, any square divisor would have a prime<=sqrt(n), already excluded. Thus r is square-free. The upper sqrt bound is22360, candidate count at most22359 for f2..22360; the22360 defensive guard does not reject a valid input. Q13 is square-free and its sqrt floor is22360, exercising the full outer-candidate count of the specified trial-square algorithm. Other implementations remain subject to the same fixed fixture and finite protocol, not an assertion about universal CPU cost.

Positive s and q fix increasing root order; h reduction gives gcd(|p|,q,s)=1. Keeping literal p0,q1,s1 is unambiguous and avoids formatting rules changing the representation. Canonical JSON keys, integer strings, numeric multiplicities, one finalLF/noBOM and explicit BigInt conversion are deterministic. Identity verification for rational q0/r0 is valid and harmless. The schema explicitly excludes Proxy-sandbox claims and rejects ordinary accessor descriptors without reading them.

## Error, state and nine-aspect audit
Per-field LENGTH before trim prevents oversized whitespace/markup from evading cap. EMPTY precedes GRAMMAR, then RANGE then a-only ZERO_A; schema precedes all fields. Sixteen zeros are valid b/c0 but invalid a; seventeen zeros fail LENGTH. ASCII minus/leadingzeros and -0 are accepted grammar but results canonicalize0. Plus, Unicode whitespace/digits/minus, decimals/exponents and expressions are excluded. Native single-line CR/LF removal and direct-core trimming are correctly distinguished. All-fields errors are ordered a,b,c without partial output.

Edit/error/reset clears all selectable stale result bytes; success is one snapshot, Enter retains field focus; language preserves mathematical bytes but re-renders human labels. Persisted pageshow invalidates restored results; ordinary reload returns defaults. Unsupported BigInt uses a nonliteral bootstrap/static fallback, no Number approximation. These requirements are implementable without network, native clipboard, dependencies or user permissions.

Nine-aspect contract is finite: independent exact fixtures and ordinary UI; boundary/state matrix; actual Network/Storage beyond source; actual CSP/header evidence beyond metadata; nonauthor guided use; keyboard/focus/contrast/zoom/reflow; full bilingual metadata and invariant math; reproducible source/build evidence; named desktop normal use and timing. Mandatory unavailable observations remain null. The author-provided scoring anchors were already required by BRIEF; this review neither assigns scores nor invents replacements.

Five warmups plus20 sequential foreground trials are precisely timed from handler entry through post-DOM rAF, with all valid durations retained and each<=100ms. Dirty setup precedes measured solve; no hidden/throttled slow result is silently discarded.100cycles have a defined edit/Solve/Reset unit and unknown segments stay unknown. No CPU timing substitutes for a missing browser. No new devices or unlimited retries are introduced.

## Findings and next boundary
Blocking findings: **none**. No author correction is required for documentary completeness.
The prior nonblocking editorial observation is CLOSED: §7 now says “D may be positive, zero or negative”, consistent with §§4.2/4.4. The reviewer checked the complete affected diff and the appended AUTHOR-CHECK explanation. No mathematical or acceptance change and no new finding. All eight gates remain true.

All product execution, GUI, privacy, security, accessibility, compatibility and timing tests are NOT_RUN; all nine scores null. No GitHub write, claim, ready, task acceptance, merge or deployment performed. Later immutable-source binding must verify these exact author bytes before formal readiness; revisions require affected independent review.
