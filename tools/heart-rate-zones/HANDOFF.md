# Handoff — Heart Rate Zones Calculator (build-first production candidate)

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec task: `labs-heart-rate-zones-spec-20261109`
- Spec: `docs/specs/heart-rate-zones/SPEC.md` (spec-heart-rate-zones-20261109, v1),
  `docs/specs/heart-rate-zones/BRIEF.md`, `docs/specs/heart-rate-zones/fixtures.json`,
  `docs/specs/heart-rate-zones/AUTHOR-CHECK.md`
- Spec candidate commit: `2a21f1a0ebde740d0874f62ccd50435517532cc9`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/149
- Implementation base: `codex/initial-publication` at
  `b7ffa5a133ac7a2b3221d0807e61c2c3faa48442` (branch tip when the build
  branch was created); implementation branch
  `muse/heart-rate-zones-production-20261109`.
- Implementation scope: `tools/heart-rate-zones/` only. Nothing outside
  this directory was touched; no registry/coordination commands were
  run. The parent verifies the PR head and handles any registry
  submission.

Because the spec PR is not merged into the base branch,
`docs/specs/heart-rate-zones/` does not exist in this checkout. The
spec's fixtures.json is therefore vendored verbatim at
`test/fixtures.json` (byte-identical copy of the file at the spec
candidate commit, SHA-256
`2d2a85de501a470e1811b77b4532ffc23a96b9c13760e3c2434077b4f6b68f45`),
and the tests and static check read that copy. The vendored file keeps
the spec's own `specId` (`spec-heart-rate-zones-20261109`), which the
check asserts.

## What was built

A bilingual (zh-Hant / en) static tool that estimates maximum heart
rate from age (Fox shown for comparison, Tanaka as the zone basis, a
measured maximum overriding both) and prints five %HRmax zones plus,
when a resting heart rate is given, five Karvonen %HRR zones:

- Pure core (`public/js/core/zones.mjs`): strict schema (exactly the
  three string fields, own data properties only, accessors rejected),
  per-field validation in the SPEC's order (capacity INPUT_LIMIT first
  — including for empty fields — then INTEGER_FORMAT grammar, then
  RANGE; empty string means "not provided" and skips grammar/range),
  cross-field checks in order (EMPTY when neither age nor measured is
  given; RESTING_NOT_BELOW_MAX when resting ≥ used), and integer
  arithmetic only: fox = 220 − age, tanaka = floor((2080 − 7·age + 5)
  / 10), %HRmax boundaries b(p10) = floor((p10·used + 5) / 10),
  Karvonen boundaries t(p10) = resting + floor((p10·reserve + 5) / 10),
  zones built with the shared-boundary +1 rule so the five zones are
  always continuous and Z5 ends exactly at the used maximum. No floats
  appear anywhere in the result.
- Controller (`public/js/controller.mjs`): empty / dirty / busy /
  success / error / cancelled state machine with generation IDs; only
  a reply carrying the current generation while busy is accepted, so
  late replies can never resurrect a cancelled or replaced result.
  The public state exposes `resultVisible`; this tool has no download
  artifact (SPEC scope).
- App (`public/js/app.js`): DOM wiring with textContent/value only;
  renders the maximum-heart-rate summary (Fox, Tanaka, used value and
  its source), both five-row zone tables with the SPEC's fixed zone
  names and use descriptions, the fixed no-resting message in place of
  the Karvonen table when resting is absent, and the SPEC's fixed
  disclaimer verbatim under the results. Computation runs in a module
  Worker created from a Blob URL of the fixed worker source embedded
  by the build (`dist-preview/js/worker-source.js`, generated from the
  fixed bytes of the core + `public/js/worker-handler.mjs`). Reset
  restores the SPEC defaults (all three fields empty) and focuses the
  age field; only a submitted failure moves focus to the first error
  field.
- Pages: `public/index.html` (zh-Hant) and `public/en/index.html`
  (en), with the SPEC-pinned titles, descriptions, H1s, both FAQ
  answers, the fixed disclaimer in each language, preview `robots`
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
2. **No report/download tests:** the SPEC states the result provides
   no download or copy button, so unlike sibling tools there is no
   report module; the third test file covers the static pages instead,
   and the controller fixtures' visibility checkpoint is
   `resultVisible` (as the fixtures themselves pin).
3. **Layout of the core:** the SPEC's implementation section names
   `src/core.mjs`-style paths, while the house file contract
   (IMPLEMENTATION-CHECKLIST) pins `public/js/core/*.mjs`,
   `public/js/app.js`, `scripts/`, `test/`. The house contract governs
   file layout; the SPEC governs behavior. The core is
   `public/js/core/zones.mjs` and a separate `public/js/controller.mjs`
   holds the state machine, matching the sibling tools.
4. **Integer grammar for "0":** the SPEC's grammar wording is "0
   或非零開頭" (0, or a non-zero leading digit). The grammar is read as
   accepting the single character "0" (then rejected by RANGE for all
   three fields, whose minimums are all above 0), while "00" and
   leading-zero forms like "035" fail INTEGER_FORMAT. This matches the
   sibling tools' reading of the same house grammar.
5. **Status copy:** the SPEC pins the dirty, busy, and cancelled
   status strings verbatim; the empty-state line follows the sibling
   tools' wording in both languages. Error strings are localized per
   the SPEC's error codes, with field-specific RANGE messages giving
   each field's pinned bounds.

## Verification (see VERIFICATION.md for commands and hashes)

- `npm test`: 33/33 pass (7 literal core fixtures and 3 controller
  fixtures verbatim from the vendored fixtures.json, hand-derived
  endpoint and Tanaka-.5 cases, a zone-continuity invariant sweep over
  every legal age and measured value, resting == used / used − 1 on
  both sides, validation classes and order, page structure).
- `npm run check`: pass (files, package contract, ranges/defaults/
  example vs the vendored fixtures, bilingual metadata, the pinned
  zone-name table and fixed strings in app.js, syntax incl. the worker
  concatenation, forbidden-capability scan, core purity).
- `npm run build:preview` run twice: byte-identical (per-file
  SHA-256).
- `npm run check:generated:preview`: pass (manifest hashes, metadata,
  worker source equals the fixed bytes, robots.txt denies all).
- Loopback HTTP probe: both language pages 200 with correct titles,
  assets 200, traversal rejected.

## Spec errata

None. All 7 literal core fixtures reproduce exactly from the SPEC's
own formulas, and the 3 controller fixtures pass verbatim.

## NOT_RUN

Real-browser rendering/interaction (including the actual Worker + Blob
flow), real devices/touch, assistive tech, measured contrast,
cross-browser comparison, deployment, and the independent nine-aspect
review (pending by design in build-first mode).

## Next owner

Independent reviewer (parent verifies the PR head first). Do not
merge, publish, or deploy from this branch without the reviewer's
acceptance and the coordinator's approval.
