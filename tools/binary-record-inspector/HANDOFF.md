# Binary Record Inspector — production handoff

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Base branch: `codex/initial-publication`, base commit `e078d80932b593f33d90e044d87249ad11e95836`
  (the branch tip at build time; it carries the parent actor's claim commit for
  this task. The brief named the earlier commit `fb6cb6e1…`, which is an
  ancestor of this tip — see the registry note below.)
- Spec: `docs/specs/binary-record-inspector/SPEC.md`,
  `BRIEF.md`, `fixtures.json`, `AUTHOR-CHECK.md`
  (spec `spec-binary-record-inspector-20261109`, v1, 2026-11-09)
- Implementation contract: `docs/IMPLEMENTATION-CHECKLIST.md`,
  `docs/SOURCE-LAYOUT.md`, `docs/TOOL-DESIGN-BASELINE.md`
- Allowed scope: `tools/binary-record-inspector/` only. Nothing outside this
  directory was touched; no registry writes were made by this build.

## Registry

- Task: `labs-prod-binary-record-inspector-20261109`
- Claim: `muse-main-claim-binary-record-inspector-20261109T073018Z-w1d`
  (claimed by the parent actor; workMayStart verified by the parent before
  this build started. This build ran no coordination/registry commands.)
- The parent submits this candidate to the registry after verifying the PR.

## What was built

Pure core (`public/js/core/inspector.mjs`): strict `run(input)` validation and
BigInt decoding exactly per the SPEC — hex tokens, layout grammar, per-row
format/dup/type/bounds order, canonical report serialization (keys sorted by
UTF-16 code units, one trailing LF, 2 MB cap). Generation controller
(`public/js/controller.mjs`): empty/dirty/busy/success/error/cancelled states,
late-generation messages discarded, Worker terminated on cancel/edit/reset and
after a result. The computation runs in a module Worker whose source is the
fixed core + `src/worker-entry.mjs`, embedded by `scripts/build.mjs` into the
generated preview (`dist-preview/js/worker-source.js`). Bilingual static pages
(zh-Hant + en) with the SPEC's exact titles/descriptions/H1/FAQ, preview
noindex, SPEC CSP, file input for raw bytes, 25-row pagination, and download
of the fixed-name report only on success.

## Decisions where the SPEC leaves a choice

- Preview pages carry no canonical/hreflang/sitemap, per the SPEC's explicit
  preview rule ("無 production canonical、hreflang 或 sitemap。語言連結只帶路徑").
  Home links are relative (`../../`, `../../en/`); the SPEC's
  `https://glossquote.com/…` home links are the formal/production plan.
- Layout rows are validated row by row in order (format, duplicate label,
  type, bounds per row); the first error stops the whole run.
- A whitespace-only hex input is EMPTY (no content); a whitespace-only layout
  line is LAYOUT_FORMAT (a malformed row, not an empty layout).
- ROW_LIMIT reports `row: null` (a whole-layout limit, not one row's error).
- Clearing both inputs back to the empty default returns the state to `empty`
  rather than `dirty`.
- The optional file field accepts raw bytes up to 4,096 and fills the hex
  textarea; an oversized file is refused with a message and the draft is left
  unchanged. Late `arrayBuffer` results are discarded by generation.

## Verification

See `VERIFICATION.md` for commands, exit codes, test counts, build
byte-identity, HTTP probe results, and the explicit NOT_RUN list.

## Next owner

Independent reviewer (parent submits the candidate to the registry). The
candidate is build-first: not accepted, not merged, not published, not
deployed. Real-browser evidence (Chrome/Edge, keyboard, zoom, Network/Storage,
download bytes) is NOT_RUN and must be gathered by the reviewer.
