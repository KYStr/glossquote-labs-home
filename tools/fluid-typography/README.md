# Fluid Typography Calculator — candidate r1

A zero-dependency, bilingual Traditional Chinese/English static calculator for an increasing or constant font size between two rem viewport breakpoints. Source candidate r1; author evidence does not establish independent product acceptance.

## Fixed contract
Specification: KYStr/glossquote-labs-home commit `50932c6c24035426a07632003437c044d71d0658`, `docs/specs/fluid-typography/SPEC.md`; SHA256 `bc0c7eaf4bfdee16ca2d4920ddde2d98d2e2c06452312bfb7cbe449c4523a5f6`.
Nine required aspects remain functionality, usability, visuals, accessibility, input-safety, privacy-permissions, performance, compatibility, maintainability. All independent quality scores are null. Author checks do not supply those scores.

## Run and build
Node24+; no dependency installation is needed and no package-lock is needed for a package with no dependencies.
```sh
npm test
npm run check
npm run build
```
Build copies the Traditional Chinese and English pages, shared stylesheet and four source modules to dist and writes BUILD-MANIFEST.json outside dist. Both pages have localized HTML labels, metadata and relative asset paths. Serve dist via the environment's already-authorized ordinary static preview. Local .openai/hosting.json names dist and carries no Site ID.
No bundled framework, webfont, image, analytics, third-party script or runtime package.

## Use
Default20–80rem viewport /1–2rem font, reference16px/rem, simulated800px. Generate produces one selectable declaration. Reference root changes only the explanatory table and mathematical preview—not page root or exported CSS. Manual Select CSS focuses a readonly textarea; use OS Copy yourself. No automatic clipboard access.
Edits clear stale results; invalid raw text remains editable. Sample text has a separate240-code-point limit; over-limit clears only preview, not valid CSS/table. Reset clears all results; language changes preserve values and translated states.
Tab order is header link/language, six numeric fields, sample, Generate, Select CSS, Reset, help. CSS output is programmatically focused by Select and is not an extra sequential tab stop.

## Architecture
src/core.mjs: exact reduced BigInt rationals, validation, rounding/serialization and simulation. src/state.mjs: isolated transitions. src/messages.mjs: matching bilingual keys. src/app.mjs: safe DOM bindings and transient lifecycle. style.css: bounded preview scroll, keyboard focus, responsive panels. tests: explicit spec vectors plus finite independent coefficient oracle and state checks. scripts: finite syntax/safety checks and deterministic static copy build.
Only computed finite numeric font size is assigned through a CSSOM property; text uses textContent. CSP restricts all loads to local scripts/styles and prohibits connect, fonts, objects, base and forms. Static auditing is not proof of actual runtime privacy.

## Verification and limitations
Read AUTHOR-CHECK.md for A01–22 coverage and exact NOT_RUN facets. Fifteen automated author tests, finite check and build passed. Ordinary cloud Chromium UI verified the principal workflows, raw/error recovery, language preservation, keyboard focus and genuine200% browser zoom reflow. Exact prescribed CSS viewport/root/DPR, screen reader, runtime network/storage audit, exported native CSS comparison, BFCache observation and20-action timing remain NOT_RUN. Organization-blocked DevTools was not bypassed through an alternative inspection API.
Source arithmetic does not prove native CSS precision, accessibility, runtime privacy or product quality. Existing ordinary UI evidence is author evidence; a nonauthor must evaluate this candidate. Source availability, independent acceptance and deployment are separate states, recorded outside this source document.

## Recovery
The URL identifies the language. The app keeps calculation state in memory during an ordinary language switch and same-document back or forward navigation. Reloading, opening the other language in a new tab, Reset and page lifecycle resets start a fresh calculation. Actual browser history and BFCache behavior still require recorded observation.
To discard this candidate, stop its authorized preview and use the frozen source snapshot manifest; no deployment change is implied. If a later revision is needed, copy the frozen candidate to a new revision, preserve its manifest/history, and recheck affected cases. Never overwrite another owner's work.

