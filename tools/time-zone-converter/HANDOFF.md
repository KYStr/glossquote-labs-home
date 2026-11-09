# Time Zone Converter — production handoff

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Specification: `docs/specs/time-zone-converter/SPEC.md` (blob
  `a5aea565df4e75b07ca493277f15e4608b44007d`), with `BRIEF.md` (blob
  `8f968d917a0c53f37f08d8565c9ebab03e8417b7`) and `AUTHOR-CHECK.md` in the
  same directory.
- Production branch base: commit
  `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` on
  `codex/consolidate-20261109`.
- The implementation follows SPEC section 4 exactly: the 40-zone list
  shipped once as data in `public/js/core/zones.mjs`; resolution of the
  source reading to a single UTC instant with round-trip gap/overlap
  detection (gap = shifted forward by the jump and read under the
  post-transition offset; overlap = earlier occurrence); every target row
  derived from that one instant; the resolved UTC instant always
  displayed; gap and overlap banners in words in both languages; the
  section 5 provenance statement visible with the table.

## Allowed scope

- Implementation lives **only** in `tools/time-zone-converter/` of this
  repository. No other path was touched: no registry writes, no catalog
  changes, no changes to `sources/`, `archives/` or other tools.

## Mode and status

- **Build-first mode**: this candidate was built directly from the fixed
  specification and is submitted for the pending independent bulk review.
  It is **not accepted and not published**: no independent reviewer has
  scored the nine SPEC section 6 aspects against this candidate yet, and
  nothing here is deployed or in the catalog.
- SPEC section 8's handoff wording (candidate in the tool's own
  repository, `KYStr/glossquote-labs-time-zone-converter`) is
  **superseded by the 2026-11-09 consolidation rules**: new tools are
  implemented in `tools/<slug>/` in this shared repository and handed
  over by a branch + draft PR here, per `docs/SOURCE-LAYOUT.md` and
  `AGENTS.md`.
- Next owner: the independent reviewer (non-author), who verifies the
  nine aspects against the fixed candidate commit from the pull request,
  with unrun checks recorded as NOT_RUN (see VERIFICATION.md).
