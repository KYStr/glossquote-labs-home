# VERIFICATION — Caffeine Half-Life Calculator

Environment: Node v24.22.1, Linux. All commands run in `tools/caffeine-half-life/`.

## Fixture provenance

- `test/fixtures.json` is the spec candidate's `fixtures.json` vendored verbatim (spec candidate commit `73e25fc7bcc49e56f8d07bd7280b8aab987539fb`, spec PR #153 — the spec PR is not merged into the production base, so the tests read this copy). `scripts/check.mjs` pins the spec id, the 9 core / 3 controller case counts, and exact reproduction of the first core case.
- Before implementation, the five successful core fixtures were recomputed with an independent Python implementation of the SPEC's stated rules; every query total, per-entry remainder, series point, and bedtime reading matched the fixtures exactly. Expected values in tests are never derived from the implementation's output.

## Commands and results

- `npm test` — 32/32 pass (core 23: all 9 literal core fixtures deep-compared plus boundary/validation-order/schema/string-limit cases; controller 7: all 3 controller fixtures with a controllable fake scheduler plus transition cases; pages 2: pinned bilingual page metadata).
- `npm run check` — pass (files, package contract, preset table/messages/default draft, fixtures identity, page metadata + candidate rules, pinned CSP, syntax of all shipped scripts, forbidden-capability scan, core/controller purity).
- `npm run build:preview` run twice — byte-identical output (BUILD-MANIFEST.json unchanged between runs; sorted SHA-256 manifest compared).
- `npm run check:generated:preview` — pass (manifest set/bytes/hashes exact, bilingual preview metadata, deny-all robots).
- Loopback HTTP probe of the built preview (ephemeral port): `GET /` → 200 with title「咖啡因代謝計算機｜Gloss Tools」; `GET /en/` → 200 with title "Caffeine Half-Life Calculator | Gloss Tools"; unknown path → 404; traversal → refused; pinned CSP / nosniff / X-Robots-Tag headers present.

## Spec-errata candidates

- None. No fixture-vs-rule conflicts were found; every fixture follows from the SPEC's stated rules.

## NOT_RUN (explicit)

- Real-browser evidence (isolated Chrome/Edge, both languages, keyboard walk, 200% zoom, reduced motion, touch targets) — no verified isolated browser mechanism was available to this builder; per the handbook this stays NOT_RUN and must not be read as a pass.
- Browser Network/Storage audit (zero work requests, storage/URL/console inspection) and offline-after-load check in a real profile.
- Real-device checks.
- Production build/HTTPS/SEO gate (no production origin is configured; the planned origin in the SPEC is unconfigured, and the build refuses production mode).
- Independent nine-aspect review and acceptance — this is a build-first candidate only: not accepted, not merged, not published.
