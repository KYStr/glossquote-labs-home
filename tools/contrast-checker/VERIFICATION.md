# Verification — Contrast Checker production candidate

Environment: Node v24.22.1, zero npm dependencies, all commands run inside
`tools/contrast-checker/` on 2026-11-09. Specification: REVISED SPEC at
commit `1b732fbd92156360b0d6d63d2593359d9a85c34f` (see HANDOFF.md for the
spec-source note and the consolidated-copy discrepancy).

## Commands run

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 24 tests, 24 pass, 0 fail |
| `npm run check` | 0 | files, script interface, core purity, DOM safety, HTML hygiene, forbidden-claim audit all pass |
| `npm run build:preview` (twice, output removed between runs) | 0 | 5 files each run; sha256 manifests compared — **byte-identical** |
| `npm run check:generated:preview` | 0 | dist-preview byte-identical to a fresh build |
| Loopback HTTP probe (`PORT=4317 node scripts/serve.mjs`, curl, kill) | — | `GET /` 200 (zh-Hant page), `GET /en/` 200 (English page), `GET /js/core/color.mjs` 200 |
| `node --check` on app.js and all four scripts | 0 | syntax OK |
| Independent fixture re-derivation (Python, separate implementation of SPEC §4) | — | fixtures 1–11 reproduced, incl. 2.7495900453 / 1.0054879683 (fixture 9) and the display-4.50-but-fails colour #008580 at 4.4999542714 used in tests |

## Test coverage against SPEC §7

- (a) Fixtures 1–11 exactly: ratios to 4 dp; fixture 9/10 values asserted
  at the full precision stated in the SPEC (1e-9); displayed strings;
  complete verdict rows for fixtures 3, 4 and 5.
- (b) Parser sweep: every accepted format, case-insensitivity, optional
  `#`, `#RGB` expansion, `#RRGGBBAA` alpha; every refusal class
  (hex-length with expected [3, 6, 8], hex-digit, channel-range naming the
  channel, channel-integer, channel-percent, alpha-range, alpha-format,
  format, empty).
- (c) Compositing: fixture 7 (effective 127.5 shown `#808080`),
  background-alpha-only, both-alpha order sensitivity, fixture 9 in both
  raw orders asserted as distinct values.
- (d) Suggestion search: fixture 8 at both targets, already-passing input
  offers nothing, fixture 10 (state is other-direction with black named
  and no colour offered), fixture 11 (both walks exhausted → state none,
  no colour; best black 4.6233 / white 4.5422 both below 7.0 asserted).
- (e) Rounding: constructed x.xx5 display cases (4.545 → "4.55",
  1.005 → "1.01"); the display-4.50-but-fails pair #008580 on white
  asserted FAIL for AA normal on the unrounded ratio.

## Spec errata

None found. Every printed fixture in the revised SPEC was reproduced by
both this implementation and the independent re-derivation.

## Explicit NOT_RUN

- Real-browser rendering and interaction (both language pages, typing and
  swatch-picker entry, suggestion apply flow, keyboard-complete flow,
  screen-reader text order) — no browser evidence collected for this
  candidate.
- Real devices / touch, 320 px layout and 200% zoom behaviour.
- Assistive-technology pass and measured contrast of the tool's own UI.
- Deployment, catalog publication, merge — build-first candidate only;
  independent bulk review pending (see HANDOFF.md).
