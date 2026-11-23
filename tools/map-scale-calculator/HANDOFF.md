# Map Scale Calculator （地圖比例尺換算）— Production HANDOFF

- Spec: `spec-map-scale-calculator-20261121`, draft spec PR #398
  (base `codex/initial-publication`, head
  `91540b9ccad4b01dc72aed0419f44b5661e1416c`, OPEN at build time).
  Registry rev 1842 (per parent task).
- Spec source (fixed): `docs/specs/map-scale-calculator/` at the spec
  PR head above — `SPEC.md` (8 sections), `BRIEF.md`, `fixtures.json`,
  `AUTHOR-CHECK.md`. `test/fixtures.json` in this tool is a
  byte-identical vendored copy (SHA-256
  `1b5e53d7286b97b667bfee2e7bde9299ee4f3309507290c158c462fd5b8701bd`,
  verified against the spec PR head via `git show` on the fetched
  spec branch; `SPEC.md` also matches the spec head byte for byte,
  SHA-256 `6b93a37110432d4d75161259eee4c853dd77ba1716ac3f69e837af0e62dceed1`).
- Production target: `tools/map-scale-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/map-scale-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent (parent orchestrator
  session 482ee4df-a4b2-4529-99b4-9311953be3cb). User confirmed
  continuation four times on 2026-11-23 (14:31, 14:33:56, 14:58:49,
  15:04:46); the same execution-risk prompt class that stopped the
  first production wave at clone/fetch re-appeared during this build
  (on the `find`/`exec` reads of the run-5 exemplar directory and
  on the clone/fetch/show steps) and was continued past under that
  authorization — glossquote-repo content only, no other content,
  credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/map-scale.mjs`: `run(input)` validates in
  the SPEC order (mode → scale → realUnit (reverse) → mapCm /
  realValue; per field capacity INPUT_LIMIT → surrogate UNICODE →
  EMPTY → grammar INTEGER_FORMAT / DECIMAL_FORMAT → RANGE) and
  computes with exact BigInt milli-unit rational arithmetic (no
  binary floating point anywhere). Forward: real cm = mapCm × N,
  metres = cm ÷ 100, kilometres = m ÷ 1000. Reverse: real cm =
  metres × 100 / kilometres × 100,000, map cm = real cm ÷ N.
  Rounding only at output, half-up: realMeters 2 decimals,
  realKilometers 3 decimals, reverse-computed mapCentimeters 2
  decimals; forward mapCentimeters is the input echoed back,
  normalized (trailing zeros trimmed), not re-rounded. The primary
  unit is decided on the exact unrounded metres (< 1000 m is "m",
  >= 1000 m is "km"; reverse is "cm"). The pinned 7-row
  common-scales table is exported from the core and derived from
  the 1:N definition only (metersPerCm = N/100, cmPerKm =
  100,000/N). Fixed report `map-scale-report.json` (canonical JSON,
  UTF-16 key order, one trailing LF, 2 MiB limit). Fields the
  current mode does not read are kept as own data and not
  validated, per the SPEC.
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected. The draft always carries the
  full five-field default shape; loadExample merges the fixture
  example over the defaults.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions,
  h1, FAQ answers, the 7-row common-scales table with per-row
  "fill in" buttons, preview noindex, no canonical/hreflang,
  same-language home links (`../../` / `../../en/`), draft-loss
  note, mode switch (forward/reverse) and real-unit (m/km)
  radios.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Reverse realMeters / realKilometers rounding: SPEC §inputsOutputs
   point 3 vs point 4 are in tension.** Point 3 pins output
   rounding without a direction exception ("realMeters 取 2 位小數、
   realKilometers 取 3 位小數、反向算出的 mapCentimeters 取 2 位小數"),
   with the only carve-out being the forward mapCentimeters echo.
   Point 4 says reverse realMeters / realKilometers are "輸入實際
   距離換算後的正規化值", which can be read as an exact conversion
   with no rounding. The two readings differ for 3-decimal metre
   inputs: 12.345 m @ 1:25000 gives realMeters "12.35" /
   realKilometers "0.012" under the point-3 reading, versus "12.345"
   / "0.012345" under the exact-conversion reading. The
   implementation follows point 3 (the only place that pins the
   rounding); a test pins the point-3 outcome for 12.345 m. If the
   reviewer wants the exact-conversion reading, §3 and §4 must be
   revised together and the test updated.
2. **Controller fixture `state-cancel-late` afterCancel draft shape.**
   The fixture's `afterCancel.draft` lists only the three forward
   fields (`mapCm`, `mode`, `scale`), while its `afterReset.draft`
   is the full five-field SPEC default. The controller draft always
   carries the full five-field default shape (unread fields kept,
   unvalidated, per the SPEC), so afterCancel's draft is the full
   default; the controller test asserts the fixture's three fields
   as a subset and deep-equals the full default at afterReset. If
   the reviewer wants the draft to drop unread fields, the SPEC
   default and the controller contract must be revised together.
3. **Task-brief path note:** the parent task cited the spec at
   `home clone docs/specs/map-scale-calculator/`; the actual fixed
   spec used here lives in the run-6 spec workspace
   `build6/specs/map-scale-calculator/docs/specs/map-scale-calculator/`
   (same content, verified byte-identical fixtures and SPEC.md
   against spec PR #398 head `91540b9c…`). No content difference;
   only the path in the brief was stale.
4. **Distance leading zeros are accepted by the SPEC grammar as
   written.** The SPEC pins the non-zero-leading rule for `scale`
   only ("1 或非零開頭"); the distance grammar ("ASCII 數字、可選
   一個小數點、小數點前後至少一位數字") has no such restriction,
   so "007" cm is accepted and echoes as "7". A test pins this
   reading. If leading zeros should be rejected for distances, the
   grammar must be revised.

## Verification

See `VERIFICATION.md` for commands, exits, test counts, and the two
build hashes. Browser / Network / Storage / compatibility evidence is
NOT_RUN (no isolated browser available to this builder; see
VERIFICATION.md) — the independent reviewer must run the nine-aspect
gates on the same PR head.
