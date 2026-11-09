# Verification — Plant Watering Route

- **Fixed spec source:** `docs/specs/plant-watering-route/` (`spec-plant-watering-route-20261109`, v1) at base `fb55ef262642744147d01db9b2fcbc82cc8b76e1` (`codex/initial-publication`)
- **Registry task:** `labs-prod-plant-watering-route-20261109`
- **Claim:** `muse-main-claim-plant-watering-route-20261109T083325Z-w6`
- **Candidate commit:** `TOOL_COMMIT` (tool commit; this follow-up commit records it and the PR URL below)
- **Draft PR:** `PR_URL` (base `codex/initial-publication`, OPEN + draft, head verified == candidate commit)
- **Environment:** Node v24.22.1, offline, Linux

## Commands and results (all exit 0)

- `npm test` — **62 pass / 0 fail**: all 8 literal SPEC fixtures
  (`deepStrictEqual`, 6 solve + 2 flow) plus hand-derived cases —
  validation paths and error codes (SHAPE/TYPE/RANGE/DUPLICATE/SIZE,
  NFC duplicates, `-0`, fractional and string numbers, text injection
  in names), SIZE boundary at exactly 65,536 / 65,537 bytes, the
  SPEC's own browser scenario (C tap removed → refill at B 350 ml, D
  short 100 ml), a refill preceding the blocked plant itself, a tap at
  the segment's first plant never listed as a refill, farthest-tap
  dominance (one refill, not two), two refills then blocked, exact fit,
  60-plant maximum, the 59-refill maximum, `leftMl` always within
  [0, capacity], and flow extras (reset, fail-then-edit, invalid draft
  settling as an error then recovering, stale error reply ignored,
  run-while-busy ignored, sample load).
- `npm run check` — pass (required files, package contract, core purity,
  app safety, SPEC-pinned limits, bilingual metadata, SPEC CSP in the
  serve script, no remote assets).
- `npm run build:preview` ×2 — **byte-identical** (aggregate SHA-256 of
  the sorted per-file hashes:
  `68e9e5c7f7ec8bc6b8ade7f8c5e39867cfaf57d548d3693df88473d48558fb41`,
  8 files in `dist/` + `BUILD-MANIFEST.json`).
- `npm run check:generated:preview` — pass (manifest bytes + SHA-256
  verified, robots denies all, both pages carry noindex/canonical/
  hreflang markers).
- Loopback HTTP probe (`node scripts/serve.mjs --port 8351`, server
  killed after): `/` and `/en/` 200 with the SPEC titles, `js/app.js`,
  `js/core/solve.mjs`, `js/core/flow.mjs`, `js/core/i18n.mjs`,
  `styles/app.css`, `robots.txt` all 200, path traversal 404, unknown
  path 404, SPEC CSP and `X-Content-Type-Options: nosniff` headers
  present on every response.

## Spec errata

**None.** All printed fixtures reproduce exactly from the SPEC's own
rules.

## SPEC-silent interpretations (for the reviewer)

1. A blank capacity/amount field is a form-level `SYNTAX` error (raw
   integer syntax); a blank plant name is reported by the core as
   `RANGE` (empty after U+0020 trim).
2. The sample loader loads the `farthest` fixture as a dirty draft, per
   the SPEC.
3. The SPEC's "one decimal" display rule has no one-decimal value in
   this tool (all amounts are integer millilitres), so it does not
   apply; displayed millilitre values use `Intl.NumberFormat` for the
   page language.
4. Preview pages use relative canonical + hreflang (x-default → zh-Hant)
   and `noindex, nofollow`; the same-language home links use the
   SPEC-pinned `https://glossquote.com/...` URLs. `build:production` is
   refused: no production origin is approved.
5. The core runs on the next event-loop work item (`setTimeout(0)`)
   under a runId guard instead of a separate worker file; the workload
   is at most 60 plants × 60 segments = 3,600 usage checks, so no worker
   is needed. Cancel/edit before that item revokes the scheduled work.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard-only flow,
  320 CSS px, 200% zoom, reduced motion, touch).
- Real devices/touch.
- Assistive technology.
- Measured contrast.
- In-browser Network/Storage observation (no fetch/storage calls exist
  in the source; the live observation itself is still NOT_RUN).
- Deployment / production HTTPS checks.
- Independent nine-aspect review.
