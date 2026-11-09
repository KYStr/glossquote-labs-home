# Handoff — Parcel Billable Weight

- **Tool:** `tools/parcel-billable-weight/` in `KYStr/glossquote-labs-home`
- **Spec:** `spec-parcel-billable-weight-20261109` v1, fixed source
  `docs/specs/parcel-billable-weight/` (SPEC.md, BRIEF.md, fixtures.json,
  AUTHOR-CHECK.md) at base commit `fb55ef262642744147d01db9b2fcbc82cc8b76e1`
  (`codex/initial-publication`).
- **Registry task:** `labs-prod-parcel-billable-weight-20261109`
- **Claim:** `muse-main-claim-parcel-billable-weight-20261109T083325Z-w6`
  (claimed by the parent actor; this builder ran no registry commands).
- **Branch:** `muse/parcel-billable-weight-production-20261109`
- **Allowed scope:** `tools/parcel-billable-weight/` only. Nothing outside
  it was touched; `docs/specs/` and the registry were not modified.

## Implementation summary

Pure core `public/js/core/solve.mjs` exports `solve(data)`,
`normalizeName(value)` and `volumeTenths(numerator, denominator)`.
Validation order: root type → SIZE (65,536 UTF-8 bytes) → root/row SHAPE
→ per-field in table/array input order → cross-field duplicate names
(parcels, then services, at the second occurrence). Sides are sorted
descending (L≥M≥S); volume is the unreduced fraction V/divisor; wrap is
`L + 2×(M+S)`; a non-empty limit is a violation only when strictly
exceeded; otherwise `num = max(actualG×divisor, V, minG×divisor)` and
`chargeG = ceil(num / (stepG×divisor)) × stepG`, computed with BigInt so
the ceiling division is exact (largest case 27,000,000,000 mm³). A
service total sums per-piece charges only when every piece is
chargeable. `public/js/core/flow.mjs` is the runId-gated
empty/dirty/busy/ready/error controller; the app solves a valid draft on
the next event-loop work item (`setTimeout(0)`) per the SPEC, with
cancel/edit revoking the pending item. Bilingual pages (zh-Hant + en)
use the SPEC-pinned titles, descriptions, home links and preview
`noindex,nofollow` with relative canonical/hreflang; no analytics, CDN,
remote fonts, network or storage use; all user text is rendered with
`textContent`/`value` only.

## Format notes for the reviewer

- The SPEC's handoff section lists a `src/` file layout and production
  build scripts. This candidate follows the consolidated house format
  (`public/js/...`, preview-only build, production refused without an
  approved origin), matching the sibling tools built in this run.
- Preview canonicals/hreflang are relative, as in the sibling tools;
  the SPEC-pinned `glossquote.com` home links are used for the
  same-language home links. The production build (HTTPS origin,
  self-referring canonicals, sitemap, robots allowing crawling) is not
  part of this candidate.
- The core result shape is exactly the SPEC's fixed shape (no `sides`
  field on pieces); the app reads the sorted sides for display from the
  validated draft behind the shown result.
- Blank form rows are skipped when building the draft; a partially
  filled row reports its first bad field. A blank required number is a
  form-level `SYNTAX` error; name rules and duplicates are reported by
  the core (`RANGE`/`DUPLICATE`).

## Spec errata

None. All 8 literal fixtures reproduce exactly from the SPEC's own
rules. One test-side expectation was corrected during the build (a
volume-driven charge of 500 g, not 100 g); the product matched the SPEC
throughout. See VERIFICATION.md.

## Next owner

Independent reviewer (parent submits the candidate to the registry).
Real-browser/device/assistive-tech/deployment checks are NOT_RUN; see
VERIFICATION.md.
