# Handoff — Retry Time Budget Planner (build-first production candidate)

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec: `docs/specs/retry-budget/SPEC.md` (spec-retry-budget-20261109, v1),
  `docs/specs/retry-budget/BRIEF.md`, `docs/specs/retry-budget/fixtures.json`,
  `docs/specs/retry-budget/AUTHOR-CHECK.md`
- Spec source commit: the consolidation branch `codex/initial-publication` at
  `e078d80` (the branch tip at build time; the brief's stated base
  `fb6cb6e111bfd5f03a88afdcb730746d81538017` is an ancestor of it — the branch
  advanced by coordination commits after the brief was written).
- Implementation scope: `tools/retry-budget/` only. Nothing outside this
  directory was touched; the coordination registry was not written.

## Registry

- Production task: `labs-prod-retry-budget-20261109`
- Claim: `muse-main-claim-retry-budget-20261109T073018Z-w1d` (claimed by the
  parent actor; workMayStart verified by the parent)
- This handoff records the taskId and claimId; the parent submits the
  candidate to the registry after verifying the PR head.

## What was built

A bilingual (zh-Hant / en) static tool that plans a serial retry timeline
under a time budget, assuming every attempt uses its full timeout:

- Pure core (`public/js/core/retry.mjs`): strict field validation (capacity,
  unpaired surrogate, grammar, range — per field in the SPEC's field order),
  the delay model (attempt 1 delay 0; later delays `min(maxDelay,
  initialDelay × factor^(i−2))` iterated with BigInt, capped only after an
  attempt is accepted), and canonical report serialization (keys sorted by
  UTF-16 code units, one trailing LF, 2,097,152-byte limit → OUTPUT_LIMIT).
- Controller (`public/js/controller.mjs`): empty / dirty / busy / success /
  error / cancelled state machine with generation IDs; only a reply carrying
  the current generation while busy is accepted, so late replies can never
  resurrect a cancelled or replaced result.
- App (`public/js/app.js`): DOM wiring with textContent/value only; the
  computation runs in a module Worker created from a Blob URL of the fixed
  worker source embedded by the build (`dist-preview/js/worker-source.js`,
  generated from the fixed bytes of the core + `public/js/worker-handler.mjs`).
  Download is `retry-budget-report.json`, created only on an explicit click,
  revoked within 30 s or earlier when the result is invalidated.
- Pages: `public/index.html` (zh-Hant) and `public/en/index.html` (en), with
  the SPEC-pinned titles, descriptions, H1s, and both FAQ answers; preview
  `robots` noindex, nofollow; same-language home links (`../../` /
  `../../en/`); relative language links; a draft-loss note next to the
  language links.

## Recorded interpretations (SPEC silent or generic-template conflicts)

1. **Candidate metadata:** the task brief's generic template asks for
   canonical + hreflang cross-links, but the SPEC's "兩語靜態內容與正式
   gate" section pins the candidate to robots noindex, nofollow with "無
   production canonical、hreflang 或 sitemap" and language links carrying
   paths only. The SPEC (the fixed contract) wins: the candidate pages carry
   no canonical and no hreflang. Formal canonical/hreflang/sitemap belong to
   the production build under the real origin, which is not approved here.
2. **Validation order:** the SPEC says "先容量、再 surrogate、再該欄文法"
   and "依 budget、timeout、attemptLimit、initialDelay、factor、maxDelay
   驗證". Implemented field-major: for each field in that order, EMPTY /
   INPUT_LIMIT, then UNICODE, then INTEGER_FORMAT, then RANGE. A test pins
   the cross-field order (an earlier field's grammar error beats a later
   field's range error).
3. **Build output directory:** `dist-preview/` (per the SPEC's test gate),
   not the `dist/` used by run-2 tools. `scripts/serve.mjs` accepts
   `--host` / `--port` / `--dir` as the SPEC's gate invokes it.
4. **Pagination:** the SPEC requires 25-row paging for tables over 25 rows;
   attemptLimit caps at 16, so the table can never exceed one page. The
   pager is still implemented generically (and hidden on a single page).

## Verification (see VERIFICATION.md for commands and hashes)

- `npm test`: 53 pass / 0 fail (7 literal core fixtures verbatim from
  fixtures.json, 3 controller fixtures, hand-derived boundaries, validation
  classes, BigInt growth, report serialization).
- `npm run check`: pass (files, package contract, ranges/defaults/example
  vs fixtures.json, bilingual metadata, syntax incl. the worker
  concatenation, forbidden-capability scan, core purity).
- `npm run build:preview` run twice: byte-identical (per-file SHA-256).
- `npm run check:generated:preview`: pass (manifest hashes, metadata,
  worker source equals the fixed bytes, robots.txt denies all).
- Loopback HTTP probe: both language pages 200 with correct titles,
  assets 200, traversal rejected.

## Spec errata

None. All 7 literal core fixtures reproduce exactly from the SPEC's own
rules, and the 3 controller fixtures pass verbatim.

## NOT_RUN

Real-browser rendering/interaction (including the actual Worker + Blob
download flow), real devices/touch, assistive tech, measured contrast,
cross-browser comparison, deployment, and the independent nine-aspect
review (pending by design in build-first mode).

## Next owner

Independent reviewer (parent submits this candidate to the registry first).
Do not merge, publish, or deploy from this branch without the reviewer's
acceptance and the coordinator's approval.
