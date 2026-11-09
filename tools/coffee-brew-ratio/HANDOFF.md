# Handoff — Coffee Brew Ratio Calculator (build-first production candidate)

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec task: `labs-coffee-brew-ratio-spec-20261109`
- Spec: `docs/specs/coffee-brew-ratio/SPEC.md` (spec-coffee-brew-ratio-20261109, v1),
  `docs/specs/coffee-brew-ratio/BRIEF.md`, `docs/specs/coffee-brew-ratio/fixtures.json`,
  `docs/specs/coffee-brew-ratio/AUTHOR-CHECK.md`
- Spec candidate commit: `ea00dfbb1d076eb3eedd47e1f3d4afae204d578d`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/145
- Implementation base: `codex/initial-publication` at
  `b7ffa5a133ac7a2b3221d0807e61c2c3faa48442` (branch tip when the build
  branch was created); implementation branch
  `muse/coffee-brew-ratio-production-20261109`.
- Implementation scope: `tools/coffee-brew-ratio/` only. Nothing outside
  this directory was touched; no registry/coordination commands were run.
  The parent verifies the PR head and handles any registry submission.

Because the spec PR is not merged into the base branch, `docs/specs/coffee-brew-ratio/`
does not exist in this checkout. The spec's fixtures.json is therefore
vendored verbatim at `test/fixtures.json` (byte-identical copy of the file
at the spec candidate commit), and the tests and static check read that
copy. The vendored file keeps the spec's own `specId`
(`spec-coffee-brew-ratio-20261109`), which the check asserts.

## What was built

A bilingual (zh-Hant / en) static tool that solves a pour-over brew ratio
in either direction and prints a bloom + three-pour schedule:

- Pure core (`public/js/core/brew.mjs`): strict schema (exactly the four
  string fields, own data properties only, accessors rejected), per-field
  validation in the SPEC's order (INPUT_LIMIT, UNICODE, EMPTY, then
  ENUM/DECIMAL_FORMAT grammar, then RANGE), and integer-tenths arithmetic:
  dose mode `W = floor((D*R+5)/10)`, water mode
  `D = floor((20*W+R)/(2*R))`, bloom from the rounded dose
  `B = floor((D*M+5)/10)`, remaining water split by largest remainder with
  leftovers to the earlier pours, so step 4's cumulative always equals the
  total. Display helpers pin one-decimal amounts and the `1:15` / `1:15.5`
  ratio label.
- Controller (`public/js/controller.mjs`): empty / dirty / busy / success
  / error / cancelled state machine with generation IDs; only a reply
  carrying the current generation while busy is accepted, so late replies
  can never resurrect a cancelled or replaced result. The public state
  exposes `resultAvailable`; this tool has no download artifact.
- App (`public/js/app.js`): DOM wiring with textContent/value only; mode
  radios switch only the amount field's label and unit; the seven ratio
  preset buttons (1:12–1:18) write into the ratio field, which stays the
  single source of truth; computation runs in a module Worker created from
  a Blob URL of the fixed worker source embedded by the build
  (`dist-preview/js/worker-source.js`, generated from the fixed bytes of
  the core + `public/js/worker-handler.mjs`). Reset restores the SPEC
  defaults and focuses the mode field.
- Pages: `public/index.html` (zh-Hant) and `public/en/index.html` (en),
  with the SPEC-pinned titles, descriptions, H1s, all three FAQ answers,
  preview `robots` noindex/nofollow, same-language home links (`../../` /
  `../../en/`), relative language links, and the draft-loss note.

## Recorded interpretations (SPEC silent or generic-template conflicts)

1. **Candidate metadata:** the generic template asks for canonical +
   hreflang cross-links, but the SPEC's static-content gate pins the
   candidate to robots noindex/nofollow with no production canonical,
   hreflang, or sitemap, and language links carrying paths only. The SPEC
   (the fixed contract) wins. The planned production origin named in the
   SPEC is not configured, so the build refuses `--mode production`.
2. **No report tests:** the SPEC states this tool has no download
   artifact, so unlike sibling tools there is no report module and no
   download button; the third test file covers the static pages instead.
3. **Layout of the core:** the SPEC's implementation section names
   `src/core.mjs`-style paths, while the house file contract
   (IMPLEMENTATION-CHECKLIST) pins `public/js/core/*.mjs`,
   `public/js/app.js`, `scripts/`, `test/`. The house contract governs
   file layout; the SPEC governs behavior. The core is
   `public/js/core/brew.mjs` and a separate `public/js/controller.mjs`
   holds the state machine, matching the sibling tools.
4. **Status copy:** the SPEC pins the dirty, busy, and cancelled status
   strings verbatim; the empty-state line follows the sibling tools'
   wording in both languages. Error strings are the SPEC's fixed table,
   including the two mode-specific amount RANGE messages.

## Verification (see VERIFICATION.md for commands and hashes)

- `npm test`: 34 pass / 0 fail (9 literal core fixtures and 3 controller
  fixtures verbatim from the vendored fixtures.json, hand-derived
  rounding/remainder cases, validation classes and order, formatting,
  page structure).
- `npm run check`: pass (files, package contract, ranges/presets/
  defaults/example vs the vendored fixtures, bilingual metadata, syntax
  incl. the worker concatenation, forbidden-capability scan, core purity).
- `npm run build:preview` run twice: byte-identical (per-file SHA-256).
- `npm run check:generated:preview`: pass (manifest hashes, metadata,
  worker source equals the fixed bytes, robots.txt denies all).
- Loopback HTTP probe: both language pages 200 with correct titles,
  assets 200, traversal rejected.

## Spec errata

None. All 9 literal core fixtures reproduce exactly from the SPEC's own
formulas, and the 3 controller fixtures pass verbatim.

## NOT_RUN

Real-browser rendering/interaction (including the actual Worker + Blob
flow), real devices/touch, assistive tech, measured contrast,
cross-browser comparison, deployment, and the independent nine-aspect
review (pending by design in build-first mode).

## Next owner

Independent reviewer (parent verifies the PR head first). Do not merge,
publish, or deploy from this branch without the reviewer's acceptance and
the coordinator's approval.
