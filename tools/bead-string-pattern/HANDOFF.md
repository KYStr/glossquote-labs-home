# Handoff — Bead String Pattern

## Fixed source

- Spec: `docs/specs/bead-string-pattern/` in `KYStr/glossquote-labs-home`
  - `SPEC.md` — `spec-bead-string-pattern-20261109`, v1, 2026-11-09
  - `BRIEF.md`, `fixtures.json` (8 cases), `AUTHOR-CHECK.md`
- Spec source commit (base of this branch): `c0a7fa3601da3de3d726f1c74d139395e40223f3`
  (`codex/initial-publication`)
- Implementation: `tools/bead-string-pattern/` only, on branch
  `muse/bead-string-pattern-production-20261109`
- Registry task: `labs-prod-bead-string-pattern-20261109`
- Claim: `muse-main-claim-bead-string-pattern-20261109T081158Z-w4`
  (claimed by the parent actor; this builder ran no registry commands)

## Scope

Only `tools/bead-string-pattern/` was added or changed. No changes to
`docs/specs/`, the registry, the catalog, or any other tool.

## What was built

Pure core `public/js/core/solve.mjs` (`solve`, `validate`, `expand`,
`normalizeName`) implementing the SPEC exactly:

- Validation order: root type → SIZE (65,536 JSON UTF-8 bytes) → SHAPE →
  per-field in table/array order (names, stock, motif, repeats, mode,
  head, tail) → cross-field references in motif, head, tail order.
- Names (N): U+0020 trim, NFC, 1–24 code points, first char letter/digit,
  rest letters/marks/digits/ASCII space/hyphen/underscore; case-sensitive;
  duplicates reported at the second occurrence.
- Expansion: head, then each motif group (even groups reversed in
  `alternate` mode; boundaries keep both end beads), then tail. At most
  514 positions, linear walk, stock deducted in position order.
- Result: `{positions, colors, firstMissing}`; unused stock colours are
  still listed.

Pure flow controller `public/js/core/flow.mjs` (empty → dirty → busy →
ready | error; runId-gated settle; cancel returns to dirty; reset returns
to empty). Module worker `public/js/worker.mjs` runs the core on the next
event-loop turn (setTimeout 0) so a cancel/edit arriving before that turn
revokes the scheduled work; the app falls back to synchronous solving if
the worker cannot start. Bilingual pages (zh-Hant + en) with the SPEC's
exact titles/descriptions/H1, preview noindex, relative canonical +
hreflang (zh-Hant/en/x-default), same-language home links. No analytics,
no CDN, no remote fonts, no storage; all user text via textContent/value.

## Deviations from the SPEC's handoff file layout (noted for the reviewer)

- The SPEC's handoff section lists a `src/` layout (`src/core.mjs`,
  `src/app.mjs`, `src/i18n.mjs`, `src/styles.css`). This build follows the
  consolidated house format instead (`public/js/core/*.mjs`,
  `public/js/app.js`, `public/styles/app.css`), matching the other tools
  built in this run. Product behaviour is unchanged.
- The SPEC's `package.json` sketch lists `build:production` /
  `check:generated:production` scripts. No production origin has been
  approved for this tool, so the build refuses production mode (same as
  the sibling tools); the preview build and its check are the verified
  paths. A production build needs a confirmed HTTPS origin first.

## Verification

See `VERIFICATION.md` for commands, counts and the explicit NOT_RUN list.

## Next owner

Independent reviewer (the parent submits this candidate to the registry).
Review the fixed candidate commit on the draft PR against the nine
acceptance aspects in the SPEC; real-browser, device, assistive-tech and
deployment checks are NOT_RUN and remain open.
