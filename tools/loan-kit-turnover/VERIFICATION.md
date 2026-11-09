# Loan Kit Turnover Check — Verification

- **Spec:** `spec-loan-kit-turnover-20261109` v1
  (`docs/specs/loan-kit-turnover/`, base
  `fb55ef262642744147d01db9b2fcbc82cc8b76e1`)
- **Candidate:** `45ec9666d583f82602f9dbc17894f7cb1aa0e135`
  (tool commit; the follow-up commit records this SHA and the PR URL
  in HANDOFF.md / VERIFICATION.md)
- **Draft PR:** https://github.com/KYStr/glossquote-labs-home/pull/128
- **Environment:** Node v24.22.1, offline, Linux (this VM)

## Commands run

- `npm test`: **47 pass / 0 fail** — all 8 literal SPEC fixtures
  (6 solve + 2 flow) reproduced verbatim via `assert.deepStrictEqual`,
  plus hand-derived cases: SIZE boundary (70,000-char name → SIZE;
  1,000-char name → RANGE, proving SIZE precedes name validation),
  SHAPE paths (root, row, missing key), TYPE/RANGE at every field
  boundary, name rules (empty, 25 code points, leading `-`, markup,
  `A/B`), NFC duplicates (U+00E9 vs U+0065+U+0301), case-sensitive kit
  names, U+0020 trimming before kit matching, REF-before-ORDER
  cross-field order, turnaround occupancy, segment loan names in loan
  input order, per-kit independence, 24:00 return, maximum-size input
  (12 kits, 60 loans), `formatMinute` (24:00 and next-day marks), and
  flow extras (reset, run with no draft, run-while-busy, cancel while
  idle, stale error reply, fail-then-edit, core-error settle).
- `npm run check`: pass (exit 0).
- `npm run build:preview` ×2: **byte-identical** (8 files; sha256 tree
  diff clean). Manifest: BUILD-MANIFEST.json.
- `npm run check:generated:preview`: pass (exit 0).
- Loopback HTTP probe (port 8351, serving `dist/`, server killed
  after): `/` and `/en/` 200 with correct titles, app.js/core/CSS/
  robots 200, traversal 404, unknown 404, SPEC CSP +
  `X-Content-Type-Options: nosniff` headers observed.

## Spec errata

None — every printed fixture reproduces exactly from the SPEC's own
rules. Two SPEC-silent interpretations are recorded in HANDOFF.md:
cross-field REF-then-ORDER pass order, and form-level SYNTAX for raw
integer/HH:MM text (a `24:00` pickup is core RANGE at the start field).

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 px, 200% zoom, reduced motion, Network/Storage)
- Real devices/touch
- Assistive tech
- Measured contrast
- Deployment
- Independent nine-aspect review
