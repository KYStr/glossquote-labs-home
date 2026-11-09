# Verification — Game Night Scorecard

- **Fixed spec source:** `docs/specs/game-night-scorecard/` (`spec-game-night-scorecard-20261109`, v1) at base `23c1d5f70db16e8bd0086259156243c5a57f8785` (`codex/initial-publication`)
- **Registry task:** `labs-prod-game-night-scorecard-20261109`
- **Claim:** `muse-main-claim-game-night-scorecard-20261109T082402Z-w5`
- **Candidate commit:** (filled in after the PR is opened; see the draft PR)
- **Environment:** Node v24.22.1, offline, Linux

## Commands and results (all exit 0)

- `npm test` — **65 pass / 0 fail**: all 8 literal SPEC fixtures
  (`deepStrictEqual`, 6 solve + 2 flow) plus hand-derived cases —
  validation paths and error codes (SHAPE/TYPE/RANGE/DUPLICATE/ORDER/
  ENUM/SIZE, NFC duplicates, `-0`, fractional and string scores, text
  injection in names), SIZE boundary at exactly 65,536 / 65,537 bytes,
  drop-3-of-4, dropped-list input order, low-mode earliest-tie drop,
  kept-total bounds ±29,970, shared ranks 1, 1, 3, 3, and flow extras
  (reset, fail-then-edit, stale error reply ignored, run-while-busy
  ignored, sample load).
- `npm run check` — pass (required files, package contract, core purity,
  app safety, SPEC-pinned limits, bilingual metadata, SPEC CSP in the
  serve script, no remote assets).
- `npm run build:preview` ×2 — **byte-identical** (aggregate SHA-256 of
  the sorted per-file hashes:
  `8e2749c625db5f975903e294f096d616a176b8d795e7ceb8b4df0787d189503c`,
  8 files in `dist/` + `BUILD-MANIFEST.json`).
- `npm run check:generated:preview` — pass (manifest bytes + SHA-256
  verified, robots denies all, both pages carry noindex/canonical/
  hreflang markers).
- Loopback HTTP probe (`node scripts/serve.mjs --port 8331`, server
  killed after): `/` and `/en/` 200 with the SPEC titles, `js/app.js`,
  `js/core/solve.mjs`, `styles/app.css`, `robots.txt` all 200, path
  traversal 404, unknown path 404, SPEC CSP and
  `X-Content-Type-Options: nosniff` headers present on every response.

## Spec errata

**None.** All printed fixtures reproduce exactly from the SPEC's own
rules.

## SPEC-silent interpretations (for the reviewer)

1. A blank score field is a form-level `SYNTAX` error (raw integer
   syntax); a blank player/round name is reported by the core as `RANGE`
   (empty after U+0020 trim).
2. Non-string `mode` is `ENUM`.
3. The sample loader loads the `high-tiebreak` fixture as a dirty draft,
   per the SPEC.
4. Preview pages use relative canonical + hreflang (x-default → zh-Hant)
   and `noindex, nofollow`; the same-language home links use the
   SPEC-pinned `https://glossquote.com/...` URLs. `build:production` is
   refused: no production origin is approved.
5. The core runs on the next event-loop work item (`setTimeout(0)`)
   under a runId guard instead of a separate worker file; the workload
   is at most 360 integers, so no worker is needed. Cancel/edit before
   that item revokes the scheduled work.

## Bug found and fixed during the build

`scripts/check.mjs` flagged `public/js/core/i18n.mjs` for the token
`document.` appearing in a comment (`stringsFor(document...)`). The
comment was reworded; no product code changed. Caught before any commit.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard-only flow,
  320 CSS px, 200% zoom, reduced motion, touch).
- Real devices/touch.
- Assistive technology.
- Measured contrast.
- In-browser Network/Storage observation (no fetch/storage calls exist
  in the source; the live observation itself is still NOT_RUN).
- Deployment / production HTTPS checks.
- Independent nine-aspect review.
