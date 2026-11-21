# Dice Roller — Production Handoff

## Source (fixed)

- Spec: `spec-dice-roller-20261109` — candidate commit
  `5dccd3dcfbe72aa52c9a892391a44719e9de3f9a`, spec PR #260
  (`muse/spec-dice-roller-20261109`), registry revision 1479.
  Files: `docs/specs/dice-roller/BRIEF.md`, `SPEC.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`.
- Base branch: `codex/initial-publication` at
  `c8ca5fd3` ("Accept independent CSV unpivot document review and mark
  spec ready").
- Production branch: `muse/dice-roller-production-20261109`.
- Vendored fixtures: `test/fixtures.json` is byte-identical to the spec
  candidate's `fixtures.json` (SHA-256
  `189ee1c7a7ed35082a3816695183422f1c03ddc5d7f0fd011dee26141d27b792`,
  verified against the spec commit with `git show`).

## Scope

Only `tools/dice-roller/`. Nothing else was touched. Build-first mode:
no registry/coordination command was run, nothing merged, nothing
published.

## What was built

Single NdM notation with optional `+K`/`-K` modifier, seeded mulberry32
(bit-level pin shared with `tools/lottery-number-picker`'s `createPrng`
and the group-generator spec), exactly one PRNG draw per die in roll
order, per-die results plus face sum and modifier-adjusted total, fixed
`dice-roller-report.json` download (canonical compact JSON, sorted keys,
one trailing LF). The core never invents a seed: an empty seed is an
EMPTY error in the core; the app fills a cryptographically random uint32
seed (`crypto.getRandomValues`) into the field only on an explicit run
when the field is blank. No persistent storage anywhere in this tool
(the SPEC forbids it): the draft lives only on the page and is discarded
on leaving. States: empty / dirty / busy / success / error / cancelled,
with a working Cancel that drops late replies; Worker failure is the
fixed `WORKER_ERROR` error, never a fabricated result.

Deliberate, SPEC-driven differences from the vo2max template this
scaffold was adapted from:

- Preview pages carry **no** production canonical, hreflang, sitemap,
  or Open Graph/Twitter tags and no https URL at all, per SPEC
  ("候選 … 無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。").
  The formal origin (`https://dice-roller.glossquote.com`) is not
  configured yet; the production build is expected to add the
  self-canonicals later.
- The CSP meta carries the SPEC's full directive set, including
  `worker-src blob:` and `frame-ancestors 'none'`.
- No `localStorage`/draft persistence: the SPEC's implementation
  section forbids persistent storage for this tool.
- Worker failure maps to the `error` state with `WORKER_ERROR` (the
  SPEC has no `unavailable` state; it pins `INTERNAL`/`WORKER_ERROR`
  for resource/Worker failure).

## Spec-errata candidates

**0.** No conflict was found between the SPEC normative text and the
fixtures: all 21 core fixture cases pass verbatim, all 3 controller
fixture cases pass, and the seed-42 numerator sequence matches the
AUTHOR-CHECK cross-check exactly. One test-side arithmetic slip was
caught and fixed during authoring (my hand sum for the extra `007d6`
anchor was 27; the correct sum is 26 — the implementation was right).

## Verification (see VERIFICATION.md for commands and exit codes)

- `npm test`: 52/52 pass (21 fixture core cases, 3 fixture controller
  cases, 14 hand-derived core cases, 10 extra controller cases,
  5 report cases).
- `npm run check`: pass.
- `npm run build:preview` run twice: byte-identical
  `dist-preview/` trees and `BUILD-MANIFEST.json` (recursive diff).
- `npm run check:generated:preview`: pass.
- Node v24.22.1.

## NOT_RUN (not verified by this builder)

- Real-browser / real-device checks (Chrome/Edge, both languages,
  keyboard, 320 px, 200% zoom, Network/Storage, Blob download):
  NOT_RUN — no isolated-browser mechanism is available to this builder.
- Formal HTTPS/SEO gate (canonical, hreflang, sitemap, headers on the
  real origin): NOT_RUN — the origin is not configured.

## Known limitations

- The preview build is `dist-preview/` only; production mode is refused
  by `scripts/build.mjs` (no production origin approved).
- The seed auto-fill uses `crypto.getRandomValues`; in a non-secure
  context that API may be unavailable and the run would throw at the
  app layer (the core stays pure). Served over the pinned loopback
  preview or HTTPS this does not occur.

## Next owner

Independent reviewer: verify this same candidate commit (see
VERIFICATION.md for the candidate SHA and PR) against the nine
acceptance facets in SPEC.md, with real-browser evidence for the
facets this build records as NOT_RUN. Do not merge or publish before
that review.
