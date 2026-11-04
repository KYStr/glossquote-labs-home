# Producer verification — not independent product scoring

Observed 2026-10-30 UTC. Runtime manifest SHA-256:
`98ba76a8091b9d5728ba9c324c9d41cbcf7785357cf9cdb891cf42dee77ec62a`.

## r4 lifecycle correction

Independent source review found OM-LIFECYCLE-003: a pending removal confirmation retained its closure across pagehide and persisted pageshow, permitting a stale acceptance to remove a dimension from the fresh blank draft. The r4 source discards the confirmation action, return-focus reference and open modal before pagehide and every reset. Ordinary cancel/Escape semantics are unchanged. The actual app/controller controlled-DOM regression and ordinary cancel control pass; together with the prior affected focus and isolated build tests, nine tests pass at 06:45 UTC. Static check and 13-file build pass. These controlled events are not a real BFCache observation. The native BFCache removal scenario was blocked by the execution tool and remains NOT_RUN; no alternate action bypassed it. The r3 candidate stays preserved in its original commit. All independent scores remain null.

## Historical r3 affected correction

SPEC L56 requires focus to stay on the same dimension movement button when it reaches the boundary. The r2 source instead focused the name field. This r3 changes movement buttons to semantic aria-disabled with a guarded inert handler, retaining native button focus, and adds matching visual styling. Two controlled-DOM tests execute the actual fields function and check focus identity, preserved input and inert boundary activation; these are not browser tests. Five isolated build tests also passed (7 affected tests total), with syntax/static check and build successful. Download core and export modules are unchanged; the earlier 19 tests and browser downloads below are explicitly historical r2 evidence, not a new full r3 execution. Managed desktop Chromium real-keyboard verification reproduced the r2 defect at 06:09:15 UTC: second dimension Up + Return moved it first but focused its name. Same-r3 at 06:09:38 Up + Return retained focus on d2-up and the accessibility tree exposed disabled; at 06:09:44 Space + Return left order and focus unchanged; at 06:09:50 Down + Return returned the dimension to the bottom with focus on disabled d2-down. Values were preserved, valid preview count remained four and no result was generated. OM-FOCUS-002 is closed only for these finite ordering cases, not full accessibility or rubric acceptance.

## Earlier r2 execution

- `node scripts/check.mjs`: `CHECK_PASS_STATIC_LIMITED` (syntax, translation keys, limited prohibited-API source checks).
- `node scripts/build.mjs`: 13 allowlisted preview outputs; no deployment.
- `node --test test/*.test.mjs`: 19 test groups passed, zero failures. Exact output is in `evidence/core-test.log`.
- Literal output fixtures cover ordering, immutable schemas/getter avoidance, Unicode and raw-length boundaries, reachable 1980/2000/2016 product boundaries, CSV formula prevention, output byte limit, stale generation and deadline, object URL lifetime and cleanup.
- Isolated T09 fixtures cover byte-identical clean builds, preserved unknown outputs, missing source, symbolic/hard linked sources and directory-link rejection.

## Browser limitation

Initial managed desktop-browser observation produced a real complete four-row JSON download, but incorrectly displayed EXPORT_FAILED. The producer identified an unbound native timer receiver in DownloadLease and created this r2 wrapper fix plus a strict receiver regression test. Same-r2 managed desktop Chromium verification at 05:54:33–05:55:09 UTC succeeded for the normal bilingual-example data in the English interface: real JSON and CSV downloads, correct handed-to-browser message, both download controls disabled during grace and re-enabled after ten seconds; Clear confirmation returned two empty dimensions, no results and focus on the first name field. JSON SHA-256 `77d89831df820f2c9a1f189c4f6e2b4018d124fd90f7470ef64bf0fa580f02b2` matched the full four rows; CSV SHA-256 `280fa9a424fa2b10912dfd212a1e2692ece17a7cba9916c38646582e0134ebe9` parsed to the header plus four exact rows. OM-EXPORT-001 is closed only for this observed normal example. Internal URL revocation, full privacy/security/accessibility and remaining lifecycle cases were not observed. This is finite execution evidence, not an independent product score.

## Remaining acceptance work

All original product dimensions require independent review; the producer assigns no scores:

| Dimension | Independent score | Evidence boundary |
|---|---:|---|
| functionality | null | core fixtures plus finite normal-example browser evidence; full review pending |
| boundaries | null | unit fixtures only; browser lifecycle pending |
| privacy | null | source inspection only; real network/storage observation pending |
| security | null | bounded schemas, quoting and local CSP; independent validation pending |
| usability | null | normal-example download/clear observed; full journey pending |
| accessibility | null | keyboard, zoom, screen reader not yet exercised |
| localization-seo | null | bilingual dictionaries/noindex source; rendered review pending |
| toolchain-provenance | null | fixed spec, built-in-only reproducible preview; independent review pending |
| compatibility | null | desktop browsers, BFCache and background throttling not yet exercised |

Additional source-review gaps: raw total-byte boundaries must be distinguished from reachable fully valid combinations under all simultaneous limits; JSON serialization has a final byte cap after construction of an input-bounded document, not a streaming serializer. Formal HTTPS hosting headers are NOT_RUN; local preview headers are not proof of deployment configuration.
