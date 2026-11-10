# Run 5 legacy candidate repair milestone

Task ID: `labs-run5-legacy-repair-20261110`. User authorized correcting pre-policy cloud work on 2026-11-10. This task preserves original 40 specification PRs and 12 build PRs; it does not rewrite their ownership or invent prior claims.

## Scope

Repair confirmed specification/fixture contradictions in salary, age, cooking and workdays; implement the specified Worker in workdays; correct four unresolvable specification references; reconcile bill-split and race-time product differentiation; substantiate NHI/MET provenance and correct unsupported dew-point provenance/accuracy claims. Bring the fixed 12 tool candidates into one reviewable maintenance branch with exact old source provenance. No unseen newer 12-tool batch is assumed.

Allowed paths: `tools/{bill-split-calculator,salary-converter,age-calculator,cooking-measurement-converter,workdays-calculator,wallpaper-calculator,feels-like-temperature,dew-point-calculator,clothing-size-converter,ping-area-converter,race-time-predictor,period-cycle-calculator}/`; corresponding nine affected specification folders in `docs/specs/` (age, bill-split, salary, cooking, workdays, dew-point, race-time, nhi-premium-calculator, calories-burned-calculator); `docs/reviews/run5-legacy-repair-2026-11-10/` evidence. Full slugs and fixed PR heads are in the adjacent SOURCE-INDEX.json.

## Decisions

- Preserve salary capacity-first error precedence and whole-unit half-up outputs; correct conflicting examples/invariants.
- Adopt the age implementation's repeated backward-month borrowing, explicitly including both leap/non-leap short-February families. Keep this a calendar convention, not legal age eligibility.
- Cooking authoritative ENUM fixture uses `oz`; separately test `liter` INPUT_LIMIT. Do not skip or override literal fixture expectations in tests.
- Workdays accepts 400 holiday lines with an 8192 UTF-16 raw cap (also accommodates CRLF); 401 nonblank rows below cap returns ROW_LIMIT. Correct -0 grammar and directional composition claims. Use real dedicated module Worker transport with cancellation/generation disposal; no setTimeout compute replacement.
- Bill split remains restaurant tax/tip equal sharing, explicitly distinct from existing per-person paid settlement. Preserve the existing settlement tool; no duplicate settlement implementation.
- Race-time may retain its direct prediction/custom target use case, but remove incorrect claims that existing running-pace lacks arbitrary known distances or predicted paces.
- Dew-point retains the pinned approximation for now; remove unsupported accuracy guarantees and misattribution to Lawrence. Explicitly distinguish the chosen 6.112 pressure normalization from BoM's 6.105 rather than claim an exact BoM reproduction. No numerical model switch without separate justified fixtures/review.
- Official NHI 115 table confirms first-grade 238. Official 2024 Compendium pages confirm the eight previously indirect rows. Append dated evidence without rewriting original author-history claims as if they were independently verified then.

## Non-goals and gates

No merge, deployment, homepage/catalog edits, ready/accepted production promotion, 28-tool implementation, global auth or system settings changes. No desktop/local browser interactions. This repairs known issues; it is not a full 52-PR or nine-aspect product acceptance. Mandatory browser, device, Network/Storage and native interaction checks remain NOT_RUN when not actually executed.

## Acceptance criteria for this maintenance candidate

1. `repair-correctness`: all enumerated conflicts and incorrect references addressed; changed core/transport has independent cases; all 12 offline test/check/build/generated checks run, reproducible builds match.
2. `source-provenance`: original 52 heads retained, original owners untouched, exact baseline source files verified, changes confined to allowlist, scientific/data citations explicit and verifiable.
3. `status-delivery`: fixed candidate+PR, honest per-tool NOT_RUN/manual scope, no implied release, one ZIP with source/evidence/status and verified hashes/relative links.

Each required maintenance aspect needs independent non-author review >=90 with evidence before maintenance acceptance. Such acceptance never means the 12 tools passed their full predeclared nine product aspects. Publish candidate before review. A failed/unknown formal registry operation is read back by original operation ID before retry. Stop on ownership conflict, remote head movement affecting baseline, unavailable authorization, credential/settings drift, or any need for desktop interaction.

Implementation delegated with tool parameters `gpt-6.1-sol`, reasoning `medium`; backend identity is not independently visible. Root owns decisions, inspection, independent reruns, publication and delivery.
