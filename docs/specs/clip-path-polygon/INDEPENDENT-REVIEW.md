# Clip-path Polygon — independent document completeness review
2026-11-01. Independent nonauthor document review; public technical edition.
Verdict: PASS for eight-area specification completeness on the exact three-document candidate below. No blocking document defect found. This is not product acceptance, a quality score, a registry ready transition, a PR, or authorization to implement/deploy.

## Identity and fixed candidate
I did not contribute to the BRIEF, SPEC, or AUTHOR-CHECK. The original brief contributor and continuing author are explicitly excluded as independent reviewers. Original authorship remains unchanged.
Repository KYStr/glossquote-labs-home, commit 62e336cfd3b44c1d2fa8219796e8f0b2bd8dd0e8, docs/specs/clip-path-polygon/:
- BRIEF.md: 7746 bytes; SHA256 50b0f73c6ca2b79db920799716a1ee9309252b88963c423b7dc41574545fd600.
- SPEC.md: 38710 bytes; SHA256 3d3affb83352737d97b474f1716c29b1a1efd68e1053bf4ed7b2593f4bf0d0d3.
- AUTHOR-CHECK.md: 3976 bytes; SHA256 113fa97787884f5518edfe4b8b4f2c0039f134d1079ece3b829a16f65915f1e9.
All three were fetched in full from the fixed commit and read. Exact lengths and hashes were verified.

## Eight completeness areas
1. **goal — true:** §1 gives a concrete frontend-learning/repair/manual-CSS task; distinguishes native paint, diagram, and layout bounds.
2. **scope — true:** 3–12 single-ring ordered vertices, 0–100 two-decimal coordinates, 40–800 integer dimensions, two fixed patterns, nonzero fill, no automatic repair. Exclusions and unknown local duplicate production gate are explicit.
3. **userFlow — true:** §2 specifies load, selected-row insert/delete, dirty/error/generated/reset, language/focus/IME/Enter, manual selection, BFCache and capability failure. Numeric edits invalidate old outputs even if numerically equivalent; selection-only/failed count actions preserve results. Focus destinations are deterministic.
4. **inputsOutputs — true:** §3 gives exact raw-length and trim boundary, ASCII grammar, negative-zero/leading-zero/precision rejection, q units, exact fractions, half-away three-decimal display, canonical CSS and terminal LF. Layout box and polygon bounds are separate. Exact tiny positive area remains available when rounded display is zero.
5. **implementation — true:** §4 orders duplicate→zero-area→adjacent-overlap→nonadjacent classification; wrap adjacency is explicit. BigInt predicates and bounded pairs avoid epsilon and unsafe Number products. Pure layers, atomic outputs, safe sinks, HTTP CSP, fixed artifacts and future built-in-only command interfaces are implementable contracts, not claims of existing scripts.
6. **acceptance — true:** §6 preserves all nine fixed BRIEF IDs and full directions, with concrete test links. No aspect was removed to fit registry labels. Product scores remain null.
7. **tests — true:** §5 P01–P15/T01–T14 cover numerical, topology, raw/focus/state, native clipping/raster, reflow/contrast, network/storage/CSP, lifecycle and finite timing. Required native observations cannot be replaced with math/screenshots of the schematic. All product tests remain NOT_RUN.
8. **handoff — true:** §8 fixes three-document bytes plus separate nonauthor review, owner/claim, source baseline, later evidence/artifact expectations and explicit production/PR/deployment gates. Private worksheets/receipts are excluded from public files.

## Independent mathematical challenge
I did not rerun or count the author's 15-case script as independent evidence. I used a separate parametric-segment worksheet with rational line parameters, new diagonal/vertical/near-collinear cases, closing-adjacency vectors and a minimum lattice triangle. These bounded document calculations are not a product validator or native tests.

- Pair classification: exact rational parameters distinguish proper crossing from endpoints; projection intervals distinguish disjoint collinear, touch and positive overlap. The near-collinear integer case is a genuine crossing and cannot use a visual/epsilon shortcut.
- Closing adjacency new witnesses have dot -2400 (straight-through) and +1800 (fold/overlap), confirming sign and shared-vertex handling. Duplicate rejection removes zero-edge ambiguity. For N=3 every edge pair is adjacent, and a distinct collinear triangle is rejected earlier by S=0.
- Precedence is intentional rather than misleading: P08 repeated end is duplicate; P09 bowtie zero signed sum is rejected before crossings; P10 retains nonzero sum but its E0/E2 parameters4/9 and5/9 require crossing rejection. P12 overlap wins before nonadjacent contact; P13 first touch is E0/E2 and P15 E0/E3, not the later overlapping pair.
- Unit conversion: q=100*percent, so S_q=10000*S_percent. Area=abs(S_q)*W*H/200000000 and coverage_percent=abs(S_q)/2000000. Rectangle/triangle/reversal, L decomposition, rectangle extents, corner-cut octagon with retained collinear points, and notch subtraction reconcile the table's literal areas; no contradiction found.
- New minimum nonzero q-lattice triangle (0,0),(2,1),(1,1) has S_q=1; at40×40 its area is1/125000px² and coverage1/2000000%. Its display may round to0.000 while validity remains positive. P07 has the same S_q at240×160, giving3/15625px².
- Conservative pre-rejection bounds: q and differences ≤10000; |orient| and |dot|≤200000000; orientation product≤40000000000000000; |S|≤1200000000; |S|WH≤768000000000000; three-decimal scaled numerator≤768000000000000000. Products exceed safe Number integers, validating the mandatory BigInt contract. At most66 unordered edge pairs. Parsing must range-check the bounded raw digit sequence before narrowing; existing integer/BigInt requirement permits this.
- Reversal flips sign but not the simple filled set. Rounding quotient/remainder and sign-after-zero logic avoid negative zero; it must not feed topology or CSS.

## Native raster and security feasibility
T07/T08 are executable later as an independent evidence harness: calibrated same-dimension/DPR native and unclipped captures, an independently constructed mathematical mask, explicit outside background/inside pattern comparisons, finite2CSSpx boundary exclusion and literal witnesses. Small P07 explicitly has no claimed visible interior; P05 comparison is separately required. Rectangle layout measurements cannot be replaced by painted bounds. Browser/OS/DPR/zoom and raw captures remain necessary. Pattern phase, coordinate calibration and all eligible pixel comparisons must be preserved by the future harness; no raster result was produced here.

Official references were opened/read this review:
- [CSS Shapes dated2025-06-12](https://www.w3.org/TR/2025/CRD-css-shapes-1-20250612/#basic-shape-functions): basic polygon syntax/reference geometry, not tool-specific topology policy.
- [CSS Masking dated2021-08-05](https://www.w3.org/TR/2021/CRD-css-masking-1-20210805/#the-clip-path): basic-shape plus geometry-box supports the declared border-box contract.
- [HTML text input](https://html.spec.whatwg.org/multipage/input.html#text-(type=text)-state-and-search-state-(type=search)): app-observed raw text excludes native CR/LF sanitization.
- [CSP3 dated2026-10-27](https://www.w3.org/TR/2026/WD-CSP3-20261027/#style-src-attr): attribute blocking is distinct from the future direct-property setter validation. T11 must establish actual behavior; no policy weakening or assumed browser PASS.
These source checks support the document boundary only. They do not establish browser support, native paint, privacy, accessibility or performance.

## Result and remaining work
No candidate modification requested. All nine product aspects remain null; all T01–T14 product checks NOT_RUN. This limited document review may be used for a subsequent separately serialized register-spec/mark-spec-ready flow after exact candidate binding; I have not written those transitions, created a PR, merged, deployed, or changed stock. Unknown unregistered local duplicates remain a production-entry condition. Original authors must fix any later real defect on the same lineage, with affected rereview.
