# Decision Wheel Picker — production candidate handoff

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (branch `codex/consolidate-20261109`)
- Paths: `docs/specs/decision-wheel-picker/SPEC.md` (blob `64ac99b8632947d883709d8e8bcac4d79406e273`), `docs/specs/decision-wheel-picker/BRIEF.md` (blob `7b623132956ff99a33f8e7197a9520e20937c3f7`), `docs/specs/decision-wheel-picker/AUTHOR-CHECK.md`
- No `fixtures.json` exists for this spec; the normative fixtures are the worked examples W1–W4 in SPEC section 4, and the test expectations are derived from them by hand.

## Allowed scope

Implementation lives only in `tools/decision-wheel-picker/` of the same repository, on branch `muse/decision-wheel-picker-production-20261109`. Nothing outside that directory was changed; the coordination registry was not written to.

## Mode and status

Build-first mode: this candidate was produced ahead of the registry production flow and is submitted for **independent bulk review**. It is not accepted, not merged, not deployed and not published. Acceptance requires a non-author reviewer scoring all nine SPEC section 6 aspects ≥90 against the fixed candidate commit, with all mandatory checks complete; unrun checks stay NOT_RUN (see VERIFICATION.md).

## Consolidation note

SPEC section 8's handoff wording names the tool's own repository (`KYStr/glossquote-labs-decision-wheel-picker`). That wording is superseded by the user's 2026-11-09 consolidation rules (repo AGENTS.md and `docs/SOURCE-LAYOUT.md`): new implementations live in `tools/<slug>/` of `KYStr/glossquote-labs-home` and are delivered by branch + PR in this repo. The spec's contract (sections 1–7) is unchanged and was implemented exactly.

## What was built

- Pure core `public/js/core/wheel.mjs`: textarea parsing (trim Unicode whitespace, drop blanks, keep duplicates, 60-code-point cap with 1-based line numbers), 2–50 count rule, the pinned rejection-sampling draw (limit = ⌊2³²/n⌋×n, index = v mod n, injectable uint32 source, rejection count exposed), and the elimination state machine (occurrence removal, final-remaining at exactly 1, editor-lock derivation, reset).
- Bilingual pages `public/index.html` (zh-Hant) and `public/en/index.html` with equal-slice SVG wheel, draw-before-animation spin (4 s ease-out; instant identical draw under `prefers-reduced-motion`), polite live-region announcements, text equivalents for entries/history, fairness explainer and permanent low-stakes note, hard error state when `crypto.getRandomValues` is absent.
- Zero runtime dependencies, no storage, no network, no analytics; user text rendered via `textContent` / SVG text nodes only.

## Next owner

Independent reviewer (not the author): verify fixtures W1–W4, the draw rule audit, bilingual equivalence, and run the real-browser evidence listed as NOT_RUN in VERIFICATION.md.
