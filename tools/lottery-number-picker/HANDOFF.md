# Handoff — Lottery Number Picker （樂透選號產生器）

## Fixed source

- Spec task id: `labs-lottery-number-picker-spec-20261109`
- Spec candidate commit: `038d3f8b114b20fbcf31949c912d18713fc470ec`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/158
- Spec files: `docs/specs/lottery-number-picker/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}` at the candidate commit. The spec PR is not merged into the base branch, so `fixtures.json` is vendored verbatim into `test/fixtures.json` (SHA-256 `b8922e9312d7ac1f392a4cc449f04c9b5ff3123568d39a69717a46b7125fa918`, byte-identical to the candidate's file).
- Implementation base: `codex/initial-publication` @ `6a56a115e6bbc1208712c74c855906ce3729e2e3`
- Mode: build-first (per the run-4 assignment). No registry/coordination commands were run; this candidate is not accepted, merged, or published.

## What was built (only `tools/lottery-number-picker/`)

- `public/js/core/lottery.mjs` — pure validation + generator. Strict own-data schema (unknown/missing/wrong-type/accessor → SCHEMA), pinned validation order (game ENUM → seed → setCount → exclude tokens grammar/range → duplicates → POOL_TOO_SMALL), mulberry32 exactly as the SPEC pins it, partial Fisher–Yates with exactly one PRNG call per position (including when one candidate remains), one PRNG instance per run consumed set-by-set (Zone 1 then Zone 2 for `power638`), results sorted ascending, no de-duplication across sets. The core never seeds itself and uses no nondeterministic randomness.
- `public/js/controller.mjs` — the six SPEC flow states with a generation counter; work is scheduled on the next macrotask (no Worker, per SPEC), edits/cancel/reset/pagehide terminate pending work and late completions are dropped by generation.
- `public/js/app.js` — DOM wiring with textContent/value only. Blank-seed behaviour exactly as pinned: on Generate with an exactly-empty seed field, one uint32 from `crypto.getRandomValues` is written back into the field and included in the run snapshot (the write-back alone does not dirty the draft); without crypto the blank string runs and the core's EMPTY error is shown. Copy uses the fixed text format; download is the fixed name `lottery-picks.txt` with identical UTF-8 bytes (no BOM), Blob URL revoked within 30 s or as soon as the result is invalidated.
- `public/index.html` / `public/en/index.html` — bilingual static pages with the SPEC-pinned titles, descriptions, help texts, honest note and FAQ answers; preview noindex; no canonical/hreflang per the SPEC's candidate rule; relative language links; same-language home links via `../../`.
- `scripts/{build,check,check-generated,serve}.mjs` — reproducible preview build (byte-identical across runs), static checks, manifest verification, loopback-only server with the SPEC-pinned CSP.
- `test/{core,controller,pages}.test.mjs` — fixture-driven tests (expectations vendored from the spec, never generated from the implementation) plus hand-derived boundary/grammar/order cases.

## Deviations

- File layout follows the handbook contract (`public/js/core/*.mjs`, `public/js/app.js`, separate `controller.mjs`) rather than the SPEC's prose sketch of paths; no behaviour difference.
- No other deviations: every literal fixture reproduces from the SPEC's stated rules (see VERIFICATION.md).

## Next owner

Independent reviewer (parent verifies the PR head first). Nine-aspect acceptance remains NOT_RUN by design in build-first mode.
