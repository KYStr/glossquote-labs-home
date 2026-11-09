# Handoff — Pairwise Test Matrix (build-first production candidate)

## Fixed source

- Repo: `KYStr/glossquote-labs-home`
- Base branch: `codex/initial-publication`, base commit `8941a010da5722f0b4690487938c4e32d2a2587f`
- SPEC: `docs/specs/pairwise-test-matrix/SPEC.md` (`spec-pairwise-test-matrix-20261109`, v1)
- BRIEF: `docs/specs/pairwise-test-matrix/BRIEF.md`
- Fixtures: `docs/specs/pairwise-test-matrix/fixtures.json` (7 core + 3 controller cases)
- Author check: `docs/specs/pairwise-test-matrix/AUTHOR-CHECK.md`
- Handbook/format: `docs/IMPLEMENTATION-CHECKLIST.md`, `docs/SOURCE-LAYOUT.md`,
  `docs/TOOL-DESIGN-BASELINE.md`

## Registry (claimed by the parent actor; this builder made no registry writes)

- Task: `labs-prod-pairwise-test-matrix-20261109`
- Claim: `muse-main-claim-pairwise-test-matrix-20261109T075001Z-w2`
- The parent submits this candidate to the registry after verifying the PR head.

## Allowed scope

`tools/pairwise-test-matrix/` only. Nothing outside it was touched.
No registry writes, no `sources/` or `archives/` changes, no deployment.

## What was built

Deterministic greedy pairwise (2-way) coverage over 2–5 dimensions,
2–6 values each, product cap 2,048. Pure core
(`public/js/core/pairwise.mjs`, no imports, no DOM/network/storage) holds
parsing/validation (SPEC check order: capacity → surrogate → row count →
per-row format/value-count/dup-key/dup-value → product limit), the greedy
generator (first-dimension-slowest enumeration, max gain, earliest-ordinal
tie-break), coverage re-verification from the real cases, and the canonical
report serializer (keys sorted by UTF-16 code units, one trailing LF,
2,097,152-byte cap).

The page runs the core in a module Worker built from one Blob URL whose
source is the fixed core bytes plus the fixed entry in
`scripts/worker-entry.mjs`, generated deterministically by
`scripts/build.mjs` into `public/js/worker-source.mjs`. User content is
only ever sent as the postMessage snapshot, never as code. The controller
(`public/js/controller.mjs`, DOM-free, injectable executor) owns the
empty/dirty/busy/success/error/cancelled state machine, generation numbers
(late results are ignored), cancel, replace-while-busy, reset, and report
availability. Bilingual static pages (zh-Hant + en) with the SPEC-pinned
H1/title/description/FAQ, 25-row pagination, and download
`pairwise-test-matrix-report.json` only on explicit click (Blob URL
revoked after 30 s or earlier on invalidation).

## Deliberate decisions (for the reviewer)

1. **No production canonical / hreflang in the candidate.** The generic
   brief template lists them, but the SPEC's own "two-language static
   content" section pins the candidate rule: robots meta + X-Robots-Tag
   `noindex,nofollow`, no production canonical, hreflang or sitemap, and
   language links carry paths only. The production origin
   (`pairwise-test-matrix.glossquote.com`) is not configured, so inventing
   a canonical URL would be fabrication. Home links follow the run-2
   convention (`../../` / `../../en/`).
2. **Per-row validation order.** The SPEC lists the four per-row checks
   under "逐列驗" (verify row by row), so each row is checked in full
   (format → value count → dup key → dup value) before the next row. A
   test pins this: `A:a|a` followed by a duplicate key reports DUP_VALUE
   row 1, not DUP_KEY row 2.
3. **Row for UNICODE / ROW_LIMIT / PRODUCT_LIMIT / OUTPUT_LIMIT:** `null`
   (the SPEC pins row only for per-row failures and the two fixture
   PRODUCT_LIMIT cases, both `null`).
4. **Exactly 2,048 product is unattainable** under the 5-dimension /
   6-value caps (2,048 = 2^11 needs eleven 2-valued dimensions or an
   8-valued dimension); the boundary is still exercised at 1,024 (ok)
   and 2,160 / 2,500 (refused).
5. **Edit from `empty` stays `empty`.** Dirty means "an old result was
   invalidated"; with no result there is nothing to invalidate. Loading
   the example from `empty` shows the example note instead.

## Verification (see VERIFICATION.md)

- `npm test`: 33 pass / 0 fail (7 literal core fixtures, 3 literal
  controller fixtures, hand-derived 3×3×3 sequence cross-checked against
  an independent Python brute-force, validation edges, schema/accessor
  cases, independent coverage recomputation, capacity cases, canonical
  serialization, worker round-trip, static HTML checks).
- `npm run check`: pass. `build:preview` ×2 byte-identical
  (SHA-256 `2c6ad350771956160eb73654a604dc94d403f01207ee763bcdab0eabbc2669f7`).
  `check:generated:preview`: pass.
- Loopback HTTP probe: `/`, `/en/index.html`, JS, CSS all 200 with
  correct MIME; traversal and missing paths 404; X-Robots-Tag present.
- Spec errata: none — every printed fixture reproduces exactly.

## NOT_RUN

Real-browser rendering/interaction (including actual Worker execution in
Chrome/Edge, Blob download bytes, 200% zoom, reduced motion), real
devices/touch, assistive tech, measured contrast, Network/Storage
zero-request observation, deployment, independent nine-aspect review.

## Next owner

Independent reviewer (parent submits the candidate to the registry first).
