# Party Supply Calculator — Verification

## Environment

- Date: 2026-11-23 (Asia/Taipei).
- Node: v24.22.1 (`node --version`).
- Workdir: `~/workspace/glossquote-factory/build6/build/party-supply-calculator/`
  (fresh clone of https://github.com/KYStr/glossquote-labs-home.git,
  branch `codex/initial-publication`, base commit `8c265267`).
- Production branch: `muse/party-supply-calculator-production-20261121`.
- gh: logged in as KYStr (HTTPS, `GH_TOKEN` from `gh auth token`).
- No dependencies installed; no network use by build/test/serve.

## Fixed source

- Spec: `docs/specs/party-supply-calculator/` (BRIEF.md, SPEC.md v1,
  fixtures.json, AUTHOR-CHECK.md), spec PR #387, registry rev 1782.
- `test/fixtures.json` is a byte-identical copy of the SPEC fixtures.json
  (verified with `cmp`; 15 cases: 10 core, 3 error, 2 controller).

## Independent hand recomputation (before coding, from SPEC formulas)

All 10 core fixtures recomputed by hand (per-person × guests → round up) and
matched the shipped fixtures exactly, including the three values AUTHOR-CHECK
says were corrected (boundary-2h drinks 13,000 ml; boundary-2-5h 15,000 ml;
boundary-4-5h 15,500 ml). Spot checks:

- snacks-2h-small (10, 2 h, snacks, f=1): food 10×200=2,000 g; drinks
  per 350×(4+2)/2=1,050 ml → 10,500 ml, 6 bottles; cups 20; plates
  ceil(10×6/5)=12; ice 10×1 halves → 5 kg. ✓
- full-3h (20, 3 h, full, f=6/5): food per 600 g → 12,000 g; drinks per
  1,400 ml → 28,000 ml, 14 bottles; cups 40; plates ceil(20×2×6/5)=48;
  ice 20×6/5=24 halves → 12 kg. ✓
- light-6h-long (30, 6 h, light, f=3/2): food per 525 g → 30×525=15,750 →
  15,800 g; drinks per 2,450 ml → 73,500 ml, 37 bottles; cups 90; plates 36;
  ice 45 halves → 22.5 kg. ✓
- min-guest-half-hour (1, 0.5 h, snacks): drinks per 525 ml → ceil to 1,000 ml,
  1 bottle; plates ceil(6/5)=2; ice 0.5 kg. ✓
- max-guests (500, 12 h, full): food 375,000 g; drinks 2,275,000 ml,
  ceil(2,275,000/2,000)=1,138 bottles; cups 1,500; plates 1,200; ice 375 kg. ✓
- rounding-mix (7, 3 h, snacks, f=6/5): food 7×240=1,680 → 1,700 g; drinks
  7×1,400=9,800 → 10,000 ml, 5 bottles; cups 14; plates ceil(7×6/5)=9;
  ice ceil(7×6/5)=9 halves → 4.5 kg. ✓

Extra hand-derived cases in test/core.test.mjs (1 guest/12 h/full,
500 guests/0.5 h/snacks, 3 guests/3.5 h/light, 2 guests/1 h/full) were
computed the same way and all pass.

## Commands run (all exit 0 unless noted)

| Command | Result |
| --- | --- |
| `node --test` (in `tools/party-supply-calculator/`) | 44 tests, 44 pass, 0 fail |
| `node scripts/check.mjs` | all static checks passed |
| `node scripts/build.mjs --mode preview` (×2, to /tmp/psb1 and /tmp/psb2) | byte-identical (see hashes below) |
| `node scripts/check-generated.mjs` | dist-preview matches fresh build (7 files) |
| serve test (inside `node --test`, ephemeral loopback port) | pages/MIME/CSP/404/traversal all pass |

## Build hashes (preview, two runs)

Combined sorted-SHA-256 tree hash — run 1 and run 2 identical:

- `46263e7e9cd53f0d3ecf8c1ec4da0e1668f3fdeb488947b9dff8c395414053a4`

Per-file SHA-256 (both runs):

- `./en/index.html` `057e34cbca077e07283e865f07851af16cce33f83def84375f1b16ddad027e3f`
- `./index.html` `1d5e962a0f540143c9cb55b28d6b98d56b14d29551f670979125a65badbb3f0d`
- `./js/app.js` `48b9f3e8c6ea501bcd08593c7e634c6bc5ecc3a0872344b673f3043760f7c5e1`
- `./js/core/controller.mjs` `f56f4ae8415bac2e83e4d78d812ff1501dd74706b4ee76575383c825631395e2`
- `./js/core/core.mjs` `d801e324f0633283dc93423c9657ebcddf3d7e5b15775ae8d383ac9fa6bd595a`
- `./js/worker-handler.mjs` `7f08cb311b62adb677b4cd9725666fee0e7430fa05da097c3670e69014b93773`
- `./styles/app.css` `343cb45553c6f5dd62825fc26f37b223cc9c78ad1d2b1adab0c3d50c5213bc1a`

## Coverage notes

- Core: 10 SPEC core fixtures + 3 SPEC error fixtures + hand-derived
  boundaries (range endpoints 1/500, 0.5/12/12.5, factor switches h2=4/5/8/9,
  cups switch h2=6/7, grammar/STEP/RANGE/ENUM shapes, capacity/empty,
  first-error-wins, SCHEMA incl. accessors, lone surrogates, rounding
  invariants, normalizeEcho).
- Controller: both SPEC controller fixtures replayed with a controllable fake
  transport (dirty-after-success, cancel-then-late-result, reset to default),
  plus loadExample, edit-during-busy, run-while-busy, stopWork.
- Report: canonical bytes checked against a hand-written expected string
  (sorted keys, one trailing LF); filename `party-supply-report.json`;
  max legal result far under the 2,097,152-byte limit.
- HTML: both pages — lang/title/description/robots noindex, home links,
  language-switch links, three SPEC FAQs each, every id the app reads,
  meal radio values, relative asset paths.
- Build: two independent builds byte-identical; built app.js embeds the fixed
  Worker source and drops the `__WORKER_SOURCE__` token.
- Serve: real HTTP on 127.0.0.1 ephemeral port — 200 + MIME for pages/CSS/JS,
  CSP + X-Robots-Tag headers, HEAD 200, 404 for missing and for traversal.

## NOT_RUN

- Real-browser verification (Chrome/Edge, zh + en flows, download bytes,
  1280×800 / 320 px, 200% zoom, keyboard, focus, contrast, touch, reduced
  motion) — no isolated browser available to this subagent.
- Network/Storage zero-request audit in a clean isolated profile.
- Nine acceptance facets at product level — for the independent reviewer.
- Production HTTPS/SEO (canonical/hreflang/sitemap/robots.txt, origin
  https://party-supply-calculator.glossquote.com) — not configured; preview
  is noindex as required.

## Errata candidates

None found. See HANDOFF.md for the five interpretation notes recorded for
the reviewer (0.25 → DECIMAL_FORMAT; 2.3 → STEP; mealType capacity/surrogate/
empty handling; "00.5" accepted; factor/iceKg emitted as pinned JSON literals).
