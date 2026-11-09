# Handoff — Protein Intake Calculator (build-first production candidate)

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec task: `labs-protein-intake-calculator-spec-20261109`
- Spec: `docs/specs/protein-intake-calculator/SPEC.md`
  (spec-protein-intake-calculator-20261109, v1),
  `docs/specs/protein-intake-calculator/BRIEF.md`,
  `docs/specs/protein-intake-calculator/fixtures.json`,
  `docs/specs/protein-intake-calculator/AUTHOR-CHECK.md`
- Spec candidate commit: `6493df72ecb2c7a583d836fdcb9731b550168b40`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/150
- Implementation base: `codex/initial-publication` at
  `b7ffa5a133ac7a2b3221d0807e61c2c3faa48442` (branch tip when the build
  branch was created); implementation branch
  `muse/protein-intake-calculator-production-20261109`.
- Implementation scope: `tools/protein-intake-calculator/` only. Nothing
  outside this directory was touched; no registry/coordination commands
  were run. The parent verifies the PR head and handles any registry
  submission.

Because the spec PR is not merged into the base branch,
`docs/specs/protein-intake-calculator/` does not exist in this checkout.
The spec's fixtures.json is therefore vendored verbatim at
`test/fixtures.json` (byte-identical copy of the file at the spec
candidate commit; SHA-256
`12cfee6a2277f56f1c1f406c92401b7a884ecc8cd47e4cba90455a1a98a0c24c`), and
the tests and static check read that copy. The vendored file keeps the
spec's own `specId` (`spec-protein-intake-calculator-20261109`), which
the check asserts.

## What was built

A bilingual (zh-Hant / en) static tool that turns body weight and an
activity goal into a daily protein target, a ±0.2 g/kg range, and a
per-meal split:

- Pure core (`public/js/core/protein.mjs`): strict schema (exactly the
  four string fields, own data properties only, accessors rejected),
  validation in the SPEC's order — whole-input SCHEMA, then weight,
  goal, customFactor (only when the goal is `custom`), meals; per field
  INPUT_LIMIT → UNICODE → EMPTY → DECIMAL_FORMAT/ENUM → RANGE. Integer
  tenths arithmetic with the single pinned rounding step
  `grams(x10) = floor((W10 * x10 + 50) / 100)`; the range recomputes at
  factor − 0.2 (clamped at 0) and factor + 0.2, never from the rounded
  target; the per-meal remainder goes one gram at a time to the earliest
  meals so the meals sum exactly to the daily target. The same module
  builds the fixed report: `protein-intake-report.json`, compact JSON
  with object keys sorted recursively by UTF-16 code units, one
  trailing LF, UTF-8 without BOM, 2,097,152-byte OUTPUT_LIMIT, via a
  hand-written serializer that never calls a value's toJSON.
- Controller (`public/js/controller.mjs`): empty / dirty / busy /
  success / error / cancelled state machine with generation IDs; only a
  reply carrying the current generation while busy is accepted, so late
  replies can never resurrect a cancelled or replaced result. The
  public state exposes `reportAvailable`; the download exists only
  while a success result matches the current draft.
- App (`public/js/app.js`): DOM wiring with textContent/value only; the
  goal `<select>` enables the custom-factor field only for the `custom`
  goal and keeps any typed value when switching; computation runs in a
  module Worker created from a Blob URL of the fixed worker source
  embedded by the build (`dist-preview/js/worker-source.js`, generated
  from the fixed bytes of the core + `public/js/worker-handler.mjs`).
  The report is created only on an explicit download click; its object
  URL is revoked after 30 seconds or as soon as the result is
  invalidated. Reset restores the SPEC defaults and focuses the weight
  field; only a submit failure moves focus to the first error field.
- Pages: `public/index.html` (zh-Hant) and `public/en/index.html` (en),
  with the SPEC-pinned titles, descriptions, H1s, both FAQ answers, the
  pinned general-nutrition disclaimer verbatim inside the results area
  (not collapsible), preview `robots` noindex/nofollow, same-language
  home links (`../../` / `../../en/`), relative language links, and the
  draft-loss note.

## Recorded interpretations (SPEC silent or generic-template conflicts)

1. **Candidate metadata:** the generic template asks for canonical +
   hreflang cross-links, but the SPEC's static-content gate pins the
   candidate to robots noindex/nofollow with no production canonical,
   hreflang, or sitemap, and language links carrying paths only. The
   SPEC (the fixed contract) wins. The planned production origin named
   in the SPEC is not configured, so the build refuses
   `--mode production`.
2. **Layout of the core:** the SPEC's implementation section names
   `src/core.mjs`-style paths, while the house file contract
   (IMPLEMENTATION-CHECKLIST) pins `public/js/core/*.mjs`,
   `public/js/app.js`, `scripts/`, `test/`. The house contract governs
   file layout; the SPEC governs behavior. The core is
   `public/js/core/protein.mjs` and a separate `public/js/controller.mjs`
   holds the state machine, matching the sibling tools.
3. **Raw capacity scope (minor spec errata candidate, see
   VERIFICATION.md):** the SPEC's generic per-field validation order
   lists INPUT_LIMIT first for every field, but pins the 8-unit
   capacity only in the `weight` field definition (customFactor
   inherits it via "same grammar"). Applying an 8-unit capacity to
   `goal` would reject the SPEC's own valid code `regular-exercise`
   (16 units). Implemented: capacity enforced for weight and
   customFactor only; goal/meals go UNICODE → EMPTY → ENUM.
4. **Status copy:** the SPEC pins the dirty, busy, and cancelled status
   strings verbatim; the empty-state line follows the sibling tools'
   wording in both languages. Error strings are localized per code and
   field, with field-specific RANGE/ENUM messages.

## Verification (see VERIFICATION.md for commands and hashes)

- `npm test`: 39 pass / 0 fail (9 literal core fixtures and 3 controller
  fixtures verbatim from the vendored fixtures.json, hand-derived
  boundary/clamp/normalization cases, validation classes and order,
  report bytes and SHA-256 against literal expectations, page
  structure).
- `npm run check`: pass (files, package contract,
  fields/factors/ranges/defaults/example vs the vendored fixtures,
  report contract, bilingual metadata, syntax incl. the worker
  concatenation, forbidden-capability scan, core purity).
- `npm run build:preview` run twice: byte-identical (per-file SHA-256).
- `npm run check:generated:preview`: pass (manifest hashes, metadata,
  worker source equals the fixed bytes, robots.txt denies all).
- Loopback HTTP probe: both language pages 200 with the pinned titles,
  assets 200, traversal rejected.

## Spec errata

One minor candidate (recorded interpretation 3 above): the generic
per-field order lists INPUT_LIMIT for all fields while the capacity is
pinned only for weight/customFactor, and an 8-unit capacity on `goal`
would reject the valid `regular-exercise` code. No literal fixture
conflicts with the SPEC's stated rules; all 9 core fixtures and 3
controller fixtures reproduce exactly.

## NOT_RUN

Real-browser rendering/interaction (including the actual Worker + Blob
flow and the native download dialog), real devices/touch, assistive
tech, measured contrast, cross-browser comparison, deployment, and the
independent nine-aspect review (pending by design in build-first mode).

## Next owner

Independent reviewer (parent verifies the PR head first). Do not merge,
publish, or deploy from this branch without the reviewer's acceptance
and the coordinator's approval.
