# Rational Arithmetic Workbench

Exact BigInt fraction arithmetic: normalize each input first, show unreduced operation, gcd, canonical and mixed forms. Four integer text fields, strict raw-length/grammar/bounds, no floating approximation, clipboard, downloads, storage or dependencies.

## Fixed contract / run
Normative SPEC and BRIEF: KYStr/glossquote-labs-home commit 3e93737ac8cf431d424a9814eea144ec10343a2c, docs/specs/rational-arithmetic/. Homepage baseline 26525d5f6380915ea95dde879dec769442db0d95. This is not independently accepted or deployed.

Node >=24; no install:
```
npm test
npm run check
npm run build:preview
npm run check:generated:preview
node scripts/verify-package.mjs
npm run dev
```
Dev binds 127.0.0.1:4180, serves built dist. Production build intentionally fails without approved origin. Preview noindex, local assets; _headers is intended hosting policy, not observed enforcement. Build replaces generated dist only.

src/core.mjs validates a closed schema and performs exact normalization/operations with an immutable controller. src/app.mjs uses fixed DOM sinks; src/messages.mjs supplies bilingual copy. scripts/html.mjs generates both entry pages. Tests use literal expected fixtures and an independent exact arithmetic cross-check. Input denominators become positive before calculation; division may require a further sign normalization. Negative mixed forms negate the entire parenthesis. No approximate decimal or executable expression is offered. Unsupported BigInt leaves a static explanatory fallback.

## Review / rollback
AUTHOR-CHECK.md and TEST-PLAN.md distinguish observed evidence from missing mandatory checks. Nine fixed aspects: functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility. All independent scores null. Author test counts are not quality scores.

MANIFEST hashes all payload files except itself. Restore a complete prior fixed source and matching dist together, verify hashes, then build and verify identity; do not mix revisions. No deployed release exists. No license selected; source visibility is not a license grant.
