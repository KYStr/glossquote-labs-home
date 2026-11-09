# Handoff — Contrast Checker production candidate

## Fixed specification source (read this first)

- **Governing contract: the REVISED specification** at commit
  `1b732fbd92156360b0d6d63d2593359d9a85c34f` on branch
  `muse/contrast-checker-spec-20261102`, path
  `docs/specs/contrast-checker/SPEC.md` (with its BRIEF.md and
  AUTHOR-CHECK.md at the same commit).
- **Discrepancy flagged for the coordinator / independent reviewer:** the
  copy of the spec filed in this consolidation branch at
  `docs/specs/contrast-checker/SPEC.md` is the **superseded pre-fix draft**
  (an older blob). It still contains claims an independent review disproved
  with counterexamples — most visibly the false claim that the Color
  Palette tool never evaluates WCAG pairs. This implementation follows the
  revised spec only: alpha compositing in the pinned order, symmetry
  narrowed to the effective colours, the three-state suggestion outcome
  contract, and fixtures 1–11 including the fixture 9 alpha-swap
  counterexample (2.7495900453 vs 1.0054879683), fixture 10 (direction
  failure with the other direction named) and fixture 11 (both directions
  fail). No product text claims this is the collection's only contrast
  evaluator; `scripts/check.mjs` audits that mechanically.
- Reconciling the consolidated `docs/specs/` copy with the revised spec is
  the coordinator's / original spec owner's step via the formal revision
  flow. This candidate deliberately does **not** modify `docs/specs/`.

## Scope and mode

- Allowed scope of this candidate: `tools/contrast-checker/` only. No other
  path in the repository was changed; the coordination registry was not
  written.
- Mode: **build-first** — the product was built ahead of the bulk
  independent review. This candidate is **not accepted and not published**;
  it has not been merged, deployed, or added to any catalog.
- SPEC §8's handoff wording (candidate in the tool's own repository,
  `KYStr/glossquote-labs-contrast-checker`) is **superseded** by the user's
  2026-11-09 consolidation rules (`docs/SOURCE-LAYOUT.md`): new tools live
  in `tools/<slug>/` of `KYStr/glossquote-labs-home`. The fixed spec source
  and acceptance criteria are unchanged by that move.

## What is implemented

WCAG 2.1 contrast checker per the revised SPEC: hex `#RGB` / `#RRGGBB` /
`#RRGGBBAA` and `rgb()` / `rgba()` inputs with per-field named errors;
alpha compositing (background over white, then foreground over the
effective background, unrounded values into luminance); five verdict rows
judged on the unrounded ratio with the display-4.50-but-fails case handled
correctly; effective colours displayed whenever alpha is involved; sample
previews (16 px text, 24 px large text, non-text glyph and border); swap
button recomputing from the raw inputs; deterministic suggestion search
(1% steps toward black or white, four selectable targets) with the
three-state outcome contract; bilingual zh-TW / English pages.

## Next owner

The **independent reviewer** (non-author), reviewing this fixed candidate
commit against the revised SPEC §6 nine aspects and §7 test list. Real-
browser and real-device evidence items are listed as NOT_RUN in
VERIFICATION.md and remain the review's to collect or require.
