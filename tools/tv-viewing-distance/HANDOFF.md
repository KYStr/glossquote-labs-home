# HANDOFF — TV Viewing Distance Calculator （電視尺寸與觀賞距離）

## Fixed source

- Spec task: `labs-tv-viewing-distance-spec-20261109`
- Spec candidate commit: `1b6147ac5d8652fe43f46614a54dfdb810b4faa8`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/155
- Spec files: `docs/specs/tv-viewing-distance/{BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md}` at that commit (spec slug `spec-tv-viewing-distance-20261109`).
- Production base: `codex/initial-publication` @ `15f20a7afa234e8a9dc1d607a88379f89cd5656c`
- Production branch: `muse/tv-viewing-distance-production-20261109`
- Scope: only `tools/tv-viewing-distance/` was added. No registry/coordination commands were run (build-first mode; the parent agent submits).

## What was built

- Pure core `public/js/core/tv.mjs`: strict own-data schema validation in the SPEC's pinned order (structure → per-field capacity → unpaired surrogate → grammar/enum → range → cross-field EMPTY), forward mode (16:9 screen via `d × 2.54 × 16/√337` and `9/√337`, float only there as the SPEC pins; four distances as exact BigInt decimals `d × multiplier × 254` with half-up output rounding; five-state fit compared on unrounded exact values), inverse mode (exact rational `R/2.54` divided by the pinned multipliers, half-up to 0.1 in). UHD 4K changes only the minimum multiplier (1.2 → 1.0) and therefore `diagonalMaxIn`. Canonical report serializer for the fixed download `tv-viewing-distance-report.json` (UTF-16-sorted keys, compact, one trailing LF, 2,097,152-byte OUTPUT_LIMIT).
- Controller `public/js/controller.mjs`: six-state machine (empty/dirty/busy/success/error/cancelled) with generation guarding; edits/cancel terminate the Worker and late replies are dropped.
- Worker: module Worker created from a Blob URL over the fixed core + handler bytes embedded at build time (`js/worker-source.js`), exactly as the SPEC pins.
- Bilingual static pages (zh-Hant default, en) with the SPEC-pinned titles, descriptions, FAQ answers, quick-pick sizes (32/43/50/55/65/75/85/98), the multiplier table in one disclosure, preview noindex, no canonical/hreflang, same-language home links via `../../`.
- Scripts: reproducible `build:preview` (byte-identical across runs, BUILD-MANIFEST.json with per-file SHA-256), static `check`, `check:generated:preview`, loopback-only `serve`.
- Tests vendored the spec fixtures verbatim into `test/fixtures.json` (SHA-256 `cf0270353735878c659c6f1e34fb4145f2fee9d884c06a2fbf71b0d1187792e8`, byte-identical to the spec candidate; `scripts/check.mjs` pins this hash) because spec PR #155 is not yet merged into the base branch.

## Deviations / interpretations

- File layout follows the handbook contract (`public/js/core/`, `public/js/app.js`, `public/styles/`) rather than the SPEC §implementation sketch's `src/` names; behaviour is unchanged. Recorded in prior runs as the standing interpretation.
- The SPEC's preview convention (no production canonical/hreflang/sitemap in the candidate; build refuses `--mode production` since no origin is configured) was followed over the generic checklist wording.
- SPEC prose says the candidate serves at port 4173 by default; the house `serve.mjs` default is also 4173 on 127.0.0.1. No deviation.

## Spec-errata candidates

- None. Every fixture expectation reproduces exactly from the SPEC's stated rules; the deliberate half-up tie in `forward-10-boundary` (63.5 cm → 64) is produced by the exact integer path, not by float error.

## Next owner

Independent reviewer (non-author) for the nine predeclared acceptance aspects on this fixed candidate; real-browser/device evidence is still outstanding (see VERIFICATION.md NOT_RUN list). Nothing here is accepted, merged, or published.
