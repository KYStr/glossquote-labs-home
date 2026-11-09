# Verification — Barcode Generator (build-first candidate)

Environment: Node v24.22.1, Linux VM, no browser used in this pass.
All commands run from `tools/barcode-generator/`.

## Commands and results

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` (`node --test`) | 0 | **38 tests, 38 pass, 0 fail** |
| `npm run check` | 0 | all static checks passed |
| `npm run build:preview` (run twice) | 0 | 7 files; SHA-256 of every output file identical across both runs (byte-identical build) |
| `npm run check:generated:preview` | 0 | preview/ matches a fresh build byte for byte (7 files) |
| Loopback HTTP probe (`node scripts/serve.mjs 4173`, then curl, then kill) | 0 | `/` 200 (zh-Hant, correct title), `/en/` 200 (English title), `js/app.js`, `js/core/barcode.mjs`, `styles/main.css` all 200, path traversal `/../package.json` rejected (404) |

## What the tests pin (expectations derived from the SPEC, not the code)

- All SPEC section 4 fixtures exactly: four Code 128 symbol traces and
  checksums (1, 44, 26, 62), full module strings for all four (hand-expanded
  from the SPEC-pinned value sequences through the ISO width table), both
  EAN-13 check digits (7 and 4) and the complete 95-module EAN string quoted
  from the SPEC, the UPC-A check digit (2) and its complete 95-module string.
- Auto-switch sweep (SPEC 7b): digit runs of 3 (stays in B), 4 (C, mid and
  end, no trailing switch), 5 at start and mid-payload (first digit in B),
  6 at start (Start C), digit-only length 7, short run after a C section.
- Pattern-table integrity (SPEC 7c): exactly 107 entries, each 11 modules
  (stop 13), unique, widths 1–4, bar-first; anchor module strings for values
  0, 99, 100, 103, 104, 105, 106; recorded SHA-256 of the joined table:
  `2a01e6cafda82cf1361cdb17699c914deca757fa07519d621075d461c9e80c5f`.
- Validators (SPEC 7d): every error class with its parameters — empty,
  too-long (48 accepted / 49 refused), invalid character with position
  (ASCII 127 at position 3, tab at position 2; ASCII 32 and 126 accepted),
  non-digit with position, wrong-length with expected/actual counts for
  EAN-13 (11/14) and UPC-A (10/13), check-digit mismatch naming the
  expected digit for both retail formats.
- Sizing (SPEC 7e): fixture widths 22.00 / 29.04 / 88.00 mm at
  X = 0.25 / 0.33 / 1.00; PNG dimensions per formula including a
  half-away-from-zero case (27.5 → 28); SVG output re-parsed back to the
  exact module string; markup payload `A<B` appears only as escaped text.

## Spec-errata candidate (for the bulk review — the rule was followed)

- SPEC section 5 states PNG at scale 10 for the widest Code 128 case
  "stays under 2,000 px wide". That bound is arithmetically unsatisfiable
  under the SPEC's own rules: a 48-character payload needs at minimum
  319 modules (all digits packed in C: start + 24 pairs + check = 26
  symbols × 11 + 13 stop + 20 quiet-zone modules), i.e. 3,190 px at
  scale 10, and up to 583 modules (all set B) = 5,830 px. The normative
  formula in section 2(e) was implemented as written; the section 5 prose
  bound should be corrected or removed by a spec erratum.

## NOT_RUN (required by SPEC sections 6–7 before acceptance)

- Real-browser rendering and interaction in both languages (entering each
  fixture through the real UI; keyboard-complete flow; focus visibility).
- Download verification in a real browser (SVG parsed back, PNG sampled at
  module centres) — the Node tests verify the SVG serializer and the PNG
  dimension formula, but the canvas PNG path itself is browser-only.
- Print preview at 100% measured against the stated physical width
  (±0.5 mm tolerance check).
- **Physical scan test**: phone scanner app on one printed Code 128 and one
  printed EAN-13 label — SPEC section 7 requires this as acceptance
  evidence; it was not and cannot be performed in this environment.
- Real devices / touch, assistive technology, measured contrast,
  320 px and 200% zoom layout checks.
- Deployment (none authorised; the preview build is noindex by design).
