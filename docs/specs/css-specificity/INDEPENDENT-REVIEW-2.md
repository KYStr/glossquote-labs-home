# CSS Selector Specificity Comparator — second independent review (task acceptance)

Reviewer: cloud-dot actor `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory` (Muse). I did not author, edit, or contribute to this specification; the task owner and sole contributor is a different cloud-dot actor (qc2). This review closes the registry task `labs-css-specificity-spec-20261102`; it is independent of the earlier in-candidate INDEPENDENT-REVIEW.md (the local reviewer's documentary pass, which supported the separate mark-spec-ready event) — I re-derived the substance myself from the fixed bytes and did not rely on that report's conclusions.

## Fixed candidate binding (verified by me at the submitted commit)

Repository `KYStr/glossquote-labs-home`, candidate commit `d97c0f4e8cf13fc9a73db9350f20f746d7c3e9ec`, PR #56 verified still open with head equal to the candidate commit. I fetched every file at that commit and verified byte sizes and SHA256 against the binding table printed in the in-candidate INDEPENDENT-REVIEW.md; all three match exactly:

| File | Bytes | SHA256 | Match |
|---|---:|---|---|
| BRIEF.md | 8320 | `a2378c127f828056be82cecb7148b3136b5cf03f67ed6f10b68fb50ad76e084f` | yes |
| SPEC.md | 26596 | `ad346df046837b1ffe26790691e53e9e11bf22c6a673222b22bbbc075fd1c72c` | yes |
| AUTHOR-CHECK.md | 3471 | `50f1c77530b59643b74e0116205e8506b8080e229000894f39acb3bd5046da18` | yes |

The in-candidate INDEPENDENT-REVIEW.md itself is 9,013 bytes, SHA256 `de43048990b464da0605510b243df88c0be2acc62b4c20696b79e11098ca4d4b`.

## Independent fixture verification (my own derivations)

I decomposed all 18 fixtures from the leaf rules (ID=(1,0,0); class/attribute/ordinary pseudo-class=(0,1,0); type/pseudo-element=(0,0,1); universal/combinators zero; :is()/:not() take the lexicographically greatest branch; :where() contributes zero while its children keep local scores) and agree with every stated result, including the discriminating cases:

- S03: eleven classes are (0,11,0) and lose to one ID (1,0,0) at component A — no decimal carrying, as specified.
- S05: `:is(.a,#b,div)` is (1,0,0), the lexicographic maximum, not the componentwise (1,1,1).
- S06: `:not(.a.b,div#x)` is (1,0,1) — max((0,2,0),(1,0,1)) is the second branch.
- S13: `:is(#x,#y)#z` is (2,0,0) — tied branches are not doubled; the outer ID adds its own.
- S14: `:NOT(...)` case-folds the pseudo name; max((0,1,0) from the inner :is, (1,0,0)) is (1,0,0).
- S15: nesting is→not→where→is is depth 4 (valid); the :where zeroes its inner (0,1,0), so :not and the outer :is both carry (0,0,0).
- S07/S09: :where children retain local contributions in the tree ((1,1,1) inside S07) while contributing zero upward; S07's only upward contribution is the terminal ::before, total (0,0,1).

Spans re-indexed by hand: S01 root [0,12) with id [0,5) and class [6,12); S05 function [0,14) with branches [4,6), [7,9), [10,13); S07 :where node [0,16) and ::before [16,24); S17's control-character raw is 12 UTF-16 units with root [2,10), correctly excluding the leading tab/space and the trailing space/FF.

Error offsets re-derived against the declared scan-first policy (whole-input UNSUPPORTED_CHAR scan precedes structural parsing): ` div/`→UNSUPPORTED_CHAR 4; `.1x`→SYNTAX 1; `div,span`→UNSUPPORTED_CONTEXT 3; `:foo`→UNSUPPORTED_NAME 0; `:is (.a)`→SYNTAX 3; `:is(.a,)`→SYNTAX 7; `:is()`→SYNTAX 4; `[a`→SYNTAX 2 (EOF = raw.length); `div >`→SYNTAX 5; `div*`→SYNTAX 3; `::before`→UNSUPPORTED_CONTEXT 0; `.a::before:hover`→UNSUPPORTED_CONTEXT 10; `:not(*::before)`→UNSUPPORTED_CONTEXT 6; depth-5 nesting→DEPTH 16 (fifth colon); ninth branch→BRANCH_LIMIT 27 (the comma introducing it); `div > > span`→SYNTAX 6. All agree.

## Per-criterion judgement (the task's nine registered aspects, scored as document coverage)

- functionality (95): §3/§4 pin the exact AST node set, per-node contribution, two lexicographic triples, the language-invariant summary template, and S01–18 as literal oracle cases; the no-cascade/no-matching claim is explicit in §1, §2 and the rubric.
- boundaries (95): closed grammar and allowlists; 1024/1025 length rule with L-first precedence; depth 4/5 and branch 8/9 caps with named error codes and verified offsets; schema-before-length-before-parse ordering; raw retention and the full idle/dirty/invalid/result lifecycle with no stale output.
- privacy (92): the document forbids transmission, persistence and clipboard access outright and — correctly — requires actual normal-browser Network/Storage observation at product stage rather than accepting source review; capability gaps stay null there by design.
- security (93): strict record schema with getter/coercion defences, bounded monotonic parser, inert text-only rendering, and a fixed header CSP string are all normative; actual CSP enforcement is honestly deferred to a permitted test origin.
- usability (92): the acceptance contract requires a non-author to complete S01/S05/S12 from page help alone and to explain A-first comparison and :where local-vs-upward contribution; subset rejection and the specificity-vs-cascade distinction are surfaced before entry.
- accessibility (93): labelled fields, linked error summary with first-error focus, no focus theft on success, numeric contrast thresholds (4.5:1 / 3:1 with the large-text definition), real 200% zoom and 320/768/1440 reflow checks, no drag dependency; untested assistive tech stays disclosed.
- localization-seo (92): complete zh-Hant/English routes with raw and semantic results preserved across the intercepted language switch, the technical summary deliberately language-invariant, preview noindex vs production canonical separation.
- toolchain-provenance (94): Node 24+ zero-dependency build interface with named scripts, pure parser/scorer separated from UI, byte-identical double-build requirement, and a harmless-change/restore exercise; AUTHOR-CHECK states the author's own worksheet history honestly and fabricates no execution.
- compatibility (91): named available desktop browser for the full matrix, a genuinely available second engine or an explicit untested statement, the finite 100-cycle lifecycle protocol, and the 5-warmup + 20-sample timing protocol for both stress shapes with valid slow samples counted as failures.

## Defects

None found. I actively checked the places this family of specifications usually breaks — componentwise-vs-lexicographic max, tied-branch doubling, :where subtree accounting, case-folding of pseudo names, depth counting, and every printed error offset — and the document is correct on all of them. The two-stage history of this package (a corrupted registry write by the author's side, later restored as validated bytes) does not touch the candidate documents: the bytes I reviewed are exactly the bytes the earlier reviewer bound.

## Honest limits

This is acceptance of a specification task. All product checks remain NOT_RUN and no product exists; nothing here claims a build, browser run, CSP enforcement, timing, or accessibility measurement. Acceptance does not merge PR #56, publish, or deploy anything.

Verdict: **accepted**.
