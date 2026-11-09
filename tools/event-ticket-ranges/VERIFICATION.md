# Verification — Event Ticket Range Check

Candidate build for `tools/event-ticket-ranges/` in `KYStr/glossquote-labs-home`.
Base: `23c1d5f70db16e8bd0086259156243c5a57f8785` (`codex/initial-publication`).
Environment: Node v24.22.1, offline, no network access during tests/build.

## Commands run (all exit 0 unless noted)

- `npm test` (`node --test`): **36 pass / 0 fail**.
  - All 8 literal SPEC fixtures from `docs/specs/event-ticket-ranges/fixtures.json`
    (imported, not copied) reproduce exactly via `assert.deepStrictEqual`,
    including both flow fixtures (`dirty-after-edit`, `cancel-then-late`).
  - Hand-derived cases: endpoint merging, three-way overlap copy counts,
    outside ordering (bundle input order, lower before higher), fully-outside
    bundle, all-zero serials, issued length = uniqueCovered + missingCount.
  - Validation: digits TYPE/RANGE (incl. `-0`, `NaN`, string, 4.5),
    root/issued/bundle SHAPE paths, serial TYPE vs SYNTAX (width, non-digit,
    full-width digits), name NFC/trim/length/character rules, DUPLICATE at the
    second row (incl. NFC-equivalent names and space-trimmed duplicates),
    ORDER issued-before-bundle, SIZE boundary (just under the 65,536-byte cap
    reaches SHAPE; just over returns SIZE at the root), 64-bundle cap
    (65 → RANGE, 64 → ok).
  - Flow extras: reset → empty, fail → error then edit → dirty, stale error
    reply cannot overwrite a newer busy run, cancel while idle is a no-op,
    resubmit while busy is ignored, core error settles as error phase.
  - One test expectation was corrected during the build (three-way overlap:
    duplicate copies are 1+2+1 = 4, not 3); the product matched the SPEC
    throughout.
- `npm run check`: pass.
- `npm run build:preview` ×2: **byte-identical** (aggregate SHA-256 of the
  `dist/` file list `8717cb3e551a7e4268eb029a0448fb9715c1c4c05626724bc5c7e7eb5d4192b8`
  on both runs; 8 files + `BUILD-MANIFEST.json`).
- `npm run check:generated:preview`: pass (manifest bytes/sha256, no extra
  files, preview noindex/canonical on both pages, robots.txt denies all).
- Loopback HTTP probe (port 8347, server killed after): `/` and `/en/` 200
  with the SPEC-pinned titles, `js/app.js`, `js/core/solve.mjs`,
  `js/core/flow.mjs`, `js/core/i18n.mjs`, `styles/app.css`, `robots.txt` all
  200, path traversal 404, unknown path 404, SPEC CSP header and
  `X-Content-Type-Options: nosniff` observed.
  - First probe attempt hit port 8331, which was already serving a sibling
    tool (game-night-scorecard) from another concurrent builder; re-probed
    on 8347 against this tool's own server.

## Spec errata

None — all printed fixtures reproduce exactly from the SPEC's own rules.

## SPEC-silent interpretations

Recorded in HANDOFF.md: DUPLICATE checked after all field validations and
before ORDER; name length failures are RANGE, character-class failures are
TYPE; non-string serials are TYPE, width/character failures are SYNTAX;
preview uses relative canonical/hreflang/home links (the SPEC's
glossquote.com values are production values; production build refused
without an approved origin); no worker file — the core runs as the next
event-loop work item per the SPEC's implementation section, with a
runId-guarded `setTimeout(0)` settle; raw digits syntax failures are
SYNTAX at `/digits` before the core runs.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 px, 200% zoom, reduced motion, Network/Storage observation).
- Real devices/touch.
- Assistive technology.
- Measured contrast.
- Deployment / production HTTPS checks.
- Independent nine-aspect review.
