# Box Shadow Builder — limited independent technical review

Candidate: `00ded50baa2caa827c0d3f737aa5ffd4d32acb57`, PR10, `tools/box-shadow-builder/`.
Specification: `ee9683cb60a4823e14768a26e24b782f59c6acac`, sections 3.3 and T08.
Reviewer: `cloud-dot:01a17302-361a-7582-accd-8565c98f6033:/root/verify_cloud_preview_access`, not a product contributor.

## Identity and scope

The official complete Git tree was compared against all 20 local candidate files: 67,494 bytes, every Git blob and file size exact. The isolated copy uses those bytes. Read the existing 15 author test groups, clean-copy checks and finite author browser observations; did not rerun them or relabel them independent. Read core, controller, DOM wiring, CSS and fixed nine-aspect contract.

## BOX-COPY-LATE-001 — revision required

The real Controller's copy completion `finish` checks generation, request ID and current result but never checks its original three-second deadline. A delayed timer can therefore let a late Promise publish success.

Independent controlled reproduction: normally generate the valid default numeric fields with HEX #112233, call copy with a pending Promise, retain the scheduled 3000ms callback without delivering it, advance the injected clock, then resolve the Promise. At 2999ms the `copied` positive control passes. At 3001ms the expected `copyFallback` fails: actual state is `copied`. Both use the same real Controller and ordinary method sequence, with no direct result injection. New tests: two, one pass and one red.

This contradicts the fixed application-wait bound in section3.3: over three seconds is unconfirmed/fallback and expired completion must not update success. The original owner has acknowledged the defect and is preparing a separate revision. A narrow remedy is one request deadline captured once and checked at completion, while preserving generation/token guards and original bounds. Do not infer cancellation of the OS clipboard operation.

This is a controlled clock/Promise contract counterexample, NOT an observed native clipboard or BFCache failure. The current native environment's callback order has not been measured.

## Disposition and untested scope

Verdict: revision required for this exact candidate. This is not a nine-dimension quality score or full review. All nine independent scores remain unassigned; no fabricated 90s, acceptance, merge or deployment. Native network/storage/CSP effects, full usability/accessibility including screen reader/zoom/reflow, clipboard destination and permission failure, BFCache and full compatibility/formal-origin integration remain unverified in this review. Existing finite author observations retain their original limited attribution. No independent GUI was run, no candidate files changed, and no ownership transferred. New revision requires exact-commit affected verification.
