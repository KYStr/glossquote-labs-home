# Rational Arithmetic Workbench — complete preparatory specification v0.2

DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW. Prepared2026-11-01 UTC Documentation only: no product source/taskclaim/ready/score/publication. All runtime checks NOT_RUN, scoresnull.

## 1. Goal
A learner or person preparing a worksheet needs an exact result for one arithmetic operation on two rational numbers, without decimal-rounding ambiguity. Enter numerators/denominators and choose add/subtract/multiply/divide; inspect normalized inputs, the unreduced calculation, reduction divisor, canonical result and a clearly signed mixed form. Success: explain why1/6+1/3=1/2 and why division by a zero-valued fraction cannot produce a result. This is a usefulness hypothesis, not teaching certification or user-research evidence.

## 2. Scope and meaningful distinction
Two fractions only; integer numerators/denominators, four arithmetic operators, exact BigInt reduction and readable explanation. No free-form mathematical expression, polynomial/algebra solver, chained history, units, currency, rounding/decimal expansion, approximation, mixed-number input, percentage conversion, random quiz, grading, export/file/clipboard/persistence/remote service. Zero numerator is valid, zero denominator is not. Signed denominators supported then normalized visibly, never silently presented as user-entered text.

Existing Unit Converter is physical-unit/temperature conversion with bounded numerical formatting; its internal rational-boundary repair is not a fraction arithmetic user interface. Recipe Scaler changes ingredient amounts for servings and unit compatibility; Bill Splitter and Grade Target solve domain-specific arithmetic, not symbolic rational operations. Integer Representation draft is radix/bit encoding, not two-operand arithmetic. No existing catalog56/spec82/task88 title/description/scope or inspected cloud draft offers this closed rational operation flow. These are functional distinctions, not new names for existing owner work. Fresh admission dedup remains mandatory; no other owner/reconciliation/baseline changes. Do not evade an action refusal through another path or name.

## 3. User flow and lifecycle
Default generated example A1/6,B1/3,operationadd. Form: numeratorA,denominatorA,operator selector,numeratorB,denominatorB,Calculate,Reset. Field labels include units(integer,notdecimal), limits and allowednegative denominator explanation. Result panels: normalizedA/B, one unreduced operation line, gcd, canonical result, signedmixed form and stable plaintext summary. Raw values remain visible and unchanged. No sliders, input parsing ambiguities or automatic calculation while typing.

Any field/operator edit clears ALL prior results immediately and marksdirty. Calculate validates all active fields in A numerator/A denominator/B numerator/B denominator order, displays associated errors and summary, focuses first error, no partialresult. With valid fields but divide and normalized B numerator0, show operation error linked to B numerator and focus it. On success retain Calculate focus, atomic result and polite short status. RepeatedCalculate idempotent. Reset restores defaults/generatedexample and clears errors, focus staysReset. No confirmation because only four transient synthetic/numeric fields.

Language toggle updates both languages' copy/lang/title/home link and retains raw/operator/state/result, no numerical localization; focus remains toggle. Direct zh-Hant/en pages are fully populated statichelp; reload startsdefaults; BFCache may restore only coherent raw/output snapshot, pageshow invalidates stale output. No storage or URL state. No claim of secure memory erasure or autosave. If JS/BigInt unavailable static instructions plus unsupportedmessage, controls cannot pretend to compute.

## 4. Input, mathematics and exact output
Core request has primitive strings aNumerator,aDenominator,bNumerator,bDenominator and operator enum add/subtract/multiply/divide only. Exact own-data plain schema; reject extra/missing/inherited/accessor fields and nonstrings. UI builds only this fixed object, noJSONimport.

Per raw field cap18UTF-16units before ASCIIspace/tab/CR/LF trim. Grammar aftertrim `-?[0-9]+`, no plus,decimal,exponent,comma,underscore,Unicode digits/space,slash in field or n suffix. Leadingzeroes and -0 allowed; canonicalzero0. Numerator absolute value<=1000000000000 inclusive. Denominator absolute value in[1,1000000000000] inclusive. -0denominator invalidzero. Validation order rawtype/length,trimempty,grammar,absolute range,denominatorzero. Preserve raw, never clamp/truncate. Parse BigInt directly after grammar/length; never Number or parseInt.

Normalize each input n/d: if d<0 negateboth; g=gcd(abs(n),d), divideboth byg, so positive denominator and reducedcoprime form. gcd(0,d)=d and zero canonical0/1. Calculate using these NORMALIZED inputs a/b,c/d:
- add: N=a*d+c*b,D=b*d.
- subtract: N=a*d-c*b,D=b*d.
- multiply:N=a*c,D=b*d.
- divide: rejectc=0; N=a*d,D=b*c; ifD<0 negateN/D BEFORE finalgcd and before rendering unreducedline.
Final G=gcd(abs(N),D), R=N/G,S=D/G. Dpositive; Gpositive includingzeroN (gcd(0,D)=D); result0=>0/1. Max intermediate magnitudes <=2*10^24, safely finite BigInt; no floatintermediate. Euclidean remainder loop operates on positivevalues, at most256iterations guard (well above this domain); guardhit internalerror/no partialoutput. This is not a security parser for unbounded mathematics.

Canonical fraction text: if denominator1, integer numerator only; otherwise `N/D` with minus only atnumerator, no spaces/leadingzeroes. Normalizedinputs and finalresult use thisformat. Unreducedpair shown as N/D ALWAYS even whenD1, followed by explicit `gcd = G`; division signnormalization is stated separately so explanation is faithful. Computation line uses normalized inputtext in parenthesized operands separatedby ASCIIoperator (`+`,`-`,`*`,`/`) and equals `N/D`, e.g.`(1/6) + (1/3) = 9/18`. No decimaloutput.

Mixedform: let q=floor(abs(R)/S),r=abs(R)%S. If r0, just signedinteger R/S. If q0, samecanonical properfraction R/S. Otherwise positiveR uses`q + r/S`; negativeR uses`-(q + r/S)` (parentheses REQUIRED so -7/3 is not written ambiguouslyas -2+1/3). R0=>`0`. It is a display, not editableexpression.

Readonly summary ASCII keyorder,LF,terminalLF: `operation: add|subtract|multiply|divide`, `a: canonicalA`, `b: canonicalB`, `unreduced: N/D`, `gcd: G`, `result: canonicalResult`, `mixed: exactMixedForm`. Each keycolononeASCIIspacevalue. Numeric signs,slash,operator formatting independentofUILanguage. The originalraw input is not repeated/exported; no save/clipboardbutton, manual selection only. Validzero results selectable. Any edit erases stale textarea value, not simply visually hides it.

Independent expected fixtures (literal math, not runtime tests):
1. A1/6+B1/3 => normalizedsame;N9,D18,G9;result1/2,mixed1/2.
2. A2/4+B2/6 =>normalized1/2,1/3;N5,D6,G1;result5/6. Unreduced result is5/6, NOT20/24 since normalization precedes calculation.
3. A1/3-B5/6=>N-9,D18,G9;result-1/2,mixed-1/2.
4. A-2/3*B9/-4=>normalized-2/3,-9/4;N18,D12,G6;result3/2,mixed`1 + 1/2`.
5. A1/2 / B-3/4=>initialN4,D-6;sign-normalizedN-4,D6,G2;result-2/3.
6. A7/3+B0/5=>normalized7/3,0/1;N7,D3,G1;result7/3,mixed`2 + 1/3`. A-7/3 givesresult-7/3,mixed`-(2 + 1/3)`.
7. A1/2-B1/2=>N0,D4,G4;result0,mixed0,internal0/1.
8. A0/-999+B0/1=>both0/1;N0,D1,G1;result0. A-0/1=>normalized0/1; denominator-0 alwayserror.
9. A0/1 / B-1/2=>sign-normalizedN0,D1,G1;result0. A1/2 / B0/9=>DIVIDE_BY_ZERO(noresult); withadd instead=>1/2.
10. A1000000000000/1 * B1000000000000/1=>N1000000000000000000000000,D1,G1;result exact10^24decimal,mixedsameinteger.
11. A1/1000000000000 * B1/1000000000000=>N1,D1000000000000000000000000,G1;result`1/1000000000000000000000000`.
12. A1000000000000/1 + B1000000000000/1=>N2000000000000,D1,G1;result2000000000000. This exceeds individualinputcap legitimately; do not apply inputrange toresult.
13. A1000000000000/-1000000000000=>normalized-1; withB1/1add=>0. Negative denominators normalized beforelabels.
14. A999999999999/1000000000000 plus same=>N1999999999998000000000000,D1000000000000000000000000,G2000000000000;result999999999999/500000000000,mixed`1 + 499999999999/500000000000`.

## 5. Implementation, toolchain and safety
Plan purecore parsing/normalization/gcd/arithmetic/serialization, separate controller raw/errors/snapshot and staticbilingualDOM. NativeESM/Node24+BigInt builtin only, no npm dependencies. [ECMAScript BigInt](https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-bigint-objects) is implementation primitive, not an external arithmeticservice or full expression evaluator. All rangeboundaries and displaymath are explicit above. Reviewerexpected fixtures must not call productgcd/arithmetic to inventexpected values.

Proposed files src/core.mjs,src/app.mjs,public/index.html,public/en/index.html,public/styles.css,test/core.test.mjs,test/state.test.mjs,scripts/check.mjs/build.mjs/serve.mjs,docs/HANDOFF.md. These are future files, not actual code. Future scriptcontract npmtest/check/build:preview/check:generated:preview/dev mustbe implemented and then reallyrun with exits. Preview loopback127.0.0.1; noindexdist; no invented canonicaldomain, dependency or hostedURL. Source/build manifest supports exactcandidate verification.

Fourfields and oneoperator,18rawchars each,up to25digitintermediate, boundedEuclideanloop and fixedresultrows. No asyncworker required; invalid or unknown errorclears outputs. Render textContent/textarea.value, fixedDOMelementnames; noinnerHTML/eval/userCSS/URL. No file/clipboard APIs,network afterstaticload,storage,telemetry,serviceworker or inputlogging. CSP default-src 'none';script-src 'self';style-src 'self';img-src 'self';connect-src 'none';font-src 'self';object-src 'none';base-uri 'none';form-action 'none';frame-ancestors 'none'. Local systemfonts,nosniff/no-referrer headers. No new environment,publichosting,cost,credential or gameslot changes.

## 6. Nine fixed acceptance aspects
AllcurrentlyNOT_RUN/null. Nonauthor uses samefixedcandidate; all mandatorytests below completed and eachaspect>=90. No average/test-countconversion/selfscore. Anchors eachaspect:100 allrequirements observed/met withoutdefect;90 allmandatoryrequirements met with only documentedcosmetic issue notaffectingmeaning/operation/safety/accessibility;80 substantive defect;60 primaryflowbroken;0 observedwhollyunusable; unknownnull. Criticalarithmeticsign/reduction error,leakage,executableinput,inaccessiblemainaction orstaleresult blocksregardlessscore. Intermediatescore requiresrationale.

|ID|Independent method, expectation and evidence|
|---|---|
|functionality|All14literalfixtures independentlyderived, matchnormalizedinputs/unreducedpair/gcd/result/mixedform/summary;UI explanation faithful. Evidence expectedactualtable and actualvisibleworkflow.|
|boundaries|All numerator/denominatorranges,signedzero,rawsyntax,operator transitions anddividebyzero tested; nofloatrounding/clamp orstaleoutput. Evidence boundary/statechecklist.|
|privacy|ActualNetwork/Storage inspection afterfixedassetload acrossedit/calculate/reset/language: noinputtransmission/persistence/permissions/clipboard/logging. Evidence synthetictraces plus sourceaudit.|
|security|Hostiletext/schemarequests rejected, fixedtext sinks, noexecutedmarkup/network; actualCSPheaders anddependency audit. Evidence sinktable and observedattacks.|
|usability|Nonauthor adds1/6+1/3,interpretsnegative mixedform,correctszerodenominator andzero-divisor,understandsno decimalapproximation. Evidence taskscript/observations withoutsourceconsultation.|
|accessibility|Keyboardallcontrols/selectableoutput,visiblefocus,fieldassociatederrors andstatus, semanticresultlabels; normaltext4.5:1,largetext3:1,essentialcontrols/focus3:1 overdefault/error/dirty/focus/disabledstates. Actual200%zoom,320CSSpxreflow; onlylongsummaryregion localscroll. Evidence contrastpairs/focus/screenshots;ATlimitsnamed.|
|localization-seo|Static+dynamiczh-Hant/enlabels/help/errors/limits/explanations complete, correctlang/title/description/h1/home links, raw/resultpreservedontoggle, numericformatstable. Previewnoindex. Evidence bilingualinventory andnavigationmatrix.|
|toolchain-provenance|CleanNode24+zerodependency test/check/build/generatedcheck with actualexits andcandidate/spec/source/artifacthashes; nofakecommandpass. Evidence reproduciblelogs.|
|compatibility|Namedavailabledesktopbrowser/OS/version at1366x768,1920x1080,200%zoom,320CSSpx,BigIntsupport,100edit/calculate/resetcycles,back-forward/reload;20maxworkrendertrials<=100mseach using§7protocol. Evidence nativeobservations/timing; missingGUI=>null.|

## 7. Required tests and timing
AllNOT_RUN; fixtures are authorarithmetic, not executabletestresults. Testeveryfieldzero/negativezero/caps±1,allowednegative denominator,empty,ASCIItrim,18/19rawunits,leadingzeroes,plus/slash/decimal/exponent/Unicode/NBSP/hex/n-suffix; nonprimitive/unknownschema reject. Casesinclude`1/2`in singlefield,`<img src=x onerror=alert(1)>`,`1;alert(1)` safely rejected. Numeratorzero valid foradd/subtract/multiply,dividezero-numeratorA valid ifBnonzero; zero-valuedB divide fails even if rawdenominatornegative.

Goldenfixtures test normalization BEFOREoperation, unreducedsignnormalization, gcd0 and exact24/25digitvalues; noNumberintermediate/sourceaudit. Mathematicallycrossmultiply canonicalR/S against originalfractions toverify value but do notreplace independentliteralexamples. Resultdenominatorpositive andgcd1, zero0/1, mixednegativeparentheses. Goldenplaintext exactorder/newlines/spacing/terminalLF inbothlanguages.

State/native: valid->editclearsall->invalid->repair->success; operatoradd withB0=>valid then divide=>clears/error; reset fromeverystate; language switch fromdirty/error/success preservesraw andsamevalues; rapidrepeatedclicks andhundredcycles no mismatch. Keyboard label/errorfocus,readonlyselection,CSP/network/storage,200%realzoom/320reflow andlargeoutputreachable,disabledJS/unsupportedBigInthonesty. Record exactcommit,browser/OS/version/viewport/DPR/zoom/time; noDOMmockcertification fornativeitems.

Timingprotocol: foregroundvisibletab,nothrottling/modal; recordhardware/environment but nonewhardwaregate. Fixed maximalarithmeticfixture14 above with two 12-digit numerators (999999999999) and two 13-digit denominators (1000000000000) and generatedexplanation/summary. Beforeeachtrial markdirty byediting thenrestore theseexactvalues. t0=performance.now atCalculatehandlerentrybeforevalidation; afterallDOMupdates enqueueonerAF,capturet1=performance.nowincallback. Thisis application-to-presentation-opportunity,notphysicalpaint. Fivecompletewarmups then20measuredtrialssequentially, nooverlap; allrawdurations/max retained,everyvalidtrial<=100ms. Hidden/throttled/interrupted trials retainedinvalidwithreason andrerun; slowsuccessfulvalidtrialfails,nosilentdiscard. UnavailableobservationsNOT_RUN,notNodeCPUsubstitute.

## 8. Handoff
Eightdocumentaryareas(goal,scope,userFlow,inputsOutputs,implementation,acceptance,tests,handoff) independentlytrue/false withsection/hashreferences; contradictions=>revision, noauthorready. CompleteprivateBRIEF/SPEC maygo tocoordinator forauthorizedbatchsave andnonauthorreview, nevercountasstockyet. Productnineaspects remainnull untilactualindependentsamecandidateinspection. Documentcompleteness notproductquality/deployment.

UnchangedREADMEbaseline26525d5f6380915ea95dde879dec769442db0d95;batchprotocolc13b91598c15b14948d38e60cec9a5fa0616bbd2;registry434read atpreparation, refreshbeforeadmission. Existinglocalstop,owners,reconciliation remain; noactorACK/claim/mark-ready here. Futureproduction requiresvalidtask,allowedexecutor,uniquefixedspec/source,claim/readbackbeforework andowncandidate/open draftPR. Finaldelivery includes exactspec/productcommits,source/buildhashmanifest,commands/exits,independentfixturederivation,nativeevidence,allnineaspectreports,knownlimits/resumablecheckpoint. Laterchanges requireaffectedrecheck. Noautomaticmerge/catalog/hosting/spend/credentialpermissions; Unrelated private evidence is excluded from the product bundle.
