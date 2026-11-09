# Pickup Window Route — Handoff

## Fixed source

- Spec: `spec-pickup-window-route-20261109` v1, `docs/specs/pickup-window-route/`
  (`SPEC.md`, `BRIEF.md`, `fixtures.json`, `AUTHOR-CHECK.md`) at base commit
  `fb55ef262642744147d01db9b2fcbc82cc8b76e1` on `codex/initial-publication`.
- Production task: `labs-prod-pickup-window-route-20261109`
- Claim: `muse-main-claim-pickup-window-route-20261109T083325Z-w6`
  (claimed by the parent actor; this build ran under that claim).
- Candidate branch: `muse/pickup-window-route-production-20261109`
- Candidate commit: `57e36e81a825717306e40c813d1c9ee7b9ce4575`
- Draft PR: https://github.com/KYStr/glossquote-labs-home/pull/131
  (base `codex/initial-publication`, OPEN + draft, head verified ==
  candidate commit)

## Scope

Only `tools/pickup-window-route/` was created or touched. No registry
commands were run by this builder; the parent submits the candidate.
Nothing outside the tool directory was modified.

## What was built

A bilingual (zh-Hant / en) same-day pickup-route planner, per the SPEC:

- Pure core `public/js/core/solve.mjs`: strict validation (SIZE → shape →
  per-field in table order → cross-field DUPLICATE, matrix size, DIAGONAL,
  deadline > start, close > open) and an exhaustive depth-first search
  over visit orders in input-index order, earliest return wins, ties keep
  the first order found. Search is a generator yielding every 4,096
  candidate steps; the 8-stop worst case is exactly 109,601 nodes and
  40,320 complete orders (verified by test).
- Pure flow controller `public/js/core/flow.mjs`: empty → dirty → busy →
  ready | error, runId-gated settle, cancel returns to dirty, stale
  replies (including stale errors) are dropped.
- Module worker `public/js/worker.mjs`: one per page, batches of at most
  4,096 steps per macrotask via MessageChannel-free `setTimeout(0)`
  scheduling so a cancel is read between batches; a cancelled or
  superseded run never posts a result. The app falls back to a
  synchronous solve (same result) if the worker cannot start.
- Bilingual pages with the SPEC's exact titles/descriptions/H1, preview
  `noindex,nofollow`, relative canonical + hreflang (zh-Hant/en/x-default
  → Chinese page), same-language home links (`../../` / `../../en/`),
  dynamic 1–8 stop rows, a directed travel-time matrix (diagonal fixed 0,
  “No direct route” per leg), a source select that filters matrix rows
  on narrow screens, a fixed sample (`pickup-window-route.only-order`),
  field-linked errors with focus, and results as a real table (arrive /
  wait / service start / service / leave per stop, plus the return time).
  `textContent`/`value` only; no network/storage/analytics/CDN/remote
  fonts; serve script sends the SPEC-pinned CSP + `nosniff`.

## SPEC-silent interpretations (for the reviewer)

1. Cross-field check order is DUPLICATE → travel size (RANGE) → DIAGONAL →
   deadline > start (ORDER) → close > open (ORDER). The SPEC pins the
   last three in that order in implementation §1; DUPLICATE placement
   (after all field types are valid, before the matrix checks) is the
   builder's choice, recorded here.
2. Matrix outer-length mismatch reports RANGE at `/travel`; a short/long
   row reports RANGE at `/travel/<i>`.
3. Name rule failures: empty or over 24 code points → RANGE; bad first
   character or bad characters → TYPE (same convention as the sibling
   tools in this run).
4. Form-level raw syntax failures (bad HH:MM, blank/malformed numbers)
   report SYNTAX at the field before core validation runs.
5. The SPEC's `src/` file layout and `build:production` scripts are
   superseded by the consolidated house format (`public/js/...`,
   preview-only build; production refused without an approved origin),
   matching the sibling tools in this run. The SPEC's
   `glossquote.com` same-language home links likewise belong to the
   production build; preview pages link home relatively (`../../`,
   `../../en/`).

## Spec errata

None — all printed fixtures reproduce exactly from the SPEC's own rules.

## Verification

See `VERIFICATION.md` for commands, counts and the explicit NOT_RUN list.

## Next owner

Independent reviewer (parent submits this candidate to the registry).
Review the fixed candidate commit against the nine acceptance aspects in
SPEC.md; real-browser / device / assistive-tech / deployment checks are
NOT_RUN and remain the reviewer's to confirm.
