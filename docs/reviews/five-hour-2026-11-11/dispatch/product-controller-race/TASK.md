# labs-five-hour-product-controller-race-20261111

## Scope and ownership

Repair the independently confirmed stale Worker callback defect in eight existing products: age-calculator, bill-split-calculator, clothing-size-converter, dew-point-calculator, feels-like-temperature, period-cycle-calculator, race-time-predictor, salary-converter. This is continuation of existing candidates, not new production or ready-stock consumption. Actual repair owner: local-codex:01a1c8a9-dc04-7bc2-b1c2-e2e445213844; requested GPT-6.1 Sol / medium. Preserve original cloud owners, commits and PRs. Existing queued clothing specification repair is not claimed and remains queued.

Fixed source: KYStr/glossquote-labs-home@448bd9fc9865fe65f6014b66f4a2e2d54b76f539 (PR283), tools/<each listed slug>/. Do not touch cooking, wallpaper, ping or workdays; the first three have other active owners, workdays passed this race test.

## Confirmed failure and required behavior

The old worker's callback compares its returned generation against its own captured generation, but omits comparison with the controller's current generation or active worker identity. When a new computation is busy, a retained old success or validation-error callback changes state and terminates the current worker. Independent Astra and primary reproduced the eight routes per affected product using controlled fake Workers; this is not a claim about real browser scheduling frequency.

Require stale replies to leave the current job busy, result/error absent, report unavailable, and current worker alive. Only the current worker/current generation response may settle that job. Exercise old success/error across run-again, cancel-run, edit-run and reset-run, plus current success, wrong response generation and stale onerror controls. Use workdays as a reference for identity/generation checks, not as a source to copy wholesale.

## Allowed changes and procedure

Read current remote AGENTS, handbook, coordination protocol and registry. Wait for the primary scheduler's exclusive slot. The actual owner must register this maintenance task with this fixed public brief and source, acknowledge if required, claim/read back operationId/requestHash/claimId/owner, then start before production edits. No duplicate claim or signing for anyone else. Preserve the original product bytes in a fixed migration commit before the repair.

Use only this dispatch folder's work/evidence files locally. Publish on one separate codex/ branch and PR in the central repo. Allowed repository paths are the eight listed tools and docs/reviews/five-hour-2026-11-11/product-controller-race/. Change only controller guard logic, meaningful regression tests, required regenerated preview artifacts and handoff evidence. Do not change core formulas, fixtures, inputs, report format, user copy, shared catalog/homepage, dependencies or specification. Do not fix unrelated findings under this task.

## Acceptance and reporting

Predeclare all nine product aspects from the fixed specifications: functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility. The controller fix must pass independent retained-callback regression, original offline tests, static checker, generated-file check, two identical builds, and exact diff/provenance review. Reuse unchanged results with their real fixed evidence; do not relabel old tests as new. Do not infer full nine-aspect acceptance from these offline checks.

No local interactive browser, native UI, focus, keyboard/IME, clipboard, audio or dialogs. CLI subprocesses must hide windows. Real browsers, Network/Storage, native downloads and device checks remain NOT_RUN_USER_FOCUS_INCIDENT until independently verified. No merge, deploy or accepted status while required checks are incomplete.

No recursive delegation, credential reading, global/system Git/auth changes, persistent environment changes, dependency installation or paid services. Run Git-settings guard around publication and persistent-environment guard around long automation. Stop on source/owner conflict, required scope expansion, new permission, or repeated unresolved failure. Report exact files, commands/exits, candidate commit/PR, claim, known risks and NOT_RUN. Start saving by 2026-11-11T07:22:08Z; hard stop 07:37:08Z.
