# Period Cycle Calculator — production handoff

## Fixed source

- Spec: `spec-period-cycle-calculator-20261109`, fixed at candidate commit
  `3fc93c6c3501795ceafdb56f544f5be2d4d24718` in `KYStr/glossquote-labs-home`,
  path `docs/specs/period-cycle-calculator/` (BRIEF.md, SPEC.md,
  fixtures.json, AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/233
- The spec was authored build-first in this run; this production was built
  directly against that fixed candidate. No registry/coordination commands
  were run by the builder; registration and independent review are the
  parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `db4b1f43f318635fcab0132832940adf97f5140a` (fetched 2026-11-09).
- Scope of this candidate: only `tools/period-cycle-calculator/`.

## What was built

The calendar-method estimate exactly as the SPEC pins it: a fixed 14-day
luteal phase (ovulation = cycle start + cycle length − 14), a fertile
window of ovulation − 5 days through ovulation + 1 day inclusive, four
projected cycles (this one plus the next three), and the pinned bilingual
contraception/medical disclaimer shown permanently beside the results.

- `public/js/core/period.mjs` — pure validation (schema with accessor
  rejection; per-field INPUT_LIMIT → UNICODE → EMPTY → DATE_FORMAT /
  INTEGER_FORMAT → INVALID_DATE → RANGE in the fixed field order),
  integer Julian Day Number arithmetic only (Fliegel & Van Flandern
  forward, Richards inverse; no floating point, no host clock or
  timezone), the four-cycle projection, and the canonical report
  serializer for `period-cycle-report.json`.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  hint lines (21–35 / 1–10 days), error messages, the verbatim disclaimer,
  FAQ (including the disclosed FIGO 24–38 divergence), titles and
  descriptions; textContent/value only.
- `scripts/` — reproducible preview build (byte-identical across runs),
  static check, generated-output check, loopback-only serve.
- `test/` — core/controller/report tests. `test/fixtures.json` is a
  byte-identical vendored copy of the spec candidate's fixtures.json
  (SHA-256 in VERIFICATION.md) because the spec PR is not yet merged into
  the base branch, so the tests stay self-contained.

## Deviations from the SPEC

- The SPEC's implementation section names `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs` paths (the older template layout).
  This candidate follows the current handbook file contract
  (`public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`),
  which the run's brief mandates; the module split, responsibilities and
  worker architecture are otherwise exactly as the SPEC describes.
- No other deviations. No spec-errata candidates were found: every
  fixture expected value agrees with the SPEC's stated rules as
  implemented (all 7 successful fixtures were reproduced with an
  independent Python `datetime` calculation before any product code was
  written, and the 21–35-day acceptance range versus FIGO's 24–38 is a
  deliberate, disclosed SPEC decision, not an inconsistency).

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md).
