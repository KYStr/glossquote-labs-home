# Deal Comparator （優惠比價）— Production HANDOFF

- Spec: `spec-deal-comparator-20261121`, draft spec PR #375
  (base `codex/initial-publication`, head
  `d96c5920128637f2b942b52c0fd11f771e7d25dc`, OPEN at build time).
  Registry rev 1722 (per parent task).
- Spec source (fixed): `docs/specs/deal-comparator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `f7d2d5fdec220b4309319b666082af2bc83459c8b6873805d5661fc196c5854b`,
  verified against the spec PR head via the GitHub API).
- Production target: `tools/deal-comparator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/deal-comparator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent, second wave (parent
  orchestrator session c194ec5a-949c-5f98-8c2e-a43de40dc53d). User
  confirmed continuation four times on 2026-11-23 (14:31, 14:33:56,
  14:58:49, 15:04:46); the same execution-risk prompt class that
  stopped the first production wave at clone/fetch re-appeared
  during this build (on the clone step) and was continued past under
  that authorization — glossquote-repo content only, no other
  content, credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/deal-comparator.mjs`: `run(input)`
  validates in the SPEC order (whole-input capacity, then
  productName, unitBasis, packSize, packPrice, offers count, then
  per-offer checks in input order: object, label, type, extra
  fields, type fields in table order, cross-field fixed-off rule),
  computes with exact BigInt integer cents and exact rational
  percentage discounts (no floating point anywhere), rounds exactly
  once at the end with round-half-up (halves away from zero for
  negatives), computes the unit price from the unrounded exact paid
  amount, and ranks by (rounded unit price, rounded total paid,
  input index) with consecutive ranks 1..n and a unique best.
  Fixed report `deal-comparator-report.json` (canonical JSON,
  UTF-16 key order, one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected. The nested draft (product fields
  plus an offers array) is deep-copied on the way in and out.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, preview noindex, no canonical/hreflang,
  same-language home links (`../../` / `../../en/`), draft-loss
  note. The form has product fields, an offer-count selector
  (2–4), and four offer blocks whose type-specific fields
  (buyN/getM, quantity + percent/amountOff/bundlePrice) show and
  hide by type. Results show the best deal in words plus a ranked
  table (rank, label, type, total paid, total quantity, unit price,
  savings); the best rank carries a text + symbol mark (★最佳 /
  ★Best), not colour alone.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Whole-input capacity serialization is unpinned.** SPEC §inputsOutputs
   says the whole input JSON text over 65,536 characters is
   INPUT_LIMIT, but does not pin the serialization (key order,
   spacing, escaping of lone surrogates). The implementation
   measures `JSON.stringify` of a sanitized own-data copy. If the
   reviewer wants a different measure, the SPEC must pin it.
2. **Cross-field order of per-field capacity is unpinned.** SPEC
   lists single-field capacity under step 1 (before steps 2–7) but
   does not say which field's capacity wins when two fields are
   over their limits (e.g. `offers[1].label` too long vs
   `offers[0].type` invalid). The implementation checks per-field
   capacity in field-validation order (the run-5/run-6 house
   pattern). No fixture covers this; all 13 core fixtures match
   the implementation exactly.
3. **Top-level SCHEMA field is only implied.** The SPEC intro says
   unknown/missing/wrong-type/accessor are SCHEMA with
   field null, and the fixtures pin `MONEY_FORMAT`/`packPrice` and
   `RANGE`/`offers[0].percent`, but no fixture covers a top-level
   SCHEMA case. The implementation returns field null for top-level
   SCHEMA (missing/wrong-type/unknown/accessor) and the field path
   for format/range/enum/empty errors. If top-level SCHEMA should
   carry a field path, the SPEC must say so.
4. **"字元" length unit is unpinned for astral characters.**
   `productName` (80) and `label` (40) limits are counted with JS
   string `.length` (UTF-16 code units), so an astral character
   (e.g. emoji) counts as 2. The SPEC does not say code units vs
   code points; no fixture covers it.
5. **Label whitespace is returned verbatim.** SPEC says custom
   labels are returned "原樣", so the implementation returns the
   label exactly as typed (only emptiness is checked after
   trimming), while `productName` is trimmed in the result
   (validation is defined on the trimmed value). If labels should
   also be trimmed, the SPEC and fixtures must say so.
6. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/deal-comparator/`; the actual fixed
   spec used here lives in the run-6 spec workspace
   `build6/specs/deal-comparator/docs/specs/deal-comparator/`
   (same content, verified byte-identical fixtures against spec PR
   #375 head `d96c5920…`). No content difference; only the path in
   the brief was stale.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.
