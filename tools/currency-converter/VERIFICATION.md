# Currency Converter — Verification

Candidate branch: `muse/currency-converter-production-20261109`
Base commit: `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
(`codex/initial-publication` at build time)
Spec source: PR #258, candidate commit
`dcb21d0903006a708584edba8713e6117f8138a6`
Spec fixtures SHA-256:
`fe03d36865e7295f94a037dc306e756fa647972d57e6d5ff7030483410343463`
Environment: Node v24.22.1, no runtime dependencies, no browser.

Product PR: https://github.com/KYStr/glossquote-labs-home/pull/361
(DRAFT, against `codex/initial-publication`; the candidate commit is
the PR head — see the build report for its SHA)

## Commands run (all in `tools/currency-converter/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 59 tests, 59 pass, 0 fail (21 fixture core cases, 13 controller tests incl. all 3 fixture cases, 4 report tests, plus hand-derived boundary/validation/property tests) |
| `npm run check` | 0 | Pass |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | 9 files; recursive diff of the two `dist-preview/` trees clean; the two `BUILD-MANIFEST.json` files byte-identical (SHA-256 `1056d5fd3108aad255a7cce76ae23e2ce134310750f1195dcbc7d863734ea55b`) |
| `npm run check:generated:preview` | 0 | Generated preview verified: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production |

## Loopback HTTP probe

`node scripts/serve.mjs --port 4173` (loopback only), then `curl`:

| Path | Status |
| --- | --- |
| `/` | 200 (8,311 B) |
| `/en/` | 200 (8,819 B) |
| `/en/index.html` | 200 (8,819 B) |
| `/styles/currency-converter.css` | 200 (6,730 B) |
| `/js/app.js` | 200 (11,462 B) |
| `/js/controller.mjs` | 200 (7,045 B) |
| `/js/core/currency-converter.mjs` | 200 (14,177 B) |
| `/js/worker-handler.mjs` | 200 (942 B) |
| `/js/worker-source.js` | 200 (15,960 B) |
| `HEAD /` | 200 |
| `/nope` | 404 |
| `/../package.json` (traversal) | 404 |

Response headers on `/` include the SPEC CSP
(`default-src 'none'; script-src 'self'; style-src 'self'; worker-src
blob:; img-src 'self'; connect-src 'none'; object-src 'none';
base-uri 'none'; form-action 'none'; frame-ancestors 'none'`) and
`X-Robots-Tag: noindex, nofollow`.

## Fixture verification

- All 21 core fixture cases pass verbatim (`assert.deepEqual` on the
  literal expected values in `test/fixtures.json`).
- All 3 controller fixture cases pass verbatim (states, drafts,
  status strings, report availability).
- The `default-forward` report bytes are asserted exactly:
  `{"amountCents":10000,"convertedCents":315000,"direction":"a-to-b","fromCode":"USD","inverseRate":"0.031746","quickTable":[{"amountCents":100,"convertedCents":3150},{"amountCents":1000,"convertedCents":31500},{"amountCents":10000,"convertedCents":315000},{"amountCents":100000,"convertedCents":3150000}],"rateMicro":31500000,"toCode":"TWD"}\n`.

## Errata found during implementation

None. Errata: 0.

## NOT_RUN

- Real-browser run of both pages (current Chrome/Edge class
  engines), including the Worker success path, keyboard operation,
  320 px reflow, and 200% zoom: no isolated-browser mechanism is
  available to this builder.
- Real-device checks: not run.
- Independent document review and the nine SPEC §6 aspect scores:
  not run (owned by the independent reviewer, not the builder).
- Registry / coordination commands: not run (build-first mode; the
  coordinator owns registration).
- Merge / publish / deploy: not run, not attempted.

## Known limitations

- See HANDOFF.md ("Known limitations"): the CSP/blob-worker
  interaction is the one open real-browser question; everything else
  verified above is deterministic and passing.
