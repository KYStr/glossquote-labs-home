# Run 5 maintenance implementation A

Workdays only. Completed in the isolated `work/` copy for task `labs-run5-legacy-repair-20261110`. The original #225 and #269 PR heads were re-read after verification and matched the pinned source. [Repair verification](../../../tools/workdays-calculator/REPAIR-VERIFICATION.md)

## Source changes

- `docs/specs/workdays-calculator/SPEC.md` documents the raw size, LF and CRLF, negative-zero grammar, directional composition, worker source and matching acceptance cases.
- `tools/workdays-calculator/public/{index.html,en/index.html}` give matching limits and directional composition in both languages.
- `tools/workdays-calculator/public/js/{app.js,controller.mjs,core/core.mjs,worker-handler.mjs}` implement the parser changes and dedicated module Worker. The handler is new.
- `tools/workdays-calculator/scripts/{build.mjs,check.mjs,serve.mjs}` generate and check the fixed worker source and serve the valid Blob-worker CSP token.
- `tools/workdays-calculator/test/{build.test.mjs,controller.test.mjs,core.test.mjs,serve.test.mjs}` cover build output, module thread execution, lifecycle and late replies, calendar boundaries and preview headers. Both fixture files and all original IDs match the original bytes.
- `tools/workdays-calculator/REPAIR-VERIFICATION.md` records final results separately from author history. `tools/workdays-calculator/dist-preview/` contains ten locally generated files for verification. Original #269 did not track this directory.

`npm.cmd test` passed 67/67, `npm.cmd run check` passed, both `npm.cmd run build:preview` invocations passed with matching bytes, and `npm.cmd run check:generated:preview` passed. All final commands exited 0. The environment guard matched before and after. Real browser Worker, UI, download and Network/Storage evidence remains NOT_RUN. No publication, merge, deployment, or registry write was performed by this implementation.
