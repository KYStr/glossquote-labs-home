# Event Battery Swap Plan — Production Handoff

## Fixed source

- Repo: `KYStr/glossquote-labs-home`
- Base commit: `c0a7fa3601da3de3d726f1c74d139395e40223f3` (tip of `codex/initial-publication` at build time)
- Spec: `docs/specs/battery-swap-plan/SPEC.md` (spec `spec-battery-swap-plan-20261109`, v1, 2026-11-09, B 組預案), plus `BRIEF.md`, `fixtures.json` (schemaVersion 1, 8 cases), `AUTHOR-CHECK.md` — all read in full at the base commit.
- Branch: `muse/battery-swap-plan-production-20261109`
- Candidate commit: the head of the draft PR opened from this branch against base `codex/initial-publication` (see the builder's completion report for the SHA and PR URL).

## Registry

- Task: `labs-prod-battery-swap-plan-20261109`
- Claim: `muse-main-claim-battery-swap-plan-20261109T081158Z-w4` (claimed by the parent actor; workMayStart verified by the parent)
- No coordination/registry commands were run by the builder. The parent submits this candidate to the registry after verifying the PR head.

## Allowed scope

Only `tools/battery-swap-plan/` was created or changed. Nothing outside it was
touched; `docs/specs/` is untouched; no registry writes; nothing merged,
deployed or published.

## What was built

- Pure core `public/js/core/solve.mjs`: strict validation (SIZE/SHAPE/TYPE/
  RANGE/DUPLICATE/ORDER/OVERLAP with fixed JSON Pointer paths, in the SPEC's
  check order: size, shape, fields in table order, then cross-field
  DUPLICATE → ORDER → OVERLAP) and the pinned swap algorithm — first working
  minute loads a pack with full runtime, closed gaps keep remaining minutes,
  a swap is placed at the next working minute when the runtime runs out and
  more work follows, never when the pack ends exactly with the last working
  minute. Events are sorted by minute with same-minute ties in device input
  order; event i (1-based) takes pack i while i ≤ charged, otherwise null.
  All minutes are integers; no floats anywhere.
- Pure run-state machine `public/js/core/flow.mjs`: empty/dirty/busy/ready/
  error with runId-guarded settle; re-submit while busy ignored; cancel
  returns to dirty and invalidates the runId; late settles ignored; `fail()`
  for form-level errors.
- Bilingual pages (`public/index.html` zh-Hant, `public/en/index.html` en):
  charged packs + 1–8 devices each with a name, measured runtime and 1–16
  HH:MM periods (add/remove device and period), example load
  (`battery-swap-plan.gaps-and-shortage`), clear draft, busy + Cancel,
  per-field errors with focus links, results table (time/device/type/pack)
  + summary (required/extra/unused/first shortage) + shortage/enough note.
  Preview `noindex, nofollow`; canonical + hreflang + x-default;
  same-language home links (`../../` / `../../../en/`); no analytics, CDN,
  remote fonts, network or storage; all user text via `textContent`/`value`.
- `scripts/build.mjs` (reproducible preview build), `scripts/check.mjs`
  (static checks), `scripts/check-generated.mjs` (dist == public byte check),
  `scripts/serve.mjs` (loopback-only, emits the SPEC's CSP headers +
  `X-Content-Type-Options: nosniff`).
- Tests: all 8 literal fixture cases (6 solve + 2 flow) plus validation,
  algorithm-property and flow-transition suites — see VERIFICATION.md.

## Notes / deviations from the SPEC's suggested layout

- The SPEC's handoff section lists a `src/*.mjs` + `src/worker.mjs` layout
  with `npm.cmd` scripts and `build:production` / `check:generated:production`.
  This candidate follows the consolidated handbook format instead
  (`public/js/core/*.mjs`, `public/js/app.js`, `public/styles/app.css`,
  `scripts/*.mjs`, preview build only), matching the other tools built in
  this run. No production build is included: the formal build needs a
  confirmed HTTPS origin supplied by the coordinator, and the preview pages
  carry relative canonicals plus `noindex, nofollow` per the SPEC's preview
  rules. The async run/cancel contract uses a runId-guarded `setTimeout(0)`
  settle around the synchronous bounded core instead of a separate worker
  file; the core's worst case (1,152 events) is a short synchronous pass,
  and the runId gate gives the same late-reply protection.
- SPEC-silent interpretations (also in VERIFICATION.md):
  - Cross-field order: name DUPLICATE is checked before ORDER, and ORDER
    is checked across all devices before OVERLAP; the SPEC pins ORDER before
    OVERLAP but does not place DUPLICATE among them.
  - A name that fails the character rules is TYPE; a name that is empty or
    over 24 code points after trim + NFC is RANGE.
  - Form-level blank/malformed input is reported with the fixed codes
    REQUIRED / SYNTAX / RANGE / DUPLICATE on the offending field; the core
    only ever receives validated data, so its own error paths are exercised
    through the flow machine's `run()` validation step.
  - The SPEC's "initialization failure shows Reload" affordance is not
    implemented: the page has no dynamic init step, and an inline fallback
    script would violate the pinned CSP (`script-src 'self'`).
