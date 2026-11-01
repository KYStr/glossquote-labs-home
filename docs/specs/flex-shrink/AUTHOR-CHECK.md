# Flex Shrink — author document check v0.2

Document arithmetic only; no product implementation or browser execution. Not an independent review or readiness decision.

|Case|Exact model widths|Residual|
|---|---|---|
|equal|80, 80, 80|0|
|weighted|50, 100, 150|0|
|unequal-shrink|100, 125, 75|0|
|freeze-min|95, 145/2, 145/2|0|
|min-above-basis|80, 80, 80|0|
|fractional-sum|85, 85, 85|-105|
|fractional-after-freeze|90, 40, 40|-20|
|all-zero-shrink|100, 100, 100|-150|
|zero-basis|0, 50, 50|0|
|infeasible-minima|50, 50, 50|-50|
|positive-free|100, 100, 100|100|
|exact-fit|100, 100, 100|0|

## Worked checks

F04: first request removes20 from each100; item1 clamps80→95, violation+15 and freezes. Recompute against original active bases: R=240−95−200=−55; each remaining item becomes100−55/2=145/2.

F07: initial F0=−150; first round widths50,50,50, then item1 clamps90 and freezes. Remaining raw R=150−90−200=−140. Active factor sum0.8 gives original F0×0.8=−120, whose magnitude is smaller; remaining targets40,40, residual−20. Do not replace F0 with the latest R.

F13: item1 basis0/min50 freezes at50 before loop; other bases/minima0 give weighted sum0. Their width contribution stays0, overflow10 remains. F14 is positive-space no-growth with all0. These zero-weight cases need future native comparison, not assumed product PASS.

F15: shrink0.25 on item1 only, initial deficit0.01 gives request0.0025; width9.9975, residual−0.0075. Two-place display10.00 does not turn exact overflow into exact fit. Half-away ties1/8→0.13 and−1/8→−0.13; calculations never use formatted output.

## Coverage

Eight sections are present: goal/distinct bounded scope; interaction and accessibility; numeric I/O; official-subset implementation; cases and desktop evidence; original nine-aspect contract; author risks/checks; immutable delivery and separate readiness/production gates. Native geometry, contrast, keyboard flow, privacy, security, compatibility and performance tests are NOT_RUN. All nine product scores null. The author does not award independent document PASS,90 or ready.

## Affected document corrections F1–F3

F1: no-growth now defines F0=C−sum(H), all reasons grow-zero, empty rounds. New F11b C400/B100×3/M150,0,0 gives H150,100,100, F0/residual50 and no rounds; M>B does not turn a grow-zero explanation into a shrink round. Existing shrink arithmetic is unchanged.

F2: fixed type=text/inputmode=decimal raw input.value snapshots, no coercion/blur rewrites/maxlength, app-owned novalidate submission and composition-aware Enter. Single-line CR/LF sanitization is explicitly not clipboard-byte preservation; pure parser and UI checks are distinct. F17/F19 cover the boundary.

F3: fixed future command/script interface, deterministic build trees/checks and static file allowlist with exact README/package baseline references. These are future implementation requirements, not already-existing Flex commands or executed tests. Exact CSP denies connections/inline attributes; known individual style-property setters must be observed working under it, without loosening policy. No product, workflow, deployment or new dependency was introduced. All product evidence remains NOT_RUN and scores null; original nonauthor must close these findings against the revised fixed candidate.
