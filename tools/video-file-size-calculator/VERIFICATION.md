# Verification — Video File Size Calculator （影片檔案大小計算機）

Build-first candidate; nothing here is an acceptance. All commands run
2026-11-09 (Asia/Taipei) in
`tools/video-file-size-calculator/` on Node v24.22.1.

## Commands and results

- `npm test` — **29/29 pass, 0 fail** (19 core + 10 controller).
  Includes: all 10 vendored core fixture literals, all 3 vendored
  controller fixture sequences, hand-derived endpoint cases
  (999:59:59 max duration; 0.1 and 1000 Mbps custom endpoints;
  9007199.25 GB near-max target accepted with headroom 0 and
  9007199.26 GB rejected as RANGE; 0.01 MB tiny target → valid
  0-second result; 8.5 GiB fractional target), the floor invariant,
  inactive-field check scoping, schema/accessor handling, validation
  ordering, capacity limits, and the report serializer (sorted keys,
  trailing LF, toJSON never called).
- `npm run check` — pass ("all static checks passed"): file inventory,
  pinned bilingual titles/descriptions/H1s, required fragments and
  texts, relative references only, forbidden-API scan, fixtures
  identity (slug + specId), dist file-type allowlist, embedded worker
  source snippets, manifest presence.
- `npm run build:preview` run **twice** — **byte-identical**:
  `diff` of the per-file SHA-256 listings of `dist-preview/` (8 files)
  and of `BUILD-MANIFEST.json` across the two runs showed no
  differences.
- `npm run check:generated:preview` — pass: dist file set, byte counts
  and SHA-256 match `BUILD-MANIFEST.json`; both pages carry noindex,
  correct lang/title/H1, no canonical/hreflang; embedded worker source
  equals the fixed core + handler bytes.
- Loopback HTTP probe of the built preview (`node scripts/serve.mjs`,
  ephemeral port 46789 on 127.0.0.1):
  - `GET /` → 200, title 「影片檔案大小估算｜Gloss Tools」
  - `GET /en/` → 200, title “Video File Size Calculator | Gloss Tools”
  - Headers on HTML: pinned CSP (`default-src 'none'; script-src
    'self'; style-src 'self'; worker-src 'blob:'; …`), 
    `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
    Permissions-Policy denying camera/microphone/geolocation/payment/
    usb, `X-Robots-Tag: noindex, nofollow`.
  - `GET /nope.txt` → 404. Server stopped after the probe.

## NOT_RUN

- Real-device checks (phone/tablet browsers, actual Worker execution
  in a browser, real download flow) — no browser run was performed in
  this build; the Worker path is covered only by the fake-worker
  controller tests and the byte-exact embedded-source check.
- Screen-reader / assistive-technology pass.
- Any independent review (this is a build-first candidate; review is a
  separate step by a different reviewer).

## Spec-errata candidates

None found. Fixture expectations and SPEC rules agree everywhere,
verified case by case in the fixture-literal tests.
