# Handoff — Knit Gauge Pattern Planner

- Spec: `spec-knit-gauge-planner-20261109` v1, `docs/specs/knit-gauge-planner/` (SPEC.md, BRIEF.md, fixtures.json, AUTHOR-CHECK.md) at base commit `23c1d5f70db16e8bd0086259156243c5a57f8785` on `codex/initial-publication`.
- Registry production task: `labs-prod-knit-gauge-planner-20261109`
- Claim: `muse-main-claim-knit-gauge-planner-20261109T082402Z-w5` (claimed by the parent actor; workMayStart verified). This builder ran no registry commands.
- Allowed scope: only `tools/knit-gauge-planner/` in `KYStr/glossquote-labs-home`.
- Branch: `muse/knit-gauge-planner-production-20261109`. Next owner: independent reviewer (the parent submits this candidate to the registry).

## What was built

Pure core `public/js/core/solve.mjs` implements the SPEC exactly:
validation order SIZE (65,536 UTF-8 bytes) → SHAPE (exact key set;
unknown key → SHAPE at `""`, missing key → SHAPE at that key's path)
→ per-field TYPE/RANGE in SPEC table order. Width candidates are
`2×edgeEach + k×repeatStitches`, height candidates `k×repeatRows`,
k a positive integer, every count ≤ 10,000. Per axis the lower option
is the largest estimate ≤ target and the upper option the smallest
estimate ≥ target (both inclusive), compared by the exact integer
difference `|n×swatchMm − targetMm×swatchCount|`; a tie takes the
larger count. Display tenths are half-up via
`floor((20×n + d) / (2×d))` on integers. All 6 literal solve fixtures
and both flow fixtures reproduce verbatim.

`public/js/core/flow.mjs` is the empty/dirty/busy/ready/error state
machine with runId gating (edit invalidates, cancel returns to dirty,
stale settles — including stale error replies — are ignored).
`public/js/core/i18n.mjs` holds both languages' strings and the
one-decimal formatter (`Intl.NumberFormat` on already-computed
tenths). `public/js/app.js` wires the form: raw ASCII-integer syntax
checked in table order (`SYNTAX` on the first bad field, focus moves
there), then core `solve()` for range/shape; a valid draft is solved
in the next event-loop work item (`setTimeout(0)`) behind the runId,
with Cancel and edit revoking the scheduled item.

## Notes for the reviewer

- No Worker is used. The SPEC's async contract is "pure core in the
  next event-loop work item" with a runId gate; the work is at most
  10,000 integer candidate checks per axis, so a `setTimeout(0)`
  settle satisfies it. Cancel/edit correctness is covered by flow
  tests.
- The SPEC handoff lists a `src/` file layout; this candidate follows
  the consolidated handbook format (`public/js/...`, preview-only
  build plus a production build gated on a confirmed HTTPS origin),
  like the other tools in this run.
- Unknown-key vs missing-key precedence inside SHAPE is a SPEC-silent
  interpretation: an unknown key is reported first (at the object
  path `""`); missing keys are then reported in SPEC table order.
  Recorded here and in VERIFICATION.md.
- An empty form field is a raw syntax error (`SYNTAX` at that field's
  path): every field is required and the form only accepts the SPEC's
  ASCII integer form.
- The preview pages use relative canonical/hreflang links and
  `noindex, nofollow` with a deny-all robots.txt, per the handbook;
  the production build rewrites them to absolute URLs under the
  confirmed origin and writes a sitemap listing exactly the two
  canonical pages. No production origin is approved for this tool, so
  the production build has not been run against a real origin (only
  verified with a placeholder origin in local checks — see
  VERIFICATION.md).

## Spec errata

None — every printed fixture reproduces exactly from the SPEC's own
rules.
