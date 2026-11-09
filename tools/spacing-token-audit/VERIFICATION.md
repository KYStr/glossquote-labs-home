# Spacing Token Audit — verification

Environment: Node v24.22.1, `KYStr/glossquote-labs-home`,
branch `muse/spacing-token-audit-production-20261109`,
base `codex/initial-publication` at `8941a010da5722f0b4690487938c4e32d2a2587f`.
All commands run from `tools/spacing-token-audit/` unless noted.

## Commands and results

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | **49 pass / 0 fail** (core 29, controller 11, html 9) |
| `npm run check` | 0 | all static checks passed (incl. all 7 core fixtures re-checked against the core) |
| `npm run build:preview` (twice, second to `/tmp/sta-preview-2`) | 0 | **byte-identical** — per-file SHA-256 comparison and `diff -r` clean (see hashes below) |
| `npm run check:generated:preview` | 0 | all generated-preview checks passed (rebuild identity, embedded worker source parses as a module and equals core + handler bytes, preview HTML noindex/CSP/h1) |

## Test coverage (expected values from fixtures.json or hand-derived)

- Core: all 7 fixtures (`tie-and-threshold`, `same-value-alias`,
  `zero-tolerance`, `upper-bound`, `out-of-range`, `duplicate-name`,
  `bad-unit`) deep-compared; schema cases (unknown/missing/wrong-type/
  accessor/non-plain input, missing tolerance defaults to `1`); tolerance
  validated before tokens/measurements; capacity (8,193 units), unpaired
  surrogate, empty tables, row limits (64/65 tokens, 100/101
  measurements), row-format classes, per-table case-sensitive duplicates,
  19 px refusal classes, trailing-LF rules, CR rejection, per-row ordering,
  tie rules (smaller px, then earlier row), status thresholds at the
  tolerance boundary, preserved measurement order, canonical decimals,
  `parsePxThousandths`/`formatThousandths` round-trips, report
  serialization (sorted keys, compact, trailing LF, escaping),
  `OUTPUT_LIMIT`, malformed-result `SCHEMA`.
- Controller: all 3 SPEC controller fixtures replayed with a controllable
  fake worker (`state-dirty-error`, `state-cancel-late`,
  `state-replace-late`) with every expected checkpoint asserted; plus run
  while busy restarts with a new generation, edit from empty, reset from
  busy, cancel no-op, late result after reset ignored, malformed worker
  outcome → `WORKER_ERROR`, worker creation failure → `WORKER_ERROR`,
  oversized report → `OUTPUT_LIMIT`, success report text + edit invalidation.
- HTML/static: exact SPEC titles/descriptions/H1s, both FAQs, noindex,
  canonical/hreflang (no `x-default`, no production origin), full CSP,
  security meta, no remote URLs, no inline handlers/scripts, labels and
  aria wiring, required ids, safe DOM APIs, core purity, file inventory.

## Generated preview hashes (dist-preview, SHA-256)

```
429d67a9b760eb85e6eb5474fcaec0e5d95bdbf3076bd40fd4c81b60f7ae5fb8  dist-preview/en/index.html
63625586aece4d515838980b11a3bab4fb6ea34ecb474b94e2c3068df1616598  dist-preview/index.html
85e5f23fe3e6ef093edad6f209a7b5c5c5b1f871ccc6d1934dd3adb975021398ea  dist-preview/js/app.js
3e855aa96f2ac55afec6f6b3b9fdb893793fe73a4a569b47b7ecd60613b02a39  dist-preview/js/controller.mjs
c1b8edc5cf057e8a7000c30ae50bebb2bc88b8e4ceddbf9f9d5fee5fec1ef166  dist-preview/js/core/audit.mjs
3ee90090ffcf1ed9d1bde1c0102a44b1cb3fc5472a4ccd8ffb5148b60fdc4a3c  dist-preview/styles/app.css
```

Aggregate (sorted per-file hashes): `fde8d13e0fc77737f2b4fb91e44b97a769cebdfe4ac5f6cbcce170399f83a23a`
for both builds.

## Loopback HTTP probe

`node scripts/serve.mjs --host 127.0.0.1 --port 4191 --dir dist-preview`
(port 4173 was occupied by another agent's preview server, so the probe
used 4191; the server falls back to the next free port automatically).

| Request | Status | Content-Type |
| --- | --- | --- |
| `/` | 200 | text/html; charset=utf-8 |
| `/en/` | 200 | text/html; charset=utf-8 |
| `/js/app.js` | 200 | text/javascript; charset=utf-8 |
| `/js/core/audit.mjs` | 200 | text/javascript; charset=utf-8 |
| `/js/controller.mjs` | 200 | text/javascript; charset=utf-8 |
| `/styles/app.css` | 200 | text/css; charset=utf-8 |
| `/nope.html` | 404 | text/plain |
| `/../package.json` | 404 | text/plain |
| `/%2e%2e/package.json` | 404 | text/plain |

Response headers on `/` verified: `Content-Security-Policy` (SPEC
directives verbatim), `X-Content-Type-Options: nosniff`,
`Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(),
microphone=(), geolocation=()`, `X-Robots-Tag: noindex, nofollow`.
Served zh title `設計間距 Token 對照｜Gloss Tools`, en title
`Design Spacing Token Audit | Gloss Tools`. Served `app.js` contains the
embedded worker source string. Server stopped after the probe.

Note: an earlier probe accidentally hit the other agent's server on 4173
(a different tool); those responses were discarded and the probe was
re-run against this tool's own server on 4191.

## Spec errata

None. All printed fixtures reproduce exactly from the SPEC's own rules.

## Interpretations

See HANDOFF.md §Interpretations (missing-tolerance default, `row: null`
for whole-field errors, per-row check order, relative candidate
canonical/hreflang, malformed worker outcome → `WORKER_ERROR`,
controller-side report serialization, `SPEC §8` superseded by the
2026-11-09 consolidation rules).

## NOT_RUN

Real-browser rendering/interaction (including the Worker path in a real
browser, busy/cancel behaviour, and Blob download bytes), real
devices/touch, assistive tech, measured contrast, 200% zoom, cross-browser
(Chrome/Edge) comparison, network/storage profiling, deployment.
