# Verification — Parcel Billable Weight

Environment: Node v24.22.1, offline, Linux. Candidate built from base
`fb55ef262642744147d01db9b2fcbc82cc8b76e1` (`codex/initial-publication`).

## Commands run

- `npm test`: **41 pass / 0 fail** — all 8 literal SPEC fixtures
  verbatim via `assert.deepStrictEqual` (6 solve + 2 flow), plus
  hand-derived cases: SIZE at exactly 65,536 / 65,537 bytes, every
  fixed error path (SHAPE/TYPE/RANGE/DUPLICATE), NFC duplicate names
  (U+00E9 vs U+0065 U+0301) and normalized output names, name rules,
  duplicate-after-field-error ordering, side-order invariance, half-up
  volume tenths, exact 27,000,000,000 mm³ maximum volume, the 12×4
  maximum combination case, exact-step minimum, step round-up,
  fractional volume round-up, null total with a kept per-piece charge,
  no input mutation, and flow extras (reset, fail-then-edit,
  run-while-busy, stale error reply, core-error settle, cancel-idle,
  sample settle).
- `npm run check`: pass.
- `npm run build:preview` ×2: byte-identical (see BUILD-MANIFEST.json).
- `npm run check:generated:preview`: pass.
- Loopback HTTP probe: `/` and `/en/` 200 with the SPEC-pinned titles,
  app.js/core/CSS 200, traversal 404, unknown path 404, SPEC CSP +
  `X-Content-Type-Options: nosniff` headers present.

## Spec errata

None. One test-side expectation was corrected during the build: in the
"null total" case the second parcel's charge is 500 g (its volume
weight is 200 g, rounded up to one 500 g step), not 100 g as first
drafted; the implementation followed the SPEC throughout.

## NOT_RUN

Real-browser rendering/interaction, real devices/touch, assistive tech,
measured contrast, Network/Storage audit, deployment, independent
nine-aspect review.
