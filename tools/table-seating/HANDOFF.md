# Handoff — Party Table Seating (table-seating)

## Fixed source
- Repository: `KYStr/glossquote-labs-home`
- Base branch: `codex/initial-publication`
- Base commit: `5e8fab03c00fba01bca68b1dd80280eb380b9bd6`
- Spec: `docs/specs/table-seating/` — SPEC.md (`spec-table-seating-20261109`, v1),
  BRIEF.md, fixtures.json (8 cases), AUTHOR-CHECK.md, all read in full at the
  base commit.
- Implementation format: the consolidated handbook
  (`docs/IMPLEMENTATION-CHECKLIST.md`, `docs/SOURCE-LAYOUT.md`,
  `docs/TOOL-DESIGN-BASELINE.md`) — new tools live in `tools/<slug>/`.

## Registry claim (parent-owned; this builder ran no registry commands)
- Task: `labs-prod-table-seating-20261109`
- Claim: `muse-main-claim-table-seating-20261109T080200Z-w3` (claimed by the
  parent actor; workMayStart verified by the parent)
- The parent submits the candidate below to the registry after verifying
  the PR head.

## Candidate
- Branch: `muse/table-seating-production-20261109`
- Candidate commit: (filled in VERIFICATION.md after the final push)
- Draft PR: (filled in VERIFICATION.md; base `codex/initial-publication`)

## Allowed scope
Only `tools/table-seating/` was created or changed. No other path, no
registry write, no deployment.

## What was built
- Pure core (`public/js/core/solve.mjs`): strict validation (SIZE 65536,
  SHAPE, TYPE, RANGE, DUPLICATE, REF; exact JSON Pointer paths; validation
  order SIZE → SHAPE → per-field in array order → cross-field pin refs),
  name normalization (U+0020 trim, NFC, 1–24 code points, first char
  letter/digit), and backtracking search (parties in input order, tables
  in input order, pin / step-free / capacity skips, first complete
  assignment wins, `found:false` only after all legal branches).
- Search as a generator batched at 4096 candidate steps
  (`BATCH_STEPS = 4096`); the worst case (7 freely placeable parties +
  one step-free party with no step-free table) measures 21,845 nodes and
  87,380 placements — within the SPEC bounds of 87,381 nodes and 87,380
  placements.
- Pure flow controller (`public/js/core/flow.mjs`): phases
  empty → dirty → busy → ready | error; edit invalidates the runId and
  clears the result; settle only applies when the runId matches and the
  phase is still busy; cancel returns to dirty and keeps the draft.
- Module worker (`public/js/worker.mjs`): runs the search generator in
  ≤4096-step batches per macrotask, reads cancel between batches, never
  posts a reply for a cancelled or superseded run, and is never
  terminated. The app falls back to synchronous solving (same result)
  if the worker cannot start, and says so once.
- Bilingual pages (`public/index.html` zh-Hant, `public/en/index.html`
  en): SPEC-pinned titles/descriptions, preview noindex, canonical +
  hreflang (incl. x-default), same-language home links (`../../` /
  `../../en/`), dynamic table/party rows (1–4 tables, 1–8 parties),
  pin selects rebuilt from table names, sample loader (the
  `table-seating.backtrack` fixture), clear draft, cancel while busy,
  results per table with party sizes and remaining seats, totals, and a
  no-solution notice with next steps. All user text via textContent/value
  only. No analytics, CDN, remote fonts, network calls, or storage.
- Scripts: reproducible preview build into `dist/` + `BUILD-MANIFEST.json`
  (byte-identical across runs), static checks, generated-output checks,
  loopback-only server.

## Spec errata
None found. All 8 printed fixtures reproduce exactly; the worst-case
tree bound holds as stated (see VERIFICATION.md).

## NOT_RUN (explicit)
- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 CSS px, 200% zoom, reduced motion, focus order).
- Real devices; assistive technology; measured contrast of the shipped UI.
- Worker execution in a real browser (Node tests cover the generator and
  the flow controller; the worker file itself is only statically checked).
- Network/Storage observation in a browser (the code makes no network or
  storage calls by construction; not yet observed live).
- Deployment / production HTTPS site, production SEO (canonical/sitemap/
  robots for the real origin), and the nine-aspect independent review.

## Next owner
Independent reviewer (parent submits this candidate to the registry with
the fixed commit and PR). Fixes go back to the original builder; a new
head needs re-verification.
