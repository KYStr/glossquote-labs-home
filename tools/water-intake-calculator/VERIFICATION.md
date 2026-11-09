# Water Intake Calculator — verification record (author-run)

Environment: Node v24.22.1, Linux VM, 2026-11-09. All commands run in
`tools/water-intake-calculator/`.

## Commands and results

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` | 0 | 40 tests, 40 pass, 0 fail (~0.6 s) |
| `npm run check` | 0 | CHECK PASS: file contract, pinned constants vs SPEC section 4, page/string-table agreement, disclaimer adjacency, forbidden-language audit, core purity, no external resources |
| `npm run build:preview` (twice) | 0 | 8 files to `dist/` each run; sha256 of `dist/` + `BUILD-MANIFEST.json` (9 files) identical across both runs — byte-identical: YES |
| `npm run check:generated:preview` | 0 | CHECK-GENERATED PASS preview (8 files byte-identical) |
| Loopback HTTP probe (`PORT=4178 node scripts/serve.mjs`, then curl) | 0 | `GET /` → 200 (3,400 bytes, zh title, W1 range present); `GET /en/` → 200 (3,477 bytes, en title, W1 range present); `GET /js/core/model.mjs` → 200; `GET /nope` → 404; server binds 127.0.0.1 only and was stopped after the probe |

## What the tests cover

- SPEC section 4 fixtures W1–W4 exactly (ml and cups), including the W4
  half-up cases (4,312.5 → 4,313; 4,812.5 → 4,813; cups 17.3/19.3 from exact
  values).
- Order of operations (SPEC 7b): (base + activity) × climate, via W3 and a
  constructed 50 kg / light / hot case (2,313, not the wrong-order 2,225).
- All 12 activity × climate combinations at 70 kg against hand-derived
  values; bounds 20.0/300.0 accepted, 19.9/300.1 range-refused, two-decimal
  weights refused, malformed inputs refused with distinct reasons.
- Freeze lifecycle (SPEC 3/7e): invalid weight keeps the last valid range
  object unchanged, including when selects change while invalid.
- SPEC 7d string audit: both locales' string tables, generated model
  statements and full page text (disclaimer exempted per SPEC 5.2) contain
  no forbidden diagnosis/assessment terms.
- SPEC 7f structure on the built pages: full disclaimer directly after the
  result block, W1 initial state, no figure in title/h1, no external URLs.
- Exhaustive-domain sweep (all 28,001 weights × 12 combinations × both
  ends): cups-from-exact always equals cups-from-rounded — see errata E2.

## Spec-errata candidates (formula followed, per instructions)

- **E1 — SPEC section 4 extreme figure.** The SPEC prints "300 kg, high,
  hot → 12,563–14,063 ml". Its own formula gives low (30×300 + 1,050) ×
  1.25 = 12,562.5 → 12,563 (matches) but high (35×300 + 1,050) × 1.25 =
  14,437.5 → 14,438 (SPEC prints 14,063). The implementation and tests
  follow the formula: 12,563–14,438 ml.
- **E2 — SPEC section 7(c) premise.** Section 7(c) requires constructing a
  case where cups-from-exact and cups-from-rounded-ml differ at the
  displayed decimal. Under the pinned constants no such case exists: a
  tenth of a cup is 25 ml = exactly 1,000 units of 1/40 ml, so whole-ml
  rounding (≤0.5 ml) can never cross a tenth-of-a-cup boundary. Proven by
  the exhaustive sweep in `test/core.test.mjs`. The implementation still
  computes cups from the exact values exactly as section 4 requires; only
  the "differing case" deliverable is unattainable.

## NOT_RUN (not performed; blocks acceptance per SPEC section 6)

- Real-browser rendering and interaction (desktop Chrome/Edge/Firefox/
  Safari and mobile widths) — no browser evidence collected.
- Real devices / touch input; virtual-keyboard behaviour.
- Assistive technology (screen reader pass) and measured contrast ratios.
- 200% zoom layout check.
- Deployment of any kind; production build (refused by `scripts/build.mjs`
  until an approved origin exists).
- Independent nine-aspect review — pending; next owner is the reviewer.
