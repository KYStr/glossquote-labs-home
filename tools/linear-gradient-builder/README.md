# Linear Gradient Builder — source candidate

Bilingual, memory-only CSS linear-gradient builder. This is an unaccepted preview source, not a deployment or a product-quality score.

## Fixed specification

`KYStr/glossquote-labs-home`, commit `aaa8ff63e8673efccc0c21ff2d32632a510f7f42`, `docs/specs/linear-gradient-builder/SPEC.md`.
All nine dimensions remain required: functionality, boundaries, privacy, security, usability, accessibility, localization-seo, toolchain-provenance, compatibility. Independent scores are null until independently assessed against the same candidate.

## Reproduce

Node.js 24, built-ins only; no install or dependencies.

```sh
node --test tests/*.test.mjs
node scripts/check.mjs
node scripts/build.mjs
node scripts/serve.mjs
```

Authorized preview server binds `127.0.0.1:4188` only. Open `/index.html` or `/en/index.html`. No network service, account, data persistence or deployment configuration is created. The build explicitly packages eight public files plus `_headers`; `dist/manifest.json` lists bytes and SHA-256. Unknown files and links fail without deletion. Static checks are limited checks, not a security audit.

## Operation and lifecycle

Enter two six-digit HEX colors, ordered integer percentages and an integer angle 0–359. Generate explicitly. Raw input is not trimmed, rewritten or sorted. Add/remove/reorder preserves full rows. Result, summary and downloaded CSS use one verified snapshot. Equal stops create a hard cut.

Every edit, composition, hidden state or navigation invalidates exports. Hidden keeps draft; pagehide clears it; pageshow resets blank. Clipboard Promise results are generation-guarded with a three-second fallback; sent clipboard writes cannot be recalled. Download URLs have one lease, a maximum thirty-second lifetime and explicit cleanup. Saving remains controlled by the browser.

No selected license is asserted; repository licensing applies as available. No workflow, catalog publication or deployment is included.

See `VERIFICATION.md` for observed evidence and untested scope.
