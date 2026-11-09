# Verification — Filament Usage Calculator （3D 列印線材用量換算）

Build-first candidate; nothing here is an acceptance. All commands run
2026-11-09 (Asia/Taipei) in `tools/filament-usage-calculator/` on
Node v24.22.1.

## Commands and results

- Pre-implementation cross-check: all 11 core fixture values recomputed
  independently from the SPEC's formulas (Python, `math.pi` doubles,
  round-half-up) — 11/11 matched the vendored fixtures, including the
  full 12-cell grams-per-metre table used by the extra tests.
- `npm test` — **29/29 pass, 0 fail** (19 core + 10 controller).
  Includes: all 11 vendored core fixture literals, all 3 vendored
  controller fixture sequences, the hand-derived grams-per-metre table
  (6 materials × 2 diameters), legal maxima (lengthM 100000,
  weightG 1000000) and just-over RANGE, spool gross == empty (zero)
  and gross 0.1 below empty (NEGATIVE_REMAINING), custom empty spool 0,
  USD cost mode, decimal grammar/per-field decimal places, enum and
  mode-priority, inactive-field check scoping, schema/accessor
  handling, the SPEC's two-phase validation order, capacity limits,
  and the report serializer (sorted keys, trailing LF, toJSON never
  called). Two of my own initial test expectations were corrected
  during the run (a 5-unit material string and a 12-unit inactive
  custom-spool string both correctly hit INPUT_LIMIT first, per the
  SPEC's capacity-before-value order); no core behaviour was changed
  to fit a mistaken test.
- `npm run check` — pass ("all static checks passed"): file inventory,
  pinned bilingual titles/descriptions/H1s, required fragments and
  texts (including the SPEC's verbatim error strings), relative
  references only, forbidden-API scan, fixtures identity (slug +
  specId), dist file-type allowlist, embedded worker source snippets,
  manifest presence.
- `npm run build:preview` run **twice** — **byte-identical**: `diff`
  of the per-file SHA-256 listings of `dist-preview/` (8 files) and of
  `BUILD-MANIFEST.json` across the two runs showed no differences.
- `npm run check:generated:preview` — pass: dist file set, byte counts
  and SHA-256 match `BUILD-MANIFEST.json`; both pages carry noindex,
  correct lang/title/H1, no canonical/hreflang; embedded worker source
  equals the fixed core + handler bytes.
- Loopback HTTP probe of the built preview (`node scripts/serve.mjs`,
  port 49187 on 127.0.0.1):
  - `GET /` → 200, title 「3D 列印線材用量換算｜Gloss Tools」
  - `GET /en/` → 200, title "Filament Usage Calculator | Gloss Tools"
  - Headers on HTML: pinned CSP (`default-src 'none'; script-src
    'self'; style-src 'self'; worker-src 'blob:'; …`),
    `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
    Permissions-Policy denying camera/microphone/geolocation/payment/
    usb, `X-Robots-Tag: noindex, nofollow`.
  - `GET /nope.txt` → 404; `GET /../secret.txt` → 404. Server stopped
    after the probe.
- Embedded worker source executed in Node with a stub `self`: the
  built `WORKER_SOURCE` reproduced fixture case 1
  (`length-pla-175` → gramsPerMetre "2.98", weightG "298.3") and the
  `spool-negative` NEGATIVE_REMAINING error exactly.

## NOT_RUN

- Real-device checks (phone/tablet browsers, actual Worker execution
  in a browser, real download flow) — no browser run was performed in
  this build; the Worker path is covered only by the fake-worker
  controller tests, the byte-exact embedded-source check, and the Node
  execution of the embedded worker source above.
- Screen-reader / assistive-technology pass.
- Any independent review (this is a build-first candidate; review is a
  separate step by a different reviewer).

## Spec-errata candidates

None found. Fixture expectations and SPEC rules agree everywhere,
verified case by case in the fixture-literal tests and the independent
pre-implementation recomputation.
