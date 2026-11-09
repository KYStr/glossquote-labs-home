# Verification — Bead String Pattern

Candidate branch: `muse/bead-string-pattern-production-20261109`
Base: `c0a7fa3601da3de3d726f1c74d139395e40223f3` (`codex/initial-publication`)
Environment: Node v24.22.1, offline, loopback only.

## Commands and results

- `npm test` — **30 pass / 0 fail**. All 8 literal SPEC fixtures reproduced
  verbatim with `assert.deepStrictEqual` (6 solve + 2 flow), plus
  hand-derived cases: SIZE boundary ±1 byte, fixed error paths (unknown
  key, missing key, row SHAPE), number syntax/type/range, NFC duplicate
  and NFC motif matching, markup-in-name rejection, REF order
  (motif → head → tail), alternate-boundary B/B adjacency, expand unit
  checks, 514-position maximum, stock conservation, and flow extras
  (reset, blank submit + error recovery, stale error reply ignored,
  run-while-busy ignored, cancel-while-idle no-op, fail keeps the draft).
- `npm run check` — pass.
- `npm run build:preview` ×2 — **byte-identical** (full sha256 tree diff).
- `npm run check:generated:preview` — pass.
- Loopback HTTP probe — `/` and `/en/` 200 with correct titles, JS/CSS
  200, path traversal 404, unknown path 404; SPEC CSP and
  `X-Content-Type-Options: nosniff` headers present on responses.

## Spec errata

None — every printed fixture reproduces exactly from the SPEC's own
rules. One test-side correction during the build (not a spec defect):
the first draft of the 514-position test used 16 distinct colours, which
exceeds the SPEC's 12-colour cap; the test now uses 12 colours with a
16-bead motif reusing them.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 px, 200% zoom, reduced motion, worker execution in a real browser,
  Blob-free flow, cancel in-browser).
- Real devices/touch.
- Assistive tech, measured contrast.
- Network/Storage observation in a browser (no fetch/storage code exists;
  only static review done).
- Deployment, production HTTPS checks, formal SEO/robots/sitemap.
- Independent nine-aspect review.
