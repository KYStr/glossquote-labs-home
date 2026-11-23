# Verification — Retirement Withdrawal Calculator

Environment: Node v24.22.1 (Linux), zero dependencies, tool directory
`tools/retirement-withdrawal-calculator/`. All commands run 2026-11-23 by the builder.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 65/65 tests |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks |
| `npm run build:preview` (run twice) | PASS — preview written to `dist-preview/` both times; sorted per-file SHA-256 list hash identical both runs: `2c32cd227c9209c205a8c3df1b5f6c9a4f57cf718c090eb1e0534d3e74325f7e` |
| `npm run check:generated:preview` | PASS — dist-preview matches a fresh build byte for byte (7 files) |
| Loopback HTTP probe of `dist-preview` via `scripts/serve.mjs` (ephemeral port 43389) + curl | PASS — `GET /` 200 `text/html` with `<title>退休提領試算｜Gloss Tools</title>`; `GET /en/` 200; `GET /js/app.js` 200 `text/javascript`; missing file 404; CSP includes `worker-src blob:`; `X-Robots-Tag: noindex, nofollow` |

## Build hashes (dist-preview, sorted per-file SHA-256)

- `dist-preview/en/index.html` `171a0caaa142d39a1fda75e8681377243a7f273150d0100fa149889c6c3b7bf0`
- `dist-preview/index.html` `3705f1a268ea80e50ebc3f1e29c465b200fe172cc26619a31a4ac66372c69444`
- `dist-preview/js/app.js` `6b6372c4e56385cc05e86d0d7490c1cfd67d58bdd03b532637bb3715f2190e0a`
- `dist-preview/js/core/controller.mjs` `87b02b1a193a55ab047fd0b24a83fe4bf436ea06aa939e337a370ed843d5f16f`
- `dist-preview/js/core/core.mjs` `1cff364057dea05aa0754ed9eb41fbbd01b96c85458b8265b7c5182c7da8812f`
- `dist-preview/js/worker-handler.mjs` `7f08cb311b62adb677b4cd9725666fee0e7430fa05da097c3670e69014b93773`
- `dist-preview/styles/app.css` `88d6fa50709c396047b8ba77fbc10edb579f335ae93f922560581a47f1404be4`

## Test breakdown (65)

- Core fixtures: all 15 SPEC core cases deep-equal (linear, exact, partial,
  zero-withdrawal, zero-portfolio, growth, inflation, negative return,
  beyond-horizon, three 4% rule cases, three error cases).
- Core rules derived by hand from the SPEC and cross-checked with an
  independent Python Decimal calculation: money max 999,999,999.99 (one
  full year) and over-max RANGE, 17-char INPUT_LIMIT, return −50/100 legal
  and 100.01/−50.01 RANGE, inflation 0/100 legal and −1/100.01 RANGE,
  1-per-year 100-year cap (100 rows, last row `999901.00` → `999900.00`),
  partial-fraction tie .005 → .01 (and .00499 → .00), negative-return tie
  −2500.005 → −2500.01 (half away from zero), inflation-grown withdrawal
  tie 110.055 → 110.06, 10% inflation case (7 full years + 0.26),
  four-percent negative shortfall with implied 3.33% meeting the rule,
  implied 4.01% missing the rule, smallest spending target 0.25,
  currentPortfolio 0 and spending 0 as RANGE, grammar accept/reject set
  (`.5`, `5.`, `007`, `+5`, `1e3`, ` 5`, `50%`, `1,000`, `--5`, `00.5`
  invalid; `-5` on money is RANGE), `-0` is zero, EMPTY, SCHEMA for wrong
  mode (field `mode`) / missing / extra / wrong types / accessor, lone
  surrogate UNICODE with INPUT_LIMIT taking precedence, first-error-wins
  field order, fixture invariants (no negative end balance, withdrawals
  never decrease, removing inflation never shortens depletion),
  formatHundredths / normalizeEcho rules.
- Controller fixtures: all 3 SPEC state cases (dirty→error invalidation,
  cancel + late-result rejection + reset, replace + older-late rejection),
  plus edit-during-busy termination, mode-switch input preservation with
  active-mode-only snapshots, and example-load + reset defaults.
- Report: byte-exact serialization for the four-percent no-current and
  never-depletes results (sorted keys, trailing LF, no BOM), SHA-256 of the
  bytes matches the hash of the literal expected text, recursive key sorting
  with array order preserved.
- Pages: both languages' lang/title/H1/description, fixed disclaimer
  verbatim, noindex, no canonical or hreflang in the candidate, no external
  assets, same-language `../../` home links, full control set and status
  semantics, SPEC FAQ answers on both pages.
- Build: two builds byte-identical (sorted SHA-256 lists equal); Worker
  token replaced; the embedded Worker source driven end to end through a
  `self` shim returns the fixture-exact outcome for the 4% rule case
  (600000 spending, 15000000 current → target 15000000.00, implied 4.00%,
  meetsRule true).
- App (DOM/Worker stub): example renders linear-no-growth (20.00 years,
  20 table rows, `Rows 1–20 of 20`), validation failure associates the
  field and focuses it once, Worker onerror/construct/post failures settle
  and can run again, late results/errors ignored after Reset/Cancel/edit,
  old Worker cannot disturb a new Worker, queued failure ignored after
  Reset + new job, zh renders the same result, mode switch preserves inputs
  and shows the 4% rule result (`NT$ 15,000,000.00`, `4.00%`), 100-row
  table paginates 25 per page (`Rows 1–25 of 100` → `Rows 76–100 of 100`).
- Serve: real HTTP on an ephemeral loopback port — both pages 200 with
  titles, JS MIME, CSP includes `worker-src blob:`, `X-Robots-Tag`
  noindex, HEAD empty body, 404, `..%2f` traversal rejected with 404.

## Spec errata candidates

1. Leading-zero grammar gap: SPEC's DECIMAL_FORMAT list does not say
   whether `007` / `00.5` are valid decimal strings. The builder rejected
   them (house canonical-decimal grammar); the spec should pin this either
   way. No fixture covers it.
2. None other found. All fixture values follow from the SPEC's stated
   rules; no fixture-versus-rule conflict was found.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, mode switch,
  currency switch, cancel, reset, pagination, real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  https://retirement-withdrawal.glossquote.com (not yet configured).
