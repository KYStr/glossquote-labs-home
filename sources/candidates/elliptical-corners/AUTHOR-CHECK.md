# Author check — elliptical-corners-20261101-r1

2026-11-01, Node v24.22.1 / Linux, zero dependencies. Author checks are not independent quality acceptance. All nine independent aspect scores remain null.

## Batch evidence
At 08:11 UTC: 16 tests passed, 0 failed/skipped, 110.037482 ms. C01–12/C21 independent expected fixtures cover defaults/exact LF, all80, asymmetric resize, allzero/one-axis-zero, 5/6 no premature rounding, equality ±0.01, bounds, grammar, 64/65 raw, canonical CSS, 1/32 half-away tie, closed shape/getter/large input. State fixtures cover revoke/selection, repeated generation, language/raw/errors/model preservation, examples/reset, lifecycle erasure and composition guard.
Initial static checker falsely matched the English explanatory word “clipboard”; the check was corrected to the actual `navigator.clipboard` sink. No runtime change. Then syntax/static source/fallback/dependency and two clean exact builds passed, followed by final build. Both original failure log and corrected check/build log retained. No tests silently skipped or fabricated.

## Normal cloud browser observations, 08:12–08:13 UTC
Actual Chromium Linux normal window; CSS viewport 1180×757, not the specified 1280×800 baseline. No DevTools or injected test actions.
- Initial defaults show no fake result, selection disabled. Default Generate retains button focus; f1/1.0000, correct table and original CSS. Readonly DOM: shape 240×160, border/padding 0, border-box, no children, requested radius24px/16px.
- Overlap intentionally clears output and keeps example focus; Generate f5/8, all50, allfour limiting sides; native shape100×100. English toggle preserves all raw/CSS/result and retains toggle focus, translating labels/table/explanation/page lang.
- Select CSS selects exactly 58 characters (0..58), feedback says selected, not copied. No OS clipboard read/write. Edit W to '-' clears result, Generate focuses W with associated error and error-summary link. Toggle translates error and preserves raw '-'. Reset restores defaults/focusW.
- W/H640 gives actual640×640 shape; outer document1165 versus viewport1180, preview client552/scroll672 (internal overflow only). Normal browser zoom bubble explicitly showed200%; resulting viewport590×378, outer582, frame502/scroll672, shape still640×640. Controls visible/reachable. Restored100%.
- Keyboard after Reset W: H, TLx, TLy, TRx, TRy, BRx, BRy, BLx, BLy, Generate, Reset, Default, Overlap. Visible focus outline captured; this is not exhaustive contrast certification.
- Asymmetric120×80 C03 inputs: f4/5/top, table72/8,48/24,24/40,16/8, original CSS90/60/30/20 slash10/30/50/10. Native borderbox120×80; screenshot visibly showed asymmetric shape in English. CSSOM values are not claimed used-radius values.
- Allzero on same120×80: f1, four square notes, requested computed radius0px, borderbox120×80. This is an additional zero case, not falsely called exact C05 W100/H100 screenshot coverage. Reload restored Chinese route defaults/noresult.

## Required evidence still NOT_RUN / partial
Exact1280×800 and320×800 baseline, full C17 five native scenario screenshot matrix (default/overlap geometry observed but not complete shape screenshot evidence; C06 not browser-run), full finite text/boundary/focus contrast matrix in both languages and all states, actual C19 network/storage observation, C20 actual JS-disabled/capability-failure observation, C22 20 handler-entry→next-rAF durations, Back/Forward/BFCache proof, native IME, selection-failure browser state. Unit state fixtures are not browser lifecycle proof. Actual200% was from1180×757, not the required1280×800. No Firefox/mobile/AT certification; screen-reader is a separately untested extension, not a new mandatory gate.

No public release, merge, deployment or acceptance. Remaining required gaps must remain explicit for nonauthor review.
