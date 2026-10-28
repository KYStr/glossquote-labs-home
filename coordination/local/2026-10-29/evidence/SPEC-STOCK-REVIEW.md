# Local specification stock review

Inventory date: 2026-10-29. This review distinguishes legacy local document completeness from the new GitHub coordination protocol's `spec ready` state. It does not create, register, or approve a production task.

## Finding

**No locally evidenced, complete, unconsumed production plan was found. The global protocol inventory remains unknown, not zero.**

The local scan found numbered product folders `01-…` through `61-…`, but none beyond 61. The folders 42–61 already have original feature-thread identities and actual M1 or later candidate/release work recorded in the 10/27 status, their HANDOFFs, and the completion evidence. Earlier numbered folders likewise appear in the established product/status/thread history. These are legacy work already produced, claimed, released, or blocked—not free plans to reissue.

Every numbered folder 01–61 has the nine expected legacy documents by file presence: `START-HERE.md`, `PRODUCT.md`, `TECHNICAL.md`, `UX-SEO.md`, `ACCEPTANCE.md`, `TASKS.md`, `TASK-ENTRY.md`, `AGENTS.md`, and `HANDOFF.md`. This was a structural presence scan, not a line-by-line content-completeness or quality approval for all 61 folders. The cached registry is rev0 with no spec/task records; the later coordinator ACK receipt records only one local coordinator actor at rev1. There is still no original feature-owner or cloud ACK/adoption, so it cannot attest that any legacy document satisfies the new protocol or that an original owner has adopted it.

`tool-projects/FUTURE-IDEAS.md` explicitly says its listed candidates do not yet have complete blueprints and must not be opened as development tasks. The top-level `NEXT-QUEUE.md`, `NEW-TOOLS-2026-10-19.md`, `NEW-BATCH-2026-10-22.md`, `BATCH-20-2026-10-23.md`, and `tool-projects/STATUS.md` describe named work that already has original threads or candidate activity. No separate unnumbered, complete plan with no production/thread identity was identified in those local queue sources.

The local catalog has **47 `published` and 9 `draft`** entries. The nine drafts are `image-contact-sheet`, `audio-cue-notes`, `image-overlay`, `moving-boxes`, `flashcards`, `tournament-scheduler`, `project-backplan`, `contact-cards`, and `agenda-conflicts`. These are catalog cards, not ready specifications. They map to IDs 45, 51, 53, 55, 56, 58, 59, 60, and 61; each has an existing local feature thread, candidate work or a specific blocker. A draft status neither proves readiness nor makes the underlying work unclaimed.

The cached remote registry (`revision: 0`, fetched 2026-10-28) lists `specs: []`, `tasks: []`, and `actors: []`, with `inventoryComplete: false`, null local/cloud reconciliations, and `readyUnconsumedCount: null` in the accompanying observation. The root coordinator later ACKed revision 1 (`ack-receipt.json`, actor `local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf`); that is not an original feature owner or cloud actor ACK and did not reconcile inventory. The protocol documentation explicitly says the ready count is unknown rather than zero until both inventories are reconciled. Consequently:

- Locally identified separate unconsumed complete plans: **0 found in the scanned local folders and queue documents**.
- Globally verified `spec ready` inventory: **unknown / not reconciled**.
- No old test count, browser PASS, primary acceptance statement, or catalog draft was converted to a score of 90 or a new-protocol acceptance.

## Legacy documents versus the new ready bar

The local product template gives a useful legacy baseline: target problem, scope, workflow, input/output, implementation approach, acceptance scenarios, test commands, handoff, environment/privacy constraints and owner folder. Having those files—and even a historical local test run—does not establish the new status.

Under `.runs/cloud-local-onboarding-2026-10-29/remote/docs/CLOUD-LOCAL-WORKFLOW.md`, a ready spec must be committed on GitHub and contain target, scope, use flow, input/output, implementation plan, complete acceptance, tests, and handoff. It must be checked by a reviewer other than its author. The same protocol separately requires each **pre-agreed required acceptance dimension** for the same fixed candidate commit to have evidence and an individual score of at least 90; averaging, a green test suite, or an unrun requirement cannot substitute. No local file scan or old owner test report supplies those new registry records or per-dimension scores.

Static review of `remote/scripts/coordination-core.mjs` and `remote/docs/COORDINATION-COMMANDS.md` confirms a safe representation path for legacy work:

- `register-spec` starts at `draft`; `mark-spec-ready` requires all eight named section booleans, one nonempty evidence string/timestamp, and a reviewer different from the author. Those are completeness/independence attestations, not retroactive 90-point ratings. The core does not inspect document content or store a separate evidence reference per section; the human review report should identify the exact GitHub document commit and discuss each required section.
- `register-task` creates an unowned `ready` task, but a claim is rejected until both inventories reconcile. During migration, the original ACKed actor can use `adopt-existing`; it assigns the existing owner/checkpoint and makes the task `blocked`, while an incomplete spec is reserved/consumed rather than counted as ready stock.
- `reconcile` requires registered IDs, includes active tasks and unresolved pending work, and `inventorySummary` keeps the count `null` while two-sided reconciliation is incomplete. The docs instruct operators to set `inventoryComplete:false` when anything is unknown.
- `review` can set `accepted` only for the submitted exact candidate, with an independent non-contributor, every predeclared aspect evidenced and scored at least 90, and required checks complete. Legacy test totals or past live publication cannot populate that record.
- The `release` transition releases task ownership; it is not a website publication action. New tasks initialize `publication:null`, and the reviewed core exposes no publication-record transition. Therefore retain historical product stage (source commit, live commit/URL, homepage status, external-review state, and date) in the inventory/evidence report. Do not map a published legacy tool to `accepted` or `released` merely to preserve its history. If an old active item is imported, register it with its historical evidence reference and checkpoint it as `blocked`; keep the publication facts separate.

One limitation for the report writer: `reconcile` checks submitted IDs exist, enforces inclusion of active owned tasks, and requires known pending tasks resolved before `inventoryComplete:true`; it cannot independently prove that an operator's task/spec lists contain every unclaimed item that the external inventory missed. The committed inventory evidence must therefore remain exhaustive. This is not a reason to invent acceptance scores or modify the core in this read-only task.

In particular, old `PASS_SCOPED` browser totals for tools 42–61 describe only the recorded local browser scope. The 10/27 status continues to list native/device and full production Network/Storage gaps, and all 11 published tools remain awaiting external review. Those results are useful historical inventory evidence but are **not** new protocol spec-review scores and do not establish full acceptance.

## Cloud overlap and stock implications

The supplemental `.runs/cloud-local-onboarding-2026-10-29/cloud-labs-reports.json` board capture has historical maker reports for all five suspected overlaps: audio-cue-notes (51), flashcards (56), tournament-scheduler (58), contact-cards (60), and agenda-conflicts (61). It also has reviewer reports covering those candidates. They are stale, have no GitHub task/claim IDs, and do not establish a current owner or protocol adoption. The separate six-candidate packaging report does not list candidate identities, leaving its sixth item unknown. Treat these as duplicate-work evidence that must be reconciled, not ready plan stock. Exact candidate references and next steps are in [`INVENTORY-42-61.md`](INVENTORY-42-61.md).

The new protocol requires no new production claim until both local and cloud inventory are complete, original actors are identified, duplicate candidates are compared without discarding either side, and the actual owner adopts/registers existing work. Parent-owned GitHub access and original-owner confirmation remain necessary to establish the global ready count. The appropriate inventory value remains **unknown**, not 0, until that reconciliation is complete.

## Evidence read

- `.runs/cloud-local-onboarding-2026-10-29/remote/AGENTS.md`
- `.runs/cloud-local-onboarding-2026-10-29/remote/docs/CLOUD-LOCAL-WORKFLOW.md`
- `.runs/cloud-local-onboarding-2026-10-29/remote/docs/LOCAL-CODEX-HANDOFF.md`
- `.runs/cloud-local-onboarding-2026-10-29/remote/coordination/work-registry.json`
- `.runs/cloud-local-onboarding-2026-10-29/dot-control-labs.json`
- `.runs/cloud-local-onboarding-2026-10-29/cloud-labs-reports.json`
- `.runs/cloud-local-onboarding-2026-10-29/ack-receipt.json`
- `.runs/cloud-local-onboarding-2026-10-29/remote/scripts/coordination-core.mjs` and `remote/docs/COORDINATION-COMMANDS.md`
- `tool-projects/00-home/catalog.json` (counted statuses and listed exact draft slugs)
- `tool-projects/FUTURE-IDEAS.md`, `NEXT-QUEUE.md`, `STATUS.md`, `BATCH-20-2026-10-23.md`, `NEW-TOOLS-2026-10-19.md`, `NEW-BATCH-2026-10-22.md`, `CONTINUOUS-DELIVERY-GOAL.md`, and `ROADMAP.md`
- Folder/file-presence scan of `tool-projects/01-*` through `tool-projects/61-*`; no product files were changed.

No product tests, builds, browser/UI, network, credentials, GitHub writes, or persistent environment operations were performed.
