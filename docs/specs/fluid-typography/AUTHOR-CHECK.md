# Fluid Typography Calculator — author document checks

Publication candidate. These are author arithmetic checks, not product tests or independent review. Original check observations: 2026-10-31T05:03:38.306632+00:00; affected v0.2 checks: 2026-10-31T05:38:17.287683+00:00.

## Ideal rational examples

|Case|a|b|Ideal px|Expected px|Result|
|---|---|---|---:|---:|---|
|default mid|2/3|5/3|24.0|24|arithmetic-only matched|
|root20|2/3|5/3|30.0|30|arithmetic-only matched|
|negative intercept|-1/2|5|16.0|16|arithmetic-only matched|
|steep lower|-455/2|3800|8.0|8|arithmetic-only matched|
|steep upper|-9110|3800|160.0|160|arithmetic-only matched|

## Exported-coefficient counterexamples

|Reference root|Viewport|Exact preferred px|Limiting state|Author result|
|---:|---:|---:|---|---|
|16|320|16.000000064|fluid|exact decimal arithmetic matched|
|20|400|20.00000008|fluid|exact decimal arithmetic matched|

Coefficient rounding bound: `5.44e-7px` in the specified simulation domain. This is not browser layout precision evidence.

Product tests: NOT_RUN. Native GUI: NOT_RUN. All product quality scores: null. Independent review was pending when the author-check record was written; subsequent document review is separately reported in INDEPENDENT-REVIEW.md. No author check establishes formal readiness or publication authorization.
