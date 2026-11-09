# Verification — Mahjong Score Calculator (build-first candidate)

Environment: Node v24.22.1, Linux, zero dependencies installed.
All commands run in `tools/mahjong-score-calculator/`.
Sources: fixed spec candidate `1afe86cfee8dc968298e8ec767b56fb4cd15f738`
(spec task `labs-mahjong-score-calculator-spec-20261109`, draft spec
PR #159); implementation base `codex/initial-publication` @
`6a56a115e6bbc1208712c74c855906ce3729e2e3`. The spec fixtures are
vendored verbatim at `test/fixtures.json` (SHA-256
`b371a1317964ab5e6d904297759bdb9d49b021094ee9623d9f93c22d23caca55`)
because the spec PR is not merged into the base branch.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 38/38 (core 28, controller 7, site 3); see breakdown below |
| `npm run check` | PASS — required files, package contract, core statics vs the SPEC, bilingual metadata/FAQ/control inventory, syntax, forbidden-capability scan, pure-module scan |
| `npm run build:preview` (run twice) | PASS — byte-identical output (BUILD-MANIFEST.json unchanged between runs) |
| `npm run check:generated:preview` | PASS — dist files match the manifest exactly, bilingual preview metadata present, embedded worker source matches the fixed core + handler bytes, robots deny-all |
| Loopback probe of `dist-preview/` | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown

- `test/core.test.mjs`: the 10 literal core fixtures from
  fixtures.json deep-compared (menqing-self-draw merge, big-dragons
  subsumption, dealer discard payout, cap, flush supersede,
  flowers-and-kongs, both error fixtures, method mismatch,
  small-dragons with override), plus hand-derived cases: E1 All
  Honors exclusions, E5 All Eight Flowers exclusions, E7 Seven Rob
  One on self-draw, double wind coexistence, Four Kongs derivation,
  dealer streak payout, discarderIsDealer ignored on self-draw,
  override recompute (PING_HU → 0 drops the line, per-flower
  override), legal maxima together, conflict priority (C1 > C2 >
  C3, C4 first-code, C5, C6 > C7), capacity before all stages,
  SCHEMA classes (shape/missing/extra/wrong type/unknown codes/
  accessor), ENUM/EMPTY/INTEGER_FORMAT/RANGE in field order
  (including full-width digits and leading zeros), zero-stakes and
  cap-equals-total edges, and the canonical report bytes pinned as
  a literal string with matching SHA-256.
- `test/controller.test.mjs`: the 3 literal controller fixtures
  verbatim via a fake worker with controllable completion
  (state-dirty-error, state-cancel-late including the reset draft
  deep-equal to the SPEC defaults, state-replace-late), plus
  edit-during-busy termination, cancel no-op outside busy, worker
  construction failure and worker error surfacing WORKER_ERROR,
  and loadExample filling fixtures case 1 without running.
- `test/site.test.mjs`: both pages' lang/title/description/h1,
  preview noindex, no canonical/hreflang, relative language link,
  same-language home link, pinned FAQ answers, and the full
  control-id inventory.

### Loopback probe

Served `dist-preview/` on an ephemeral loopback port:

- `GET /` → 200, title 「麻將台數計算機｜Gloss Tools」
- `GET /en/` → 200, title "Mahjong Score Calculator | Gloss Tools"
- Assets (CSS, app.js, worker-source.js) → 200 with correct MIME
- Missing path → 404; path traversal → refused
- HTML carries the SPEC CSP, nosniff, and `X-Robots-Tag: noindex,
  nofollow` headers

### Embedded worker source (Node harness)

Imported `WORKER_SOURCE` from the built
`dist-preview/js/worker-source.js`, installed a fake `self`, and
invoked the handler: the menqing-self-draw snapshot returned the
fixture result (MENQING_SELF_DRAW 3, unit 250); the
conflict-menqing-all-from-one snapshot returned the pinned
CONFLICT error. This exercises the exact bytes the page turns
into a module Worker; it does not replace a real browser Worker
check (still NOT_RUN below).

## Spec errata candidates

None. Every literal fixture reproduces from the SPEC's stated
rules (tai table, validation order, C1–C7, E1–E8, line order,
dealer, cap, payout).

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both
  languages, including the live module Worker created from a Blob
  URL, keyboard-only flow, focus movement on error, 320 px reflow,
  real 200% zoom, reduced motion, and touch targets — no isolated
  browser mechanism was used.
- Measured contrast ratios and assistive-technology checks.
- Network/Storage observation in a real browser profile
  (zero-request, storage, cookie, service-worker checks).
- Real-device checks.
- Production build (`--mode production` is refused: no approved
  origin), deployment, catalog integration, and the independent
  nine-aspect review (pending by design in build-first mode; all
  nine aspects remain null / NOT_RUN).

## Next owner

Independent reviewer, after the parent verifies the PR head.
