# Solar Payback Calculator （太陽能回本試算）— Production HANDOFF

- Spec: `spec-solar-payback-calculator-20261121`, draft spec PR #403
  (base `codex/initial-publication`, head
  `31b1fbf5174698ef9176a1687e1eb68ad5e8ae70`, OPEN at build time).
  Registry rev 1862 (per parent task).
- Spec source (fixed): `docs/specs/solar-payback-calculator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `76d1c9b6c9fcfb5e77d67680b293c88f3041ea28ae059cb55fa53dcf85ff850e`,
  verified against the spec PR head via the GitHub API).
- Production target: `tools/solar-payback-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/solar-payback-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (parent orchestrator
  session 59f06c6b-16c8-4b72-b161-090370bbe5f5). User confirmed
  continuation four times on 2026-11-23 (14:31, 14:33:56, 14:58:49,
  15:04:46); the same execution-risk prompt class that stopped the
  first production wave at clone/fetch re-appeared during this build
  (on the initial `ls`/`find` listing and on the `git clone`) and was
  continued past under that authorization — glossquote-repo content
  only, no other content, credentials, outbound sends, or deletion
  involved.

## What was built

- Pure core `public/js/core/solar-payback.mjs`: `run(input)` validates
  in the SPEC order (capacity INPUT_LIMIT → EMPTY → DECIMAL_FORMAT →
  RANGE, fields in the SPEC's order, first error stops), then computes
  with exact decimal arithmetic (BigInt coefficients, value =
  coef × 10^-exp) so a decimal .5 boundary is never flipped by binary
  floats (for example 50 kWh exported at a 1.15 tariff is exactly
  57.5 → 58). Tariff lookup uses the pinned 2026 (ROC 115) MOEA
  rooftop table (lower bound inclusive, upper exclusive); `fitSource`
  is `table` when the typed rate equals the band value, else
  `override`. Roof shortfall is the `ROOF_TIGHT` warning (not an
  error) with `maxFeasibleKwp` floored to 1 decimal. Result shape is
  exactly the fixtures' 15 keys. Fixed report
  `solar-payback-calculator-report.json` (canonical JSON, UTF-16 key
  order, one trailing LF, 2 MiB limit). Display-only ping conversion
  (`m2ToPing`, 1 ping = 400/121 m², 2 decimals).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, disclaimer in both languages, the tariff citation and
  all six band rates, preview noindex, no canonical/hreflang,
  same-language home links (`../../` / `../../en/`), draft-loss
  note, and the SPEC's default values prefilled. Roof and
  beyond-contract results show text + symbol (⚠) prompts, not colour
  alone.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Report vs tariff citation: SPEC implementation says the tariff
   year and notice number go "into the report and page disclosure"
   （費率年度與公告文號以字串寫進報告與頁面 disclosure), but
   inputsOutputs fixes the report content as the result's compact
   JSON and the result object has no field for them.** The
   implementation keeps the report as the canonical JSON of the
   result only (byte-exact against the fixture derivation) and puts
   the citation in the page disclosure of both pages. If the
   citation belongs in the report bytes, inputsOutputs and the
   fixtures must be revised together.
2. **fitRate default is capacity-dependent, but the SPEC never states
   whether changing systemKwp should re-derive it.** inputsOutputs
   says the fitRate default is "裝置容量對應的級距表值", while
   userFlow pins the reset dict with fitRate "5.6279" (for the
   default 9 kWp). The implementation keeps fitRate as an
   independent typed value (reset dict fixed); a rate left over from
   another capacity is reported honestly as fitSource `override`
   and used as typed. If the reviewer wants auto-derivation, the
   SPEC must state when it happens — and that it must not clobber a
   deliberate manual override.
3. **Source paths in the SPEC's implementation section are
   `src/core.mjs`, `src/controller.mjs`, `src/app.mjs`.** The build
   follows the parent task instruction and the run-6 house layout
   (`public/js/core/*.mjs`, `public/js/controller.mjs`,
   `public/js/app.js`), the same layout the other run-6 productions
   use and `scripts/check.mjs` enforces. If `src/` is normative,
   the house layout (and the other productions) must change instead.
4. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/solar-payback-calculator/`; the actual fixed
   spec used here lives in the run-6 spec workspace
   `build6/specs/solar-payback-calculator/docs/specs/solar-payback-calculator/`
   (same content, fixtures verified byte-identical against spec PR
   #403 head `31b1fbf5…`). No content difference; only the path in
   the brief was stale.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.
