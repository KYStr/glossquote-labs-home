# Party Supply Calculator — Production Handoff

## Fixed source

- Spec: `docs/specs/party-supply-calculator/` — BRIEF.md, SPEC.md (8 sections, v1,
  `spec-party-supply-calculator-20261121`), fixtures.json (15 cases), AUTHOR-CHECK.md.
- Spec PR: #387, registry rev 1782 (per task brief).
- Spec read from: `~/workspace/glossquote-factory/build6/specs/party-supply-calculator/`
  (local spec clone; home clone `~/workspace/glossquote-factory/home/` does not
  contain `docs/specs/party-supply-calculator/` — the spec lives in the
  `build6/specs/party-supply-calculator` clone).
- Base: remote `codex/initial-publication` head at clone time — commit
  `8c265267` ("coordination: submit labs-image-file-size-calculator-spec-20261121").
- Branch: `muse/party-supply-calculator-production-20261121`.
- Product: `tools/party-supply-calculator/` in this repo (KYStr/glossquote-labs-home).
- No registry production registration was done (production does not go through
  the registry system, per run-5 mode).

## Scope

Build-first production of the Party Supply Calculator per SPEC: guests 1–500,
duration 0.5–12 h in 0.5 h steps, meal types snacks / light / full; five outputs
(food g, drinks ml + 2 L bottles, cups, plates, ice kg) from the pinned
per-person table and duration factor, all rounded up to buyable units, all
integer/rational arithmetic, no floating point on operands. Bilingual static
pages (zh-Hant / en), Worker-based run with generation guard, canonical JSON
report download (`party-supply-report.json`), preview build + static checks +
loopback serve, all offline and zero-dependency (Node ≥ 24, ESM).

## What was built

- `package.json` — ESM, Node ≥ 24, zero dependencies, scripts
  test / check / build:preview / check:generated:preview.
- `public/index.html`, `public/en/index.html` — independent bilingual pages,
  preview noindex, same-language home links (`../../`), language switch notes
  that the draft is lost, SPEC titles/descriptions/H1, all three SPEC FAQs.
- `public/js/core/core.mjs` — pure `run(input)`, validation in SPEC field order
  (guests → durationHours → mealType; capacity → surrogate → empty → grammar →
  STEP → range), exact integer ceilDiv arithmetic, canonical report serializer.
- `public/js/core/controller.mjs` — draft + generation + six states
  (empty/dirty/busy/success/error/cancelled); late results dropped.
- `public/js/worker-handler.mjs` — fixed Worker handler (core + handler embedded
  by the build into a Blob module Worker).
- `public/js/app.js` — textContent/value only, download Blob revoked within 30 s.
- `public/styles/app.css` — Gloss Tools paper/ink tokens, 320 px → desktop.
- `scripts/build.mjs`, `scripts/check.mjs`, `scripts/check-generated.mjs`,
  `scripts/serve.mjs` — reproducible preview build, static checks, byte-identical
  rebuild verification, loopback-only server (GET/HEAD, CSP, traversal rejected).
- `test/fixtures.json` — byte-identical copy of the SPEC fixtures (verified with
  `cmp`, 15 cases).
- `test/` — core (fixtures + hand-derived boundaries), controller (both SPEC
  controller fixtures with a controllable fake transport), report (hand-written
  canonical bytes), html (metadata/FAQ/ids), build (two-run byte identity),
  serve (real HTTP: MIME/CSP/404/traversal).

## Results

- `node --test`: **44 tests, 44 pass, 0 fail**.
- `node scripts/check.mjs`: all static checks passed.
- `node scripts/build.mjs --mode preview` run twice: byte-identical.
  Combined sorted-SHA-256 tree hash (both runs):
  `46263e7e9cd53f0d3ecf8c1ec4da0e1668f3fdeb488947b9dff8c395414053a4`
  Per-file SHA-256 (dist-preview): see VERIFICATION.md.
- `node scripts/check-generated.mjs`: dist-preview matches fresh build (7 files).
- Node: v24.22.1. No network use during build/test; no dependencies installed.

## Errata candidates (spec problems found)

None. All 10 core fixtures and all 3 error fixtures were independently
recomputed by hand from the SPEC formulas before coding and match exactly
(see VERIFICATION.md for the recomputation). AUTHOR-CHECK.md already documents
the three drink-total errors it caught and fixed (boundary-2h, boundary-2-5h,
boundary-4-5h); the shipped fixtures.json contains the corrected values.

## Interpretation notes (not spec changes — judgement calls, for the reviewer)

1. `"0.25"` is DECIMAL_FORMAT, not STEP: the SPEC grammar allows at most one
   fraction digit ("最多一位小數位"), and grammar is checked before STEP, so a
   two-digit fraction fails the grammar first. (SPEC's own test list mentions
   0.25 only as a value to verify, without assigning it a code.)
2. `"2.3"` is STEP, not DECIMAL_FORMAT: the grammar allows any single fraction
   digit; the 0.5-multiple rule is the STEP check. This is pinned by fixture
   `duration-step`.
3. mealType longer than 8 raw units is INPUT_LIMIT, a lone surrogate is UNICODE,
   and empty string `""` is ENUM (it is simply not one of the three values);
   the SPEC's general "capacity, then surrogate" order is applied to all three
   string fields.
4. `"00.5"` is accepted as 0.5 h: the SPEC duration grammar only requires at
   least one integer digit and does not forbid leading zeros (unlike guests,
   where "0 or non-zero leading" is explicit).
5. `durationFactor` (1 / 1.2 / 1.5), per-person `iceKg` (0.5 / 0.6 / 0.75) and
   `durationHours` (0.5 multiples) are emitted as the exact JSON-number literals
   the SPEC pins; all derivation uses integer fractions (1, 6/5, 3/2) and h2.

## NOT_RUN (not verified by this builder)

- Real-browser checks (Chrome / Edge, zh + en): example flow, typing, error,
  edit-after-success, cancel, reset, Blob download byte check, reflow at
  1280×800 and 320 CSS px, real 200% zoom, keyboard/Tab/Enter/Space, focus,
  contrast, touch targets, reduced motion — no isolated browser was available
  to this subagent. Node/DOM-level tests above are not a substitute.
- Network/Storage zero-request audit with a clean isolated profile
  (local/sessionStorage, IndexedDB, CacheStorage, cookies, service worker,
  URL, console) — code contains no fetch/storage/service worker, but no live
  profile audit was run.
- The nine acceptance facets (functionality, boundaries, privacy, security,
  usability, accessibility, localization-seo, toolchain-provenance,
  compatibility) are all NOT_RUN at product level and need the independent
  reviewer against the same PR head.
- Production HTTPS/SEO (canonical, hreflang, sitemap, robots.txt, headers,
  origin https://party-supply-calculator.glossquote.com) — not configured;
  preview carries noindex as required.

## Next owner

Independent (non-author) reviewer: verify this PR head against the SPEC's nine
acceptance facets with real-browser evidence, then the primary decides on
accept / merge / deploy. Do not merge or publish from this branch without
that review.
