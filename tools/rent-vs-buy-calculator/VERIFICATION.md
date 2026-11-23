# Rent vs Buy Calculator （租屋 vs 買房試算）— VERIFICATION

- Candidate: `tools/rent-vs-buy-calculator/` on branch
  `muse/rent-vs-buy-calculator-production-20261121`, base
  `codex/initial-publication` (base commit `8c265267`).
- Spec: `spec-rent-vs-buy-calculator-20261121`, draft spec PR #378,
  head `46b55199bc39d221bb6ff529cdcb04778fe1e7b4` (OPEN, read back
  with `gh pr view 378`).
- Fixtures: `test/fixtures.json` is a byte-identical vendored copy
  of the spec fixtures (SHA-256
  `cf0ef0ab1d4733258065059da6a2e42c4b8b48a605787726917f3649adef515f`).
- Environment: Node v24.22.1, `gh` 2.102.0, Linux VM. All commands
  below were run inside `tools/rent-vs-buy-calculator/` unless
  noted. Only synthetic data and local files were used in tests.

## Commands and results (all exit 0)

| Command | Result |
| --- | --- |
| `node --test` | 50 tests, 50 pass, 0 fail. 13 literal core fixtures (full deep equal of the complete result or error triple) + boundary/grammar/schema/timezone tests + 3 literal controller fixtures + controller unit tests + report byte-exact tests + bilingual page contract tests. |
| `node scripts/check.mjs` | Pass: files, package contract, fixtures hash, core fields/defaults/ranges/example, pages, syntax, worker concatenation, capability scan, core purity. |
| `node scripts/build.mjs --mode preview` (run 1) | Preview build: 9 files written to dist-preview/ with BUILD-MANIFEST.json. Manifest SHA-256 `5cceff871ba457df82cefdc1a071d92efe9e5758d426b760d1d7b233d2b230a6`. |
| `node scripts/build.mjs --mode preview` (run 2) | Same manifest SHA-256 `5cceff871ba457df82cefdc1a071d92efe9e5758d426b760d1d7b233d2b230a6`; `diff` of the two manifests empty — byte-identical rebuild. |
| `node scripts/check-generated.mjs --mode preview` | Pass: 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production. |

Build manifest (run 1 = run 2, sorted):

| Path | Bytes | SHA-256 |
| --- | --- | --- |
| en/index.html | 10006 | 7b4e07288c38709cfe64f1bbbf00dd34ff947e7b0ada66d7ad176d9efe9aeeb7 |
| index.html | 9687 | f41e4a9eedd90d53b8b7fb238d7fa33c11f29f399f88fbe417da25941bc987b3 |
| js/app.js | 13793 | d5a8972adcbf20e46a1ba2c29cace96c6d020ef29d76bea31ea55ff484e7d94f |
| js/controller.mjs | 5021 | e99c58471ebfdbc17436ae12e4cad3295b03f950336fb52df6dfced3a636e71c |
| js/core/rent-vs-buy.mjs | 18716 | 1df93df51ccf3064cd79ec79f288bec75ea835724d8524f2a0707d5bd31bba17 |
| js/worker-handler.mjs | 793 | b51e617b57a51c1df8429d4d9942375f6b30dd1bdfa11d0e3381c24a2f3294e7 |
| js/worker-source.js | 20490 | c3b5102df1b3523ac7b95ae07526eb21d742a75dc30d24ef2dffb85a033367d0 |
| robots.txt | 26 | 331ea9090db0c9f6f597bd9840fd5b171830f6e0b3ba1cb24dfa91f0c95aedc1 |
| styles/app.css | 6932 | 281621974dfca2dad5df9a8bdd00d499eb8cf7b68e33a49cc4ec79a57a9888ad |

## Serve smoke check (loopback only, NOT a browser gate)

`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview`
started and served the preview over loopback; the full page flow
(two-language input, error, reset, Worker, Blob download, reflow)
was NOT exercised in a real browser — see NOT_RUN below.

## NOT_RUN (for the independent reviewer, same PR head)

- Real-browser gates: Chrome / Edge, two languages, input, error,
  success-after-edit, cancel, reset, Blob download byte check,
  1280×800 and 320 CSS px, real 200% zoom, reduced motion,
  Tab/Shift+Tab, Enter/Space, focus, status and error announcements,
  contrast ≥ 4.5:1 / ≥ 3:1, touch targets ≥ 44×44, 40% translation
  growth. No isolated browser was available to this builder; Node /
  DOM-substitute checks must not be claimed as browser passes.
- Network / Storage: clean isolated profile, zero work requests from
  load through reset, local/sessionStorage, IndexedDB, CacheStorage,
  cookies, service worker, URL, console; offline calculation after
  assets load.
- Compatibility: real isolated Chrome and Edge.
- Formal HTTPS / SEO: no production origin is approved; the
  candidate carries preview noindex only.
- Nine-aspect independent review: all scores null until the
  reviewer verifies this same PR head.

## Known limitations

- The defensive principal clamp (see HANDOFF.md) covers a rounding
  edge the SPEC does not pin; it never triggers on the fixtures.
- RANGE message endpoints render as plain numbers (see HANDOFF.md
  errata candidate 1).
- No merge, no publish, no registry production registration was done
  (build-first mode, per the parent task).

## Next owner

Independent reviewer: verify this same PR head against the nine
aspects in the SPEC acceptance section, with real-browser,
Network/Storage, and compatibility evidence. Then the primary
records the ledger entry.
