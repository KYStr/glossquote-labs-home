# Integer Representation Inspector

Exact BigInt integer inspection, bases 2/8/10/16, widths 8/16/32/64 and signed/unsigned input. Mathematical representations stay distinct from fixed-width two's-complement bits and MSB-first bytes. No floating fallback, wrap, clipboard, downloads, storage or dependencies.

## Fixed contract and run
Normative SPEC and BRIEF: KYStr/glossquote-labs-home commit 3e93737ac8cf431d424a9814eea144ec10343a2c, docs/specs/integer-representation/. Homepage baseline 26525d5f6380915ea95dde879dec769442db0d95. This candidate is not independently accepted or deployed.

Node >=24; no install needed:
```
npm test
npm run check
npm run build:preview
npm run check:generated:preview
node scripts/verify-package.mjs
npm run dev
```
Dev binds 127.0.0.1:4180, serves built dist; production build intentionally fails without approved origin. Preview is noindex with local assets; _headers is intended hosting configuration, not proof of observed server enforcement. Build recreates only generated dist; keep source and any separate candidate checkpoint.

Core: src/core.mjs closed raw/config validation, exact encoding and immutable controller. UI: src/app.mjs fixed DOM sinks, bilingual src/messages.mjs. scripts/html.mjs generates both entry pages. tests use literal independent expected values plus complete boundary matrices. No dynamic user CSS/HTML/URLs. Unsupported BigInt keeps honest static fallback. Changes to output contract require affected tests; bilingual copy changes require both keys and rendered page checks.

## Review / rollback
See AUTHOR-CHECK.md and TEST-PLAN.md. Required nine aspects: functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility. All independent scores null. Complete mandatory missing observations before acceptance, never derive scores from author test count.

Manifest lists all payload bytes except itself. To roll back a future revision, restore the complete fixed candidate source and matching dist together, verify MANIFEST hashes, build and verify emitted identity. Do not mix source and runtime revisions. There is no deployed release to roll back in this package. No license has been selected; source access is not a license grant.
