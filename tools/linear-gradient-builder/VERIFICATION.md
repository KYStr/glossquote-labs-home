# Producer verification — no independent scores

2026-10-30 UTC. This file separates controlled tests, finite browser observations and missing acceptance evidence.

Final frozen runtime manifest: `4ab2f901734a5f2a9f10ceee9baea1c264e575aabdc6a2fa3d671b0d86df6592`. Final combined suite: 21 groups passed, zero failures; see `evidence/final-tests.log`.

## Executed

- Eight core test groups: literal four-line CSS including final LF, immutable result, angle/position syntax and endpoints, 2–8 count, closed descriptors/getters, ordered/equal/nonendpoint stops.
- Six real-controller/controlled-clock tests: synchronous copy invocation, one pending operation, timeout and stale Promise guards, unsupported/rejected clipboard fallback, raw snapshot/IME invalidation, one URL/30-second cleanup, failure and lifecycle delivery guards.
- Four isolated build test groups: deterministic nine runtime files, unknown/missing source rejection, preserved unknown output, source/output symlink rejection.
- Three real-app/controlled-DOM tests: CSSOM assignment/edit invalidation, first-field error and cancelled confirmation, modal callback disposal across pagehide/pageshow, equal stops and unsupported CSS fail-closed. These are not native DOM/BFCache/keyboard evidence.
- Syntax and limited static contract check pass; build creates per-file byte/SHA manifest. No dependency installation.

## Finite managed desktop-browser observation

At 06:53 UTC an earlier runtime checkpoint with manifest `37513fa92da45931fff7570038f7961e384b70f61e2f3e94999c538b1aa9eedf` was exercised in real managed Chrome: red #FF0000 at 0%, blue #0000FF at 100%, angle90. Actual rendered pixels showed left red/right blue; normal generated CSS matched. A real CSS download event produced a file read back against displayed CSS, SHA256 `c62321196f7c6df90cec39d0941ff5b9a1c308f616683c82c4e1c28464970f19`. Download wording correctly claimed handoff only. Copy showed API-success; clipboard contents were not read back, so full copy correctness is unverified.

Later source corrections add IME generate-disabled behavior, visible stop count, localized static metadata, fixed unexpected-error fail-closed handling and initial-state clear-button logic. The CSS serializer is unchanged. Earlier browser observations are historical finite evidence, not a full verification of the later candidate.

## Required remaining review

All nine independent scores: **null**. No accepted/merged/deployed claim.

Remaining native work includes both-language keyboard journeys, added/removed/reordered stops and error recovery, IME, hidden/reload/BFCache, dialog focus/Escape, clipboard content or real rejection fallback, download CSS used on an isolated page, 320px reflow and true200% zoom, contrast measurements, full Network/Storage observation, exact served security headers and injection/path/Host/MIME negative checks. Controlled tests cannot replace these observations. Other browser engines and screen readers remain untested. Original nine aspects and fixed scope are unchanged.
