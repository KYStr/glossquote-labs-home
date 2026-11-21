# Interval Timer — Production handoff

- **Tool:** `tools/interval-timer/` (slug `interval-timer`, spec `spec-interval-timer-20261109`)
- **Source (fixed):** spec candidate commit `e86816781bc220d184a8c31ad50168730e1b973b`, spec PR #257, fixtures 21 (15 core / 3 session / 3 controller), registry rev 1467 (per `~/workspace/glossquote-factory/build5/RUN-STATUS.md`).
- **Branch:** `muse/interval-timer-production-20261109`, from `codex/initial-publication` head `c8ca5fd3` ("Accept independent CSV unpivot document review and mark spec ready").
- **Candidate:** see VERIFICATION.md for the pushed head SHA and draft PR.
- **Mode:** build-first. No registry/coordination command was run, nothing merged, nothing published.

## What was built

- `public/js/core/interval-timer.mjs` — pure core: `run(input)` (schema gate, per-field INPUT_LIMIT → UNICODE → EMPTY → INTEGER_FORMAT/ENUM → RANGE in the fixed field order, segment table with zero-length segments omitted, total via the SPEC formula), `startSession` / `applyEvent` / `snapshot` (state machine over active elapsed milliseconds only; ceil display; boundary belongs to the next segment; multi-segment ticks cue only the landing segment; unlisted phase/event pairs and invalid/backwards readings ignored; sessions immutable), `serializeReport` (canonical compact JSON + LF, 2,097,152-byte cap), `formatDuration`.
- `public/js/controller.mjs` — page state machine (empty / dirty / busy / success / error / cancelled) with a sequence guard: late Worker replies are dropped, a new run supersedes a pending one, cancel keeps the draft, reset restores the pinned defaults. No draft persistence: the SPEC pins the draft to the current page only, so there is no storage use at all.
- `public/js/worker-handler.mjs` — Worker fragment (core + handler concatenated by the build into `dist-preview/js/worker-source.js`).
- `public/js/app.js` — DOM layer only (textContent/value; no HTML injection). Timer loop derives active elapsed milliseconds from `performance.now()` plus a banked total, so paused time never enters the core; segment changes announce via a polite live region and a short cue tone (program end: longer tone), with audio failure degrading to the visual cue only.
- `public/index.html` + `public/en/index.html` — full bilingual zh-TW/en UI: program form, segment schedule with totals, timer panel (current segment/round, large remaining seconds, total remaining, Start/Pause/Resume/Skip/Reset), report download, FAQ. Preview noindex, pinned CSP, same-language home links via `../../`.
- `scripts/{build,check,check-generated,serve}.mjs`, `package.json` (Node >= 24, ESM, zero runtime dependencies), `test/` (fixtures vendored verbatim; hash asserted in `scripts/check.mjs`).

## Verification (all run in `tools/interval-timer/`, Node v24.22.1)

- `npm test` — 50/50 pass (15 core fixtures verbatim + hand-derived schema/boundary checks, 3 session fixtures replayed step by step + invalid-event/immutability checks, 3 controller fixtures against a controllable fake worker + worker-failure checks, report canonical-form checks).
- `npm run check` — pass.
- `npm run build:preview` run twice — the two `dist-preview/` trees and the two `BUILD-MANIFEST.json` files are byte-identical (recursive diff, no differences).
- `npm run check:generated:preview` — pass.

## Spec defects / derived decisions (no fixture conflicts; errata candidates: 0)

1. **Delivered SPEC.md is truncated.** The file on disk (`~/workspace/glossquote-factory/build5/specs/interval-timer/docs/specs/interval-timer/SPEC.md`, 11,513 bytes) ends mid-sentence at "轉換表（未列出的組" followed by a literal `...[truncated 8188 chars]` line. The transition table and the implementation / acceptance / tests / handoff sections are missing from the delivered file. The transitions implemented are exactly those pinned by the three session fixtures (which AUTHOR-CHECK says were hand-derived and independently re-derived 21/21); unlisted phase/event pairs are ignored, matching the fixture `session-invalid-events-ignored` ("階段外事件與倒退讀數一律忽略"). **This is a spec-delivery defect, not a fixture conflict: errata candidates 0.** The reviewer should obtain the complete SPEC.md (or confirm the table) before acceptance.
2. **Reset accepted from every phase.** Fixtures show `reset` only from `finished`; the UI's "重設計時" control implies it from any phase, and the truncated table cannot confirm it. Implemented as valid in all phases; flagged here for the reviewer.
3. **Events with extra fields are accepted on their typed fields.** The SPEC lists tick/pause elapsedMs validity and unknown types as ignored, but does not say extra fields invalidate an event; extra fields are ignored. Flagged for the reviewer.
4. **Edit from `empty` goes to `dirty`.** The SPEC state table says any input change revokes the old result and shows "輸入已變更，請重新執行"; implemented uniformly from every state (the sibling vo2max controller keeps idle on edit, but its SPEC pinned different wording).

## Known limitations / NOT_RUN

- Real-browser and real-device checks: NOT_RUN (no isolated-browser mechanism available to this builder). Includes the two-language flow in a real browser, keyboard flow, 320 px / 200% zoom layout, Network/Storage observation, download behaviour, and audible cue tones.
- No audible cue verification (tone code is present but unheard); no sound is synthesised by the core, per SPEC.
- The pinned preview canonical is `https://interval-timer.glossquote.com/` (following the run-5 sibling convention); no production origin is approved and the preview is noindex.

## Next owner

Independent reviewer: verify this candidate commit against the SPEC's nine product aspects. If the complete SPEC.md transition table surfaces, re-check transitions 2–3 above against it first. Do not merge or publish from this branch.
