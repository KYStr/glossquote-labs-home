# Handoff — Module Dependency Reduction (dependency-reduction)

Build-first production candidate in the consolidated format. Not accepted,
not merged, not published. Next owner: independent reviewer (the parent
submits this candidate to the registry).

## Fixed source

- Repo: `KYStr/glossquote-labs-home`
- Base branch: `codex/initial-publication`
- Base commit: `fb6cb6e111bfd5f03a88afdcb730746d81538017`
- Spec: `docs/specs/dependency-reduction/SPEC.md` (`spec-dependency-reduction-20261109`, v1)
- Also read in full: `docs/specs/dependency-reduction/BRIEF.md`,
  `docs/specs/dependency-reduction/fixtures.json`,
  `docs/IMPLEMENTATION-CHECKLIST.md`, `docs/SOURCE-LAYOUT.md`,
  `docs/TOOL-DESIGN-BASELINE.md`
- Candidate branch: `muse/dependency-reduction-production-20261109`

## Registry

- Task: `labs-prod-dependency-reduction-20261109`
- Claim: `muse-main-claim-dependency-reduction-20261109T073018Z-w1d`
  (claimed by the parent actor; workMayStart verified by the parent.
  No registry commands were run from this build.)
- The parent submits the candidate commit / PR to the registry.

## Allowed scope

Only `tools/dependency-reduction/` was created or modified. Nothing outside
that directory was touched; the registry was not written from here.

## What was built

Pure core (`public/js/core/graph.mjs`): schema validation, the pinned
validation order (capacity → surrogate → grammar per field, modules before
edges), DFS cycle detection from ASCII-sorted starts, Kahn stages in rounds,
BFS alternate-path witnesses (shortest, ASCII tie-break), and the canonical
report serializer (recursive UTF-16 key sort, trailing LF, 2,097,152-byte
cap). Pure controller (`public/js/core/controller.mjs`): the SPEC state
machine (empty/dirty/busy/success/error/cancelled) with generation IDs, so a
late result can never revive an old result or overwrite a newer error.
Browser app (`public/js/app.js`): DOM wiring with textContent/value only;
the audit runs in a real module Worker built from a fixed Blob-URL string
that imports the shipped core module — user content never participates in
code. Bilingual static pages (zh-Hant / en) with the SPEC-pinned H1, title,
and description; 25-row pagination for long result tables; download only on
explicit user action, Blob URL revoked within 30 seconds.

## Deliberate readings (SPEC silent or template-conflicting)

- Invalid module name → error code `ID` (SPEC lists the check as 「名稱 ID」;
  the other codes are named in the same sentence).
- Edge lines are validated row by row in the order shape → unknown endpoint
  → duplicate; the first failure wins.
- `ROW_LIMIT` reports the first row beyond the limit (101 for modules, 401
  for edges); `EMPTY` and `INPUT_LIMIT` report row `null`.
- Candidate pages carry NO production canonical or hreflang, per the SPEC
  tests section ("無 production canonical、hreflang 或 sitemap。語言連結只
  帶路徑。"); language links are plain path links and home links are
  `../../` / `../../en/`. This overrides the generic file-contract wording.
- `OUTPUT_LIMIT` is checked when the report is serialized at success time:
  the result is still displayed, but the download is disabled with a notice.
  With the input caps in force the report cannot reach the cap in practice.
- The SPEC's `src/` layout (core/controller/app under `src/`) is superseded
  by the house file contract used by this run: `public/js/core/*.mjs` +
  `public/js/app.js` (+ `public/js/strings.mjs` for the bilingual strings).

## Verification summary

33 tests pass (7 literal SPEC fixtures + 3 controller fixtures with a fake
Worker + validation/limit/graph/serialization cases). `npm run check` passes.
`build:preview` run twice is byte-identical (aggregate SHA-256
`6014780e67b158ae1e07be1ea952dfd6df3931826839c8788037669b18cc6c35`).
`check:generated:preview` passes. Loopback HTTP probe: `/` and `/en/` 200,
JS 200, 404 for unknown paths and traversal. See VERIFICATION.md for the
full record, including the explicit NOT_RUN list.

## Spec errata

None found. All 7 core fixtures and all 3 controller fixtures reproduce
exactly as printed.
