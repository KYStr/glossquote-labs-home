# Handoff — Plant Watering Route (production candidate)

- **Tool:** `tools/plant-watering-route/` in `KYStr/glossquote-labs-home`
- **Fixed spec source:** `docs/specs/plant-watering-route/` (`spec-plant-watering-route-20261109`, v1)
  - `SPEC.md`, `BRIEF.md`, `fixtures.json`, `AUTHOR-CHECK.md`
  - Read from base commit `fb55ef262642744147d01db9b2fcbc82cc8b76e1` (`codex/initial-publication`)
- **Registry task:** `labs-prod-plant-watering-route-20261109`
- **Claim:** `muse-main-claim-plant-watering-route-20261109T083325Z-w6`
  (claimed by the parent actor; this builder ran no registry commands)
- **Candidate:** see VERIFICATION.md for the fixed commit SHA and draft PR.
- **Allowed scope:** only `tools/plant-watering-route/` was touched.

## What was built

Pure core `solve(data)` per the SPEC: a full can at departure, 1–60
plants with integer amounts in [1, 20000] ml and a 1–20000 ml can, taps
before plants that refill to full. The scan records every reachable tap
after the segment's first plant; at the first plant that does not fit,
the farthest recorded tap is used — settle up to the plant before it,
refill the amount used in this segment, restart with a full can. With
no reachable tap, the completable prefix is kept and `blockedAt` /
`missingMl` are reported. Because every amount is positive, the
farthest reachable tap dominates any earlier one, so the greedy scan
uses the fewest refill stops when the route can be completed. The
algorithm was cross-checked against an exhaustive search on 3,000
random small routes before the tests were written (minimum refill
count and exact `leftMl` values all agree). All 8 literal SPEC fixtures
reproduce exactly via `deepStrictEqual`, including the SPEC's own
browser scenario (C tap removed → refill at B 350 ml, D short 100 ml).

The app is a bilingual (zh-Hant / en) form: can capacity, dynamic
plant rows (name, amount, tap-before checkbox), and a route table that
lists each refill row directly above the plant it precedes, with the
amount left after every plant and a blocked notice with the next steps
when the route cannot be finished. The core runs on the next event-loop
work item (`setTimeout(0)`) under a runId guard, so an edit or cancel
before that item revokes the scheduled work and a late reply can never
revive a result. Cancel returns to dirty and keeps the draft. No
network, no storage, no analytics, no remote fonts; user text is
rendered with `textContent`/`value` only. Displayed millilitre values
are formatted with `Intl.NumberFormat` for the page language. The serve
script sends the SPEC-pinned CSP plus `X-Content-Type-Options: nosniff`.

## Format notes for the reviewer

- This candidate follows the consolidated handbook format
  (`public/js/...`, preview-only build, `dist/` + `BUILD-MANIFEST.json`).
  The SPEC's handoff section lists a `src/` layout and `build:production`
  scripts; those are superseded by the consolidated format, and no
  production origin is approved, so `build:production` is refused.
- Preview pages use relative canonical + hreflang (x-default → zh-Hant)
  and `noindex, nofollow`; robots denies all crawling. The same-language
  home links use the SPEC-pinned `https://glossquote.com/...` URLs.
- **Spec errata: none.** Every printed fixture reproduces exactly from
  the SPEC's own rules.
- SPEC-silent interpretations recorded in VERIFICATION.md: a blank
  capacity/amount field is a form-level `SYNTAX` error (raw integer
  syntax); a blank plant name is reported by the core as `RANGE` (empty
  after U+0020 trim); the sample loader loads the `farthest` fixture as
  a dirty draft; the SPEC's "one decimal" display rule has no
  one-decimal value in this tool (all amounts are integer millilitres),
  so it does not apply.

## Next owner

Independent reviewer: review this fixed candidate against the SPEC's nine
aspects (functionality, boundaries, privacy, security, usability,
accessibility, localization-seo, toolchain-provenance, compatibility).
The parent submits the candidate to the registry. Accepted ≠ published;
deployment is a separate, separately approved step.
