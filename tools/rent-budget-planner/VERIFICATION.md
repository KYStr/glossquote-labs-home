# Rent Budget Planner — VERIFICATION

Environment: Node v24.22.1, Linux VM, 2026-11-09. All data is synthetic
(the spec fixtures). Product acceptance is NOT_RUN: this is a build-first
candidate awaiting an independent reviewer on the same fixed head.

## Fixed source

- Spec candidate: `2b83a326544418542bb0223b58f2cc86701a49dd`
  (`spec-rent-budget-planner-20261109`, draft PR #139)
- Production base: `codex/initial-publication` @ `9e6abd357f29f5f914cc5252023f3d7b2fbee4ef`
- Branch: `muse/rent-budget-planner-production-20261109`
- Fixtures vendored verbatim: `test/fixtures.json` is byte-identical to the
  spec candidate's `docs/specs/rent-budget-planner/fixtures.json`
  (verified with `diff`, no differences).

## Commands run and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 30 tests, 30 passed, 0 failed |
| `npm run check` | PASS — all static checks passed (after VERIFICATION.md was added) |
| `npm run build:preview` ×2 | PASS — 7 files; SHA-256 manifests of both builds identical |
| `npm run check:generated:preview` | PASS — "builds are byte-identical" (two fresh builds + dist-preview compared) |
| Loopback HTTP probe (`scripts/serve.mjs --port 0 --dir dist-preview`) | PASS — see below |

Test breakdown: 10 literal spec core fixtures (deep-equal on the full
`{ok, result|error}` value), 9 additional core boundary/schema/grammar cases
(income 999,999,999 accepted; candidate rent 99,999,999 accepted and
100,000,000 → `INPUT_LIMIT`; custom ratio 1/100 pass, 0/101 → `RANGE`;
non-CUSTOM garbage `customRatio` ignored; one-third floor direction at
±1 NT$; extra/missing/wrong-type/accessor/non-object → `SCHEMA`; leading
zero/sign/decimal/spaces → `INTEGER_FORMAT`; empty → `EMPTY`; lone surrogate
→ `UNICODE`; pinned first-error order), 3 spec controller fixtures with a
fake executor (dirty-error invalidation, cancel-then-late-result dropped,
replace-then-older-late-result dropped) plus 2 controller extras, 3 report
serialization tests (standard-p30 bytes match the hand-written expected
string and its SHA-256; recursive key sort with array order preserved; an
input `toJSON` is never called), 3 page-structure tests (every wired element
id exactly once per page; pinned titles/robots/home and language links).

HTTP probe (ephemeral loopback port, server stopped afterwards):

- `GET /` → 200 `text/html`, title `租屋預算規劃｜Gloss Tools`
- `GET /en/` → 200 `text/html`, title `Rent Budget Planner | Gloss Tools`
- `GET /styles/app.css`, `/js/app.js`, `/js/core/rent-budget.mjs` → 200 with correct MIME
- `GET /missing`, `/../scripts/serve.mjs`, `/%2e%2e/package.json` → 404
- Response headers include `X-Robots-Tag: noindex, nofollow`, the pinned CSP,
  `nosniff`, `no-referrer`, `no-store`

## Spec-errata candidates

None. Every fixture expected value agrees with the SPEC's stated rules.
Two implementation-level deviations from the SPEC's prose (Worker transport
and file layout) are recorded in HANDOFF.md; neither changes any
fixture-observable behavior.

## NOT_RUN (explicit)

- Real-browser checks in isolated Chrome and Edge (both languages: example,
  typing, error, edit-after-success, cancel, reset, Blob download byte
  comparison) — no verified isolated browser mechanism in this environment.
- Real 200% zoom, reduced-motion, keyboard-only walk, touch targets,
  320 CSS px and 1280×800 layout inspection.
- Network/Storage audit in a clean browser profile (zero work requests,
  local/sessionStorage, IndexedDB, CacheStorage, cookies, service worker,
  URL/console inspection) and offline-after-load behavior in a browser.
  (Static source contains no fetch/XHR/WebSocket/storage calls — verified by
  `scripts/check.mjs` token scan — but that is not a browser observation.)
- Native OS download dialog and real-device (phone) checks.
- Production HTTPS/SEO gate (canonical, hreflang absolutes, robots.txt,
  sitemap, origin https://rent-budget-planner.glossquote.com) — not
  configured; preview is noindex by design.
- The nine acceptance aspects are all NOT_RUN / null scores pending an
  independent reviewer on this fixed candidate.
