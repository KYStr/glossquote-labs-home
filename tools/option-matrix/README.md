# Option Matrix — cloud production candidate

Bilingual browser-only Cartesian option matrix generator. No persistence, network API, analytics, dependencies, or deployment. Current candidate is not independently accepted.

## Fixed contract

- Specification: `KYStr/glossquote-labs-home` commit `a691bbc5bd984feb032bd450990abf083496d153`, `docs/specs/option-matrix/SPEC.md`.
- Original nine product criteria remain unchanged. Producer does not assign independent quality scores.
- Inputs: 1–6 dimensions, 1–12 values each, at most 2,000 combinations. Last dimension varies fastest.
- JSON preserves strings. CSV is blocked for ASCII/fullwidth formula-risk prefixes; quoting alone is not treated as protection.
- Generation invalidates on edit, cancellation, composition, lifecycle changes and absolute timeout. Download object URLs have a bounded grace period and explicit cleanup.

## Reproduce in a cloud environment

```sh
node scripts/check.mjs
node --test test/*.test.mjs
node scripts/build.mjs
node scripts/serve.mjs
```

Node 24.22.1 was used. No package install is needed. Preview binds only `127.0.0.1:4187`; open `/index.html` or `/en/index.html`. The build creates `dist/manifest.json` with SHA-256 and byte counts for the explicit runtime allowlist. Tests use isolated temporary fixture copies; unknown output files are rejected and preserved. This repository contains no deployment workflow.

## Verification boundaries

See `VERIFICATION.md`. Passing core tests or source inspection is not GUI, accessibility, cross-browser, native audio/GPU, or independent quality evidence. Desktop browser compatibility remains to be exercised through the authorized managed preview.
