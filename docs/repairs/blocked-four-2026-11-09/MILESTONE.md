# M2 — Repair four blocked static candidates
Owner: local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf
Task: labs-blocked-four-repairs-20261109
Predecessor: labs-inspection-expansion-20261109 accepted at registry r1279, candidate40d95e7b211c8fa53b416dd7433a00d03137ea07.

## Goal and scope
Remove the four confirmed code/spec blockers in word-frequency, text-to-speech-reader, fluid-typography and svg-to-png-converter. The user revoked original-author-only repair on2026-11-09. Delegate bounded implementation to GPT-6.1 Sol with medium reasoning; the primary inspects actual source, independently runs affected tests and owns publication. Preserve original PR/actor/source evidence. This is a maintenance claim, not a takeover or retrospective product acceptance.

## Fixed source checkpoints
- word-frequency: KYStr/glossquote-labs-word-frequency PR1,180dcb19d56416da352e26405955aaba69a09acc, tree d12c11fe08cfe3ce58bbcfa46647a78a731ec8d0.
- text-to-speech-reader: KYStr/glossquote-labs-text-to-speech-reader PR1,45164104bdc713fc352ea37dfe5a5509d5d9864d, tree50209d3667663ab933e3bb1d35f7cc50fb2e241d.
- fluid-typography: sharedrepo PR40,1e7a28b214542e6ed095338fe9b05d6955d76023,tree e42c094570a7d78f7cfea57934e298fa4c0b024e.
- svg-to-png-converter: sharedrepo PR99,af98d8ca9b4df2365f7991c512e178ac788d3708,tree1b2888d2615b7eb1a038d91a1ca200e6b7efd087.
The baseline commit adds exact original source subtrees to tools/<slug> BEFORE any product repair. Frozen original specs remain unchanged; the additive SPEC-ERRATA.md records the approved resolution.

## Decisions and acceptance
1. Word frequency: preserve existing tokenization and Unicode16 simple C+S folding. Minimum count filters visible/exported rows after counting; it does not renormalize denominators. Stopwords/number/minLength token filters affect counted totals. Alpha alpha beta with minCount2 has total3 and alpha2/3 (66.7%). Top100 is display-only; export all count-filtered rows. Align bilingual labels/help, README, provenance and additive errata; tests must distinguish count filters from token filters, C+S from C+F, and CSV from top100 display.
2. Speech: only voices whose localService is exactly true can be selected or passed to speak. No null/default/remote fallback. Revalidate against the current synth.getVoices immediately before every enqueue and resume; disappearance/removal/empty enumeration stops safely, returns idle, clears stale selected state and explains unavailable local voices. Preserve generation guards, progress, text-edit cancellation, sentence playback, speed/pitch and error handling. Test fake synth: remote-only, missing voice, local-to-remote mutation, voiceschanged removal, empty list, queued-next chunk, resume, stale callbacks and local successful playback. Actual device speech/network remains NOT_RUN until observed; UI must describe the browser-reported local flag without claiming audited OS network behavior.
3. Fluid typography: ship independent complete zh-Hant index.html and en/index.html, language-matching home links, both static metadata and labels; preserve clamp math, rounding, input errors, old-result invalidation and style/token system. Build/check both pages and local resource paths. No runtime-only language replacement as a substitute for static English content.
4. SVG: replace permissive regex-only CSS handling with a strict supported subset and fail-closed handling. Remove external references in all URL-bearing attributes and CSS/presentation values, xml:base, non-SVG namespace content, and SMIL capable of mutating a reference after sanitation. Preserve ordinary shapes, numeric geometry, simple colors, safe fragment references and supported embedded raster data. Unsupported CSS may be rejected or removed with a clear bilingual warning rather than silently claiming faithful preservation. Do not add a CSS runtime dependency or widen CSP. Test escaped/commented/malformed import/url, image-set/custom-property indirection, style elements/attributes, presentation fill/filter/clip/mask/marker/cursor, href/xlink, namespace/xml:base and animate/set; ensure harmless fragment gradient/clip/mask, shapes and permitted raster data continue. The old source promise to preserve every non-banned attribute is superseded by this explicit safety erratum. Do not claim observed exfiltration without network evidence.

## Allowed paths and roles
Primary: docs/repairs/blocked-four-2026-11-09/**, releases/blocked-four-2026-11-09/**, reviewed exact source subtrees tools/{four slugs}/**, isolated .runs/blocked-four-repair-2026-11-09/**, existing authorized shared homepage/inspection release integration. Never edit the original frozen snapshots or unrelated work.
Implementation groupA: word-frequency and text-to-speech-reader only.
Implementation groupB: fluid-typography and svg-to-png-converter only.
No recursive delegation, global Git/auth/environment writes, credential reads, paid services, desktop/browser interaction or native dialogs. Offline CLI and fake-data tests only. The primary alone deploys through the authorized exact token loader after frozen candidate review.

## Milestone gates
A. Preserve and hash fixed source/spec context, review exact diff, run required package test/check/build and relevant independent regression cases.
B. Publish candidate source and PR; independent non-author reviewer scores each declared aspect >=90 with evidence.
C. After safety/release checks, publish all four as noindex public inspection sites on free existing shared Worker, preserving the previous97 assets and same-language directory/home links. Product full browser/device/network/storage/native gates remain pending, never inferred from unit tests or deployment.
D. Verify actual HTTP assets, metadata, headers, redirects and route isolation; update status with source commit and actual Worker version.
E. Deliver one combined ZIP including prior M1 scope plus new fixes/sources/evidence. Keep historical ZIPs immutable.

## Required independent review aspects
- source-provenance: exact original baseline and scoped repairs, no overwritten ownership/spec history.
- defect-resolution: four specified blockers resolved with meaningful tests and truthful UI contract.
- release-security: safe sanitizer/local-voice policy/static routing, no secrets/telemetry/settings drift.
- bilingual-release: actual separate language pages, SEO, noindex notices, live artifact hashes and navigation.
- delivery-integrity: one complete portable archive, status table, hashes and explicit remaining gates.

## Non-goals and stop conditions
No new feature inventory, no acceptance of the four complete products, no changes to original two media support requirements. Video remains Chrome+Edge; video WASM/GPL and transcription resource/browser gates are recorded separately. Stop only affected candidate for source drift, unresolved safety regression, unsupported dependency, missing required release evidence, credential/settings drift, or occupied unrelated domain. Return concrete failure evidence to the assigned Sol implementer, not to unavailable original authors.
