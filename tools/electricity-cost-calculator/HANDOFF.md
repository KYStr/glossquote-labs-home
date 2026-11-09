# Electricity Cost Calculator — production handoff

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (branch `codex/consolidate-20261109`)
- Paths: `docs/specs/electricity-cost-calculator/SPEC.md`, `docs/specs/electricity-cost-calculator/BRIEF.md`, `docs/specs/electricity-cost-calculator/AUTHOR-CHECK.md`
- No `fixtures.json` exists for this spec; the normative fixtures are SPEC section 4 (F1–F6), reproduced exactly in `test/calculator.test.mjs`.

## Allowed scope

All work is inside `tools/electricity-cost-calculator/` of the same repo. Nothing outside that directory was touched: no registry writes, no catalog changes, no other tool, spec or source snapshot was modified.

## What was built

- Pure core (`public/js/core/data.mjs`, `public/js/core/calculator.mjs`): all SPEC constants once, as auditable data (limits, precisions, currency minor units and symbols, `DATA_VERSION`); strict string validation with per-field error codes; exact BigInt-rational energy and money arithmetic — the only rounding is at display, half away from zero, per SPEC section 4. Deliberately no built-in tariff table: the user's own bill rate is the only rate source.
- Bilingual UI (`public/index.html` zh-Hant default, `public/en/index.html`): flat and tiered (2–3 band) modes, five currencies, tier breakdown table, tiered limitation note beside the result (hidden in flat mode), printed formulas and rounding note, prefilled worked example (SPEC F1). Label renders via `textContent` only.
- Scripts: reproducible preview build (`build:preview` → `dist/preview/`), generated-tree verification (`check:generated:preview`), static checks (`check`), loopback-only serve.
- Tests: `node --test` suites for fixtures F1–F6, tier edges, rounding discipline, every validation refusal in SPEC sections 2/4, page scaffolding, and build byte-identity.

## Mode and status

Build-first mode: this candidate was produced ahead of a registry production claim, pending independent bulk review. It is **not accepted, not published, not deployed**. The open PR is a draft against `codex/consolidate-20261109`.

## Next owner

An independent reviewer (not the author) reviews the fixed candidate commit against SPEC section 6's nine aspects, with the NOT_RUN items in `VERIFICATION.md` completed or kept as blocking NOT_RUN.
