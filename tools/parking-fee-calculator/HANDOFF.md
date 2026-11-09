# Handoff — Parking Fee Calculator （停車費計算機）

- Product: `tools/parking-fee-calculator/` in `KYStr/glossquote-labs-home`.
- Fixed spec source: task `labs-parking-fee-calculator-spec-20261109`, spec
  `spec-parking-fee-calculator-20261109`, candidate commit
  `29b703e0a23ea6e5c56d702a746686467892d01f`, draft spec PR
  https://github.com/KYStr/glossquote-labs-home/pull/141
  (`docs/specs/parking-fee-calculator/{BRIEF,SPEC}.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`). The spec PR is not merged into the production base;
  the 15 literal fixtures were vendored verbatim into `test/fixtures.json`
  from that candidate.
- Production base: `codex/initial-publication` @
  `9e6abd357f29f5f914cc5252023f3d7b2fbee4ef`.
- Mode: build-first. No registry/coordination commands were run by the
  builder; registry submission is the parent agent's step.

## What was built

- `public/js/core/parking.mjs` — pure core: exact-schema validation,
  per-field checks in the pinned order (INPUT_LIMIT / UNICODE / EMPTY /
  DATETIME_FORMAT / INTEGER_FORMAT / RANGE), cross-field ORDER and the
  43,200-minute cap, integer days-from-civil segmentation on Asia/Taipei
  calendar days, all-or-nothing grace on total minutes, per-day
  first/subsequent period billing with per-day restart after midnight,
  per-day cap (`dailyCap` 0 = uncapped; equal-to-cap is not capped),
  lost-ticket flat fee, and the canonical `parking-fee-report.json`
  serialization (sorted keys, compact, trailing LF, 2,097,152-byte limit).
- `public/js/core/messages.mjs` — the pinned bilingual error table and UI
  strings.
- `public/js/controller.mjs` — the six-state machine
  (empty/dirty/busy/success/error/cancelled) with generation guarding:
  edits and cancels invalidate results and downloads; late worker replies
  from stale generations are dropped; the worker is terminated after
  every settle.
- `public/js/app.js` — DOM wiring using textContent/value only; module
  Worker created from a Blob URL over the build-embedded fixed core
  source; download only on explicit click, Blob URL revoked after 30 s
  or on invalidation; pagehide terminates the worker and revokes URLs.
- `public/index.html` (zh-Hant) and `public/en/index.html` — static
  bilingual Product App pages: pinned titles/descriptions, relative
  canonical/hreflang, noindex preview, same-language home links, CSP
  meta, FAQ pair, full field set with labels, help, and error slots.
- `scripts/build.mjs` — reproducible preview build into `dist-preview/`
  (also `--verify` for check:generated:preview).
- `scripts/check.mjs` — static gate: zero dependencies, file allowlist,
  forbidden-sink scan, page requirements.
- `scripts/serve.mjs` — loopback-only preview server with pinned
  security headers, traversal/symlink rejection, no directory listing.

## Deviations

- None from the SPEC. The spec's preview convention (noindex candidate,
  relative canonical/hreflang, no production canonical/sitemap) is
  followed as pinned.
