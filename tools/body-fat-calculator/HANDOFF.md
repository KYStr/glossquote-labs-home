# Handoff — Body Fat Calculator （體脂率計算機） (build-first production candidate)

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec: `docs/specs/body-fat-calculator/SPEC.md` (spec-body-fat-calculator-20261109, v1),
  `docs/specs/body-fat-calculator/BRIEF.md`, `docs/specs/body-fat-calculator/fixtures.json`,
  `docs/specs/body-fat-calculator/AUTHOR-CHECK.md`
- Spec candidate commit: `e3be9220520a92b9b7b0de37c03bb0f2f26de76c`
  (draft spec PR https://github.com/KYStr/glossquote-labs-home/pull/147).
  The spec PR is not merged into the implementation base, so the spec's
  fixtures.json is vendored verbatim into `test/fixtures.json` and the
  tests read that copy.
- Spec task id: `labs-body-fat-calculator-spec-20261109`
- Implementation base: `codex/initial-publication` @
  `b7ffa5a133ac7a2b3221d0807e61c2c3faa48442` (branch tip at build time).
- Implementation scope: `tools/body-fat-calculator/` only. Nothing outside
  this directory was touched; no registry/coordination commands were run.

## What was built

A bilingual (zh-Hant / en) static tool that estimates body fat percentage
with the US Navy circumference method:

- Pure core (`public/js/core/bodyfat.mjs`): strict own-data validation
  (unknown / missing / wrongly typed / accessor-backed fields are SCHEMA;
  per field in the SPEC's order sex, heightCm, neckCm, waistCm, hipCm,
  weightKg: capacity INPUT_LIMIT, unpaired surrogate UNICODE, then EMPTY /
  DECIMAL_FORMAT / RANGE, ENUM for sex, NOT_APPLICABLE for a non-empty
  male hip), the cross-field log-domain check in centimetres, the Navy
  formulas on inches (centimetre combinations divided by 2.54, published
  constants 86.010/70.041/36.76 and 163.205/97.684/78.387), the
  plausibility gate 0 < BF% < 75 on the unrounded value
  (IMPLAUSIBLE_RESULT), the SPEC's r1 half-up rounding applied once per
  output (fat mass from the unrounded BF%, lean mass from the weight minus
  the rounded fat mass), ACE categories from the rounded percentage, and
  canonical report serialization (keys sorted by UTF-16 code units, one
  trailing LF, 2,097,152-byte limit → OUTPUT_LIMIT).
- Controller (`public/js/controller.mjs`): empty / dirty / busy / success
  / error / cancelled state machine with generation IDs; only a reply
  carrying the current generation while busy is accepted, so late replies
  can never resurrect a cancelled or replaced result.
- App (`public/js/app.js`): DOM wiring with textContent/value only;
  switching sex to male clears the hip draft and disables the hip field,
  as the SPEC pins; the computation runs in a module Worker created from
  a Blob URL of the fixed worker source embedded by the build
  (`dist-preview/js/worker-source.js`, generated from the fixed bytes of
  the core + `public/js/worker-handler.mjs`). Download is
  `body-fat-report.json`, created only on an explicit click, revoked
  within 30 s or earlier when the result is invalidated. The fixed
  estimate disclaimer is shown in the result area and in the static
  content, next to the result.
- Pages: `public/index.html` (zh-Hant) and `public/en/index.html` (en),
  with the SPEC-pinned titles, descriptions, H1s, measurement hints,
  disclaimer, and both FAQ answers; preview `robots` noindex, nofollow;
  same-language home links (`../../` / `../../en/`); relative language
  links; a draft-loss note next to the language links.

## Recorded interpretations (SPEC silent or generic-template conflicts)

1. **Candidate metadata:** the generic brief template asks for canonical
   + hreflang cross-links, but the SPEC's "兩語靜態內容與正式 gate"
   section pins the candidate to robots noindex, nofollow with "無
   production canonical、hreflang 或 sitemap" and language links carrying
   paths only. The SPEC (the fixed contract) wins: the candidate pages
   carry no canonical and no hreflang. Formal canonical/hreflang/sitemap
   belong to the production build under the real origin, which is not
   approved here.
2. **File layout:** the SPEC's implementation section sketches
   `src/core.mjs` / `src/controller.mjs` / `src/app.mjs`, while the
   handbook file contract (docs/IMPLEMENTATION-CHECKLIST.md) pins
   `public/js/core/*.mjs`, `public/js/controller.mjs`, and
   `public/js/app.js`. The handbook layout is followed; behaviour is
   unchanged.
3. **sex capacity/surrogate checks:** the SPEC pins the capacity
   (INPUT_LIMIT) and unpaired-surrogate (UNICODE) checks for "每欄"
   (every field) before that field's own value check, and states the same
   explicitly for the male hipCm special case. The sex field is treated
   the same way: an overlong or surrogate-bearing sex string reports
   INPUT_LIMIT / UNICODE before ENUM. A test pins this reading.
4. **Build output directory:** `dist-preview/` (per the SPEC's test
   gate). `scripts/serve.mjs` accepts `--host` / `--port` / `--dir` as
   the SPEC's gate invokes it.

## Verification (see VERIFICATION.md for commands and hashes)

- `npm test`: **74 pass / 0 fail** (12 literal core fixtures verbatim
  from fixtures.json, 3 controller fixtures, hand-derived endpoints and
  boundaries, validation classes and field order, invariants sweep,
  report serialization).
- `npm run check`: pass (files, package contract, fields/ranges/defaults/
  example vs fixtures.json, bilingual metadata incl. pinned hints,
  disclaimer and FAQs, syntax incl. the worker concatenation,
  forbidden-capability scan, core purity).
- `npm run build:preview` run twice: byte-identical (per-file SHA-256).
- `npm run check:generated:preview`: pass (manifest hashes, metadata,
  worker source equals the fixed bytes, robots.txt denies all).
- Loopback HTTP probe: both language pages 200 with the SPEC-pinned
  titles, assets 200, traversal rejected.

## Spec errata

None. All 12 literal core fixtures reproduce exactly from the SPEC's own
rules (independently recomputed from the pinned formulas before the
implementation was written), and the 3 controller fixtures pass verbatim.

## NOT_RUN

Real-browser rendering/interaction (including the actual Worker + Blob
download flow), real devices/touch, assistive tech, measured contrast,
cross-browser comparison, deployment, and the independent nine-aspect
review (pending by design in build-first mode).

## Next owner

Independent reviewer (parent submits this candidate to the registry
first). Do not merge, publish, or deploy from this branch without the
reviewer's acceptance and the coordinator's approval.
