# Interval Timer — Verification

- **Tool:** `tools/interval-timer/`
- **Spec source (fixed):** spec candidate commit `e86816781bc220d184a8c31ad50168730e1b973b`, spec PR #257, fixtures 21 (15 core / 3 session / 3 controller), registry rev 1467.
- **Fixtures vendored:** `test/fixtures.json` is a byte-identical copy of the spec candidate's `fixtures.json`; SHA-256 `6133ac436565addcb961071161e276a7c72dfd07f40de6f159a6a2dfae751969` (asserted by `scripts/check.mjs`).
- **Candidate branch:** `muse/interval-timer-production-20261109`
- **Base commit:** `c8ca5fd3` (`codex/initial-publication` at build time)
- **Spec source:** spec PR #257, candidate commit `e86816781bc220d184a8c31ad50168730e1b973b`
- **Candidate commit / draft PR:** see parent report for the exact 40-character head SHA and PR number (the pushed head is the candidate; this file records the branch, base and spec source).

## Commands run (all in `tools/interval-timer/`, Node v24.22.1)

| Command | Result |
| --- | --- |
| `npm test` | exit 0 — 50/50 pass (15 core fixtures verbatim, 3 session fixtures replayed step by step, 3 controller fixtures, plus hand-derived schema / boundary / invalid-event / worker-failure / report checks) |
| `npm run check` | exit 0 — pass (files, package contract, core constants, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity) |
| `npm run build:preview` (twice) | exit 0 both times — the two `dist-preview/` trees and the two `BUILD-MANIFEST.json` files are byte-identical (recursive diff, no differences) |
| `npm run check:generated:preview` | exit 0 — pass (manifest hashes exact, bilingual metadata present, worker source matches fixed bytes, robots deny-all) |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (8,306 B) |
| `/en/` | 200 (8,741 B) |
| `/js/core/interval-timer.mjs` | 200 (16,584 B) |
| `/js/worker-source.js` | 200 (18,140 B) |
| `/robots.txt` | `User-agent: *` + `Disallow: /` |

## NOT_RUN

- Real-browser checks (two-language flow, keyboard flow, 320 px / 200% zoom, Network/Storage observation, report download, audible cue tones): NOT_RUN — no isolated-browser mechanism was available to this builder.
- Real-device checks: NOT_RUN.
- Independent document review of the candidate: NOT_RUN (reviewer-owned).

## Known limitations

- The delivered SPEC.md file is truncated mid-transition-table (ends with a literal `...[truncated 8188 chars]` line); the implemented transitions are those pinned by the session fixtures. See HANDOFF.md for the derived decisions (reset from every phase; extra event fields ignored; edit from empty goes dirty).
- Audible cue tones are implemented in the page controller but were never heard in a real browser.
- Preview canonical `https://interval-timer.glossquote.com/` is pinned by sibling convention; no production origin is approved and the preview is noindex.
