# CSS Steps Easing Explorer — author document check v1.0

2026-11-01. Original author checks of the specification only. No product implementation, browser test, independent verdict, score or ready claim.

## Arithmetic and semantic checks

S01–S07's literal four-mode rows were checked by exact rational calculations, including p0/p1 and before flags; S08–S16 assertions cover N1 modes/none rejection, N2 none, N3 exact1/3 versus neighboring six-decimal values, N100 both/none and endpoint clipping. The planned native midpoint expected rows were also calculated independently of any future browser/product implementation. This is author corroboration, not nonauthor evidence.

At N4,p1/4, floor(p*N)=1. With before=false, end/start/none/both give1/4,2/4,1/3,2/5. With before=true, the exact integer-boundary decrement gives0/4,1/4,0/3,1/5. At a nonboundary p1/8 the decrement does not occur for either flag. At p0 the unit-domain lower clamp prevents negative values. At p1 before=true yields3/4,1,1,4/5; don't require both flags to produce1 in every mode.

At N3, decimal0.333333*N=0.999999 and floor0; exact boundary1/3*N=1 and floor1. Therefore jump-end before=false differs (0 versus1/3), while decimal0.333334 yields1/3. Exact boundary selection is not a rounded progress text field. At N100,jump-both,p0.505, current step51 and J101 give51/101, the specified finite native midpoint expectation.

## Contract checks

Eight sections cover goal/scope, UI and state, lexical/exact I/O, algorithm/toolchain/security, reference cases/tests, all nine fixed acceptance aspects, author risks and handoff. Original BRIEF remains unchanged; its optional playback is explicitly omitted, retaining the mandatory static complete task. No motion/dependency/file/permission feature was added.

Control contracts preserve invalid input.value and distinguish single-line browser sanitization from parser grammar. Boundary mode initializes k0 on Generate and discards stale options on N/mode edits; selected boundaries are exact fractions. CSS excludes inspection-only p/before values. Graph hollow/filled markers represent the two explicit evaluations, not extrapolated endpoint limits; all rows have text equivalents.

Future command/CSP/server/asset contracts are fixed but not asserted to exist. Native sampling separates verified active forward phase from the mathematical before flag; no imaginary browser setter or epsilon substitute. Desktop required checks are finite, other devices explicit untested extensions. Nine aspect IDs exactly match the fixed BRIEF, each future required score>=90; current values remain null.

## Remaining work

Nonauthor must review exact fixed document bytes, all eight areas, endpoint conventions, input/selector lifecycle and realistic native phase observation. Any defect is corrected in the same candidate lineage and rechecked. Product tests, builds, native geometry, focus/accessibility, privacy/security, performance and compatibility are all NOT_RUN. Document arithmetic is not product acceptance, PR approval, readiness or deployment.
