# Calories specification maintenance evidence

Finding: [FH-QC-A-03](https://github.com/KYStr/glossquote-labs-home/blob/4a838d688e60356de444e44212950f5306980b3d/docs/reviews/five-hour-2026-11-11/astra/FINDINGS-INITIAL.md#L23-L30). Fixed source: [PR 283 at 448bd9fc9865](https://github.com/KYStr/glossquote-labs-home/commit/448bd9fc9865fe65f6014b66f4a2e2d54b76f539). Maintenance task: `labs-five-hour-calories-repair-20261111`.

## Changes

- [SPEC.md](SPEC.md) defines result validity and report availability across edits, validation failure, cancellation, supersession, reset and page lifecycle. Download uses the accepted snapshot and revokes the transient Blob URL. The comparison result shows individual alternatives at equal duration. JSON `totalKcal` remains the arithmetic sum of rounded rows.
- [fixtures.json](fixtures.json) adds exact controller inputs, outcomes and report bytes to the three existing scenarios. The first 20 core fixtures, all 14 MET rows, input ranges and the formula are preserved.
- [BRIEF.md](BRIEF.md) aligns comparison and report scope. Original [author evidence](AUTHOR-CHECK.md) and [provenance recheck](PROVENANCE-RECHECK.md) retain their source bytes.

## Author verification

Node v24.14.0. The offline document verification exited 0. It compared the first 20 fixture records byte for byte, compared the pinned table and numeric rules, replayed three controller scenarios through 34 state checkpoints, and compared the two literal canonical report examples. Across the scenarios it verified three successful byte-exact downloads in the test adapter, four refusals and six discarded deliveries. The source-to-candidate Git diff whitespace check emitted no diagnostics.

To reproduce the document check, start from the fixed source linked above. Compare the first 20 entries of `fixtures.json` and the literal 14 rows, bounds and calculation in §2 of `SPEC.md`. For each of the final three entries, start at `expectedInitial` and apply each event in order using §4.3. For a delivery, calculate the recorded job's input independently using §2.5 even when the controller must discard it. Check the entire `expected` snapshot. For a download, check the filename and exact UTF-8 bytes including LF, or confirm the expected refusal. Compare the two §3.3 examples with the first two core fixtures.

| Repaired file | SHA-256 |
| --- | --- |
| SPEC.md | `758fe288720df99da25e5abfbb66ce5b13a2babee8b9bb11696293dee9ba9bb5` |
| fixtures.json | `9e83a7c974d9a75a3a2cc49fca6fcbfb0ed8231c4108190330c0ac2a83bcd7f4` |
| BRIEF.md | `495e75517c68f662b61cafba2a475fdeae8e0fc3c129efd1fe967d92d5047a81` |

Product implementation, product commands, actual browser/OS behaviours including downloads and BFCache, accessibility and privacy runtime inspection, deployment and independent review are **NOT_RUN** at this document-author checkpoint. Independent document review is pending.
