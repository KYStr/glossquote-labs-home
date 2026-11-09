# Pickup Window Route — Verification

Candidate commit: (filled in after the PR is opened; PR head is verified
equal before the parent submits it).

Environment: Node v24.22.1, offline, Linux. All commands run from
`tools/pickup-window-route/`.

## Commands and results

- `npm test` (`node --test`): **40 pass / 0 fail** — all 8 literal SPEC
  fixtures verbatim (`assert.deepStrictEqual`, 6 solve + 2 flow), SIZE
  boundary at exactly 65,536 / 65,537 UTF-8 bytes, fixed error paths
  (SHAPE/TYPE/RANGE/DIAGONAL/ORDER/DUPLICATE), name rules (NFC
  duplicates, trim, bad characters, length), one-way-leg search case,
  8-stop worst case (exactly 109,601 nodes and 40,320 orders, return 17,
  input order kept on ties), waiting counted separately from service,
  no input mutation (frozen input), flow extras (reset, fail-then-edit,
  run-while-busy ignored, stale error reply dropped, cancel-while-idle
  no-op), worker protocol in Node with stubbed messaging (run posts one
  done reply; cancel before drain posts only `cancelled`).
- Independent cross-check (not committed, `/tmp` scratch): the search
  was re-implemented in Python (brute-force over all permutations) and
  compared against `solve` on 60 seeded random cases (1–4 stops, null
  legs, tight windows): **60/60 match**.
- `npm run check`: pass (required files, package contract, core purity,
  app safety, worker contract, SPEC-pinned constants, bilingual
  metadata, SPEC CSP fragments, no remote assets).
- `npm run build:preview` ×2: **byte-identical** (aggregate SHA-256 of
  the `dist/` tree `e919e574e6b6711df1021aba6a0f1211fc2a3fc874f05c3e428337e4b4280f4c`
  both runs; 9 files + `robots.txt` denying all).
- `npm run check:generated:preview`: pass.
- Loopback HTTP probe (port 8353, server killed after): `/` 200 with the
  Chinese title, `/en/` 200 with the English title, `app.js`,
  `core/solve.mjs`, `worker.mjs`, `styles/app.css` all 200, path
  traversal 404, unknown path 404, SPEC CSP + `X-Content-Type-Options:
  nosniff` headers present on every response. (First probe showed `/en/`
  404 because `serve.mjs` only mapped `/` to `index.html`; fixed by
  mapping trailing-slash directory paths to their `index.html` and
  re-probed green.)

## Spec errata

None — all printed fixtures reproduce exactly from the SPEC's own rules.

## SPEC-silent interpretations (see HANDOFF.md)

Cross-field order DUPLICATE → travel size → DIAGONAL → deadline ORDER →
close ORDER; matrix length errors at `/travel` / `/travel/<i>`; name
character failures TYPE, empty/over-24 RANGE; form-level raw syntax
failures SYNTAX; consolidated `public/js/...` layout and preview-only
build instead of the SPEC's `src/` layout and production scripts;
relative home links in preview (`../../`, `../../en/`) with the
SPEC-pinned `glossquote.com` home links reserved for the production
build.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 px, 200% zoom, reduced motion, Network/Storage observation)
- Real devices
- Assistive tech
- Measured contrast
- Deployment
- Independent nine-aspect review
