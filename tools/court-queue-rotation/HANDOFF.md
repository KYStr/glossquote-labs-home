# Handoff — Drop-In Court Queue （單場散打輪轉板）

- Spec: `docs/specs/court-queue-rotation/` — SPEC.md v1, BRIEF.md,
  fixtures.json, AUTHOR-CHECK.md; spec ID `spec-court-queue-rotation-20261109`.
- Fixed spec source: repo `KYStr/glossquote-labs-home`, base commit
  `c0a7fa3601da3de3d726f1c74d139395e40223f3` (`codex/initial-publication` tip
  at build time), path `docs/specs/court-queue-rotation/SPEC.md`.
- Registry production task: `labs-prod-court-queue-rotation-20261109`
- Claim: `muse-main-claim-court-queue-rotation-20261109T081158Z-w4`
  (claimed by the parent actor; workMayStart verified). This builder ran no
  registry commands; the parent submits the candidate after verifying the PR.
- Candidate branch: `muse/court-queue-rotation-production-20261109`
- Allowed scope: `tools/court-queue-rotation/` only. Nothing outside it was
  touched.
- Next owner: independent reviewer (parent submits the candidate to the
  registry; reviewer scores the nine aspects against the fixed candidate).

## What was built

Pure core `public/js/core/solve.mjs` (`solve`): strict validation in the
SPEC order (root TYPE → SIZE 65536 bytes → root SHAPE → fields in table
order → cross-field initialQueue REF then DUPLICATE, then event REFs →
replay STATE / NEED_TEAMS / WINNER), then the replay — holder re-enters
first with streak+1, otherwise the two queue heads start at streak 1; a
winner below the cap stays as holder and the loser goes to the queue tail;
on a draw or at the cap both return to the tail in court order; `next`
previews the start selection only while idle and never consumes the queue.
`public/js/core/flow.mjs` (`createFlow`): empty/dirty/busy/ready/error with
runId gating — edits invalidate the live run, settle delivers the solve
reply for the captured draft, stale replies (including stale errors) are
dropped, cancel returns to dirty, reset returns to empty, the fixed sample
loads as dirty. The app runs the core in the next event-loop work item
(`setTimeout(0)`) behind the runId gate; there is no Worker (the replay is
at most 120 events × 12 teams, so no background thread is needed).

Bilingual pages (`public/index.html` zh-Hant, `public/en/index.html` en)
with the SPEC titles/descriptions/H1, preview `noindex, nofollow`, relative
canonical + hreflang (zh-Hant/en/x-default, Chinese as x-default),
same-language home links (`../../` / `../../en/`), dynamic event rows
(join/leave/start/finish, winner blank = draw), add-event and
delete-last-event controls, load-sample (the `court-queue-rotation.cap`
fixture), clear-draft, cancel while busy, field-linked errors with focus,
results as a semantic list (played / on court / staying / waiting /
next pair) with a plain-language note when no next pair can be previewed.
All rendering uses `textContent`/`value` only; no network, storage,
analytics, CDN or remote fonts; bfcache restore clears the in-memory work.

## Notes for the reviewer

1. The SPEC handoff lists `src/core.mjs`, `src/app.mjs`, `src/i18n.mjs`,
   `src/styles.css` and production build scripts (`build:production`,
   `check:generated:production`). This candidate follows the consolidated
   handbook format instead (`public/js/core/…`, `public/js/app.js`,
   `public/styles/app.css`, preview-only build), like the other wave-3
   tools; no production origin has been approved, so the production build
   (absolute canonicals, sitemap, robots allowing crawl) is a follow-up
   for the coordinator, not part of this candidate.
2. Same-language home links are relative (`../../`, `../../en/`), resolving
   to the SPEC's `https://glossquote.com/…` home in production; no official
   domain is hard-coded into the preview pages.
3. `-0` as a core integer is reported as RANGE; non-integers and string
   numbers as TYPE. Raw form integer syntax failures are SYNTAX (app-level).
4. InitialQueue cross-field order follows the SPEC implementation rule:
   refs first, then duplicates, each in array order.
5. No spec errata: all 8 printed fixtures reproduce exactly from the SPEC's
   own rules. Three test-expectation slips found during the build (loser
   returns to the queue tail) were corrected in the tests, not in the
   product; the product matched the SPEC throughout.

## Verification

See VERIFICATION.md. `npm test`, `npm run check`, `npm run build:preview`
×2 byte-identical, `npm run check:generated:preview`, loopback HTTP probe.
NOT_RUN: real-browser rendering/interaction, real devices/touch,
assistive tech, measured contrast, Network/Storage audit, deployment,
independent nine-aspect review.
