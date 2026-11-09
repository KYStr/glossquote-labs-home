# Time Zone Converter — verification record

Environment: Node v24.22.1 (this VM), zero dependencies installed or
required. Candidate built in build-first mode from the fixed SPEC at
`docs/specs/time-zone-converter/SPEC.md` (blob
`a5aea565df4e75b07ca493277f15e4608b44007d`), base commit
`7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`.

## Commands run and results

| Command | Result |
| --- | --- |
| `TZ=UTC npm test` | exit 0 — 19 tests, 19 pass, 0 fail |
| `TZ=Pacific/Kiritimati npm test` | exit 0 — 19 tests, 19 pass, 0 fail |
| `TZ=America/New_York npm test` / `TZ=Asia/Taipei npm test` | exit 0 — 19/19 pass each (host-timezone independence) |
| `npm run check` | exit 0 — files, package contract, 40-zone list (count + Intl acceptance), both pages' metadata/links, provenance statement in both locales, forbidden-capability scan, core purity |
| `npm run build:preview` (run twice) | exit 0 both runs — 7 files in `dist/` plus `BUILD-MANIFEST.json` |
| Build byte-identity | The two consecutive builds produced identical SHA-256 for every output file and for `BUILD-MANIFEST.json` (diff of the two hash listings: empty) — byte-identical |
| `npm run check:generated:preview` | exit 0 — dist file set, byte counts and SHA-256 match the manifest exactly; both generated pages carry noindex, correct `lang`, title, description, h1 |
| `node --check public/js/app.js` | exit 0 — module parses |
| Loopback HTTP probe (`node scripts/serve.mjs`, then curl, then killed) | `GET /` → 200, 3620 bytes, `lang="zh-Hant"`, provenance statement present; `GET /en/` → 200, 3687 bytes, `lang="en"`, provenance statement present; `GET /js/app.js` → 200; `GET /js/core/convert.mjs` → 200; `GET /nope.html` → 404; responses carry the CSP and `X-Content-Type-Options: nosniff` headers |

## What the tests pin (independently derived expectations)

- SPEC fixtures Z1–Z5 exactly, every field of every row: resolved UTC
  instant, resolved source reading, offsets, day shifts, gap kind with a
  60-minute jump (Z3), overlap kind using the earlier −04:00 occurrence
  (Z4), and the source-as-target gap row showing 03:30 (Z5).
- Southern-hemisphere round-trip cases from published IANA rules:
  Australia/Sydney 2026-04-05 02:30 overlap (earlier +11:00 occurrence,
  instant 2026-04-04 15:30 UTC) and 2026-10-04 02:30 gap (resolved
  03:30 +11:00, instant 2026-10-03 16:30 UTC).
- Single-instant property across ten fixed inputs (including both
  pathological kinds and the 2000/2099 bounds): every target row re-read
  in its own zone equals the displayed UTC instant; row dates just
  outside the input range are checked arithmetically against the row's
  printed offset.
- Day shift across the date line in both directions (Honolulu →
  Auckland +1; Auckland → Honolulu −1).
- Bounds and refusals: 2000-01-01 / 2099-12-31 accepted; 1999-12-31 /
  2100-01-01 refused as out of range; 2026-02-30 and 2026-02-29 refused
  as invalid; 24:00 / seconds-form times refused; unknown zone refused;
  20 targets accepted, 21 refused; duplicate target refused by name.
- Offset formatting: +05:45, −05:00 (ASCII hyphen-minus), +00:00,
  +13:00, −10:00, +03:30, −00:30.

## Spec errata candidates

None found. Every printed fixture in SPEC section 4 (Z1–Z5) agrees with
the SPEC's own rules as implemented, and the section 7(b) Sydney cases
match the published rules. One representation note, not an erratum: the
SPEC prints negative offsets with a typographic minus (−05:00); the
implementation formats them with the ASCII hyphen-minus (-05:00), the
conventional machine-readable form of the same ±HH:MM value.

## NOT_RUN (not verified by this build)

- Real-browser rendering and interaction (including the SPEC section 7
  GUI evidence: entering Z3/Z4 in a browser shows the banners; the
  provenance statement on a mobile-width viewport).
- Real devices / touch input; native date/time control behaviour in
  each browser.
- Assistive technology (screen reader pass) and measured contrast.
- Cross-browser Intl equivalence (Chrome/Edge/Firefox/Safari).
- Deployment, hosting, and any production build (production mode is
  refused by the build script: no production origin is approved).
- Independent nine-aspect review (SPEC section 6): pending; this
  candidate is not accepted and not published.
