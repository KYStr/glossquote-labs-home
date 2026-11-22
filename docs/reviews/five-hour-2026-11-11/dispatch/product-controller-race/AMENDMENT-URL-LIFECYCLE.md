# Conditional narrow amendment: Worker construction cleanup

Within the same eight tools and actual claim named in TASK.md, also inspect the app.js createWorker factory. Independent review found a shared baseline pattern where createObjectURL succeeds but a synchronous Worker-constructor failure leaves that URL unreleased. Apply this amendment only to listed tools where fixed-source code and an offline injected-platform test confirm this failure. Record a tool that already cleans up correctly as unchanged; do not infer failure from a name.

Allow the smallest createWorker lifecycle repair, meaningful regression tests and required generated artifacts/evidence. Release the newly created URL when construction fails, propagate the original failure for retryable controller behavior, retain normal termination cleanup, and make cleanup idempotent. Do not alter formulas, fixtures, copy, other app behavior or dependencies. No workdays/cooking/wallpaper/ping changes under this claim.

Test failed constructor, normal termination and a successful retry using deterministic fakes. This cannot substitute for real browser resource measurements or full product acceptance. Preserve all original scope, independent review, provenance, safe background execution and deadline requirements. The original fixed nine-aspect rubric remains unchanged.
