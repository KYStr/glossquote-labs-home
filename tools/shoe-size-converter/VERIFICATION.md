# Verification — Shoe Size Converter (build-first candidate)

Environment: Node v24.22.1, Linux VM, 2026-11-09. All commands run inside
`tools/shoe-size-converter/`. This is the author's own build record for a
build-first candidate; it is not an independent review and assigns no scores.

## Commands and results

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 25 tests, 25 pass, 0 fail (fixtures D1–D5, D6 round-trips, boundaries, validation, data gate) |
| `npm run check` | 0 | All static checks passed: data gate, fixtures D1–D5 through the core, both pages' lang/title/description/h1/canonical/hreflang/noindex/home-link invariants, no external URLs anywhere under `public/`, no forbidden fit wording, core purity, app.js free of innerHTML, package.json contract |
| `npm run build:preview` (×2) | 0 | 7 files copied to `dist-preview/` both times; per-file SHA-256 listings of the two runs compared with `diff` — byte-identical |
| `npm run check:generated:preview` | 0 | 7 generated files verified against `public/` sources and the build manifest |
| Loopback HTTP probe (`PORT=4199 node scripts/serve.mjs`, curl, then killed) | — | `/` 200 (lang zh-Hant, noindex), `/en/` 200 (lang en, noindex), `/js/app.js` 200, `/js/core/convert.mjs` 200, unknown path 404 |
| `node --check` on all shipped JS | 0 | Syntax OK for app.js, both core modules, all scripts and tests |

Data gate detail: adult 22 rows, kids 16 rows,
`public/js/core/tables.mjs` SHA-256
`82c0cf6d743ecc955eed5d81b0849f1f108f680fe400314b74a4bd91ab3e5f13`,
matching `DATA-SOURCE.md`. All five SPEC fixtures reproduce exactly; the
transcription was cross-checked row by row against the source article as
retrieved on 2026-11-09, and all SPEC-pinned values (both endpoints and every
fixture row) match.

## Spec-errata candidates (for the independent reviewer / coordinator)

1. **Kids table completeness.** SPEC section 4 describes the kids table as
   rows keyed by Mondopoint with US kids, UK kids and EUR columns, implying a
   label in every system on every row. The source's ISO/TS 19407 children
   equivalence table does not provide that: on its Mondopoint rows, US kids is
   unassigned at 130, 140, 145, 160, 180 and 195 mm, and UK kids is unassigned
   at 150 mm (the merged grid's increments do not intersect every 5 mm step),
   and its 200–210 mm rows carry adult-scale values in parentheses rather than
   kids labels. The shipped table transcribes exactly what the source prints
   (16 rows, 120–195 mm), with unassigned cells as explicit `null`s — shown as
   "—" in results and offered nowhere in the selects. Nothing was interpolated
   or derived from a formula, per the SPEC's own provenance gate; whether the
   SPEC should instead pin a different children's source table is a
   coordinator decision.
2. **Source children's table condition.** The source table carries an
   editorial notice that it may require cleanup and does not match its
   companion figure. Recorded in `DATA-SOURCE.md`; the transcription follows
   the printed cells exactly.
3. **SPEC section 8 location wording.** The SPEC names the tool's own
   repository for the candidate; the 2026-11-09 consolidation rules supersede
   that with `tools/<slug>/` in this repository. Noted in `HANDOFF.md`; the
   SPEC was not edited.

No printed SPEC fixture contradicts the source table or the SPEC's own rules;
D1–D6 all reproduce as written.

## NOT_RUN (not verified by this build)

- Real-browser rendering and interaction (desktop and mobile widths),
  including the SPEC section 7 GUI evidence: the visible round-up at
  26.3 cm, category switching at a fixed foot length, provenance visibility
  on a mobile-width viewport.
- Real devices and touch input; virtual-keyboard behaviour.
- Assistive technology (screen reader pass) and keyboard-only walkthrough
  beyond code inspection.
- Measured contrast ratios (values were chosen conservatively; not measured).
- Zoom / 200% layout checks.
- Deployment, catalog publication, and any production-domain behaviour.
- Independent review and the nine-aspect scoring (SPEC section 6) — pending,
  by design, in build-first mode.
