# Handoff — Concrete Bag Calculator (build-first production candidate)

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec task: `labs-concrete-bag-calculator-spec-20261109`
- Spec: `docs/specs/concrete-bag-calculator/SPEC.md`
  (spec-concrete-bag-calculator-20261109, v1),
  `docs/specs/concrete-bag-calculator/BRIEF.md`,
  `docs/specs/concrete-bag-calculator/fixtures.json`,
  `docs/specs/concrete-bag-calculator/AUTHOR-CHECK.md`
- Spec candidate commit: `f02756da51344f143425657d3bcefc478e1da521`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/152
- Implementation base: `codex/initial-publication` at
  `15f20a7afa234e8a9dc1d607a88379f89cd5656c` (branch tip when the
  build branch was created); implementation branch
  `muse/concrete-bag-calculator-production-20261109`.
- Implementation scope: `tools/concrete-bag-calculator/` only. Nothing
  outside this directory was touched; no registry/coordination
  commands were run. The parent verifies the PR head and handles any
  registry submission.

Because the spec PR is not merged into the base branch,
`docs/specs/concrete-bag-calculator/` does not exist in this checkout.
The spec's fixtures.json is therefore vendored verbatim at
`test/fixtures.json` (byte-identical copy of the file at the spec
candidate commit, SHA-256
`6ae00aba1f36834f2f931a5dbd269a3c73c2d0afde8b418dde8a5d979aed4fa9`),
and the tests and static check read that copy. The vendored file
keeps the spec's own `specId`
(`spec-concrete-bag-calculator-20261109`), which the check asserts.

## What was built

A bilingual (zh-Hant / en) static tool that takes one shape (slab,
strip footing, or cylinder) in centimetres, a count, and a waste
allowance, and prints the net and waste-adjusted volumes (m³ and yd³)
plus the 40 / 60 / 80 lb premix bag counts:

- Pure core (`public/js/core/concrete.mjs`): strict schema (exactly
  the nine string fields, own data properties only, accessors
  rejected), validation in the SPEC's fixed order — SCHEMA, shape
  ENUM, the current shape's dimension fields in their pinned order,
  count, wastePct — with per-field INPUT_LIMIT → EMPTY →
  NUMBER_FORMAT / INTEGER_FORMAT → RANGE. Fields of other shapes are
  ignored completely, even when invalid. The whole pipeline is exact
  BigInt rational arithmetic, no floating point: dimensions become
  hundredths-of-a-centimetre integers; slab/footing volume is the
  product over 10^12; cylinder volume uses π fixed to 30 decimal
  places; waste is applied exactly once to the total volume; bag
  counts are ceilings of the UNROUNDED adjusted volume over the
  SPEC's fixed yield table (0.0084950539776 / 0.0127425809664 /
  0.0169901079552 m³ per bag); displayed volumes are 3-decimal
  half-up strings of the exact rationals (an exact 0.0005 rounds up).
- Controller (`public/js/controller.mjs`): empty / dirty / busy /
  ready / error / cancelled state machine with generation IDs; only
  a reply carrying the current generation while busy is accepted, so
  late replies can never resurrect a cancelled or replaced result.
  The public state exposes `resultAvailable`; this tool has no
  download artifact (SPEC scope).
- App (`public/js/app.js`): DOM wiring with textContent/value only;
  a segmented shape control shows only the current shape's dimension
  fields while the others keep their draft values (and editing any
  field, used or not, revokes the result, per the SPEC); renders the
  volume summary and the three-row bag table with each row's bag size
  and fixed per-bag yield. Computation runs in a module Worker
  created from a Blob URL of the fixed worker source embedded by the
  build (`dist-preview/js/worker-source.js`, generated from the fixed
  bytes of the core + `public/js/worker-handler.mjs`). Reset restores
  the SPEC defaults and focuses the shape control; only a submitted
  failure moves focus to the first error field.
- Pages: `public/index.html` (zh-Hant) and `public/en/index.html`
  (en), with the SPEC-pinned titles, descriptions, H1s, both FAQ
  answers verbatim, preview `robots` noindex/nofollow, same-language
  home links (`../../` / `../../en/`), relative language links, and
  the draft-loss note.

## Recorded interpretations (SPEC silent or generic-template conflicts)

1. **Candidate metadata:** the generic template asks for canonical +
   hreflang cross-links, but the SPEC's static-content gate pins the
   candidate to robots noindex/nofollow with no production canonical,
   hreflang, or sitemap, and language links carrying paths only. The
   SPEC (the fixed contract) wins. The planned production origin
   named in the SPEC is not configured, so the build refuses
   `--mode production`.
2. **Layout of the core:** the SPEC's implementation section names
   `src/core.mjs`-style paths, while the house file contract
   (IMPLEMENTATION-CHECKLIST) pins `public/js/core/*.mjs`,
   `public/js/app.js`, `scripts/`, `test/`. The house contract
   governs file layout; the SPEC governs behavior. The core is
   `public/js/core/concrete.mjs` and a separate
   `public/js/controller.mjs` holds the state machine, matching the
   sibling tools.
3. **State and error vocabulary:** the SPEC and its fixtures name
   the success state `ready` (sibling tools use `success`) and shape
   errors as `{code, path}` with a JSON Pointer (siblings use
   `{code, field, row}`). The SPEC wins on both; the controller
   fixtures' checkpoints (`resultAvailable`, `draft`, `error`) are
   honoured verbatim.
4. **No report/download tests:** the SPEC states the result is
   display-only with no download or export, so unlike sibling tools
   there is no report module; the third test file covers the static
   pages instead.

## Verification (see VERIFICATION.md for commands and hashes)

- `npm test`: 34/34 pass (7 literal core fixtures and 3 controller
  fixtures verbatim from the vendored fixtures.json, hand-derived
  waste-0% crossing values, an exact-yield-multiple case, the legal
  endpoints together, the exact 0.0005 display tie, ignored-field
  cases, validation classes and order, page structure).
- `npm run check`: pass (files, package contract, fields/shape
  fields/defaults/yields/example vs the vendored fixtures, bilingual
  metadata, the pinned FAQ and fixed strings, syntax incl. the
  worker concatenation, forbidden-capability scan, core purity).
- `npm run build:preview` run twice: byte-identical (per-file
  SHA-256).
- `npm run check:generated:preview`: pass (manifest hashes, metadata,
  worker source equals the fixed bytes, robots.txt denies all).
- Loopback HTTP probe: both language pages 200 with correct titles,
  assets 200, traversal rejected.

## Spec errata

None. All 7 literal core fixtures reproduce exactly from the SPEC's
own rational pipeline, and the 3 controller fixtures pass verbatim.
The SPEC's test list calls for a synthetic case where the adjusted
volume is an exact integer multiple of a yield; that case is
constructible with real inputs because the yield numerators factor
as 2^9 · 3^4 · 127^3 (40 lb; 60 lb = 1.5×, 80 lb = 2×), and it is
covered in `test/core.test.mjs` (bag40 = 1250 and bag80 = 625 land
exactly, with no ceiling bump).

## NOT_RUN

Real-browser rendering/interaction (including the actual Worker +
Blob flow), real devices/touch, assistive tech, measured contrast,
cross-browser comparison, deployment, and the independent
nine-aspect review (pending by design in build-first mode).

## Next owner

Independent reviewer (parent verifies the PR head first). Do not
merge, publish, or deploy from this branch without the reviewer's
acceptance and the coordinator's approval.
