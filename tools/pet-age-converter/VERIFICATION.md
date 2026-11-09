# VERIFICATION — Pet Age Converter

Environment: Node v24.22.1, Linux. All commands run in `tools/pet-age-converter/`.

## Fixture provenance

- `test/fixtures.json` is the spec candidate's `fixtures.json` vendored verbatim (SHA-256 `9ecbfe44698ee33b9dbe581cb13ed3e023b1fa0a2dde950694ceecaae401f783`, identical to the spec candidate's file; spec candidate commit `6d76d1b14832f3c8488ca7090c7916e4576096b4`, spec PR #157 — the spec PR is not merged into the production base, so the tests read this copy). `scripts/check.mjs` pins the spec id, the 12 core / 3 controller case counts, and exact reproduction of the first core case.
- Before implementation, the eight successful core fixtures were recomputed with an independent Python implementation of the SPEC's stated rules; every total, segment display, and stage matched the fixtures exactly. Expected values in tests are never derived from the implementation's output.

## Commands and results

- `npm test` — 37/37 pass (core 28: all 12 literal core fixtures deep-compared plus boundary cases for segment edges m=12/13/24/25, the cat 456/457 cap, exact-value stage thresholds, grammar, validation order, schema, string limits, and the pinned bilingual error templates; controller 7: all 3 controller fixtures with a controllable fake scheduler plus transition cases; pages 2: pinned bilingual page metadata).
- `npm run check` — pass (files, package contract, size/stage tables/messages/default draft, fixtures identity, page metadata + candidate rules, pinned CSP, syntax of all shipped scripts, forbidden-capability scan, core/controller purity).
- `npm run build:preview` run twice — byte-identical output (BUILD-MANIFEST.json unchanged between runs; sorted SHA-256 manifest compared).
- `npm run check:generated:preview` — pass (manifest set/bytes/hashes exact, bilingual preview metadata, deny-all robots).
- Loopback HTTP probe of the built preview (ephemeral port): `GET /` → 200 with title「寵物年齡換算｜Gloss Tools」; `GET /en/` → 200 with title "Pet Age Converter | Gloss Tools"; unknown path → 404; pinned CSP / nosniff / X-Robots-Tag headers present.

## Spec-errata candidates

- None. No fixture-vs-rule conflicts were found; every fixture follows from the SPEC's stated rules.

## NOT_RUN (explicit)

- Real-browser evidence (isolated Chrome/Edge, both languages, keyboard walk, 200% zoom, reduced motion, touch targets) — no verified isolated browser mechanism was available to this builder; per the handbook this stays NOT_RUN and must not be read as a pass.
- Browser Network/Storage audit (zero work requests, storage/URL/console inspection) and offline-after-load check in a real profile.
- Real-device checks.
- Production build/HTTPS/SEO gate (no production origin is configured; the planned origin in the SPEC is unconfigured, and the build refuses production mode).
- Independent nine-aspect review and acceptance — this is a build-first candidate only: not accepted, not merged, not published.
