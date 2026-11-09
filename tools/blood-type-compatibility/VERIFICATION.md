# VERIFICATION — Blood Type Compatibility （血型相容查詢）

## Scope

Production candidate for `tools/blood-type-compatibility/`, built from the
fixed spec candidate `27343e5d448ef476ba11f09697a8c5f9b30a77e0`
(spec PR #172) on base `c08e3243f0257f80fa512d15b1c37fcbeb6ef962`.

## Independent fixture audit (before implementation)

All 7 success fixtures were re-derived from the antigen rules stated in the
spec's AUTHOR-CHECK (RBC: donor antigen set ⊆ recipient antigen set, with D
for Rh+; plasma: recipient ABO antigen set ⊆ donor ABO antigen set, Rh
ignored) using a throwaway script, and matched `fixtures.json` exactly —
including badge sets, list contents and canonical ordering. The core test
suite repeats this derivation in-repo: all 64 pair verdicts and all 8 single
results are checked against an independent rule implementation written from
AUTHOR-CHECK, not against the matrices the implementation ships.

## Commands run (all in `tools/blood-type-compatibility/`)

- `npm test` — **38/38 pass** (core 18: 10 vendored fixtures + antigen-rule
  cross-checks + EMPTY/INPUT_LIMIT/UNICODE/SCHEMA/accessor/order cases;
  controller 9: 3 vendored fixtures + mode-shape, example, worker-error and
  reset cases; report 4; site 7).
- `npm run check` — pass (required paths, package contract, core constants:
  TYPES, both matrices, badge order, DEFAULTS, EXAMPLE == fixtures case 1,
  8-unit capacity; bilingual page pins including the verbatim plasma note
  and medical disclaimer; syntax incl. worker concatenation; forbidden
  capability scan; core/controller/handler purity).
- `npm run build:preview` run **twice** — outputs compared with
  `find dist-preview -type f | sort | xargs sha256sum`: **byte-identical**
  (9 files).
- `npm run check:generated:preview` — pass ("Generated preview verified:
  9 files, hashes exact, bilingual metadata present, worker source matches
  fixed bytes; not production").
- Loopback HTTP probe of the built preview (`node scripts/serve.mjs`,
  port 4173): `GET /` → 200, title `血型相容查詢｜Gloss Tools`;
  `GET /en/` → 200, title `Blood Type Compatibility | Gloss Tools`;
  `GET /js/worker-source.js` → 200; `GET /robots.txt` → deny-all.
  Server stopped after the probe.

## NOT_RUN

- Real-browser rendering and interaction (no browser available to this
  builder environment; the preview was verified over loopback HTTP only).
- Real-device checks (phone/tablet layout, touch targets).
- Screen-reader / assistive-technology pass.
- Windows re-run of the test suite.

## Spec errata candidates

1. **SPEC.md is truncated at the fixed spec candidate**
   (`27343e5d448ef476ba11f09697a8c5f9b30a77e0`, blob
   `aa6b85cf87270ae1d383c95f160ade71afd67713`, 4,924 bytes). The file ends
   mid-table in the user-flow section — the busy-state row is cut off and a
   literal truncation marker follows — and the inputs/outputs,
   implementation, acceptance, tests and handoff sections are entirely
   absent. The implementation reconstructed the missing contract surface
   from BRIEF.md, fixtures.json and AUTHOR-CHECK.md (see HANDOFF.md
   "Deviations and reconstructions"). Recommend the spec author restore the
   full SPEC.md at the candidate so a reviewer can check the reconstructed
   points (validation sub-order, report filename, FAQ copy) against the
   original intent.
2. No fixture-vs-rule conflicts were found: all 13 fixtures (10 core +
   3 controller) are consistent with the matrices and rules documented in
   AUTHOR-CHECK, and all reproduce exactly. Functional errata count: **0**.
