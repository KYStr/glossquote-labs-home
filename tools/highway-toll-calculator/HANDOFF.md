# Handoff — Highway Toll Calculator （國道通行費試算）

## Fixed spec source

- Spec id: `spec-highway-toll-calculator-20261121`
- Spec draft PR: https://github.com/KYStr/glossquote-labs-home/pull/388
- Registry rev at spec registration: 1787 (per assignment)
- Implementation base: `codex/initial-publication` @ `8c2652671012498891e7f7afe02fdca3f154aa64`
- Scope: only `tools/highway-toll-calculator/` added. Build-first mode: no registry/coordination commands were run; nothing is accepted, merged, or published.

## What was built

- `public/js/core/toll.mjs` — the pure core. Strict own-data validation (unknown/missing/wrong-type/accessor → SCHEMA, accessors never invoked), fields in the SPEC's order (mode → vehicleType → entry → exit → distanceKm → priorKm → etag); per field: capacity INPUT_LIMIT → unpaired surrogate UNICODE → EMPTY → grammar FORMAT → RANGE, then cross-field UNKNOWN_INTERCHANGE / SAME_INTERCHANGE (field exit). The computation is the SPEC's exact-integer model: distances in tenths of a km, rates in milli-NT$ per km (small 1200/900, large 1500/1120, trailer 1800/1350 — the large long rate is the official table value 1.12, not 1.125); `gross(d)` splits the daily total into free (≤20 km), standard (20–200 km) and discounted (>200 km) parts; this trip's charge is `gross(prior + trip) − gross(prior)`; eTag takes 10% off before the single final half-up rounding to whole NT$ (integer arithmetic only: `floor((milli + 500) / 1000)`, eTag `floor((milli × 9 + 5000) / 10000)`). No clock, `Date`, `Intl`, network, storage, or DOM reads. The canonical report serializer (keys sorted by UTF-16 code units recursively, compact, one trailing LF) never invokes an input `toJSON`.
- `public/js/controller.mjs` — generation-guarded draft/work controller (empty/dirty/busy/success/error/cancelled) over an injected Worker factory; late replies are dropped, edits and cancels terminate the worker, reset restores the SPEC defaults. Public state exposes `reportAvailable`.
- `public/js/app.js` + bilingual static pages — mode radio (distance / entry & exit), the 14-station Freeway 1 selects with km labels, vehicle-type select, priorKm input (blank means 0), eTag checkbox, the SPEC-pinned disclosure statement resident in both the input and results areas, the four pinned FAQ answers, the method disclosure (rate table, daily settlement formula, single final rounding, interchange table), and the fixed `highway-toll-calculator-report.json` download (created only on click from the current success snapshot, Blob URL revoked within 30 s or on invalidation). Amounts display with the `NT$` prefix; gross amounts show up to 3 decimals, km values 1 decimal.
- `scripts/` — reproducible preview build (copies `public/`, embeds the fixed worker source = core + handler bytes, deny-all robots.txt, SHA-256 BUILD-MANIFEST), static check, generated-output check, and a loopback-only serve with the SPEC's CSP and noindex headers. Production mode is refused (no approved origin).

## Deviations and interpretations

- File layout follows the handbook contract (`public/js/core/*.mjs`, `public/js/app.js`, `public/js/controller.mjs`) rather than the SPEC implementation sketch's `src/` names; no behaviour difference.
- Candidate metadata follows the SPEC's pinned preview convention (noindex, no production canonical/hreflang/sitemap; production build refused) over the generic checklist wording.
- The SPEC pins error codes INPUT_LIMIT / EMPTY / UNICODE / FORMAT / RANGE / UNKNOWN_INTERCHANGE / SAME_INTERCHANGE / SCHEMA but does not spell out every nullable-field rule, so the core fixes these from the input contract: mode/vehicleType/etag missing means the SPEC default, priorKm missing or empty means `"0"`; in pair mode distanceKm must be null (a value is FORMAT) and entry/exit are required (null/empty is EMPTY, unknown id is UNKNOWN_INTERCHANGE); in distance mode entry/exit must be null (a value is FORMAT) and distanceKm is required (missing is SCHEMA, empty is EMPTY). Empty mode/vehicleType/etag strings are EMPTY (missing content), not FORMAT.
- The SPEC's tests section lists "單獨 surrogate" among the extra checks without naming an error code; the core reports `UNICODE` for an unpaired surrogate, following the sibling hiking-time-estimator tool's convention (capacity → UNICODE → EMPTY prelude order).
- The disclosure statement is duplicated in the input area as well as next to the results, following the sibling tool's fixed-note pattern; the SPEC pins it as page fixed text.
- The English interchange names (Keelung End, Xizhi, Neihu, Taipei, Wugu, Linkou, Taoyuan, Zhongli, Yangmei, Hukou, Taichung, Changhua, Tainan, Kaohsiung End) are transliterations of the SPEC's Chinese names, which the SPEC does not translate.
- Fixtures are vendored verbatim into `test/fixtures.json` (SHA-256 `079de2b5fb3ab7a61f4d2c4d1cdb79cd44b8e8ca45deab3e642c63e0de6088fb`, byte-identical to the spec candidate's file) because spec PR #388 is not merged into this branch's base.

## Spec-errata candidates

None. All 14 literal core fixtures and all 3 error fixtures reproduce from the SPEC's stated rules; before product code existed, an independent scratch implementation (Python `decimal.Decimal`, half-up) reproduced all 14 successful fixtures value-for-value, including the official-example cross-check in the disclosure (327.4 km → 330.66 → 331; eTag 297.594 → 298) and the large-vehicle table rate 1.12. No SPEC-vs-example conflict was found: every fixture agrees with the SPEC's formula text.

## Next owner

Independent reviewer (parent verifies the PR head first). Real-browser/device evidence and the nine-aspect review are still outstanding — see VERIFICATION.md NOT_RUN.
