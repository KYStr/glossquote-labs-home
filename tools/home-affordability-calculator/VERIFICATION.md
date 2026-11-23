# Home Affordability Calculator （購屋負擔能力）— VERIFICATION

- Spec: `spec-home-affordability-calculator-20261121`, draft spec PR #381
  (head `d0a79715f63df1ad1c9050a8642d8dad382fa7b8`), registry rev 1752.
- Production branch: `muse/home-affordability-calculator-production-20261121`,
  base `codex/initial-publication` (base head `8c265267`).
- Environment: Node v24.22.1, no dependencies, no network use by the
  tool itself (only the initial `git clone` and `gh` reads of the
  public spec PR).
- PR: #420 (draft, OPEN, base `codex/initial-publication`).
- PR head SHA: read back with `gh pr view` after the final push
  (see the builder's report to the parent orchestrator; the SHA is
  not hard-coded here so it cannot go stale).

## Commands run (all from `tools/home-affordability-calculator/`)

- `node --test` — 54 pass, 0 fail (exit 0). Node v24.22.1.
- `node scripts/check.mjs` — passed (exit 0).
- `node scripts/build.mjs --mode preview` — run twice; both runs
  byte-identical (hashes below).
- `node scripts/check-generated.mjs --mode preview` — passed (exit 0).
- Loopback serve smoke test: `node scripts/serve.mjs --host 127.0.0.1
  --port 4179 --dir dist-preview` served the built pages (zh title
  `購屋能力試算｜Gloss Tools` returned; en 200; worker-source.js
  header matches the fixed core). Port 4173 was already in use by
  another local process at test time, so 4179 was used instead, per
  the SPEC's "換空閒端口並記錄" rule. GET index 200, GET en 200,
  missing page 404, traversal (`/../package.json`) 404, CSP header
  and `X-Robots-Tag: noindex, nofollow` present on HTML.

## Build hashes (two runs)

- Run 1: BUILD-MANIFEST.json SHA-256
  `9e1f6686500e409e0b3004560c6d5722d698dd5980c01bfae429d5029a240b10`.
- Run 2: identical BUILD-MANIFEST.json SHA-256
  `9e1f6686500e409e0b3004560c6d5722d698dd5980c01bfae429d5029a240b10`
  (`diff` of the two manifests: no differences).
- Per-file hashes (both runs, from BUILD-MANIFEST.json):
  `en/index.html` fc623e43877c79121763f9e77d675b1eca75dc178ad245caad31d836066dc7e5;
  `index.html` 91a0f4341fc62cccf3f10495d120b7fdaf3f024df2d8f183f5942ac237be6fe3;
  `js/app.js` 8b95e51e73415908ed84b023540a22fa4e6f120c0d0a7bbdc24a7e1fc2cbe456;
  `js/controller.mjs` 2290a24e3140aed2121521bc5f02081565af05a953d332299e624d2109edc04b;
  `js/core/home-affordability.mjs` 86e5bfda1d89c6fc19b8eab872eb883f4535b82f7dd5057723888ffe2acb97fa;
  `js/worker-handler.mjs` 1c866cb2c6df16c9e887f3305741202eadda8d1f43f2aaaabf0fd7a1f756c75b;
  `js/worker-source.js` 760419354a2b3b7ea1b9a370c6a475ac843ebac0a658e9a3433dd455e003868c;
  `robots.txt` 331ea9090db0c9f6f597bd9840fd5b171830f6e0b3ba1cb24dfa91f0c95aedc1;
  `styles/app.css` c1b8859f50b9a7c82af892dbbe7cffa7d5b6379feb670bf01f4fa55d6b360a3f.

## What the tests cover

- 15 literal core fixtures verbatim (deep equal); 3 literal
  controller fixtures driven by a controllable fake worker; report
  bytes for typical-taipei (228 bytes) and debts-exceed-back-cap
  (215 bytes) derived independently with a separate canonicalizer;
  boundary tests (years 1/40/41, mortgageRate 30/30.0001,
  frontEndCapPct 10/50, backEndCapPct 20/60, caps equal / 0.01 apart,
  other debts exactly consuming the back-end limit, loan-floor
  invariant, monotonicity, grammar, schema, lone surrogates,
  timezone independence).

## NOT_RUN

- Real-browser checks (Chrome/Edge, both languages, keyboard, 320px,
  200% zoom, reduced motion, Worker/Blob download, reflow): no
  isolated browser is available to this builder. Node/DOM-free static
  checks are not presented as browser evidence.
- Network/Storage checks (zero work requests, storage, URL, console):
  NOT_RUN for the same reason; the code contains no fetch/XHR/
  WebSocket/beacon/analytics/remote font/storage/service worker, and
  `scripts/check.mjs` scans the shipped sources for those tokens.
- Native file-picker / OS download dialogs: NOT_RUN (human-only).
- Formal HTTPS/SEO gates (canonical, hreflang, sitemap, production
  origin): NOT_RUN — the candidate is preview-only (noindex,
  no canonical/hreflang); the planned origin
  `home-affordability-calculator.glossquote.com` is not configured.

## Next owner

Independent reviewer (not the builder): verify the nine aspects
against the same PR head, starting with the NOT_RUN items above.
