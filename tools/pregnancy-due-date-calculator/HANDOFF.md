# Handoff — Pregnancy Due Date Calculator (production candidate, build-first)

## What this is

A production candidate for the Pregnancy Due Date Calculator, built in
the consolidated layout of `KYStr/glossquote-labs-home` under
`tools/pregnancy-due-date-calculator/`. It implements the fixed
specification exactly: three dating modes (LMP with cycle adjustment,
conception, ultrasound) reducing to one estimated due date and one
implied day zero, gestational age as of today, trimester derivation
and calendar boundaries, the beyond-42-weeks note, and the permanent
bilingual not-medical-advice notice.

## Fixed spec source (do not edit)

- Repository: `KYStr/glossquote-labs-home`
- Commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (branch
  `codex/consolidate-20261109`, the consolidation baseline this
  candidate branches from)
- Paths: `docs/specs/pregnancy-due-date-calculator/SPEC.md`,
  `docs/specs/pregnancy-due-date-calculator/BRIEF.md`,
  `docs/specs/pregnancy-due-date-calculator/AUTHOR-CHECK.md`
- No fixtures.json exists for this spec; the normative fixtures are
  D1–D6 in SPEC section 4 and are reproduced literally in
  `test/due-date.test.mjs`.

## Allowed scope

Only `tools/pregnancy-due-date-calculator/` was created or modified.
Nothing else in the repository was touched; the coordination
registry was not written to.

## Mode and status

Build-first mode: the candidate is submitted for later independent
bulk review. It is **not accepted, not published, not deployed**.
No registry claim was made by this build; coordination and any
registry submission remain with the coordinator.

## How to verify

From this directory, on Node >= 24:

```sh
npm test                          # core + static suites
npm run check                     # static contract checks
npm run build:preview             # writes dist/ (byte-reproducible)
npm run check:generated:preview   # dist/ matches a fresh rebuild
node scripts/serve.mjs            # loopback preview on 127.0.0.1:4173
```

See VERIFICATION.md for the commands actually run, their results,
and the explicit NOT_RUN list.

## Next owner

Independent reviewer (not the author): score the nine aspects of
SPEC section 6 against the fixed candidate commit, with the
real-browser and real-device checks that are listed as NOT_RUN in
VERIFICATION.md.
