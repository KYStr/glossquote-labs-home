# Meeting Cost Calculator — production handoff

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (branch `codex/consolidate-20261109`)
- Paths: `docs/specs/meeting-cost-calculator/SPEC.md`, `docs/specs/meeting-cost-calculator/BRIEF.md`, `docs/specs/meeting-cost-calculator/AUTHOR-CHECK.md`
- No `fixtures.json` exists for this spec; the normative fixtures are SPEC section 4 (M1–M5), reproduced exactly in `test/calculator.test.mjs` and `test/timer.test.mjs`.

## Allowed scope

All work is inside `tools/meeting-cost-calculator/` of the same repo. Nothing outside that directory was touched: no registry writes, no catalog changes, no other tool, spec or source snapshot was modified.

## What was built

- Pure core (`public/js/core/data.mjs`, `public/js/core/calculator.mjs`): all SPEC constants once, as auditable data (group/headcount/rate/duration bounds, the closed preset list, the 2080 salary divisor, the five display currencies); strict string validation with per-field error codes; exact BigInt-rational money arithmetic — the only rounding is at display, half-up, once per figure. The timer is a state machine over injected monotonic timestamps: it stores accumulated milliseconds only, and every cost is recomputed as burn × total elapsed (never per-tick increments), per SPEC section 4.
- Bilingual UI (`public/index.html` zh-Hant default, `public/en/index.html`): manual-duration and live-timer modes with per-mode state preserved across switches, 1–5 roster groups with per-group salary presets, five display currencies (symbol only), per-group breakdown table, the mid-meeting repricing note beside the roster, the rounding note under the breakdown, the preset/divisor honesty note, and stale-state freezing of outputs while any input is invalid (the timer keeps accumulating). User input renders via `textContent`/input values only.
- Scripts: reproducible preview build (`build:preview` → `dist/preview/`), generated-tree verification (`check:generated:preview`), static checks (`check`), loopback-only serve.
- Tests: `node --test` suites for fixtures M1–M5, preset fills, the timer state machine on a fake monotonic clock (pause spanning a large fake interval, exact multi-interval accumulation, reset while running), the drift property with hand-computed checkpoints, every validation refusal in SPEC sections 2/4, the one-cent breakdown-rounding case, page scaffolding, and build byte-identity.

## Superseded handoff wording

SPEC section 8 describes production in the tool's own repository (`KYStr/glossquote-labs-meeting-cost-calculator`). That wording is superseded by the 2026-11-09 consolidation rules (`docs/SOURCE-LAYOUT.md`, `docs/IMPLEMENTATION-CHECKLIST.md`): new tools are implemented in `tools/<slug>/` of `KYStr/glossquote-labs-home` and reviewed there. This candidate follows the consolidation rules.

## Mode and status

Build-first mode: this candidate was produced ahead of a registry production claim, pending independent bulk review. It is **not accepted, not published, not deployed**. The open PR is a draft against `codex/consolidate-20261109`.

## Next owner

An independent reviewer (not the author) reviews the fixed candidate commit against SPEC section 6's nine aspects, with the NOT_RUN items in `VERIFICATION.md` completed or kept as blocking NOT_RUN.
