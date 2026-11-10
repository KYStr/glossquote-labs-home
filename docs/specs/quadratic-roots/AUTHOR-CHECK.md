# Exact Quadratic Roots — author documentary check v0.1

This is the specification author's check, not an independent review. Product implementation/tests/GUI are NOT_RUN and all nine product scores null. The author does not mark ready.

## Fixed scope and sources
Admission BRIEF fixed at81c661cc655b5f5be77904e943a5ac34b977caa5, docs/specs/quadratic-roots/BRIEF.md, KYStr/glossquote-labs-home. Source baselineREADME26525d5f6380915ea95dde879dec769442db0d95. One bounded integer-coefficient quadratic, exact real roots only. No parser, approximate solver, graph, complex values, equationsystem, export, network or product code.

The current catalog, complete registry and existing specification PRs plus saved inventory/private draft scope were compared at admission. The closest Rational Arithmetic and Exact2x2 LinearSystem documents were read in full: they do not provide this quadratic discriminant/radical workflow. Their ownership and files were not changed. Unregistered private work remains unknown; no assertion of platform-wide local visibility.

Official mathematical source read: OpenStax College Algebra2e §2.5 Quadratic Equations, quadratic formula and discriminant classification. Official ECMAScript BigInt reference supplies the language primitive; exact bounded representation and error/lifecycle contracts are this document's own design. No source text/table copied wholesale or new dependency required.

## Actual author checks
- All eight sections written and manually checked for goal/scope/flow/raw-output/algorithm/acceptance/tests/handoff coverage; presence is not a nonauthor completeness result.
- Eighteen literal fixtures Q01–Q18 independently entered in an author worksheet, then checked with Python standard integer arithmetic, not product code. For each: original=m*normalized, positive normalized A/common gcd1, exact D, stated decomposition k*k*r=D, square-free literal r by direct testing of all potential square divisors, reduced root triples/positive denominators, multiplicity total2 when real, exact constant/radical identity coefficients0. All18 passed this documentary check. No application exists or was executed.
- Important distinction checked: Q02 original discriminant0 remains0 but Q12 original large coefficients normalize to(1,1,-1), D5; UI explicitly identifies normalized D. Q06/Q16 retain original negative-leading tuples while normalizing sign. No claim that original raw strings equal canonical output strings.
- Literal Q13 D499980001 and Q15 D99999996 decompositions checked; no Number rounding or approximate root oracle. Q04/Q10/Q13 verification denominator values4/9/400000000 checked.
- Reviewed raw16-unit cap, strict ASCII integers, a0/-0 error, b/c0 valid, error precedence and native single-line CR/LF caveat. Text controls retain received invalid raw; no maxlength clipping or success focus relocation.
- Reviewed D<0 success with empty roots/null verification, repeated one entry/multiplicity2, rational versus irrational shape, exact JSON key order and LF. Mathematical no-real does not claim no complex solutions.
- Reviewed conservative coefficient/discriminant bounds and finite22360 candidate guard, explicit test/script/artifact interfaces, same-origin assets/CSP/header distinction, native evidence NOT_RUN and finite timing/cycle protocol. Necessary missing observations may not be inferred from source or this worksheet.
- Nine acceptance ids/order/requirements match the fixed BRIEF and registered task; full spec supplies finite checks and explicit numerical anchors. No product score is inferred from document completeness or18 fixtures.

## Limits and independent review gate
The literal worksheet is author arithmetic only, not an independent oracle receipt or runtime/unit/browser performance/security pass. The future producer must actually create and run the specified product tests and preserve logs; this check creates no implementation, candidate deployment or product claim.

A different actual reviewer must read exact BRIEF/SPEC/AUTHOR-CHECK, derive their own expectations, check all eight completeness gates and report all genuine gaps. Any correction changes the document candidate and needs affected recheck. Only authorized technical Markdown belongs in the public docs/specs scope; private coordination/receipts/approval messages are excluded. No merge, deployment, workflow, new repository, service, cost or credentials are authorized here.

## Editorial follow-through
After independent documentary review, corrected the §7 phrase to “D may be positive, zero or negative”. This changes no algorithm, fixture, bound or acceptance requirement; the existing author arithmetic was not rerun. Independent affected review is required for the new bytes.
