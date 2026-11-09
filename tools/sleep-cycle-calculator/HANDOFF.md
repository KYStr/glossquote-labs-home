# Sleep Cycle Calculator — production handoff

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (branch `codex/consolidate-20261109`)
- Paths: `docs/specs/sleep-cycle-calculator/SPEC.md`, `docs/specs/sleep-cycle-calculator/BRIEF.md`, `docs/specs/sleep-cycle-calculator/AUTHOR-CHECK.md`
- No `fixtures.json` exists for this spec; the normative fixtures are the worked examples S1, S2 and S3 in SPEC section 4, and the test expectations are hand-derived from them.

## Allowed scope

- Implementation lives only in `tools/sleep-cycle-calculator/`. Nothing outside that directory was added or modified by this task.
- The coordination registry was not read for a claim and was not written; this is a build-first production under the parent agent's instruction, following the consolidated `tools/<slug>/` format from `docs/SOURCE-LAYOUT.md` and `docs/IMPLEMENTATION-CHECKLIST.md`.

## Mode and status

- Build-first mode: the candidate is submitted for the independent bulk review, exactly like the earlier build-first productions now preserved under `sources/candidates/`.
- This candidate is **not accepted, not published, not deployed**. No catalog, registry, homepage or deployment state was changed.
- The SPEC's section 8 candidate-in-own-repo instruction is superseded for this run by the 2026-11-09 single-repo consolidation (AGENTS.md / SOURCE-LAYOUT.md): new tools are built in this repo under `tools/<slug>/` on their own branch/PR.

## Implementation summary

- Pure core `public/js/core/sleep-cycle.mjs`: strict HH:MM parse, whole-minute latency 0–60, mathematical modulo over 1440 minutes, the section 4 row builders returning label enum keys, and the auditable constants (cycle 90, latency bounds/default, row orders, recommended set) defined once.
- `public/js/app.js`: direction toggle with per-direction remembered times, latency shared across directions, stale-state freeze on invalid input, "going to sleep now" filling the bedtime from the device clock once per tap; rendering via textContent only.
- Both language pages are complete static HTML with the SPEC honesty framing (90 minutes is a varying conventional average; results are planning estimates, not medical advice; the general 7–9 hour note).

## Next owner

- Independent reviewer (non-author): score the nine aspects of SPEC section 6 against the fixed candidate commit on this branch's PR; every unrun check stays NOT_RUN (see VERIFICATION.md) and blocks acceptance until run.
