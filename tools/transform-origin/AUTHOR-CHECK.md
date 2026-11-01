# Author self-check — Transform Origin r2 label correction
Observed 2026-11-01 05:43–05:51 UTC. Implementation-author self-check; not independent review.

Fixed specification: 9dad1e10e9158df9d405460b0370cbc45e6679d6. This is author evidence only, not independent quality acceptance. All eight quality scores remain null.

## Executed
- Node v24.22.1: 29/29 tests pass. Fourteen fixed Appendix A cases / 56 vertices meet absolute 1e-6 mathematical tolerance; exact default CSS including LF passes. Seven-field full-string grammar, precision, bounds, raw preservation and invalid→valid recovery; malformed order/selector; negative-zero display and half-away rounding; origin invariance and bounded diagrams.
- Syntax checks and static build pass. No npm dependencies/install. Static source checks find no unsafe HTML insertion, storage or outbound-data APIs. These checks do not establish full runtime privacy.
- Normal cloud Chromium 155.0.8059.79 on Debian GNU/Linux 13, local preview: initial Chinese A=TRS/B=RTS geometry/results; raw +0010.0 survives English switch with normalized CSS10px; '-' survives Chinese switch with cleared geometry/CSS; ' 10.0 ' restores results without rewriting raw. 1.00 produces precision error and clears CSS. B SRT retained across hiding/reopening. Zero sx renders explicit degenerate/invisible-real-CSS warning and mathematical lines only.
- Normal native 200% zoom verified by browser zoom popup. Actual document width 582 CSS px, scrollWidth582; no document horizontal overflow in sampled Chinese error/English order views. Visible focus outline; Tab tx→ty and A→B works. These are NOT 320/768/1440 checks.
- At normal zoom, observed tab sequence: tx,ty,angle,sx,sy,originX,originY,example,reset,order-a,order-b,show-b,A table,A CSS,A copy,B table,B CSS (then B copy). Clipboard buttons were only focused, never activated. Reset restored all seven defaults/TRS/RTS/showB while retaining English.
- Native actual CSS fixture used zero-sized corner markers relative to an untransformed reference, not computedStyle or AABB as a four-vertex oracle. Thirteen cases read exactly as expected (including singular mathematical coordinates, NOT visibility). The 45-degree case read (0,0),(141.42138671875,141.421875),(70.710693359375,212.1328125),(-70.710693359375,70.7109375). Maximum deviation from fixed expectation ≈0.000778144 CSS px in this long-page layout. Mathematical implementation still meets1e-6; this native measurement must NOT be reported as meeting1e-6 or used to relax the fixed criterion. Browser numeric/layout precision and fixture offset are unresolved measurement limitations, not silently discarded observations.
- Fixed author-observed presentation issues: SVG label clipping at upper edge; legend unintended full border; stale aggregate language text during debounce; grammatical singular decimal description. Rebuilt and continued normal UI checks.

## NOT_RUN / not established
- Independent quality scores: math, validation, css-output, visualization, interaction-a11y, responsive-compatibility, privacy-reliability, maintainability-performance all null.
- Firefox GUI: no supported Firefox surface established in this environment; not installed/launched as workaround.
- 320/768/1440 CSS px: NOT_RUN. Normal Chromium DevTools responsive entry showed “DevTools not allowed on this page / Your organization has blocked the use of DevTools on this page.” Stopped that path; no policy changes or alternate interface bypass. Other actual widths are not substitutes.
- Complete keyboard/AT/screen-reader announcement matrix, all error/order/result combinations and exhaustive contrast evaluation NOT_RUN. Sampled focus/order/zoom is not comprehensive accessibility acceptance.
- Native clipboard success/refusal and asynchronous lifecycle NOT_RUN; no clipboard data read/write or permissions granted.
- Full runtime Network/Storage audit NOT_RUN. Source/CSP evidence is not equivalent.
- Hardware-qualified UI-to-paint latency NOT_RUN; test execution times are not product latency and no performance score is inferred.
- Independent review, deployment, catalog and live-site verification NOT_RUN. Source availability does not establish acceptance or deployment.

Required gaps restrict acceptance; they do not erase author work already performed. No averages, test counts or sampled UI observations are converted to quality scores.

## R2 affected correction — 2026-11-01 06:13–06:16 UTC
Independent normal-UI review of r1 identified overlapping vertex IDs when sx=0 and near-touching labels for mirrored B=SRT, sx=-2, plus default origin proximity. R2 changes diagram annotation only: per-panel coincident IDs are grouped with slash separators, label rectangles use bounded collision-avoidance placement and leader lines, and display padding keeps annotations inside the diagram. Coordinates, core matrices, CSS generation, table values and the mathematical oracle are unchanged. Slash groups identify vertices sharing a diagram position; they do not rename vertices.

Executed affected author checks: four new label cases (default, sx=0, mirrored B=SRT/sx=-2, and both scales zero) preserve all four IDs in each panel, leave input geometry unchanged, keep label rectangles in bounds and avoid rectangle overlaps in these cases. Three existing source-safety/semantics/explicit-copy checks rerun because app rendering changed; all pass. Syntax and static build pass. Unchanged mathematical cases were not rerun.

Normal Chromium page observations: default O and A/B labels separately legible; sx=0 shows A·P0/P1 and A·P2/P3 plus corresponding B groups; mirrored B=SRT/sx=-2 shows separate B P0/P3 and P1/P2 with lower diagram margin; both scales zero shows all P0/P1/P2/P3 in each panel group. No clipboard action, responsive DevTools, native numeric fixture or Firefox was attempted. These are affected author observations, not independent review, exhaustive annotation guarantees or scores. Original NOT_RUN items and native 45-degree residual above remain unchanged.
