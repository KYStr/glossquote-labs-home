# Handoff — Curtain Pattern Cuts (curtain-repeat-cut)

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec: `docs/specs/curtain-repeat-cut/SPEC.md` (spec `spec-curtain-repeat-cut-20261109` v1, 2026-11-09, B 組預案), with `BRIEF.md`, `fixtures.json`, `AUTHOR-CHECK.md` in the same directory.
- Base commit: `5e8fab03c00fba01bca68b1dd80280eb380b9bd6` (branch `codex/initial-publication`).
- Branch: `muse/curtain-repeat-cut-production-20261109`
- Candidate commit: (filled in by the parent after verification — see PR head)

## Registry

- Production task: `labs-prod-curtain-repeat-cut-20261109`
- Claim: `muse-main-claim-curtain-repeat-cut-20261109T080200Z-w3` (claimed by the parent actor; workMayStart verified by the parent)
- This build ran no coordination/registry commands. The parent submits the candidate to the registry after verifying the PR head.

## Allowed scope

Only `tools/curtain-repeat-cut/` was created or changed. No other path in the repo was touched; the registry was not written by this build.

## What was built

Curtain Pattern Cuts per the SPEC: pattern-repeat cut planning for one roll of printed cloth.

- Pure core `public/js/core/curtain-repeat-cut.mjs`: strict validation (exact key sets, integer/range checks, NFC name rules with duplicate detection, phase rules) and the pinned cut algorithm (non-negative remainder skip, sequential cursor, waste/spare/shortage). Also exports `solveJson` (65536-byte SIZE cap, SYNTAX) and `createFlow` (empty/dirty/busy/ready/error with runId gating and cancel).
- Bilingual pages (`public/index.html` zh-Hant, `public/en/index.html` en): same fields and order, panel table in sewing order (up to 16), continuous cut ruler plus a cuts table as its text equivalent, shortage trial-plan notice, sample loader, clear draft, cancel during busy, bfcache reset, leave-page reset note.
- No network, no storage, no analytics, no CDN, no remote fonts; user text is only ever inserted with `textContent`/`value`. CSP per the SPEC (`default-src 'none'` with `script-src`/`style-src`/`img-src`/`worker-src 'self'`, `connect-src 'none'`).

## Format note

The SPEC's handoff section lists a `src/core.mjs` / `dist/` layout. That layout is superseded by the consolidated house format used by this build (`public/js/core/*.mjs`, `public/js/app.js`, `public/js/i18n.mjs`, `public/styles/app.css`, `scripts/build.mjs` + `check.mjs` + `check-generated.mjs` + `serve.mjs`, `test/*.test.mjs`, preview `dist/` as a byte copy of `public/`), consistent with the run-2 consolidated builds. No product behaviour was changed by this.

## Verification

See `VERIFICATION.md` for commands, test counts, build byte-identity and the HTTP probe, plus the explicit NOT_RUN list.

## Next owner

Independent reviewer (non-author). The parent submits this candidate to the registry; the reviewer checks the same fixed candidate commit against the SPEC's nine fixed aspects (each ≥ 90, all required checks complete). Nothing here is accepted, merged, published or deployed.
