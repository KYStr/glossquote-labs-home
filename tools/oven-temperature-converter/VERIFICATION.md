# Verification — Oven Temperature Converter （烤箱溫度換算）

Author-side verification of the build-first candidate, run 2026-11-09
on Node v24.22.1 (Linux). These are the author's own results, not an
independent review; all nine product aspects remain NOT_RUN for the
reviewer on the same fixed head.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test test/*.test.mjs`) | PASS — 42/42 tests |
| `npm run check` | PASS — package contract, required files, core purity, forbidden sinks, pinned chart data, HTML metadata/id parity/static chart, SPEC strings, i18n parity |
| `npm run build:preview` (run twice) | PASS — both runs byte-identical; identical sorted SHA-256 manifests |
| `npm run check:generated:preview` | PASS — dist-preview file set equals public/, every file byte-identical, preview metadata intact |
| Loopback HTTP probe (`scripts/serve.mjs`, ephemeral port) | PASS — `GET /` 200 with title 「烤箱溫度換算｜Gloss Tools」; `GET /en/` 200 with title "Oven Temperature Converter \| Gloss Tools"; CSP and `X-Robots-Tag: noindex,nofollow` headers present. The build test additionally asserts traversal (`/../package.json`) and missing files return 404. |

## Test coverage notes

- All 11 SPEC core fixtures deep-compared against `run()` (fixtures
  vendored verbatim from spec candidate
  `acfe72ccf073cb5fa8d55281aff8ae262215a24d`; expected values never
  derived from this implementation).
- All 3 SPEC controller fixtures replayed with a controllable
  scheduler, including the exact firing order of state-replace-late
  (newer work errors first, then the older late success is dropped).
- Every chart row as a Gas input returns its own paired °C/°F on the
  conventional side; `"0.50"` and `"1.0"` spellings accepted.
- All 11 chart midpoints (115–250 °C) take the hotter row.
- A °F input proves Gas lookup uses exact °C: 364.9 °F = 184.944… °C
  displays 185 °C but takes Gas 4, not the rounded-value tie Gas 5.
- Range endpoints (−50/350 °C, −58/662 °F) accepted; ±0.01 beyond is
  RANGE. FAN_GAS precedes GAS_VALUE; INPUT_LIMIT and UNICODE precede
  grammar; accessor/missing/extra/wrong-type inputs are SCHEMA.

## dist-preview SHA-256 (sorted)

```text
3dc56ad095a40d9a0cc088dcb12ce286f969089d3365e46ca7cb2e283e2f2690  js/core/convert.mjs
60dc8ffb1d3fa36d7892846908f1794ca4b1c12147c6c3edad3eb5c72d12cbe3  js/i18n.mjs
653c15e293fa8f4a198876e278add0d35b1077ed7b3fda0a19cf9a70dcba28f8  js/controller.mjs
6fb3b5fb20baded402c0df9e816e07e8906678473ce4cf30dee1e00d126ec71d  index.html
755b98e30453904524a519c083f8a5682832a67ec1205d86ab8df6fe59300569  styles/app.css
abfe77fa07bae8402dc35f146c0c073b6e250056ec1f6fef860112bab5fea5c2  js/app.js
d593e823d36b5c0dac5dda90abe06a50726b10920d51b74cf98774e9f8f9843e  en/index.html
```

## NOT_RUN

- Real-browser checks (isolated Chrome and Edge, both languages:
  example flow, typing, error focus, edit-after-success, cancel,
  reset, 1280×800 and 320 CSS px layouts, real 200% zoom, reduced
  motion, keyboard order, contrast measurement) — no verified
  isolated browser mechanism was available to this builder, so per
  the SPEC gate these are NOT_RUN, not passed by substitution.
- Real-device (physical phone/tablet) checks.
- Browser Network/Storage observation in a clean profile (zero work
  requests, storage, console) — same reason as above.
- Production HTTPS/SEO gate (canonical, hreflang, sitemap, robots.txt
  on the planned origin) — the candidate intentionally ships preview
  noindex metadata only.

## Spec-errata candidates

1. **Chart row count in prose.** The SPEC repeatedly describes the
   Gas Mark chart as having 14 rows / 14 Gas values (userFlow:
   「完整的 Gas Mark 對照表（14 列）」; inputsOutputs: 「gas 輸入必須恰為
   對照表 14 個 Gas 值之一」; acceptance: 「對照表 14 列」). The pinned
   table itself — declared the sole authority (「本表為唯一依據，實作
   不得另查或改值」) — lists exactly 12 rows: ¼, ½, 1, 2, 3, 4, 5, 6,
   7, 8, 9, 10. This implementation follows the table verbatim
   (12 rows, 12 accepted Gas values). The "14" likely conflates the
   14 fixture cases. Reviewer/spec author to confirm the prose should
   read 12.
2. **Midpoint count in prose.** The SPEC tests section says
   「115、130、145、160、175、185、195、210、225、235、250°C 十個中點」
   but enumerates 11 midpoint values (there are 11 gaps between the
   12 chart rows). All 11 enumerated values are implemented and
   tested; only the count word 「十個」 appears wrong.
