# Verification — Cabin Baggage Checker （手提行李規定檢查）

Environment: Node v24.22.1, workdir
`tools/cabin-baggage-checker/` on branch
`muse/cabin-baggage-checker-production-20261109`, base
`c08e3243f0257f80fa512d15b1c37fcbeb6ef962`.

## Commands run and results

- Fixture replay against the core (scratch run before the test files
  were written): all 9 core fixtures deep-equal — 9/9 PASS, including
  `fits-five-of-six` (tigerair fails by −1.0 cm on the long side),
  `heavy-main-light-total` (STARLUX total 9.5 kg vs 7 kg fails) and
  `exact-fit` (2/2 overallPass).
- `npm test` — **55 tests, 55 pass, 0 fail**
  (`node --test`: core fixtures + boundary/validation extras,
  controller fixtures + state extras, report canonical bytes, page
  contract).
  - Report bytes were pinned independently of the implementation: the
    `exact-fit` literal was derived by hand from the fixture's
    expected result (680 bytes, SHA-256
    `1cba4023d12a177a54737ce5e1d52968e145b98a555b47a3c45ac94f1cbe5d42`),
    and the `fits-five-of-six` digest was computed from the fixture
    with an independent canonicalizer (`jq -c -S`) at authoring time
    (1697 bytes incl. LF, SHA-256
    `fde806a40c935d64ce3d5fd885f989aedf1114425d77d3271e5c9a0e4169bb9a`).
    Both match the implementation's output.
- `npm run check` — PASS ("source contract OK": required files,
  fixture spec id and 9+3 case counts, full rules-table deep equality
  including the null personal limits and STARLUX total mode, pinned
  page strings/disclaimer, no canonical/hreflang/sitemap or remote
  URLs, core/app purity scans).
- `npm run build:preview` run **twice** — `BUILD-MANIFEST.json`
  byte-identical across runs (`cmp` clean) and the full
  `dist-preview/` SHA-256 listing byte-identical: **reproducible,
  9 files**.
- `npm run check:generated:preview` — PASS ("9 files, hashes exact,
  bilingual metadata present, worker source matches fixed bytes; not
  production").
- Loopback HTTP probe of the built preview
  (`node scripts/serve.mjs --port 4399`, then killed):
  - `GET /` → 200, title `手提行李規定檢查｜Gloss Tools`
  - `GET /en/` and `GET /en/index.html` → 200, title
    `Cabin Baggage Checker | Gloss Tools`
  - `GET /nope.html` → 404; `GET /../package.json` (path-as-is) → 404
  - `GET /js/app.js`, `/js/worker-source.js`, `/styles/app.css` → 200
  - Headers on HTML: SPEC CSP (`default-src 'none'; script-src 'self';
    style-src 'self'; worker-src 'blob:'; …`), `X-Robots-Tag: noindex,
    nofollow`, `X-Content-Type-Options: nosniff`,
    `Referrer-Policy: no-referrer`.

## Spec-errata candidates

None. Every fixture expectation agrees with the SPEC's stated rules.

Two reading judgements, both resolved in the SPEC's own text (not
errata): a non-string `airlines` member is SCHEMA with field/row null
(SPEC's general shape-error convention; only ENUM and DUPLICATE carry
the field and 1-based row), and the report failure shape for a
non-object argument is unpinned by the SPEC (see HANDOFF.md).

## NOT_RUN (explicitly not verified)

- Real-browser rendering and interaction (form flow, Worker execution
  in a browser, focus behaviour, table layout) — no browser evidence
  was produced for this candidate.
- Real-device checks (mobile layout, touch targets, download flow on
  a phone) and the native OS download dialog.
- Browser Network/Storage audit (no-fetch/no-storage is enforced by
  source checks and CSP, not observed in a browser).
- Production build and production origin — not approved; the build
  refuses `--mode production`.
- Independent nine-aspect review of this candidate — pending by
  design (build-first batch; review is the next step, by a reviewer
  who did not build it).
