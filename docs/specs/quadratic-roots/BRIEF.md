# Exact Quadratic Roots — admission BRIEF v0.1

Specification work only. This brief fixes the scope of a future complete eight-section specification, not a product implementation, independent review or readiness claim.

## Purpose and observable use
A learner or worksheet author enters integer coefficients a, b, c for a*x^2+b*x+c=0 and checks the discriminant and exact real roots. The tool distinguishes two rational roots, two irrational real roots, one repeated real root, and no real roots. For example (1,-3,2) yields roots 1 and 2; (1,0,-2) yields -sqrt(2) and sqrt(2); (1,0,1) has no real roots, not “no complex solutions”. This is educational algebra, not a numerical engineering, medical or financial decision tool.

## Closed scope
Three raw integer text fields only; each coefficient -10000 through 10000 inclusive, a must be nonzero. The complete specification will fix ASCII grammar, length, exact error priority and unchanged raw preservation. Use exact bounded BigInt arithmetic; normalize the common integer gcd and leading sign visibly, compute D=b*b-4*a*c, and represent real roots as reduced rational values or canonical square-free radicals. No decimal approximations, floating tolerance, plotting, free-form expression parser, symbolic variable names, complex root output, degree reduction for a=0, systems of equations, inequalities, imported files, history, clipboard API, download, network services or new dependencies. A negative D is a successful no-real-roots classification, not an input error.

Pure result data and a bilingual zh-Hant/English normal desktop interface show original and normalized coefficient tuples, discriminant, classification, exact root text and algebraic verification values. Distinguish root order and repeated multiplicity; the complete spec must fix canonical serialization and non-ambiguous signs/denominators. Basic arithmetic code shared in concept with other tools is not a transfer of those tools' ownership.

## Functional de-duplication
The existing Rational Arithmetic Workbench handles two rational operands and four scalar operations; it explicitly excludes polynomial/algebra solving. Exact 2x2 Linear System Solver handles two first-degree constraints, rank and solution families, not a second-degree single equation or radical roots. Integer Representation Inspector concerns radix/fixed-width encodings. Grade Target solves domain-specific weighted grades. None supplies the discriminant/real-root/radical explanation flow here.
Current catalog and registry, known saved cloud/local inventories and existing specification PRs were checked by scope, including subsequent calculator drafts. This is not a renamed existing task. Unknown unregistered private work remains unknown; refresh functional collision and owner checks before admission. Do not overwrite, release or borrow another actor's task.

## Mathematical source
[OpenStax College Algebra 2e, Quadratic Equations](https://openstax.org/books/college-algebra-2e/pages/2-5-quadratic-equations) provides the quadratic formula and discriminant classification. The bounded integer domain, exact canonical radical representation, lifecycle, serialization and measurement plan are this tool's own explicit contract, to be fixed in the complete specification. No external expression evaluator, algebra service or runtime fetching.

## Complete specification deliverables
After a legitimate unique claim, supply SPEC.md and AUTHOR-CHECK.md covering all eight independent documentary gates: goal, scope, userFlow, inputsOutputs, implementation, acceptance, tests and handoff. Include:
- Default example, dirty invalidation, first-error focus, success focus retention, reset, language preservation, coherent reload/back-forward and unsupported-feature behavior.
- Exact schema, grammar/length/range/error priority, output data model and canonical root ordering/formatting for all discriminant classes.
- Finite algorithms with worst-case bounds, proof/check of square-factor extraction, rational reduction, invariant verification and finite literal expected examples including extrema and adjacent rejected inputs.
- Static bilingual native HTML/ESM, pure core/controller/DOM separation, Node 24 built-ins only; real future script interfaces, artifacts, static assets/CSP contract and reproducible build plan.
- One complete test/evidence matrix separating documentary arithmetic, future core tests and necessary normal native GUI observations. Do not claim fixtures are executed product tests.
- Same-candidate handoff with exact source/document hashes, author checks, NOT_RUN limitations and a different actual reviewer. Author cannot self-review or mark ready.

## Nine fixed future acceptance directions
Each direction must have finite mandatory checks, named evidence and explicit 0–100 anchors in the full spec; each later requires at least 90 and all mandatory checks complete. Untested is null, never inferred from test counts.
1. functionality: independently derived discriminant/classes/rational and radical roots, normalized tuples and exact verification; normal UI matches one committed snapshot.
2. boundaries: every field endpoint/adjacent rejection, a=0, D sign/zero/square/non-square cases, raw grammar/cap/schema and all lifecycle transitions; no partial/stale result.
3. privacy: no input transmission, persistence, logging, telemetry, permissions or URL state; distinguish source evidence from actual Network/Storage observations.
4. security: fixed text sinks, hostile raw/schema rejection, no executable expressions/eval/user HTML, actual relevant CSP/header evidence and dependency inventory.
5. usability: nonauthor can solve and interpret rational, irrational, repeated and no-real-root examples, repair invalid a and distinguish exact roots from excluded approximations using only on-page help.
6. accessibility: native labeled keyboard flow and errors/status, visible focus, selectable structured results, finite contrast checks, desktop 200% zoom and bounded reflow; unavailable AT/mobile evidence explicit, no invented full certification.
7. localization-seo: complete static/dynamic zh-Hant and English, correct lang/title/description/home links, language-preserved raw/state/results, invariant mathematical bytes, preview noindex.
8. toolchain-provenance: fixed source/spec/candidate/artifact identity, zero new dependency, actual clean test/check/build/generated-check evidence and deterministic rebuild.
9. compatibility: named available desktop environment, repeated/edit/reset/navigation coherence and a fixed maximum-work timing protocol with all raw valid timings retained; no CPU substitute for native observation.

## Admission and boundaries
Proposed spec id spec-quadratic-roots-20261102 and task id labs-quadratic-roots-spec-20261102. The task is specification writing only with allowedExecutors [cloud-dot]; source baseline KYStr/glossquote-labs-home at 26525d5f6380915ea95dde879dec769442db0d95 / README.md. Fixed public brief must precede register-task, actual actor claim and exact CAS/readback before complete-spec work starts. A different reviewer checks the finished eight sections before any ready event; production needs a separate task/claim. No product code, new repository, merge, deployment, workflow, cost, credential or owner change is included. Current product checks NOT_RUN; nine scores null.
