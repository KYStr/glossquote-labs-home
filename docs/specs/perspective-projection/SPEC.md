# CSS Perspective Projection Explorer
Complete specification v0.1. This is a document candidate for independent review, not a tested product.

## 1. Goal and scope
The user compares how a single tilted rectangle projects onto its parent's plane, understands rotation-origin versus perspective-origin, and obtains reproducible CSS. Success requires a coherent numeric table, unclipped schematic, actual CSS preview and explanatory clipping status, not just a plausible drawing.

The fixed [BRIEF](https://github.com/KYStr/glossquote-labs-home/blob/ab0762366146a6fb4532cd333d1f6bdccedbccfb/docs/specs/perspective-projection/BRIEF.md) governs scope. One HTML border-box rectangle 200×120 CSS px, zero border/padding, positioned at (0,0) in a same-size parent. The parent has perspective:500px. Child rotation origin O=(100,60,0), fixed order rotateX(a) rotateY(b), backface visible. Only four fields: a,b in [-60,60] degrees, and parent origin percentages ox,oy in [0,100], all at most one fractional digit. Defaults raw strings "20","-30","50","50".

No arbitrary dimensions, distance, Z translation, animation, dragging, multiple scene objects, WebGL, files, imported CSS/HTML, matrices, clipboard API, URLs, storage, accounts, telemetry, downloads or deployment. No 2D translate/scale/order comparison; that belongs to the existing Transform-Origin tool. Unknown unpublished local duplicates remain UNKNOWN, not zero. All existing ownership is preserved.

No eye-plane crossing renderer. All accepted points remain safely in front of the eye. Display-frame clipping is explicitly different from perspective clipping. A future extension to nonpositive w is a new scope, not a hidden fallback.

## 2. User flow and state
Two static routes: /index.html (Traditional Chinese) and /en/index.html (English). Each loads default raw values and immediately generates the default valid snapshot. A visible in-page language selector preserves raw strings, current validity and snapshot while changing all labels/messages; explicit links to the other static route navigate and reset defaults. Reset restores defaults and generates once without changing the current language. Three example buttons set and generate: Identity P01, X tilt P02, Origin corner P05. Defaults are P04.

Four labeled single-line text inputs, inputmode=decimal, ordered a,b,ox,oy. No type=number, spinners, range slider or implicit step buttons. Generate is a real submit button; Enter in a field submits the same form. Exact input.value is the retained raw source; every input event clears the generated snapshot, CSS selection area, table, SVG drawing and native preview, and marks the state dirty. Do not silently continue showing a valid old rectangle. Keep an explicit placeholder where each result had been so disappearance is explained.

Blur, in-page language change and rendering do not normalize raw. Generate validates all fields; failure preserves raw, displays all applicable field errors, marks aria-invalid and focuses the first invalid input. The global status reports the error count once. Success produces one immutable result snapshot and does not programmatically move focus: Enter stays in its input; clicking Generate stays on that button. If an edit or reset removes a currently focused result element, move focus to Generate before removing it. Otherwise edits, Reset and example buttons preserve their initiating control's focus.

Generated output includes original and transformed vertex IDs P0..P3, rotation origin, perspective origin, per-corner X,Y,Z,w and projected x,y, unclipped AABB, per-corner outside-display-frame status, unrounded-model versus formatted-value notice, schematic, native CSS preview and readonly selectable CSS textarea. AABB is of the whole projected quadrilateral, not its visible fragment. If corners lie outside the frame, warn without calling the calculation invalid. Never infer that all corners outside means the polygon is invisible.

Manual CSS selection uses ordinary browser text selection only. No automatic selection/copy command, clipboard read/write or permission prompt. Textarea has a label and is readonly, not disabled. Static code/help remains legible without opening developer tools.

On normal navigation/reload, defaults load; no state in URL, session/history storage or cookies. On pageshow with persisted=true, explicitly reset to defaults and regenerate once, so back/forward cache does not revive stale mismatched raw/output. A plain page reload and a BFCache restoration must be distinguished in future evidence. No timers or requestAnimationFrame loops when idle. Language toggling cannot attach another set of handlers.

## 3. Input and output contracts
The pure parser receives exactly four own string properties {a,b,ox,oy}; arrays, null, unknown/missing properties and nonstrings reject as schema errors with no result. No accessors or arbitrary object execution at the UI boundary: construct this plain object from known raw fields. Pure fixtures may test invalid plain-data structures, not execute user-defined getters.

Each raw length is at most 24 UTF-16 code units before trimming; reject overlong instead of truncating. No maxlength attribute that hides pasted-overlong evidence. The HTML single-line control can remove CR/LF; promise to preserve input.value, not characters the control never retained. Pure parser rejects interior CR/LF. Trim only ASCII whitespace U+0009/U+000A/U+000C/U+000D/U+0020 at the edges of a copy. Match the full remaining string to [+-]?[0-9]+(?:\.[0-9])?. A trailing dot, .5, two decimals including .00, exponent, comma, hex, Unicode digit/minus, units, calc, NaN and Infinity are invalid. Leading zeros, plus sign, signed zero and edge ASCII whitespace are allowed within raw length. Test syntax before numerical bounds. Error precedence per field: length, empty, syntax/precision, range. Pure schema error is separate; UI cannot submit a schema-invalid form but must fail closed if internal state is corrupt.

Convert accepted values to signed integer tenths by decimal digit processing. a/b integer tenths range -600..600; ox/oy 0..1000. Signed zero becomes integer0 only in parsed output; raw is unchanged. Canonical decimal serializer emits integer digits or one fractional digit as needed, no plus, leading zeros, trailing .0, exponent, locale punctuation or negative zero. CSS uses this serializer, never values rounded from the projection.

P0=(0,0), P1=(200,0), P2=(200,120), P3=(0,120). IDs never reorder after rotation. O=(100,60,0). Parent origin Q=(2*ox,1.2*oy,0) CSS px when ox/oy are percentages, preserving calculation precision. Per-corner X,Y,Z are after the child rotation about O but before perspective. w=1-Z/500. Projected x,y refer to parent's top-left, not the outer display frame or screen.

Return full-precision IEEE754 numbers for calculations; require finite values and w>0.766 for the validated domain. An invariant failure is a distinct internal-model error with no partial output, not a reason to clamp w or invent a point. Trig in radians; exact a/b=0 uses sin0=0 and cos0=1. No other angle snapping. Float error checks compare raw results with independently derived values, never display strings.

Displayed X,Y,Z,w,x,y,AABB use six decimal places rounded to nearest, ties away from zero, then trim trailing zeros and the decimal point. Define rendering for the stored finite binary number v: sign(v)*floor(abs(v)*1000000+0.5)/1000000 using JS Number operations, then fixed six decimals and trimming; normalize a rounded zero to "0". This is a display convention for stored values, not a promise of exact-real trigonometric rounding. CSS input serialization is independent. Example display fixtures: 0.0000004→"0", 0.0000005→"0.000001", -0.0000005→"-0.000001", 1.25→"1.25". Numeric model tolerance is 1e-6 CSS px for X/Y/Z/projected coordinates and 1e-9 for w against the printed expected examples.

The preview window in model coordinates is [-10,-10] to [210,130], inclusive boundaries. Corner outside iff raw x<-10 or x>210 or y<-10 or y>130; equality is inside. No rounding before classification. Display that this is a corner classification, not polygon visibility or an eye-plane test. AABB=min/max of all four raw projected coordinates.

CSS output is the following fixed structure with canonical substitutions, LF line endings, two-space indentation and one final LF; preserve zero functions and both origins. Outer frame and stage-position CSS are also included so this is reproducible, but the mathematical outputs stay parent-relative.
```css
.preview-frame {
  position: relative;
  width: 220px;
  height: 140px;
  padding: 0;
  border: 0;
  overflow: hidden;
}
.perspective-parent {
  position: absolute;
  left: 10px;
  top: 10px;
  width: 200px;
  height: 120px;
  padding: 0;
  border: 0;
  perspective: 500px;
  perspective-origin: <ox>% <oy>%;
}
.projected-rectangle {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  width: 200px;
  height: 120px;
  padding: 0;
  border: 0;
  transform-box: border-box;
  transform-origin: 50% 50% 0px;
  transform: rotateX(<a>deg) rotateY(<b>deg);
  backface-visibility: visible;
}
```
Provide adjacent fixed markup instructions: frame contains parent contains rectangle; background and corner labels are presentation rules, not user-injected CSS. No perspective() function on the child, no second perspective, no extra wrapper transform or translateZ. The output is a canonical application snippet, not CSSOM serialization.

## 4. Implementation and security design
Separate strict parser, rotation/projection core, formatter/serializer, bilingual state machine and DOM view. Future implementation uses the existing Node24+ zero-runtime-dependency baseline; the following interfaces are requirements to build, not claims that this product already exists.

With column vectors and degrees converted to radians, let u=x-100, v=y-60, ca=cos(a), sa=sin(a), cb=cos(b), sb=sin(b).
- X=100+cb*u.
- Y=60+ca*v+sa*sb*u.
- Z=sa*v-ca*sb*u.
- w=1-Z/500.
- projected x=Qx+(X-Qx)/w; projected y=Qy+(Y-Qy)/w.

This is Ry first, then Rx, because the CSS function list is rotateX(a) rotateY(b). Equivalent composition is T(Q)*P(500)*T(-Q)*T(O)*Rx(a)*Ry(b)*T(-O); P has row4,column3=-1/500 and otherwise identity. A general matrix engine is not required in the product. The author verification uses a separate explicit 4×4 multiplication route, and a nonauthor must challenge the signs/order independently.

Safety proof: each centered vertex has norm sqrt(13600)=116.619037896906..., rotations preserve norm, so |Z|<=sqrt(13600), hence w>=1-sqrt(13600)/500=0.766761924206188...>0.766. Q does not affect Z or w. Convex combinations inside the rectangle have no larger norm; the same positive-w guarantee applies throughout the face, not just four samples. No near-eye clipping algorithm is needed or advertised. The parent projection is finite and edges remain straight in this domain.

The SVG schematic is explanatory, not a CSS renderer. Draw baseline rectangle dashed, projected quadrilateral solid, original fixed vertex IDs, O as cross, Q as diamond and the display-window boundary dotted. Where O/Q coincide, use a combined symbol with both text labels. No color-only encoding. Its viewBox is the min/max union of baseline vertices, projected vertices, O,Q and window corners, plus20px on every side; preserve aspect ratio xMidYMid meet. SVG width100%, maximum560 CSS px, height auto with aspect-ratio from the viewBox, and a minimum visible drawing height180px. Diagram fit does not change model, CSS, outside status or table. Do not apply clipping to this schematic: it is deliberately the full projection alongside the clipped native preview.

Actual native preview uses exactly the hierarchy and dimensions in §3; no scale-to-fit at desktop or 320px (220px frame fits). Outline may mark the frame without altering its layout border. Background color and four corner markers/labels identify the face; labels may be clipped by the outer frame, so the full corner table remains the accessible equivalent. No preserve-3d hierarchy is required for a single leaf plane. Do not add opacity/filter/contain/transform to intermediate ancestors to "improve" rendering. Markers used in native measurement must be on the rectangle's local plane; zero-sized absolute marker anchors at (0,0),(200,0),(200,120),(0,120) have no own transform. Decorative marker ink can be a pseudo-element; measure the zero-sized anchor itself, not the ink box.

Use textContent/readonly value for all generated text, explicit numeric SVG attributes for schematic and only individual CSSStyleDeclaration setters for validated native properties perspectiveOrigin and transform. Static dimensions/order/property names cannot come from input. No innerHTML, eval, new Function, injected style text, style attribute string, cssText, arbitrary custom properties, data URLs, SVG foreignObject, external font/image or remote library.

Deployment/preview header contract: Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; img-src 'none'; connect-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'". No inline script/style block or inline HTML event handler. DOM individual style-property writes are the only dynamic CSS path; future native evidence must show they work under the actual emitted header without CSP violations, including both transform and perspectiveOrigin. If a targeted browser blocks that path, report a required compatibility failure and repair within reviewed scope, not loosen CSP silently. No network exception or credential may be introduced.

Static runtime allowlist: /index.html, /en/index.html, /assets/app.js, /assets/core.js, /assets/styles.css. Any favicon request must be prevented without adding an external/data URL resource, or handled as an expected local404 with no UI failure. Native evidence records all requests, including navigation, rather than asserting zero requests: page/static resource loads are expected; input-bearing requests are forbidden.

Future repository must provide package.json commands npm test, npm run check, npm run build, npm run preview using Node24 built-ins with no dependency installation. npm test runs finite node:test parser/model/serializer/state fixtures; check verifies bilingual keys, five runtime artifacts, dangerous sinks/CSP configuration and references; build deterministically writes dist containing exactly the five runtime files. preview serves dist on127.0.0.1:4180 only, GET/HEAD allowlisted paths, no traversal/redirect/fallback to arbitrary files, correct HTML/JS/CSS content types, CSP and X-Content-Type-Options:nosniff. Server implementation files and tests are source, not runtime assets. Reject other methods405 and unknown paths404. Record two clean builds' per-file SHA256 equality; artifacts are not claimed reproducible until run. No new Actions workflow or deployment in this specification work.

Baseline source: [README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md). Adopt the baseline's static bilingual/zero-service direction; the exact commands above are this future tool's explicit required interface, not unverified existing script names.

## 5. Expected cases and finite tests
The fixed literal table below gives [projected x,projected y,w] in P0..P3 order; inputs are [a,b,ox,oy]. Six or more decimals in these literals are comparison targets with the §3 tolerances, not canonical CSS text. Full XYZ comes from the stated equations and independently checked signs/order; the future test suite must also compare full XYZ, AABB and outside flags rather than checking only a picture.

P01 [0,0,50,50]: [[0,0,1],[200,0,1],[200,120,1],[0,120,1]].
P02 [30,0,50,50]: [[5.660377358491,10.979694125409,1.06],[194.339622641509,10.979694125409,1.06],[206.382978723404,115.278217262837,0.94],[-6.382978723404,115.278217262837,0.94]].
P03 [0,30,50,50]: [[3.774955135062,-6.666666666667,0.9],[178.729582162222,5.454545454545,1.1],[178.729582162222,114.545454545455,1.1],[3.774955135062,126.666666666667,0.9]].
P04 default [20,-30,50,50]: [[23.698987455743,25.391941952642,1.135011679278],[191.442292403934,-17.589111269962,0.947073155120],[200.119895614457,105.411653706571,0.864988320722],[17.750657797737,129.788860233540,1.052926844880]].
P05 [20,-30,0,0]: [[11.803807719479,18.254834110883,1.135011679278],[197.030756673389,-14.236032708289,0.947073155120],[215.728392982945,114.776752127664,0.864988320722],[12.724017520029,126.772876066915,1.052926844880]].
P06 [20,-30,100,100]: [[35.594167192007,32.529049794400,1.135011679278],[185.853828134479,-20.942189831635,0.947073155120],[184.511398245969,96.046555285479,0.864988320722],[22.777298075445,132.804844400164,1.052926844880]].
P07 [60,60,0,100]: [[49.148719211979,-42.190773399531,1.017320508076],[125.994771894898,107.400522810510,1.190525588833],[152.643869372165,165.793160811649,0.982679491924],[61.768475087298,-9.713797683325,0.809474411167]].
P08 [-60,-60,100,0]: [[47.356130627835,-45.793160811649,0.982679491924],[138.231524912702,129.713797683325,0.809474411167],[150.851280788021,162.190773399531,1.017320508076],[74.005228105102,12.599477189490,1.190525588833]].
P09 [-0.1,0.1,0.1,99.9]: [[0.000040630454,-0.066594716045,0.999441495455],[199.971954384843,0.016522794510,1.000139625738],[199.888320856461,119.999537235597,1.000558504545],[0.000124400893,120.000230019113,0.999860374262]].
P10 [0,0,0,100]: identical projected XYW to P01; O=(100,60), Q=(0,120), demonstrating that perspective origin alone does not move a z=0 identity rectangle.

P02 derivation: top row centered v=-60 gives Z=-30,w=1.06,Y=60-30sqrt(3); bottom row Z30,w0.94,Y=60+30sqrt(3). X before projection stays0/200. P03 left column u=-100 gives Z50,w0.9,X=100-50sqrt(3); right column Z-50,w1.1,X=100+50sqrt(3), Y remains0/120. These radical cases are independent of the default numeric calculation.

P04 AABB=[17.750657797737,-17.589111269962,200.119895614457,129.788860233540]; only P1 outside the display frame. P05 outside P1 and P2; P06 outside P1 and P3; P07 and P08 outside P0 and P2. P01/P02/P03/P09/P10 all corners inside. Classify with unrounded values. Pure classification fixtures at (-10,-10),(210,130) are inside; x=-10.000001 or y=130.000001 outside, regardless of six-place formatting.

Finite implementation checks (all currently NOT_RUN):
- T01: P01–P10 independent literals, full modelXYZ, safe-w proof/invariant, positive and negative angle signs, exact-zero path and origin invariance. Matrix route must not simply import the scalar function under test.
- T02: Every field low/high valid bound; -60.1/60.1 angles and -0.1/100.1 origins invalid; length24/25, empty, onlywhitespace, "-", "+", ".5", "1.", "1.00", "1e2", "0x10", "1,2", "12px", fullwidth digits, Unicode minus, newline interior and injection strings. "+" and leading zero valid only with digits. Raw "+0001.0","-0.0"," 20 " retain exactly while CSS1/0/20 canonical.
- T03: Schema arrays/null/unknown/missing/nonstring; invalid/internal error never returns partial result. Very long pasted raw is visibly rejected, not truncated. Toggle language/blur retains unfinished "-", no number sanitization.
- T04: Default exact CSS using §3 structure; P01 zero functions retained; negative zero canonical0; raw formatting never enters CSS. Display tie fixtures and negativezero. Language never changes decimal separator or numbers.
- T05: Edit→dirty clears all four result forms; invalid→error first focus; fix→Generate recovers; Enter and click success focus; Reset/example generation and focus; language state; repeated20 actions no duplicate listeners or stale snapshot.
- T06: Whole schematic/table versus clipped native frame. Check P04/P05/P07 outward corners using actual screenshot and unclipped table; window is not an eye-plane mask, no coordinate clamping or all-corners-outside inference. O/Q marker labels and IDs stable, including coincidence.
- T07: Independent native geometry on actual desktop at100% browser zoom and unscaled220×140 frame. For each P01–P08 use the four zero-sized local-plane anchors. Record DOM hierarchy, computed used dimensions, perspective/origin, transform/origin, parent bounding rect and each marker rect, page scroll, devicePixelRatio and browser version. Subtract untransformed parent rect left/top from anchor rect left/top. Absolute per-axis difference from independent projected expected <=0.5 CSS px. Marker rect width/height should be0 within0.01px; if unavailable/nonfinite, record NOT_RUN rather than using AABB as four corners. No DPR multiplication of CSS-pixel positions. Clipping does not turn layout geometry into clipped coordinates. Screenshots corroborate appearance but cannot alone prove this geometry. Compare computed style as diagnostic only, not the expected oracle.
- T08: Native rendering under emitted CSP, including both individual style writes, no violations; actual network/storage trace through default/edit/error/Generate/Reset/language/navigation. Expected five static asset paths and same-origin page navigation only; no input values in requests, storage, URL or logs. Confirm no permissions prompt or clipboard call. Adversarial grammar fixtures cannot create DOM or style property names.
- T09: Two fresh builds and command exit results/artifact hashes; source/runtime allowlist, header and server path/method/content-type checks; expected CSS remains selectable without clipboard. Node and OS versions recorded.
- T10: Traditional Chinese and English full flows at1280×900 and320×800 CSS px,100%zoom, plus1280×900 at200%zoom. All inputs/buttons/help/CSS reachable without page-level horizontal scroll; table may use a labeled local horizontal scroll region, keyboard accessible. Native frame remains220px model width; diagram responsive. Full keyboard order/focus, firsterror association, status announcements, contrast rules below, translations and exact numbers checked.
- T11: Reload/normal navigation/BFCache persistence behavior; record pageshow.persisted observation. A normal back navigation that misses BFCache proves reload only. If no BFCache restoration can be obtained in the available browser, required lifecycle evidence remains NOT_RUN with the specific missing observation, not assumed PASS.
- T12:20 finite Generate actions cycling defaults,P02,P05,P07, with performance.now at submit entry and a single subsequent requestAnimationFrame after DOM commit. Record all20 handler-to-frame durations and browser/OS/viewport; each <=100ms in an otherwise idle visible foreground page. If tab visibility/background throttling invalidates the environment, label that sample invalid and obtain a valid observed run, not silently discard a true slow sample. No claim about FPS, mobile or unlimited workloads. Source shows only four-corner bounded work; this is not a substitute for measured responsiveness.

## 6. Nine required acceptance aspects
All IDs and obligations are those fixed in the task and BRIEF. A different reviewer scores the same future product candidate; every necessary aspect >=90, no average, no untested-as-pass. At this document stage every product score=null.

| ID | Evidence required |
| --- | --- |
| functionality | T01/T04/T06/T07: signs/order/origins/projection, coherent table/schematic/CSS/native preview and correct unclipped AABB. |
| boundaries | T01–T05: grammar/precision/limits, safe-w proof, finite/error behavior, formatting, raw preservation, display classification and stale-state prevention. |
| privacy | T08/T11: actual requests/storage/URL/permission observations; synthetic numeric inputs stay in memory, lifecycle resets as specified. |
| security | T02/T03/T08/T09: closed schemas, sink/source review, bounded computations, CSP headers enforced with actual dynamic preview, allowlisted assets/server routes. |
| usability | Independent desktop user completes default→tilt→origin change→repair invalid input→manually select CSS; explains O versus Q,500px fixed distance and clipped versus whole projection using page help. Record concrete confusion/fixes, not mere task completion count. |
| accessibility | T05/T06/T10: full keyboard/focus/labels/error descriptions/live status, non-color corner labels/table, finite contrast, zoom/reflow and accessible local scroll region. |
| localization-seo | Both static routes and in-page languages contain complete labels/help/status/errors, matching numeric/CSS output, lang/h1/title/description, working same-language links. Preview pages use noindex until a separately authorized production origin is supplied; do not invent canonical URLs. |
| toolchain-provenance | T01/T09 plus fixed sources/commands/artifact manifests/independent literals, documented modules and limitations; no new dependency, hidden service or unverifiable test result. |
| compatibility | T07/T10/T11/T12: named normal desktop engine, corner observations, clipping/selection/focus/navigation, viewport/zoom and finite latency; unsupported devices/extensions explicitly untested. |

Finite accessibility criteria: normal and large text both at least4.5:1 against actual composited background; nontext input borders, essential diagram lines/markers and focus indicator at least3:1 against adjacent background. Measure actual computed foreground/background including error/disabled/hover/focus and native face-label states, not palette tokens alone; decorative lines may be exempt only if no information depends on them. Focus visible at least2 CSS px outline with2px offset, never clipped for form controls. Actual geometry text has table equivalence if label ink in preview clips. Programmatic labels and aria-describedby reference units/ranges/errors; failed fields aria-invalid true, successful/dirty fields false, errors not left attached from prior snapshot. Announce Generate result/error once through polite status, not every keystroke. SVG has title/description and is not the sole source of data. No requirement to acquire a phone or certify all assistive technologies; unavailable extensions are recorded, not silently made required.

## 7. Author checks and limitations
Author-only arithmetic compares explicitly multiplied 4×4 matrices against the expanded formulas for ten fixed cases, with two radical identities and identity/origin checks. This is reviewable documentation arithmetic, not product code or native validation. No GUI, build, CSP, accessibility, lifecycle, network, latency or browser geometry test has run. Each T01–T12 implementation check remains NOT_RUN even where a document expectation was derived. No numeric quality score is issued.

Official source: [W3C CSS Transforms Level2 Working Draft dated9 November2021](https://www.w3.org/TR/2021/WD-css-transforms-2-20211109/), especially §4.1.1,4.2,6,8,9; read2026-11-01. Parent perspective and positive-w division inform this model. Nonpositive-w special behavior is deliberately excluded, not approximated. All UI bounds,500pxdistance,display-frame,rounding,tolerances and finite tests are application decisions. Official prose is not runtime proof. CSS support and geometry must still be tested in the selected browser; browser measurements cannot be used to generate their own expected numbers.

Principal review risks: rotation sign/order; confusing child and parent origin; using viewport/DPR coordinates as model values; measuring decorative anchor ink instead of projected zero-sized points; frame clipping accidentally contaminating numeric bounds; CSP incompatible with actual style updates; BFCache assumptions and duplicate handlers. A reviewer should reject unexplained mismatches instead of raising a tolerance until values pass.

## 8. Handoff and gates
This candidate consists of fixed BRIEF, SPEC, AUTHOR-CHECK and a later independently authored INDEPENDENT-REVIEW. The original specification writer retains the task claim. Independent reviewer reads all eight sections, challenges expected cases and scope boundaries, and returns any defect to that author. Revisions preserve stable aspect IDs and get affected review at the changed fixed commit. Only a nonauthor can mark document ready after exact remote binding; this is not product acceptance.

Product implementation is a separate task, allowed executor and valid atomic claim, with current owner/local-overlap checks. Do not treat this cloud specification claim as cloud product permission. Future handoff supplies fixed source/document commit, exact commands/artifact paths, expected fixtures, runtime/browser details, all NOT_RUN gaps, actual screenshots/measurements and same-candidate independent results. Submit requires a real matching open PR under the core protocol; no PR number is invented here. Public preservation, document readiness, task submission, accepted, merged and deployed are distinct states.

No private operational receipts, message identifiers, credentials, user data or unpublished coordination notes are part of the public document packet. Public files may contain technical version/source references and honest limitations only. Unknown unpublished local overlap remains a product-admission prerequisite, not a fabricated zero. This work adds no deployment, workflow, fee, permission or owner transfer.
