# Verification — Knit Gauge Pattern Planner

Environment: Node v24.22.1, offline. Spec `spec-knit-gauge-planner-20261109`
v1 at base commit `23c1d5f70db16e8bd0086259156243c5a57f8785`
(`codex/initial-publication`). All commands run from
`tools/knit-gauge-planner/`.

## Commands and results (all exit 0)

- `npm test` (`node --test`): **29 pass / 0 fail**.
  - All 6 literal `solve` fixtures and both `flow` fixtures from
    `docs/specs/knit-gauge-planner/fixtures.json`, compared with
    `assert.deepStrictEqual` on the whole result/error.
  - Hand-derived cases (recomputed from the SPEC's rules, never from
    the implementation's output): raw integer syntax (14 bad forms),
    TYPE for string/fractional/`-0`/null values, RANGE at every field
    boundary (min−1/max+1 fail, min/max pass), table-order precedence,
    SHAPE for unknown/missing keys, SIZE at exactly ±1 byte of the
    65,536-byte cap, half-up tenths (3.35→34, 3.25→33, 3.24→32),
    nearer-side vs tie-takes-larger choice, edge stitches always
    included in width candidates, no input mutation.
  - Flow extras: reset, fail-then-edit, resubmit-while-busy ignored,
    stale error reply ignored, cancel-while-idle no-op, run with no
    draft no-op.
  - i18n: both languages present for every field and error code;
    `formatMm` gives one decimal.
  - The algorithm was also independently re-derived in Python against
    all 6 solve fixtures before implementation; all matched.
- `npm run check`: pass (required files, package contract, core
  purity, app safety, SPEC constants, bilingual metadata, no remote
  assets).
- `npm run build:preview` ×2: **byte-identical** (full sha256 tree
  diff over `dist/`).
- `npm run check:generated:preview`: pass (MANIFEST.txt hashes,
  noindex on both pages, robots.txt denies all, no sitemap).
- `npm run build:production -- --origin https://glossquote.com` ×2:
  **byte-identical**. The origin is the SPEC's own glossquote.com
  home domain, used only as a local placeholder to verify the
  transform; no production origin is approved for this tool and
  nothing was deployed.
- `npm run check:generated:production`: pass (no noindex, robots
  allows and announces the sitemap, sitemap lists exactly the two
  HTTPS canonicals).
- Loopback HTTP probe (`node scripts/serve.mjs --port 8347`, serving
  `dist/`, killed after): `/` and `/en/` 200 with the SPEC titles,
  `js/app.js`, `js/core/solve.mjs`, `js/core/flow.mjs`,
  `js/core/i18n.mjs`, `styles/app.css`, `robots.txt` all 200; the
  SPEC CSP header and `X-Content-Type-Options: nosniff` observed;
  path traversal (`/../package.json`) 404, unknown path 404.
  - Probe note: the first attempt on port 8331 hit a sibling tool's
    server already listening there (it served another tool's pages);
    re-probed on 8347 and confirmed this tool's titles.

## Spec errata

None — every printed fixture reproduces exactly from the SPEC's own
rules.

## SPEC-silent interpretations (also in HANDOFF.md)

- SHAPE precedence: an unknown key is reported first (at the object
  path `""`); missing keys are then reported in SPEC table order.
- An empty form field is a raw syntax error (`SYNTAX` at that field's
  path): every field is required and the form only accepts the SPEC's
  ASCII integer form.
- No Worker is used: the SPEC's async contract is a next-event-loop
  work item with a runId gate, implemented as a `setTimeout(0)`
  settle; cancel/edit revokes the scheduled item. The work is at most
  10,000 integer candidate checks per axis.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard, touch,
  320 px width, 200% zoom, reduced motion, focus order).
- Real devices/touch, assistive tech, measured contrast.
- In-browser Network/Storage observation, offline-after-load check.
- Deployment, production HTTPS checks against a real origin.
- Independent nine-aspect review.
