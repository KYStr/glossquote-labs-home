# Copy completion deadline correction

Original candidate: 00ded50baa2caa827c0d3f737aa5ffd4d32acb57. Nonauthor controlled-clock test observed 2999ms success control PASS and 3001ms fallback expectation FAIL when the timeout callback was delayed. No native clipboard or BFCache claim.

Correction: capture one deadline at request acceptance; completion checks current time against the same deadline, returns fallback at or after 3000ms, and consumes its token so later callbacks cannot write UI. Timer uses remaining original duration. Existing invalidation and OS-cancellation disclaimer remain unchanged.

Author affected 2999/3000/3001 controlled cases PASS, 18 total groups PASS; original failure evidence retained separately by the independent reviewer. No new numeric quality score.
