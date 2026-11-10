# Integer-rate Frame Timecode Calculator

Exact frame indices and signed frame offsets at 24/25/30/50/60 fps within one day. Two input modes, no modulo/clamp, exact reduced seconds and eight-line summary. No fractional rates, drop-frame, media import, clipboard, downloads, storage or dependencies; not full SMPTE compliance.

## Contract / run
Normative SPEC/BRIEF: KYStr/glossquote-labs-home commit d2922922f7f7df1be58b58bcc5a31538f532c5df, docs/specs/frame-timecode/. Homepage baseline26525d5f6380915ea95dde879dec769442db0d95. Node>=24, no install:
```
npm test
npm run check
npm run build:preview
npm run check:generated:preview
node scripts/verify-package.mjs
npm run dev
```
Dev binds127.0.0.1:4180 and serves built dist. Production build refuses without approved origin. Preview noindex; _headers is intended hosting policy, not observed enforcement. Build replaces generated dist only.

src/core.mjs strict closed raw schema, bounded safe integer arithmetic, formatting/fractions and immutable controller; src/app.mjs fixed DOM sinks; src/messages.mjs bilingual copy; scripts/html.mjs static entries. Native single-line inputs remove CR/LF before the controller; help discloses this. Switching mode preserves the inactive raw string, does not convert prior results. Rate change reinterprets literal input, not elapsed time. Inactive raw must still be a string but its grammar/length is not checked until activated.

## Review / rollback
See AUTHOR-CHECK and TEST-PLAN. Nine fixed independent aspects functionality,boundaries,privacy,security,usability,accessibility,localization-seo,toolchain-provenance,compatibility remain null pending independent evidence; no acceptance from author tests. Missing mandatory GUI/resources are not waived.

MANIFEST lists exact payload bytes except itself. Roll back by restoring the complete fixed source and matching dist together, verifying manifest and rebuilt identity; do not mix source/runtime revisions. No deployed release exists. No license selected; source access is not a license grant.
