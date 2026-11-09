# Production status

This tool was built under the owner's 2026-11-02 build-first directive
(「直接一路做，之後一起審」 — build everything first, review in bulk
afterwards).

- The registry gate experiment was run first: a production task
  (`labs-qr-code-maker-cloud-production-20261102`) was registered for
  `spec-qr-code-maker-v1`, but claiming it against the still-draft spec
  was refused by the coordination core with `SPEC_UNAVAILABLE`
  ("Production needs a ready spec or the same previously consumed
  spec."). No spec was marked ready and nothing was forced.
- This repository is therefore the complete production candidate built
  to the full house standard, with registry production registration and
  submission held for the later bulk-review phase.
- Candidate commit = the head of the pull request opened from this
  repository's production branch; see `CANDIDATE-MANIFEST.json` and
  `VERIFICATION.md` for the frozen evidence.
- Nothing here is merged, deployed, published, or catalogued.
