# Handoff — Barcode Generator (production candidate, build-first)

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Spec commit (consolidation base): `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c`
- Paths: `docs/specs/barcode-generator/SPEC.md`, `docs/specs/barcode-generator/BRIEF.md`
  (the spec directory contains no fixtures.json; all fixtures are the worked
  examples pinned in SPEC section 4, and the tests quote them from there.)

## Allowed scope

- Implementation lives **only** in `tools/barcode-generator/` of this repo.
- No other path was modified. No coordination-registry writes were made by
  the implementer.

## Mode

- **Build-first**: this candidate was produced ahead of the independent bulk
  review. It is **not accepted and not published**; acceptance requires a
  non-author reviewer scoring all nine SPEC section 6 aspects ≥ 90 against
  this fixed candidate commit with all mandatory checks complete.
- SPEC section 8's handoff wording (candidate in the tool's own repository
  `KYStr/glossquote-labs-barcode-generator`) is **superseded** by the
  2026-11-09 consolidation rules recorded in `docs/SOURCE-LAYOUT.md` and
  AGENTS.md: new implementations live in `tools/<slug>/` in this shared repo
  and are handed over by PR here.

## What is implemented (SPEC sections 2–5)

- Code 128 over sets B and C with the SPEC's deterministic auto-switch rule,
  printable ASCII 32–126, length 1–48, mod-103 checksum; the ISO/IEC 15417
  width table (values 0–106) ships as auditable data in
  `public/js/core/code128-patterns.mjs`.
- EAN-13 (12 digits → check digit computed and appended; 13 digits →
  validated, mismatch error names the expected digit) and UPC-A (11/12),
  check digits, parity patterns and the two 95-module fixtures per SPEC.
- Options: module width X 0.25–1.00 mm (step 0.01, default 0.33), bar height
  10–60 mm (defaults 25 Code 128 / 22 EAN·UPC), human-readable text toggle,
  PNG scale 1–10 px per module (default 3). Live facts: symbology, symbol
  count, total modules including quiet zones, physical width (2 decimals),
  EAN/UPC check digit.
- Error states per SPEC section 3: last valid barcode stays visible, greyed
  and labelled out of date; downloads are disabled while an error stands.
  Switching symbology never silently rewrites the input (a stated note
  explains any replacement by that symbology's last-valid value or sample).
- Downloads: SVG in module units and PNG per the SPEC formula, both built
  from the same module string as the preview, only on explicit user action.
  GS1 allocation note is shown on both pages. Nothing is persisted; the
  payload never appears in the URL or title.

## Next owner

Independent reviewer (non-author): run the SPEC section 6/7 evidence,
including the real-browser flows and the physical print-and-scan test that
this build-first pass records as NOT_RUN in VERIFICATION.md.
