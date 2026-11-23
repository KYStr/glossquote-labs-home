# HSR Fare Calculator （高鐵票價試算）— Production HANDOFF

- Spec: `spec-hsr-fare-calculator-20261121`, draft spec PR #389
  (base `codex/initial-publication`, head
  `9c9beb8e4a9a186ef4193d476bc41002fb9b81ae`, OPEN at build time).
  Registry rev 1792 (per parent task).
- Spec source (fixed): `docs/specs/hsr-fare-calculator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `c8890da6bd89bd1ce4f49775e0e220cbea80dc4cd3020ed3cb452a09903514a9`,
  verified against the spec fixtures). The spec PR is not merged
  into this branch's base, so the tool vendors the fixtures rather
  than reading a repo-level docs path.
- Production target: `tools/hsr-fare-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/hsr-fare-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (parent orchestrator
  session 06a04127-f501-49de-84ac-68a4b0939874). User confirmed
  continuation four times on 2026-11-23 (14:31, 14:33:56, 14:58:49,
  15:04:46); the same execution-risk prompt class that stopped the
  first production wave at clone/fetch re-appeared during this build
  (a system execution-risk notice on the `exec` listing of the run-6
  exemplar directory, and again on the clone step) and was continued
  past under that authorization — glossquote-repo content only, no
  other content, credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/hsr-fare.mjs`: `run(input)` validates
  in the SPEC order (capacity INPUT_LIMIT → surrogate UNICODE →
  EMPTY → INVALID_VALUE / INTEGER_FORMAT → RANGE, in field order
  origin, destination, cabin, fareKind, quantity, then cross-field
  SAME_STATION → CABIN_NOT_SOLD → FARE_CABIN_MISMATCH), looks up
  the pinned literal fare tables, and returns the fixture-shaped
  result `{origin, destination, direction, distanceKm, cabin,
  fareKind, baseFare, singleFare, quantity, totalFare}`. The three
  full-fare tables (standard / business / non-reserved, 66 pairs
  each) are transcribed verbatim from the SPEC as upper triangles;
  the three business not-sold pairs are null in the business table.
  Discounts use exact integer arithmetic,
  `5 * floor(baseFare * rate / 5)` with rates as numerator /
  denominator pairs — no floating point enters any price; distance
  is computed in integer tenths of a kilometre and is display-only.
  Fixed report `hsr-fare-calculator-report.json` (canonical JSON,
  UTF-16 key order, one trailing LF, 2 MiB limit; the one-decimal
  distanceKm serializes in shortest round-trip form).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, fare note in both languages, preview noindex, no
  canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note. Results show route, direction,
  distance, cabin, fare type, full fare, per-ticket fare, quantity,
  and total, plus the same-segment full fares for all three cabins
  (business shows "不發售 / Not sold" on the three short segments).
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Verification done by this builder

- All 17 literal core fixtures pass verbatim (deep equal).
- The three fare tables were cross-checked cell by cell against
  the SPEC's markdown tables with an independent one-off parse
  (132 pairs × 3 cabins = 396 cells, 0 mismatches).
- 1,584 combinations (66 pairs × 3 cabins × 8 fare kinds) pass
  the invariants: symmetry, single fare a multiple of 5 and never
  above its full fare, business nulls exactly the 3 pairs, and the
  mismatch rules.
- `node --test`, `node scripts/check.mjs`,
  `node scripts/build.mjs --mode preview` (twice, byte-identical),
  `node scripts/check-generated.mjs --mode preview`, and a
  loopback serve smoke test: see VERIFICATION.md for counts and
  hashes.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Enum-field raw capacity is not pinned.** The SPEC pins
   quantity raw at most 8 units, but gives no per-field capacity
   for origin / destination / cabin / fareKind, while the pinned
   validation order says capacity comes first for every field.
   The implementation uses one shared cap of 16 units for the four
   enum fields (no valid value exceeds 11 units:
   "earlyBird65" / "nonreserved"). Only raw strings longer than
   16 units are affected; every valid input and every fixture is
   unaffected. Suggested fix: pin a per-field capacity for the
   enum fields in the SPEC (or state explicitly that only
   quantity has a capacity).
2. **Implementation section names `src/core.mjs` /
   `src/controller.mjs` / `src/app.mjs`, but the run-6 house
   layout (per the parent task and the sibling run-6 tools) is
   `public/js/core/*.mjs`, `public/js/controller.mjs`,
   `public/js/app.js`.** File-layout naming only; the
   implementation follows the task's layout. Suggested fix: align
   the SPEC's paths with the house layout, or note the mapping.
3. **No fixture conflicts with the SPEC text.** All 17 literal
   core fixtures pass verbatim under the SPEC's own validation
   order, including the discount round-down cases (125 → 60,
   968.5 → 965, 616 → 615, 202.5 → 200, 52.5 → 50) and the
   cross-field order (SAME_STATION → CABIN_NOT_SOLD →
   FARE_CABIN_MISMATCH). Nothing was adjusted to make them pass.

## NOT_RUN (not verified by this builder)

- Real-browser gates (Chrome / Edge, both languages, keyboard,
  320 px, real 200% zoom, reduced motion, touch targets,
  contrast): no isolated browser available to this subagent.
  Node/DOM checks do not stand in for browser evidence.
- Network / Storage gates (zero work requests, storage, URL,
  console, offline calculation, service worker): NOT_RUN for the
  same reason.
- Formal HTTPS / SEO gates (production canonical, hreflang,
  sitemap, robots.txt, headers on the approved origin): NOT_RUN —
  no production origin is approved for this tool
  (the planned origin `hsr-fare-calculator.glossquote.com` is not
  configured).

## Next owner

Independent (non-author) reviewer: verify this same PR head
against the SPEC's nine aspects, run the browser / Network /
Storage gates, and confirm the errata candidates above with the
spec author. Do not merge or publish from this draft PR.
