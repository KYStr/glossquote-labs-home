# Flex Shrink Distribution Explorer — complete preparation specification v0.2

2026-11-01. Documentation candidate, not an implemented or accepted product. BRIEF is fixed at KYStr/glossquote-labs-home commit77dab8e0bc5a06245795adcaecc6c83021f59038, docs/specs/flex-shrink/BRIEF.md. Source baseline: commit26525d5f6380915ea95dde879dec769442db0d95, README.md. Formal specification task: labs-flex-shrink-spec-20261031. Proposed spec identifier: spec-flex-shrink-20261031. No product scores are supplied.

## 1. Goal, scope and semantic boundary

Help a frontend author explain why adjacent flex items shrink unequally, why explicit minimum widths freeze some items, and why shrink factors below one can leave overflow. A complete normal task is edit numeric inputs, Generate, inspect an ordered iteration table and final widths, compare a native empty-box preview, then manually select reproducible CSS. This is not a general CSS parser, page debugger, responsive-layout designer or browser simulator.

Exactly3–6 items in document order; horizontal-tb/ltr, row/nowrap, definite container inner width, grow0, explicit px basis and explicit px minimum width (default0), max-width:none. All boxes have content-box sizing, zero margin/padding/border/gap; items are empty non-replaced elements of fixed32px height. No auto/intrinsic basis or minimum, percentage, aspect ratio, text measurement, media, wrap, order/reversal, automatic margins, cross-axis baseline calculation, shadow, transform, draggable controls, arbitrary CSS/HTML import, clipboard API, file import/export, storage or sharing. Labels and legends are outside the flex container, so they cannot change item intrinsic widths. Do not use min-width:auto as shorthand for zero.

This distinct scope was compared against the registered tools/catalog and visible proposals: Grid handles two-dimensional tracks/areas, Object-fit image cropping, Box Fit three-dimensional packing, Fluid Typography type interpolation and Transform-Origin transforms. Unregistered local/unpublished work remains unknown; source preservation is not proof of global uniqueness. Resolve any actual collision before production without taking an existing owner.

Semantic reference: [W3C CSS Flexbox Level1, 2025-10-14 CR Draft, §9.7](https://www.w3.org/TR/2025/CRD-css-flexbox-1-20251014/#resolve-flexible-lengths) and [§4.5](https://www.w3.org/TR/2025/CRD-css-flexbox-1-20251014/#min-size-auto), read2026-11-01. These establish the flexible-length algorithm and the automatic-minimum boundary. This specification's bounds, UI, serialization, rational arithmetic and finite evidence requirements are app decisions, not additional CSS standards. Browser quantization is separately observed; no exact-pixel or complete-browser equivalence is promised.

## 2. User flow, state and accessibility contract

First load: item count3, C240; each basis100, shrink1, minimum0. Show explanatory help, no generated widths/table/preview/CSS. Field order is count, C, then basis/shrink/minimum for item1 through N. Count is a native select restricted to3/4/5/6. Growing count appends defaults; reducing count permanently discards removed rows. Count changes always clear generated output and errors; unchanged visible raw inputs remain. Focus stays on the select.

Generate alone validates/recomputes. Validate C then each item in field order. Show all field errors with labels and described-by links; focus the first invalid field. On success retain the currently focused control: Enter from a numeric input stays there; keyboard activation of Generate stays on Generate; do not programmatically move pointer focus. Announce one concise result, including whether overflow remains. Generated model is immutable and owns CSS, table, summary and native preview. Repeated Generate replaces it, never duplicates listeners/nodes.

Any numeric input event immediately removes ALL old results and disables Select CSS, before validation; retain raw text, never silently clamp. Invalid state does not display prior results. Changing language preserves raw fields and model/error codes, translates presentation and lang, leaves CSS/numbers unchanged and keeps focus. No recomputation from dirty values. Traditional Chinese and English cover labels, errors, units, rationale, exclusions and live status. Fixed item IDs remain1–N in both languages.

Provide two example buttons: Defaults loads the initial state; Minimum freeze loads C240, basis[100,100,100], shrink[1,1,1], min[95,0,0], count3. Each clears results/errors without generating and leaves focus on its button. Reset loads defaults and focuses C. Select CSS only when generated: focus and select the readonly textarea, announce selected/manual copy, never say copied. A permission-free manual selection instruction remains visible if programmatic selection fails. No asynchronous clipboard or download action.

Reload and normal back/forward navigation show defaults. On pagehide erase application state; on pageshow.persisted reset to defaults. Evidence must distinguish real BFCache restoration from a fresh load. No promise to erase browser caches/history. JS-unavailable message is static and controls are disabled until initialization succeeds; unsupported required capability shows unavailable, never fabricated output.

Native labels/fieldsets/buttons/table caption and headers are required. Preview may be aria-hidden because all geometry is available as text. No color-only encoding: item ID plus table row links its colored box; zero-width items have an explicit table note and external legend. Keyboard order follows visible order, no traps, visible focus. At320 CSSpx and200% zoom controls wrap; only dedicated preview/table/code wrappers may scroll horizontally, never the page. Output/table keyboard scroll and selection must remain usable.

One opaque solid sRGB theme; no gradient/image/transparent backgrounds behind functional text. All app text (including help/error/output and large headings) contrast≥4.5:1 against its actual adjacent background. Enabled input/button/textarea identifying boundaries≥3:1 against surrounding background; focus indicator≥3:1 against every directly touching color; required state icons≥3:1 plus text. Test distinct pairs in both languages for default/hover/focus/invalid/generated states. Record computed foreground/background colors and unrounded WCAG luminance ratio; don't measure antialiased pixels or round up a failure. Disabled controls and user-agent-owned text selection are separately described, not certified; adjacent explanations still meet text target. These are finite app criteria, not full WCAG certification. Phone, other OS and screen-reader extension may be reported if available but are not unresourced hard gates.

## 3. Numeric input and deterministic output

C in[40,1200] CSSpx; basis B and minimum M in[0,1200] CSSpx; shrink S in[0,4]. All inclusive. Every numeric field accepts only ASCII outer whitespace U+0009–000D/U+0020 followed by full-match `(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?`. No signs, exponents, commas, units, leading zeros other than0, NaN/Infinity or Unicode digits/whitespace. Raw maximum64 UTF-16 code units, checked BEFORE parsing. Overlong paste is visible but never parsed; HTML maxlength is not a substitute for application validation. Canonical numbers remove fractional trailing zeros/dot. M>B is valid and intentional. No hidden validation requiring sum of minima≤C or all shrink factors≥1.

Numeric controls MUST be `<input type="text" inputmode="decimal" autocomplete="off" spellcheck="false">`, with no maxlength or native numeric coercion. The controller stores each field's `input.value` string on every input event, including invalid/overlong lexemes; Generate validates that snapshot. Do not use type=number, valueAsNumber, parseFloat, or trim/canonicalize/write back on blur or success. Examples/reset are the only intentional numeric raw replacements; language changes retain strings. Inputmode is a keyboard hint, not a validator. Use form novalidate and prevent submit navigation so app errors and Enter handling are deterministic; ignore Enter while composition is active and Generate only after committed input.

Raw means the value exposed by the single-line text control, not the original clipboard bytes. HTML text controls strip CR/LF; do not claim preservation or validation of stripped line endings, and do not add clipboard reads. The pure parser still tests the full stated ASCII-whitespace grammar, including CR/LF at the outer edge; UI evidence separately records browser sanitization (a paste of `1\n2` can expose `12`, which is validated as12). Tabs/other controls are accepted only when actually present and allowed by the grammar. This boundary follows [HTML text-state sanitization](https://html.spec.whatwg.org/multipage/input.html#text-(type=text)-state-and-search-state-(type=search)); it does not promise arbitrary multiline input support.

Parse to integer hundredths and use exact rational arithmetic thereafter (BigInt numerator/positive denominator, normalized). Decimal presentation of calculated widths/free space/weights is fixed2 fractional digits, half-away-from-zero, trailing zeros retained; render negative zero as0.00. Retain reduced exact fraction in a details column (integers without /1). Input/CSS values remain canonical requested decimals, not calculated rounded widths. Round only at display; exact residual is C−sum(final widths), not sum of rounded strings. For example width1/8→0.13 and residual−1/8→−0.13. A residual whose absolute value rounds to0.00 still has its exact sign/status and fraction explained, not called exact fit.

Result includes: chosen branch (shrink or no-growth), each H and initial freeze reason, initial free space F0; one row per iteration containing active IDs, recomputed R, selected distributable R*, factor sum A, weighted sum D, tentative/limited widths and newly frozen IDs; final requested versus used width, final exact/rounded residual and overflow=max(−residual,0). Positive residual is unused space at the right; negative residual is right overflow; zero is exact fit. Label all approximate decimals.

CSS is deterministic LF-only UTF-8, one final LF, no BOM/trailing spaces; these lines in this order:

```
.flex-demo {
  display: flex;
  flex-flow: row nowrap;
  writing-mode: horizontal-tb;
  direction: ltr;
  justify-content: flex-start;
  align-items: flex-start;
  box-sizing: content-box;
  width: 240px;
  margin: 0;
  padding: 0;
  border: 0;
  gap: 0;
}
.flex-demo > .item {
  box-sizing: content-box;
  height: 32px;
  margin: 0;
  padding: 0;
  border: 0;
  max-width: none;
}
.flex-demo > .item:nth-child(1) { flex: 0 1 100px; min-width: 0px; }
.flex-demo > .item:nth-child(2) { flex: 0 1 100px; min-width: 0px; }
.flex-demo > .item:nth-child(3) { flex: 0 1 100px; min-width: 0px; }
```

Replace width and per-item numbers with canonical inputs; include exactly N nth-child lines. Explain markup requires N empty direct child blocks class=item inside class=flex-demo, no other children/author CSS. Output deliberately does not set calculated widths or visual colors. It is an isolated-subset example, not a guarantee under arbitrary cascading CSS/content. Native preview uses the identical declarations in an isolated fixed stylesheet with named style setters; colors are app constants, no inline user CSS or HTML parsing. Outer preview wrapper scrolls at actual CSS scale; do not shrink-to-fit or transform the demo. Numeric zero width stays zero, not a minimum visible width.

## 4. Implementation and rational model

Use existing repository Node24+ zero-dependency toolchain, pure parsing/calculation/formatting/serialization functions, state controller and bilingual semantic renderer. No product source is delivered here. Production later needs its own task/claim. Rational operations/comparisons must not convert to Number before final CSSOM measurement comparison. Bound N≤6 and raw lengths, gcd-normalize every operation; synchronous finite work, no worker/network/permission/retry mechanism.

For the scoped model let H_i=max(B_i,M_i). Outer and inner widths agree because margins/padding/borders are0. Initialize targets T_i=B_i. If sum(H)<C, the official algorithm selects grow, but all grow factors are0: freeze all at H with initial reason `grow-zero` for every item (even when M>B); define F0=C−sum(H), final residual=F0, and rounds=[] (display “no shrink rounds”, not fabricated A/D/R rows). Show no-growth; the original requested B remains visible separately. Otherwise use shrink. Freeze S_i=0 or B_i<H_i at H_i. Reasons distinguish zero-shrink, minimum-above-basis or both. Other items initially active. F0=C−sum(frozen target or active B), fixed for all later rounds.

Each round recomputes R=C−sum(frozen T or active B) and A=sum(active S). R*=R unless A<1 and abs(F0*A)<abs(R), in which case R*=F0*A. Equality keeps R. D=sum(active S_i*B_i). If R*=0, tentative U_i=B_i. If R*≠0 and D>0, U_i=B_i−abs(R*)*(S_i*B_i)/D. Limit each active value L_i=max(U_i,M_i,0). V=sum(L_i−U_i). With no finite max in this scope V cannot be negative: V=0 freezes all active; V>0 freezes precisely positive-minimum-violation items. Set all active tentative targets to L before freezing, but next round distributes from original B, never from prior tentative widths. Keep frozen widths unchanged. A negative V is an internal invariant failure, not a user error or a silent approximation.

Zero-weight degeneracy: if D=0 all active bases are0 (active S>0; S0 was frozen). Each active minimum is0, otherwise it was initially frozen. Set these active targets to0 and freeze them; any remaining free-space deficit comes only from frozen items, is reported as overflow, not divided by0. This is the zero-contribution limit of the restricted model, not support for arbitrary CSS degeneracies. Require an explicit native comparison case before product acceptance. At least one item freezes each round, so at most N rounds; assertion failure clears outputs and gives bounded internal-error text, never partial CSS. The cap is a correctness guard, not a route to truncate valid results.

Finish T_i as used model widths, each nonnegative and≥M_i. Residual may be nonzero even when min sum fits C, because factors below1 request only partial shrink. Do not force normalization to C. Official intrinsic-size/automatic-minimum algorithms are excluded rather than approximated by entered numbers. Native measurements use getBoundingClientRect on untransformed empty boxes only; computed flex-basis is not evidence of used width.

Safe construction: no innerHTML, eval, dynamic imports, arbitrary property names or CSS text injection from raw input. Set known style properties from canonical validated values. Errors and labels use textContent. Use the exact proposed CSP and static asset contract below; no third-party fonts/scripts. Developer evidence uses synthetic inputs only. No URL state, cookies/storage writes, telemetry or sensitive data logs.

### 4.1 Reproducible future implementation interface

Baseline sources actually read: [README.md](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md) and [package.json](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/package.json). They establish Node>=24, built-in modules only, and preview/production build separation. They are homepage scripts, NOT an already-existing Flex implementation. The later separately claimed tool must implement the following interface in its own approved source root; no edit to homepage scripts or workflow is authorized here:

```
node --version
npm test
npm run check
npm run build:preview
npm run check:generated:preview
npm run build:production
npm run check:generated:production
npm run dev
```

No install/network dependency step. Future package scripts must map test→`node --test`, check→`node scripts/check.mjs`, build:preview/production→`node scripts/build.mjs --mode preview|production`, check:generated:preview/production→`node scripts/check-generated.mjs --mode preview|production`, dev→`node scripts/serve.mjs`. Every check/test/build must exit0 or fail nonzero with the failing fixture/path; no skipped required test passes. Tests contain independent literal F01–F17/F26 expected data and state tests; check enforces bounded sinks, imports, bilingual strings and this asset list. Builds deterministically emit dist/ (noindex preview) and dist-production/ (production metadata); generated checks compare file allowlist, exact generated CSS/JS/HTML, links, CSP and hashes. Neither command deploys. Dev binds127.0.0.1:4180, serves only prebuilt dist/ with the same CSP headers and no write endpoints. Browser F18–F25 are separate recorded manual checks, not claimed by npm test. The implementer supplies real command transcripts, Node version, source commit and output SHA manifest; these commands are specifications to implement, all currently NOT_RUN.

Static emitted file allowlist, for both modes: index.html, en/index.html, assets/app.mjs, assets/core.mjs, assets/styles.css, robots.txt, sitemap.xml, _headers, _redirects. HTML may request only the same-origin named module graph (app→core) and styles.css; system fonts only, no images/favicons/font files, source maps, arbitrary imports or extra resources. Robots/sitemap and redirects are build metadata; _headers/_redirects are hosting configuration, not UI assets. Network evidence must distinguish page navigations/metadata from data requests. Production canonical origin remains unset until separately approved, so production check must fail rather than invent a domain. Preview uses noindex and local URLs. No publication is implied by a build.

Proposed response CSP (not a claim about existing deployed headers): `default-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; img-src 'none'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; worker-src 'none'; manifest-src 'none'`. Deliver as HTTP header through the local preview server and eventual approved hosting _headers; do not rely on meta for frame-ancestors. No unsafe-inline/eval, nonce bypass, telemetry/report endpoint or remote allowlist. Source inspection narrows same-origin script/style permissions to the named emitted files; CSP self alone is not a path allowlist.

Dynamic preview sizing uses direct known CSSStyleDeclaration properties only (container.style.width and item.style.flexGrow/flexShrink/flexBasis/minWidth) from canonical validated decimals. No setAttribute('style'), cssText, injected style element, stylesheet text parsing, arbitrary property/value or event-handler attributes. [CSP3 style-src-attr](https://www.w3.org/TR/2026/WD-CSP3-20261027/#style-src-attr) governs style attributes; the required baseline must demonstrate these individual property setters actually work under the exact response CSP, with no violation, while injected style attributes/inline scripts are blocked. This is a required F22 compatibility/security observation, not an assumed pass and not permission to loosen CSP if it fails. Constant layout/colors remain in styles.css. Any necessary contract change requires same-candidate review, not silent widening.

## 5. Author reference cases and future test matrix

These expected values are document arithmetic, not product tests. Items are listed in order; omitted minima are0. All examples use3 items unless stated.

|ID|C; B; S; M if nonzero|Expected widths; residual|
|F01|240;100,100,100;1,1,1|80,80,80;0|
|F02|300;100,200,300;1,1,1|50,100,150;0|
|F03|300;100,200,300;0,1,2|100,125,75;0|
|F04|240;100,100,100;1,1,1;95,0,0|95,145/2,145/2;0; two rounds|
|F05|240;50,100,100;1,1,1;80,0,0|80,80,80;0; item1 initially frozen|
|F06|150;100,100,100;0.1,0.1,0.1|85,85,85;−105; F0−150, R*−45|
|F07|150;100,100,100;0.4,0.4,0.4;90,0,0|90,40,40;−20; second R−140 but R*−120|
|F08|150;100,100,100;0,0,0|100,100,100;−150; no rounds|
|F09|100;0,100,100;1,1,1|0,50,50;0|
|F10|100;100,100,100;1,1,1;50,50,50|50,50,50;−50|
|F11|400;100,100,100;1,1,1|100,100,100;100; no-growth branch|
|F11b|400;100,100,100;1,1,1;150,0,0|150,100,100;50; H=150,100,100, F0=50, every reason grow-zero, rounds=[]|
|F12|300;100,100,100;1,1,1|100,100,100;0; zero-space round|
|F13|40;0,0,0;1,1,1;50,0,0|50,0,0;−10; zero-weight active set|
|F14|40;0,0,0;1,1,1|0,0,0;40; no-growth branch|
|F15|40;10,10,20.01;0.25,0,0|9.9975,10,20.01;−0.0075; widths display10.00,10.00,20.01, overflow0.01|

For F15, F0=−0.01, active factor sum0.25, R*=−0.0025; apparent rounded total must not replace exact residual. Formatting unit cases: ±1/8→±0.13; exact0→0.00;1/3→0.33; output requested10.00 canonicalizes to10. These are explicit expected fixtures independent of a future implementation; a test calling the core twice is not an oracle.

Additional planned cases, all product NOT_RUN:
- F16 inclusive bounds C40/1200, B/M0/1200, S0/4; invalid adjacent hundredths. N3/6 accepted; impossible select/programmatic N2/7 rejected safely.
- F17 grammar: empty,01,+1,−0,1e2,0x10,comma,Unicode space/digit,third decimal,Infinity; ASCII-trimmed valid numbers accepted. Raw64 versus65 reject in correct order, retain visible input before and after blur/Generate/language switch; verify type=text/inputmode and no valueAsNumber. Pure parser CR/LF-whitespace tests and separate single-line UI sanitization observation must not be conflated.
- F18 generate→edit/count-change→Select cannot expose stale output; generate twice, invalid→valid, examples/reset/language states; every output derives one snapshot.
- F19 committed numeric Enter (not composing) versus button success preserves focus, errors focus first field; full keyboard navigation/select fallback and nonauthor normal task in both languages.
- F20 1280×800 and320×800 CSS viewports on the same desktop;200% zoom from wide viewport, record resulting CSS viewport. Only dedicated wrappers scroll; focus/error/help not clipped.
- F21 native previews F01–F15 plus six-item upper bounds; measure all item widths and cumulative right edge relative to container. Per-item error≤0.1 CSSpx and total sum error≤0.1*N CSSpx versus exact model converted for measurement. Record raw measurements, browser/OS/device scale/zoom and screenshots. Do not round measurements into a pass. If baseline fails, investigate/fix or revise documented supported subset with review, never waive silently. This is finite numerical tolerance, not screenshot-byte equality.
- F22 inspect real network/storage/permissions from load through editing, selection, reset and navigation: exact §4.1 response CSP/asset list and direct style setters, blocked inline attribute/script probes, static allowlisted assets only, no data requests/storage writes/permission prompts; source review supplements, never replaces runtime evidence.
- F23 reload/back/forward/BFCache and JS-unavailable/unsupported state; explicitly identify unexercised BFCache rather than fabricate coverage.
- F24 contrast pairs/states, labels/error associations, focus/reflow as §2; screenshots locate computed-color observations.
- F25 twenty sequential six-item upper-bound Generate actions after previous render; record handler-entry→next requestAnimationFrame elapsed time for every action, each≤100ms on named baseline; confirm no extra listeners/nodes, responsive reset/edit. This is an app checkpoint, not physical display-latency certification.
- F26 exact CSS fixture including final LF, no BOM, canonical numbers, item order/count; language-independent bytes. Changing only container affects width line, not requested item declarations. CSS applied to native empty markup verifies scoped behavior, not arbitrary user pages.

Available normal desktop Chromium is required baseline; record actual installed version, OS, viewport, zoom and device scale. Other engines/OS/mobile/assistive technology remain explicit untested extensions unless separately resourced and requested. Missing required desktop/native/privacy/security evidence is not an optional extension and keeps its score null.

## 6. Nine fixed acceptance aspects

Preserve the BRIEF/registered task IDs below. For later product acceptance each necessary aspect independently≥90/100 on one immutable candidate with evidence; mean scores, case counts and author claims do not substitute. Current score of every aspect=null; product evidence NOT_RUN.

|ID|Required evidence and outcome|
|---|---|
|functionality|F01–15/F26 exact model, correct branch/initial freezes/round traces/partial shrink/overflow and deterministic requested CSS; native F21 comparison.|
|boundaries|F13–18/F23 exact grammar/length/range/zero-weight/tie/dirty/invalid/lifecycle behavior; finite assertions and no partial or stale result.|
|privacy|F22 actual network/storage/permission observations and matching page promise; no sensitive input or persistence.|
|security|F17/F22 safe known sinks/CSP/asset allowlist and malicious-input rejection, bounded synchronous core, no arbitrary CSS/HTML or remote resources.|
|usability|F04/F06/F07/F18/F19 nonauthor can distinguish freeze/partial shrink/overflow, repair input and manually take CSS with page help only; no false copied/full-browser claims.|
|accessibility|F19/F20/F24 finite keyboard/focus/names/errors/text alternatives/contrast/zoom/reflow records; color not sole cue, extensions truthfully separate.|
|localization-seo|Both-language F18–20/F26; complete translated help/errors/status, invariant math/CSS, correct lang/title/description/h1 and same-language links.|
|toolchain-provenance|Clean existing Node24+ build/check/tests with no dependencies; pure layers, independent expected fixtures, source/version/rights/build instructions and full handoff; no private data committed.|
|compatibility|F20–23/F25 recorded desktop native geometry/selection/navigation/reset and finite timing baseline, unsupported capabilities explicitly handled, other devices not claimed.|

Document completeness instead checks eight areas goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff. The nonauthor must review exact document bytes and affected corrections. No document verdict grants product scores.

## 7. Author document checks and risks

Author checked the finite fields, exact rational rules and representative cases using separate document-only Fraction calculations, not product execution. Required author evidence includes the full expected case table, worked F04/F07 and zero-weight argument, formatting ties, CSS fixture and eight-section check. A nonauthor must independently challenge the model; same author's script is not an independent review.

Principal risks: treating auto minimum as zero; forgetting initial min>B freeze; recomputing F0 each round; using rounded previous widths; omitting factor-sum<1; forcing overflow away; injecting label text into native flex items; asserting CSSOM basis is used width. Mitigation is explicit exclusions and empty items, exact immutable trace and adversarial fixtures. Rounding may make an adjusted item appear unchanged; always expose exact fractions/status. Exported CSS assumes isolated empty markup and does not promise validity under unrelated styles.

Public files are limited to BRIEF/SPEC/AUTHOR-CHECK and independently authored INDEPENDENT-REVIEW. Private arithmetic scripts, manifests, operational receipts and approval conversations are not published. No new license is invented; inherited repository baseline says no license selected, and standards reference is attribution not a license for arbitrary copied code.

## 8. Delivery, review and admission

Deliver this same stable spec identity, exact bytes/hash, baseline and fixed GitHub commit when authorized; bind independent review to that candidate. Correct defects within scope, preserve old versions/receipts and re-review affected sections; never replace a low score or required aspect with an easier one. Spec registration and independent mark-ready remain separate from the original writing claim and from later production. Unknown local duplication remains explicit before production. Eight-section readiness may increase stock only after independent formal processing, not merely after this file exists.

Required future implementer handoff: approved immutable four-document set; exact task/claim/allowed executor and nine criteria; reproducible existing-toolchain commands; synthetic fixtures and measured native evidence; NOT_RUN/unsupported limitations; candidate PR and nonauthor evaluation. No product implementation, merge, deployment, workflow, credentials, permissions, cost or catalog update is authorized by this specification. A separate production claim is necessary. This version is awaiting independent document review; ready is not asserted.
