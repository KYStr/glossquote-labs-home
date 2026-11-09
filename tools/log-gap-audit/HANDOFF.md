# Log Gap Audit — production candidate handoff (build-first)

## Fixed source

- Repo: `KYStr/glossquote-labs-home`
- Base: branch `codex/initial-publication`, commit
  `fb6cb6e111bfd5f03a88afdcb730746d81538017`
  (“coordination: claim QC1 five-task production batch after fresh reconciliation”)
- SPEC: `docs/specs/log-gap-audit/SPEC.md` (spec-log-gap-audit-20261109, v1)
- BRIEF: `docs/specs/log-gap-audit/BRIEF.md`
- Fixtures: `docs/specs/log-gap-audit/fixtures.json`
  (7 literal core cases + 3 controller cases, schemaVersion 1)
- Author check: `docs/specs/log-gap-audit/AUTHOR-CHECK.md`

## Registry (claimed by the parent actor — no registry writes by this builder)

- Task: `labs-prod-log-gap-audit-20261109`
- Claim: `muse-main-claim-log-gap-audit-20261109T073018Z-w1d`
- The parent submits this candidate to the registry after verifying the PR.

## Allowed scope

Only `tools/log-gap-audit/` was created or changed. No other path, no
registry write, no deployment, no publication.

## Layout mapping (SPEC src/ → consolidated house format)

The SPEC's implementation section names `src/core.mjs`, `src/controller.mjs`
and `src/app.mjs`. In this consolidated repo those are realized as the house
format used by the other `tools/<slug>/` builds:

- core → `public/js/core/audit.mjs` (pure `run` + `serializeReport`)
- controller → `public/js/controller.mjs` (draft / generation / worker)
- app → `public/js/app.js` (DOM wiring, bilingual strings)
- worker handler → `public/js/worker-entry.mjs` (concatenated after the core
  by `scripts/build.mjs` into the fixed Blob-URL module worker)

The SPEC's worker architecture is honored, not just the file names: the
preview build embeds the fixed core + fixed message handler as a string and
the page creates a module Worker from a Blob URL of that string. A static
module worker (`public/js/worker.mjs`, same core, same contract) is used only
as a fallback when the page is served from `public/` directly without a
preview build. The documented preview path always uses the Blob URL.

## Implementation notes

- Validation order pinned (SPEC gives the field order in §inputsOutputs step 1
  and the general “capacity, then surrogate, then grammar” rule; no fixture
  covers the UNICODE / ROW_LIMIT ordering, so the chosen reconciliation is):
  THRESHOLD → INPUT_LIMIT → EMPTY → ROW_LIMIT → UNICODE → ROW_FORMAT →
  SEQUENCE → TIME. Recorded in VERIFICATION.md for the reviewer to overrule.
- Findings use BigInt deltas; no `Date`, no float. SEQ_GAP carries
  `from`/`to`/`count` as decimal strings. Report is canonical JSON (object
  keys sorted by UTF-16 code units, recursive), compact, one trailing LF,
  UTF-8 without BOM, capped at 2,097,152 bytes (OUTPUT_LIMIT).
- Download is created only on an explicit click (`log-gap-audit-report.json`),
  its Blob URL is revoked within 30 s and immediately on any invalidation.
- Pagination: findings over 25 rows paginate 25 per page; export is never
  truncated. The 1,000-row cap bounds the report well under OUTPUT_LIMIT in
  practice; the cap is still enforced and tested with a synthetic result.
- File input reads bytes locally (`File.arrayBuffer` → UTF-8 decode); a
  buffer arriving after an edit, run, cancel, reset, or newer file load is
  discarded. A read failure is INTERNAL and keeps the draft.

## Spec errata

None — all 7 literal core fixtures reproduce exactly, and no printed fixture
contradicts the SPEC's own rules.

## NOT_RUN (recorded in VERIFICATION.md)

Real-browser rendering/interaction, real devices/touch, assistive tech,
measured contrast, 200% zoom, cross-browser (Chrome/Edge) comparison,
Network/Storage inspection, deployment, and the independent nine-aspect
review (pending by design in build-first mode).

## Next owner

Independent reviewer (parent submits the candidate to the registry first).
