# Elliptical Corner Radius Explorer — preparation specification v0.2

Specification publication candidate, 2026-10-31. Not yet published or authorized for publication; not an official claim, ready inventory or product. Proposed repository path: `docs/specs/elliptical-corners/`. Independent document review and product acceptance are separate.

## 1. Goal, audience and distinct scope

Help a frontend author understand why large CSS corner radii shrink and obtain one deterministic border-radius declaration for four independently shaped elliptical corners. The core outcome is not merely a rounded card: it is a side-by-side explanation of requested and overlap-adjusted radii, the limiting sides, and a matching native preview. A normal task is edit a corner pair, Generate, understand the result and Select CSS without permissions or installation.

Known-source comparison found no dedicated eight-radius/overlap explanatory tool among the registered tools, catalog and proposals observed at preparation time. This is not proof of unknown unpublished work. Box Shadow edits ordered shadow layers with card geometry; this proposal does not edit shadows or modify that tool. Grid positions areas, Gradient positions colors, Cubic maps animation time, Fluid Typography derives font scaling; this tool does none of those. Repeat current collision checks before registration/publication; preserve existing owners and resolve any real overlap before admission.

Included: eight nonnegative px radii, fixed physical corner order, rectangular dimensions in CSS px, deterministic CSS, original/adjusted numerical table, limiting-side explanation, plain native preview, Traditional Chinese/English UI, manual selection. Excluded: percentages/rem, shorthand import, arbitrary CSS, logical corners/writing modes, border widths/styles, images, shadow/gradient editing, animations, draggable points, linked-corner mode, SVG/path export, downloads, clipboard API, persistence, sharing, live-site editing, accounts or network services. Existing tools remain untouched.

## 2. User flow and interaction contract

First load fills defaults but shows no generated result: W=240, H=160; every horizontal radius=24 and every vertical radius=16. Explain px means CSS px, not physical device pixels. Show a static example instruction, not a fake computed preview. Input order is W,H, then TL horizontal/vertical, TR horizontal/vertical, BR horizontal/vertical, BL horizontal/vertical. Corner labels always use physical top-left/right/bottom-right/left, not document direction.

Generate validates all ten inputs in that order. Show every error associated with its field; focus the first invalid field. On success display a single result section containing native preview, table, scale factor, limiting sides and read-only CSS textarea. Announce one concise generation result politely. Repeated Generate replaces the result without duplicating handlers or changing focus unexpectedly.

Any numeric edit immediately removes the generated CSS/table/preview/summary and disables Select CSS, even if the new text is valid. No stale output is selectable as current. Preserve raw edits and never silently clamp/swap values. Generate is the sole recomputation trigger. Select CSS focuses and selects the textarea; the user uses OS Copy. Feedback says selected, not copied. No clipboard call or permission request.

Two labelled example buttons intentionally replace all ten values and clear errors/result without generating: Default restores default values; Overlap loads W100,H100 and every horizontal/vertical radius80. Reset has the same data outcome as Default but explicitly clears all result state and focuses W. Example-button activation leaves focus on the activated button. A language toggle preserves raw input, errors and generated CSS bytes; translates descriptions/errors, updates page lang and retains focus. Results are rerendered from the last generated immutable model, never silently recalculated from dirty inputs.

At desktop viewport320 CSSpx all controls stack; use an internal scroll container for the preview and output. No page-level horizontal scrollbar. Preview dimensions must not silently shrink to fit. A 240px default is normally visible; larger boxes may need internal scrolling. At200% browser zoom labels and actions remain reachable. Every function is keyboard operable; no drag-only interaction or color-only state. The finite contrast contract in §5 applies to both languages and all required UI states. Visible labels, fieldsets, error links and visible focus are mandatory. Preview is decorative because the adjacent table fully expresses the values. No user-entered sample text is needed.

Reload/navigation returns defaults, no custom state stored. On pagehide clear in-memory inputs/result; on pageshow restoration reset to defaults so BFCache cannot restore old values as a new result. Browser memory/cache erasure is not promised. Reset while generated/invalid, language change in either state and repeated activation are explicit future tests.

## 3. Input, calculation and output contract

Trim only ASCII outer whitespace (U+0009–000D and U+0020). Full-match grammar: `(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?`. Reject leading zeros except0, signs, exponent, comma decimals, units, internal whitespace, empty, Infinity, NaN and hexadecimal. Maximum raw length64 UTF-16 code units per field, checked before parsing; excessive paste remains visible as an error but is never parsed. Set an input length affordance but do not rely on HTML maxlength as validation. Product-supported ranges: W,H inclusive40–640 CSSpx; each radius inclusive0–640 CSSpx. These are app limits, not CSS limits. Normalize valid output decimals by stripping fractional trailing zeros and a now-empty dot; no negative zero is accepted. Compare parsed values, never strings.

Let xTL,xTR,xBR,xBL and yTL,yTR,yBR,yBL be requested horizontal and vertical radii. Work in exact integer hundredths. Side sums: top=xTL+xTR; right=yTR+yBR; bottom=xBL+xBR; left=yTL+yBL. For each nonzero sum use corresponding width/sum (top/bottom) or height/sum (right/left). Zero sums impose no restriction. f is the minimum of1 and these ratios; compare rational pairs by integer cross multiplication. All adjusted pairs are f times their requested pair, using exact rational arithmetic. At f=1 label “no reduction”; otherwise “proportional reduction.” List all sides attaining f when f<1, in top/right/bottom/left order; at f=1 list no limiting sides even if a sum exactly equals the dimension. Zero radius on either axis makes that corner square; retain its requested/adjusted pair in the table and add a square-corner note, rather than falsifying the input value. Side-sum computation still uses all specified radii.

Display f as reduced fraction (or1) plus approximate decimal with exactly four fractional digits, rounding half away from zero and retaining trailing zeros (f=1 shows1.0000). Display adjusted radii with exactly two fractional digits, also rounding half away from zero and retaining trailing zeros. Both conversions operate on the exact rational value; only their displayed strings are rounded. Tables explicitly label approximations. Do not round f before multiplying. Requested values and CSS use canonical original decimals, not adjusted values. Output exactly one declaration, all four values on each side of slash, single ASCII spaces, newline terminator, no selector:

`border-radius: 24px 24px 24px 24px / 16px 16px 16px 16px;`

Default table: f=1, all adjusted24.00/16.00, no limiting sides. Never compress repeated values into CSS shorthand. Do not bake adjusted values into exported CSS: changed box dimensions should let CSS perform its own reduction. W/H affect the explanation/preview only and are not emitted; show a nearby warning that another box size may yield a different shape. Native preview uses the original requested CSS on an empty borderless, padding-free block with box-sizing:border-box, widthW,heightH, fixed background, no transforms/animation and no children/scrollbars inside the shape. Scrolling belongs to its outer container. The explanatory model is not a pixel-perfect browser rendering promise.

Analytical examples:
- W100,H100, all x=y=80: side sums160, f=5/8, all adjusted50.00; all four limiting sides. CSS retains eight80px values.
- W120,H80; x=[90,60,30,20], y=[10,30,50,10]: sums top150,right80,bottom50,left20; f=4/5, limiting top only; adjusted x=[72,48,24,16], y=[8,24,40,8].
- Same pairs W240,H160: f=1, no reduction, exact CSS identical to previous case.
- W100,H100; all x=y=0: f=1, all zero, four square notes, no division by zero.
- W100,H100; x=[0,80,80,0], y=[80,80,80,80]: top80,right160,bottom80,left160; f=5/8, limiting right,left; adjusted x=[0,50,50,0], y=[50,50,50,50]; left corners square.
- W100,H100; all x=y=60: f=5/6, adjusted50.00 exactly. Display f≈0.8333 but must not compute49.998 from that display.

CSS semantics reference: [W3C CSS Backgrounds and Borders Level3, rounded corners/overlap](https://www.w3.org/TR/css-backgrounds-3/#corner-overlap), read2026-10-31, Candidate Recommendation Draft dated2024-03-11. It specifies elliptical corner radii and proportional reduction to avoid overlap. The app's bounds, interaction, serialization and examples are our design decisions. Native behavior still needs observation.

## 4. Construction plan and bounded behavior

After separate admission, use the existing approved repository toolchain. No new dependency/framework/origin/workflow is implied. Separate pure decimal parser/rational geometry/serializer, synchronous state controller and semantic bilingual view. Integer inputs max64000 hundredths, sums≤128000. Use BigInt for rational products/comparisons and decimal-display rounding, eliminating floating rounding near ties. The core returns immutable validated models or ordered field errors; DOM never parses arbitrary CSS. Set only named style properties from canonical numbers and the fixed border-radius template. Render labels/errors/tables via textContent.

States: pristine(default inputs,no result), dirty/invalid(no result), generated(model+output). Editing from generated clears model immediately; language changes do not alter state. Selection requires generated and never creates a job. All computation is bounded over ten inputs/four sums; no retry loop, worker, timer, object URL, download, async clipboard or cancellation machinery required. Long raw values are rejected before numeric work. Repeated actions must not accumulate nodes/listeners.

No file access, arbitrary HTML, storage, URL input state, telemetry, third-party fonts or post-load requests. Static assets are the only network dependency. No product input is included in logs/evidence. Disable result action when JS absent; show an honest explanatory fallback. Unsupported browser capabilities display a bounded unavailable message, not fabricated CSS output.

Implementation sequence later: fix approved source/brief/rubric→pure core+independent expected fixtures→state/UI→native desktop observations→author evidence exact candidate→nonauthor full product evaluation. Revisions keep identity and preserve historical receipts. This preparation includes no product source and cannot authorize that sequence itself.

## 5. Future acceptance cases and finite desktop baseline

All cases below are NOT_RUN. Required baseline is an available Linux desktop Chromium; record actual version/OS/CSS viewport/zoom/device scale. 1280×800 and320×800 CSS viewports use the same desktop, not a required phone. At200% zoom start from1280×800 and log resulting CSS viewport. No other OS/browser/mobile compatibility is claimed. Core arithmetic tests and browser observations are different evidence types.

|ID|Action|Required result|
|---|---|---|
|C01|Defaults→Generate|Exact declaration above plus LF, f1, eight adjusted values24/16, no limiting sides|
|C02|All80 example|f5/8, adjusted50, four limiting sides, original80px CSS|
|C03|Asymmetric120×80 example|f4/5, top only, eight values match §3|
|C04|Resize C03 to240×160|Old result immediately gone; regenerate f1, CSS bytes unchanged|
|C05|Allzero|No divide-by-zero, four square corners, f1|
|C06|One-axis-zero example|Right/left limiting, left square notes; retain raw/adjusted y values|
|C07|All60|f5/6 display0.8333 but adjusted50.00, no premature rounding|
|C08|Sum exactly equalsdimension|f1, no limiting sides; below/above by0.01 distinguish reduction|
|C09|W/H40,640 and radius0,640|Boundaries accepted;39.99/640.01 dimensions and−0.01/640.01 radii rejected|
|C10|Empty,01,+1,-0,1e2,1,5,0x10,16px,1.001|Field-specific grammar errors, no output; ASCII-trimmed valid tokens accepted|
|C11|64/65-length raw; unsupported whitespace|Range/grammar versus length errors deterministic; no expensive parsing or silent truncation|
|C12|24.00 versus24;0.50 versus0.5|Identical canonical CSS bytes and numeric equality|
|C13|Edit valid generated value→Select|Output/preview/table gone, action disabled, no stale bytes|
|C14|Generate twice, example, Reset, language|One result only; example intentionally replaces inputs without generation; defined focus and reset outcomes|
|C15|Keyboard-only and output selection|Every input/action reachable; selected text correct; no copy-success claim or permission prompt|
|C16|320 viewport,640pxshape,200%zoom|Only inner preview/output scroll; labels/actions accessible, no outer horizontal overflow|
|C17|Native preview C01/C02/C03/C05/C06|Recorded screenshot and exact borderbox dimensions; requested style applied, visible corner behavior consistent; CSSOM requested/computed values not falsely asserted to expose used radii|
|C18|Reload and navigateBack/Forward|Defaults/no old results. If pageshow.persisted true, reset proven; if false, state BFCache unexercised and validate fresh defaults|
|C19|Network/storage/permissions|Only expected static assets, no writes or permission API calls, evidence from actual runtime|
|C20|JS disabled|Readable unavailable explanation, no fake generated result; if baseline cannot disable JS mark NOT_RUN|
|C21|Independent rational oracle|All six analytical cases plus boundary/tie cases compare expected values, not core against itself. W=H40 with all eight radii640 gives f=1/32, approximate factor0.0313 (not0.0312), adjusted radii20.00 and allfour limiting sides; f1 shows1.0000.|
|C22|Repeated upper-bound inputs|20 sequential Generate actions after each render; handler-entry to next rAF checkpoint each≤100ms on recorded baseline; report all durations, no physical latency promise|

Accessibility required baseline: native keyboard/focus/error associations, text alternatives, computed contrast and200%zoom/reflow.

Finite contrast acceptance (part of C15/C16, not a new device requirement): use one fixed app theme with opaque solid sRGB foreground/background colors; no translucent layers or image/gradient backgrounds behind functional UI. In both languages measure rendered computed colors for headings, body/help/error/status text, field labels and entered values, table cells and the output textarea, plus every enabled button/link label. App baseline requires all of this text at least4.5:1 against its immediate actual background, including large text (a deliberately simpler app target, not a claim that standards require4.5 for every large heading). Disabled controls are listed separately, not claimed contrast-certified; the adjacent explanatory text remains subject to4.5:1.

For enabled numeric inputs, textarea and buttons, require a visible identifying boundary at least3:1 against the immediately surrounding page/panel background. Require every keyboard focus indicator at least3:1 against each color it directly touches; use an opaque outline with spacing if needed to make that set unambiguous. Any error/state icon required to understand a state must reach3:1 against its adjacent background and also have text. Decorative shape fill is excluded from functional-control contrast; its numerical table is not excluded.

Check each distinct foreground/background pair in default, hover, keyboard-focus, invalid and generated/selected-control states where present; also check read-only selected output text if the app styles its selection. Browser-default selection styling is reported as user-agent-controlled, not app-certified. Record element/state/language, computed color pair, unrounded ratio and pass/fail, with screenshots locating the elements. Equal style pairs may share a calculation only when their matching computed values are recorded. Use the WCAG relative-luminance contrast formula, not antialiased screenshot edge pixels; do not round a ratio up to a threshold. Reflow/zoom must not change the required colors or hide focus/errors. These are bounded app acceptance criteria, not full WCAG certification, and remain NOT_RUN until actual desktop observation.

Threshold reference: [W3C text contrast explanation](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [W3C non-text contrast explanation](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), read2026-10-31. The chosen all-text4.5 and explicit control-boundary/focus baseline are app requirements; no new mobile or mandatory screen-reader scope is added.
 Desktop screen-reader observation is a separately reported extension if resources exist; absence is explicitly NOT_RUN for that extension and does not create a missing-device gate for baseline acceptance or imply screen-reader certification. Privacy, compatibility and baseline performance checks remain required, not optional because tooling is inconvenient. Missing required evidence stays null. No blanket WCAG or all-browser certification.

## 6. Nine-aspect future acceptance contract

This is a proposed full rubric to be owner-fixed with the public source before implementation. Every necessary aspect must independently reach≥90/100 on one fixed candidate with evidence; mean scores and author tests cannot substitute. Current score for every row is null; evidence NOT_RUN.

|Aspect|Evidence required before independent scoring|
|---|---|
|Functional correctness|C01–12/C21 exactbytes, rational model, zero/tie/canonical behavior, unchanged CSS under dimensions|
|Normal-use usability|Nonauthor desktop edits/understands requested vsadjusted/uses selection inboth languages; C13–15 without misleading copy or stale state|
|Visual quality|Fullpage native narrow/wide screenshots, clear corner mapping/table hierarchy, visible shape, no clipping of controls|
|Accessibility|Defined baseline keyboard/focus/errors/labels/zoom plus §5 finite contrast pair/state records (C15/C16); extension scope truthfully separate; no color-only information|
|Input safety and robustness|C09–14 length/grammar/invalid transitions/repeat, fixed style/text sinks, no CSS injection/overflow|
|Privacy and permissions|C19 actual runtime no unexpected network/storage/permission behavior; selection stays manual|
|Performance and responsiveness|C22 recorded finite timing, bounded input, no duplicated handlers; observed normal interactions|
|Compatibility and lifecycle|C16–18/C20 named desktop baseline, dimensions and navigation/reset; explicit BFCache/unsupported limits|
|Completeness and maintainability|Fixed source/brief/spec, bilingual dictionaries, independent expected fixtures, build/run instructions, manifest/limitations/handoff|

Technical tests are future maker work; independent product scoring belongs to a nonauthor. Neither author nor reviewer may label all dimensions90 from case counts. Document completeness is a separate eight-section review and has no product numeric score.

## 7. Author document check and risks

Author checked eight sections, ten bounded numeric fields, eight radii/four side sums, zero-denominator treatment, canonical CSS and six manually derived examples. This is reasoning about requirements only; no product exists or was tested. Self-check must preserve NOT_RUN and request a different reviewer.

Risks: confusing physical/CSS pixels, requested/used values and shape-size dependence; tiny/zero radii appearing square; large boxes overflowing page; using getComputedStyle as proof of used-radius geometry; falsely carrying private-source review to sanitized public text. Mitigations: persistent notes, canonical labels, fixed preview sizing/outer scroller, explicit screenshot/geometry interpretation, new hash and affected review after edits. Native antialiasing is not evaluated by exact screenshot-byte equality. Shape has no inner scrollbar or unequal borders, avoiding out-of-scope browser shape adjustments.

A deliberate limitation is px-only: percentages and responsive units are not approximated. Another is no arbitrary CSS import and no automated copy/download. This keeps normal desktop validation attainable without added privileges. Border-radius shape exploration does not claim to replace the existing shadow editor.

## 8. Handoff and admission boundary

Proposed document set: BRIEF.md, SPEC.md, AUTHOR-CHECK.md and a separately authored INDEPENDENT-REVIEW.md. This is one specification publication candidate; no registry/spec ID is reserved, no ownership transferred and no ready inventory added. Independent review must be bound to the exact sanitized candidate hash and subsequently its confirmed public commit; prior private-source review is not automatically a review of changed public bytes. Corrections retain candidate identity and history.

Before public writing: refresh registered work, catalog, proposals and relevant existing-source inventory; resolve actual overlap; obtain authorization for the exact repository/branch/files; fix the brief, source and full rubric; have actual participants complete required acknowledgement, admission/claim and readback under the current coordination contract. Only formal readiness processing can increase ready stock. Product implementation needs its own authorized task/claim. This document set includes no product code, merge, deployment, workflow, catalog, account or permission change. Private operational provenance is excluded from the proposed public files.
