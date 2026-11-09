# Production status

This tool was built under the owner's 2026-11-02 build-first directive
(「直接一路做，之後一起審」 — build everything first, review in bulk
afterwards).

- The wave's registry gate experiment (run once, on the QR Code Maker)
  established that the coordination core refuses production claims
  against draft specs (`SPEC_UNAVAILABLE` — "Production needs a ready
  spec or the same previously consumed spec."), so per the directive no
  production task was registered for this tool at all in this wave.
- This repository is the complete production candidate built to the
  full house standard, with registry production registration and
  submission held for the later bulk-review phase.
- Candidate commit = the head of the pull request opened from this
  repository's production branch; see `CANDIDATE-MANIFEST.json` and
  `VERIFICATION.md` for the frozen evidence.
- One SPEC defect was found while building (a worked fixture whose
  stated suffix length disagrees with the SPEC's own tier rule); it is
  documented in `VERIFICATION.md` for the bulk review. The
  implementation follows the rule.
- Nothing here is merged, deployed, published, or catalogued.
