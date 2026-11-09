# Handoff — Moving Box Estimator (build-first production candidate)

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec task: `labs-moving-box-estimator-spec-20261109`
- Spec: `docs/specs/moving-box-estimator/SPEC.md` (spec-moving-box-estimator-20261109, v1),
  `docs/specs/moving-box-estimator/BRIEF.md`, `docs/specs/moving-box-estimator/fixtures.json`,
  `docs/specs/moving-box-estimator/AUTHOR-CHECK.md`
- Spec candidate commit: `a536732ba0512afc595c924b242ee220211bf7ed`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/156
- Implementation base: `codex/initial-publication` at
  `6a56a115e6bbc1208712c74c855906ce3729e2e3` (branch tip when the build
  branch was created); implementation branch
  `muse/moving-box-estimator-production-20261109`.
- Implementation scope: `tools/moving-box-estimator/` only. Nothing
  outside this directory was touched; no registry/coordination commands
  were run. The parent verifies the PR head and handles any registry
  submission.

Because the spec PR is not merged into the base branch,
`docs/specs/moving-box-estimator/` does not exist in this checkout. The
spec's fixtures.json is therefore vendored verbatim at
`test/fixtures.json` (byte-identical copy of the file at the spec
candidate commit, SHA-256
`5a0b48e0c2a1ad90724e601b346acab59ae40810311f8800d54e9b030eda6896`),
and the tests and static check read that copy. The vendored file keeps
the spec's own `specId` (`spec-moving-box-estimator-20261109`), which
the check asserts.

## What was built

A bilingual (zh-Hant / en) static tool that estimates how many moving
boxes to buy from a home type plus up to five habit toggles:

- Pure core (`public/js/core/boxes.mjs`): strict schema (exactly the
  six fields — one enum string and five booleans — own data properties
  only, accessors rejected), validation in the SPEC's pinned order
  (JSON-serialized size over 65,536 bytes → INPUT_LIMIT; structure and
  per-field types in field order → SCHEMA; homeType lone surrogate →
  UNICODE; empty → EMPTY; outside the five home types → ENUM), and
  integer arithmetic only: base split small = floor((30B + 99)/100),
  medium = floor((50B + 99)/100), large = B − small − medium; adders
  counted after the split (books +8 small, fragile +4 small, kitchen
  +6 medium, clothes +5 medium); the lived-5+-years uplift
  floor((subtotal + 4)/5) counted after the adders and entirely as
  medium; supplies at one roll per 10 boxes rounded up, packing paper
  matching tape plus one extra roll when fragile items are on. The
  three sizes always sum to `totalBoxes`. The fixed report
  (`moving-box-estimator-report.json`) is the canonical serialization
  of the result: recursive UTF-16 key sort, compact, one trailing LF,
  2,097,152-byte OUTPUT_LIMIT.
- Controller (`public/js/controller.mjs`): empty / dirty / busy /
  success / error / cancelled state machine with generation IDs; only
  a reply carrying the current generation while busy is accepted, so
  late replies can never resurrect a cancelled or replaced result.
  The public state exposes `reportAvailable`.
- App (`public/js/app.js`): DOM wiring with textContent/value only;
  renders the total plus a five-row table (small / medium / large /
  tape / packing paper), the SPEC's fixed estimate note verbatim under
  the results, and the download button only on success. The download
  is created only on an explicit click from the current result; its
  object URL is revoked within 30 seconds or as soon as the result is
  invalidated. Computation runs in a module Worker created from a Blob
  URL of the fixed worker source embedded by the build
  (`dist-preview/js/worker-source.js`, generated from the fixed bytes
  of the core + `public/js/worker-handler.mjs`). Reset restores the
  SPEC defaults and focuses the first home-type radio; only a
  submitted failure moves focus to the first error field.
- Pages: `public/index.html` (zh-Hant) and `public/en/index.html`
  (en), with the SPEC-pinned titles, descriptions, H1s, both FAQ
  answers, the fixed estimate note in each language, the fixed
  per-option addition hints beside every toggle, preview `robots`
  noindex/nofollow, same-language home links (`../../` / `../../en/`),
  relative language links, and the draft-loss note.

## Recorded interpretations (SPEC silent or generic-template conflicts)

1. **Candidate metadata:** the generic template asks for canonical +
   hreflang cross-links, but the SPEC's static-content gate pins the
   candidate to robots noindex/nofollow with no production canonical,
   hreflang, or sitemap, and language links carrying paths only. The
   SPEC (the fixed contract) wins. The planned production origin named
   in the SPEC is not configured, so the build refuses `--mode
   production`.
2. **Layout of the core:** the SPEC's implementation section names
   `src/core.mjs`-style paths, while the house file contract
   (IMPLEMENTATION-CHECKLIST) pins `public/js/core/*.mjs`,
   `public/js/app.js`, `scripts/`, `test/`. The house contract governs
   file layout; the SPEC governs behavior. The core is
   `public/js/core/boxes.mjs` and a separate `public/js/controller.mjs`
   holds the state machine, matching the sibling tools.
3. **Plain-object check is realm-tolerant:** the core accepts a plain
   object whose prototype is null or whose prototype's own prototype
   is null (what structured clone delivers into a Worker), and rejects
   class instances as SCHEMA. Fixture expectations are unaffected.
4. **Capacity vs accessors:** the SPEC defines the capacity step as
   the byte length of the input's JSON serialization, which is
   measured with `JSON.stringify` exactly as the sibling tools do;
   field validation then reads own data descriptors only and rejects
   accessors as SCHEMA without using their values.
5. **Status copy:** the SPEC pins the dirty, busy, and cancelled
   status strings verbatim; the empty-state and success lines follow
   the sibling tools' wording in both languages. Error strings are the
   SPEC's five fixed pairs verbatim.

## Verification (see VERIFICATION.md for commands and hashes)

- `npm test`: 32/32 pass (8 literal core fixtures and 3 controller
  fixtures verbatim from the vendored fixtures.json, the hand-derived
  five-home-type base table, an invariant sweep over all 5 home types
  × all 32 toggle combinations against an independently formulated
  recomputation, validation classes and order, the canonical report
  bytes against a hand-written literal, page structure).
- `npm run check`: pass (files, package contract, tables/defaults/
  example vs the vendored fixtures, bilingual metadata, the pinned
  strings, syntax incl. the worker concatenation, forbidden-capability
  scan, core purity).
- `npm run build:preview` run twice: byte-identical (per-file
  SHA-256).
- `npm run check:generated:preview`: pass (manifest hashes, metadata,
  worker source equals the fixed bytes, robots.txt denies all).
- Loopback HTTP probe: both language pages 200 with correct titles,
  assets 200, traversal rejected.

## Spec errata

None. All 8 literal core fixtures reproduce exactly from the SPEC's
own formulas, and the 3 controller fixtures pass verbatim.

## NOT_RUN

Real-browser rendering/interaction (including the actual Worker + Blob
flow and the native download dialog), real devices/touch, assistive
tech, measured contrast, cross-browser comparison, deployment, and the
independent nine-aspect review (pending by design in build-first
mode).

## Next owner

Independent reviewer (parent verifies the PR head first). Do not
merge, publish, or deploy from this branch without the reviewer's
acceptance and the coordinator's approval.
