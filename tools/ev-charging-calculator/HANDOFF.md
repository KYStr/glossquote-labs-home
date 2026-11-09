# HANDOFF — EV Charging Calculator （電動車充電計算機）

## Fixed source

- Spec task: `labs-ev-charging-calculator-spec-20261109`
- Spec id: `spec-ev-charging-calculator-20261109`
- Spec candidate commit: `548ffc2efc37072e11080e229d24c281683e7c79`
- Draft spec PR: https://github.com/KYStr/glossquote-labs-home/pull/144
- Production base: `codex/initial-publication` @ `b7ffa5a133ac7a2b3221d0807e61c2c3faa48442`
- Production branch: `muse/ev-charging-calculator-production-20261109`
- Build mode: build-first (independent production review still required; nothing here is accepted, merged, or published)

## Scope built

Only `tools/ev-charging-calculator/` was added:

- `public/js/core/ev-charging.mjs` — pure core: strict own-data string schema (SCHEMA for unknown/missing/wrong-type/accessor), the SPEC's fixed per-field validation order (INPUT_LIMIT → UNICODE → EMPTY → DECIMAL_FORMAT/INTEGER_FORMAT → RANGE) in the fixed field order, then the cross-field SOC_ORDER check. All arithmetic is exact BigInt rational; each output is rounded half-up once from the exact value. `targetSoc == currentSoc` is the pinned zero-charge success (`needsCharge:false`, all-zero outputs, cost 0 with a price / null without); wall energy is battery energy ÷ efficiency and time is wall energy ÷ charger power × 60, per the SPEC's constant-power model.
- `public/js/core/controller.mjs` — the six flow states (empty/dirty/busy/success/error/cancelled) with a generation/token guard: settling happens on a scheduled macrotask, only the current generation while busy may settle, late settlements are discarded, edits invalidate results and the report immediately.
- `public/js/app.js` — DOM wiring using `value`/`textContent` only; preset buttons (7/11/50/120/180 kW) write the pinned strings into the power field as an edit; load-example fills the first fixture case; reset restores the SPEC defaults and focuses the first field; the fixed download `ev-charging-report.json` is built only on an explicit click (Blob URL revoked after 30 s or as soon as the result is invalidated); pagehide drops pending work, a bfcache restore resets.
- `public/index.html` (zh-Hant) and `public/en/index.html` (en) — static bilingual pages with the SPEC-pinned titles, descriptions, H1s, FAQ copy and estimate disclosure; robots noindex/nofollow; per the SPEC's candidate convention there is no production canonical, hreflang or sitemap — language and home links are path-only (home: `../../` and `../../en/`).
- `scripts/check.mjs`, `scripts/build.mjs`, `scripts/serve.mjs` — static checks, reproducible preview build into `dist-preview/` (production mode refused: no production origin configured), and a loopback-only preview server with the candidate security headers (CSP `default-src 'none'`, nosniff, no-referrer, X-Robots-Tag noindex, Permissions-Policy denying camera/microphone/geolocation).
- `test/` — vendored fixtures plus core, report, controller, build and serve tests (see VERIFICATION.md).

## Deviations

None from the SPEC. The test fixtures are vendored verbatim into `test/fixtures.json` (SHA-256 `194ad7dd3d6578fe6d44e4677c2b2564ba1b074e06dd2537809127586fa5e23c`) because the spec PR is not yet merged into the production base; no other spec content was copied.
