# Baking Pan Converter — Verification

Candidate branch: `muse/baking-pan-converter-production-20261109`
(on `codex/initial-publication` base
`c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`).
Spec: `spec-baking-pan-converter-20261109`, PR
https://github.com/KYStr/glossquote-labs-home/pull/264
(head `88a5d223d06de8e6a732327a92fed78f94296e74`).
Environment: Node v24.22.1, no browser, no network calls by the tool
itself. All commands run inside
`tools/baking-pan-converter/` unless stated otherwise.

## Commands and results

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` (`node --test`) | 0 | 44/44 tests pass (15 core fixtures verbatim + boundary/independent-recomputation tests + 3 controller fixtures verbatim + extra controller tests + report serialization tests) |
| `npm run check` (`node scripts/check.mjs`) | 0 | Pass: files, package contract, core fields/limits/defaults/pan table/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity |
| `npm run build:preview` (run 1) | 0 | 9 files written to `dist-preview/` with `BUILD-MANIFEST.json` |
| `npm run build:preview` (run 2) | 0 | `diff -r` of the two `dist-preview/` trees clean and `BUILD-MANIFEST.json` identical — byte-identical: yes |
| `npm run check:generated:preview` | 0 | Pass: manifest hashes exact, bilingual metadata present, worker source matches fixed bytes, robots.txt denies all |
| Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` + curl) | 0 | 200 for `/`, `/en/`, stylesheet, all four shipped scripts, generated worker source, `/robots.txt`; 404 for a missing path and for a `..` traversal attempt; 405 for POST; CSP, nosniff, and X-Robots-Tag headers present on HTML |

## Fixtures

- `test/fixtures.json` is a byte-identical copy of the spec
  candidate's fixtures.json, SHA-256
  `9e4fb7ea7d084df5c9e3817a690f2881104179512559972c3ef9bb0984c22272`
  (verified against PR #264 head; `scripts/check.mjs` fails if the
  hash changes). 15 core cases, 3 controller cases.
- Expected values in the tests come from those fixtures or from
  independent recomputation (exact BigInt rational arithmetic for
  table-vs-table factors; Python Decimal at 60 digits of pi for the
  custom-round boundary volumes). No expected value was taken from
  the implementation's own output.

## NOT_RUN

- Real-browser checks (Chrome / Edge, both languages): input,
  error, reset, Worker success path, Blob download, reflow at
  1280×800 and 320 CSS px, real 200% zoom, reduced motion,
  keyboard/focus order, contrast measurement — no isolated-browser
  mechanism is available to this builder.
- Network / Storage observation with a clean isolated profile
  (initial requests, processing, reset; local/session storage,
  IndexedDB, CacheStorage, cookies, service workers, URL, console)
  — same reason; the shipped code contains no network or storage
  capability (static scan enforced by `scripts/check.mjs`), but that
  is a code reading, not a runtime observation.
- Native file-picker / OS download dialogs — manual only.
- Formal HTTPS / SEO gate (canonical, hreflang, sitemap, robots.txt,
  sitemap on the production origin) — the production origin
  `https://baking-pan-converter.glossquote.com` is not configured;
  the preview correctly carries no canonical, hreflang, or sitemap
  and is noindex/nofollow.
- Independent nine-aspect review of the fixed candidate — next
  owner's job.

## Known limitations

- The blob-URL module Worker under the pinned CSP (`worker-src
  blob:`) can only be settled in a real browser; on refusal the
  controller degrades to `error` with WORKER_ERROR (see HANDOFF.md).
- Open spec-repair PR #303 proposes different factor/percent
  formatting for tiny values and eight extra core cases; this
  production follows the task-pinned spec (PR #264 head). If PR #303
  is accepted, revise against the new spec.
