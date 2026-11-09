# Loan Kit Turnover Check — Production Handoff

- **Tool:** Loan Kit Turnover Check (`tools/loan-kit-turnover/`)
- **Spec:** `spec-loan-kit-turnover-20261109` v1, `docs/specs/loan-kit-turnover/`
  (SPEC.md, BRIEF.md, fixtures.json, AUTHOR-CHECK.md)
- **Spec source:** repo `KYStr/glossquote-labs-home`, branch
  `codex/initial-publication`, base commit
  `fb55ef262642744147d01db9b2fcbc82cc8b76e1`
- **Registry task:** `labs-prod-loan-kit-turnover-20261109`
- **Claim:** `muse-main-claim-loan-kit-turnover-20261109T083325Z-w6`
  (claimed by the parent actor; workMayStart verified by the parent)
- **Candidate:** `45ec9666d583f82602f9dbc17894f7cb1aa0e135`
- **Draft PR:** https://github.com/KYStr/glossquote-labs-home/pull/128
- **Allowed scope:** `tools/loan-kit-turnover/` only. Nothing outside it
  was touched; no registry commands were run by this builder.

## What was built

Pure core `solve(data)` per SPEC.md: strict validation (root type →
SIZE 65,536 bytes → root/row SHAPE → per-field in table/array input
order → cross-field REF for all loans, then ORDER for all loans),
then per-kit endpoint sweep over `[start, end + turnMin)` with release
before the next pickup at touching times. Peak, `minExtra`, and
per-segment shortages (demand, extra, loan names in input order).

Flow controller (`flow.mjs`): empty → dirty → busy → ready | error with
runId gating; edit invalidates, stale settles (including stale errors)
are dropped, cancel returns to dirty, reset to empty. The app solves a
valid draft on the next event-loop work item (`setTimeout(0)`) under the
runId; an edit or cancel before that item revokes it.

Bilingual pages (zh-Hant + en) with the SPEC's exact titles,
descriptions, H1 and same-language home links; preview `noindex,
nofollow`, relative canonical + hreflang (zh-Hant/en/x-default). Kit
rows (1–12) and loan rows (0–60) with HH:MM time inputs, kit select
rebuilt from kit names (stale values kept so the core can report REF),
sample loader (the `turnover-overlap` fixture, loads as dirty), clear
draft, busy + cancel, field-linked errors with focus to the first error,
results as a per-kit table with expandable shortage intervals, a
first-shortage summary naming the concurrent loans, and a next-step
note. All user text via `textContent`/`value` only; no network,
storage, analytics, CDN or remote fonts. Serve script sends the
SPEC-pinned CSP + `X-Content-Type-Options: nosniff`.

## Format notes for the reviewer

- The SPEC's handoff section lists a `src/` file layout
  (`src/core.mjs`, `src/app.mjs`, …) and `build:production` scripts.
  This candidate follows the consolidated handbook format
  (`public/js/...`, preview-only build, production refused without an
  approved origin), matching the sibling tools in this run.
- Cross-field order: the SPEC implementation rule says “依借用輸入序驗
  kit 參照，再驗 end>start”. This build checks all kit REF errors in
  loan input order first, then all end > start ORDER errors in loan
  input order. A test pins this order.
- Form-level `SYNTAX` covers raw integer text and HH:MM text
  (two-digit hours/minutes; `24:00` only as a return). A `24:00`
  pickup parses to 1440 and is reported by the core as RANGE at
  `/loans/<i>/start`, since the start range is [0, 1439].
- Times after midnight render with the next-day marker
  (`隔日 HH:MM` / `next day HH:MM`); exactly 1440 renders as `24:00`.
- `npm test`: 47 pass / 0 fail (8 literal SPEC fixtures verbatim plus
  hand-derived validation, algorithm, formatting and flow cases).
  See VERIFICATION.md for the full evidence.

## Spec errata

None — every printed fixture reproduces exactly from the SPEC's own
rules.

## NOT_RUN

Real-browser rendering/interaction, real devices/touch, assistive
tech, measured contrast, Network/Storage audit, deployment,
independent nine-aspect review. See VERIFICATION.md.

## Next owner

Independent reviewer (parent submits the candidate to the registry).
