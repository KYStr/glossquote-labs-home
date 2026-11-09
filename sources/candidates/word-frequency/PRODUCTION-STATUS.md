# Production status

This tool was built under the owner's 2026-11-02 build-first directive
(「直接一路做，之後一起審」 — build everything first, review in bulk
afterwards).

- The registry gate was tested in wave 1 of this run: a production
  claim against a not-yet-ready spec is refused by the coordination
  core with `SPEC_UNAVAILABLE` ("Production needs a ready spec or the
  same previously consumed spec."). Per the directive, no spec was
  marked ready and nothing was forced; the registry production
  registration and submission for this tool are held for the later
  bulk-review phase.
- This repository is therefore the complete production candidate built
  to the full house standard. Candidate commit = the head of the pull
  request opened from this repository's production branch; see
  `CANDIDATE-MANIFEST.json` and `VERIFICATION.md` for the frozen
  evidence.
- Nothing here is merged, deployed, published, or catalogued.
