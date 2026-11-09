# Verification — Curtain Pattern Cuts (curtain-repeat-cut)

Environment: Node v24.22.1, Linux VM, offline (no network use in any command below).

## Commands and results

- `npm test` — exit 0: 25 pass / 0 fail (test/core.test.mjs: 18, test/flow.test.mjs: 7).
- `npm run check` — exit 0: "Project check passed."
- `npm run build:preview` — run twice; per-file SHA-256 of `dist/` identical across both runs (byte-identical).
- `npm run check:generated:preview` — exit 0: "Generated preview check passed."
- Loopback HTTP probe (`node scripts/serve.mjs` on 127.0.0.1:4173, killed after probe):
  - `GET /index.html` → 200, zh-Hant page
  - `GET /en/index.html` → 200, en page
  - `GET /js/app.js` → 200
  - `GET /js/core/curtain-repeat-cut.mjs` → 200
  - `GET /styles/app.css` → 200
  - `GET /../package.json` (path traversal attempt) → 403

## What the tests cover

- All six `solve` fixtures from `docs/specs/curtain-repeat-cut/fixtures.json` compared with `assert.deepStrictEqual` against the whole expected object, plus both `flow` fixtures (dirty-after-edit, cancel-then-late) through `createFlow`.
- Hand-derived three-panel case (repeat 250, head 30, motif 200) with every visible top re-checked against the phase invariant `(headPhaseMm + startMm + topMm) mod repeatMm == motifPhaseMm`, and cut intervals checked non-overlapping and in order.
- Boundaries: skip 0 and skip repeat−1, 16-panel maximum, 65536-byte input cap at exactly ±1 byte, JSON syntax error, shape (unknown/missing keys at root and panel level), type/range (string numbers, fractions, `-0`, out-of-range values), phase order (head before motif), name rules (empty, bad characters, over-long, NFC duplicate pointing at the second name, U+0020 trimming), validation order (shape > field types > cross-field phases).
- Flow: run-while-busy ignored, wrong-runId settle ignored, core error keeps the draft, reset, sample load stays dirty, cancel from dirty is a no-op, edit while busy invalidates the pending run.

## Spec errata

None. Every printed fixture in `fixtures.json` reproduced exactly from the SPEC's own rules, and the two flow fixtures pass through the flow executor as specified.

## Interpretations (SPEC silent, recorded for the reviewer)

- Name content violations are reported as `TYPE`, name length over 24 code points as `RANGE`, and a normalised duplicate as `DUPLICATE` pointing at the second name's path — the SPEC names the codes but does not pin which applies to each name failure.
- The SPEC's "one decimal place" display rule has no field to apply to in this tool (all quantities are integer mm), so nothing is formatted to one decimal.
- The SPEC's handoff file list (`src/core.mjs`, `dist/`/`dist-production/` production build) is superseded by the consolidated house format (see HANDOFF.md); no production build with a confirmed HTTPS origin was produced, so preview canonicals are relative and the preview carries `noindex, nofollow`.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard-only, touch, 320 CSS px width, 200% zoom, reduced motion, focus order, Network/Storage inspection).
- Real devices, assistive technology, measured contrast of the tool's own UI.
- Production HTTPS site checks (status, headers, SEO, robots, sitemap, same-language home links).
- Independent nine-aspect review of this candidate (pending by design).
- Deployment.
