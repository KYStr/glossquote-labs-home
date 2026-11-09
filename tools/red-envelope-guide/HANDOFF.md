# Red Envelope Guide — production handoff

## Fixed source

- Spec task: `labs-red-envelope-guide-spec-20261109`
- Spec: `spec-red-envelope-guide-20261109`, fixed at candidate commit
  `131169738d7f451345fd13d88dc0f81866a648c4` in `KYStr/glossquote-labs-home`,
  path `docs/specs/red-envelope-guide/` (BRIEF.md, SPEC.md, fixtures.json,
  AUTHOR-CHECK.md). Draft spec PR:
  https://github.com/KYStr/glossquote-labs-home/pull/160
- The spec was authored build-first in this run; this production was built
  directly against that fixed candidate. No registry/coordination commands
  were run by the builder; registration and independent review are the
  parent coordinator's steps.
- Production base: `codex/initial-publication` at
  `6a56a115e6bbc1208712c74c855906ce3729e2e3` (fetched 2026-11-09).
- Scope of this candidate: only `tools/red-envelope-guide/`.

## What was built

Five-occasion red-envelope lookup exactly as the SPEC pins it: the fixed
market tables （婚禮 12 格、彌月 4、喬遷 4、長輩 3 階段、晚輩 5 年齡帶）,
the exact validity predicate (multiple of 100, no digit 4 anywhere, the
hundreds/thousands-tail rule), integer-only snap alignment with ties up,
the wedding per-tier extra-attendee increment, and the not-attending 60%
scaling via `⌊(6x + 5) / 10⌋`.

- `public/js/core/red-envelope.mjs` — pure validation (schema with
  accessor rejection; per-field TYPE → INPUT_LIMIT → UNICODE →
  ENUM/INTEGER_FORMAT/RANGE; applicability EMPTY/NOT_APPLICABLE in the
  fixed field order; the wedding consistency rule last), the tables, the
  predicate and snap functions (midpoint compared on the doubled scale,
  never rounded first), display formatting, and the canonical report
  serializer.
- `public/js/controller.mjs` — draft/generation state machine
  (empty/dirty/busy/success/error/cancelled) over an injected worker
  factory; late replies are dropped by generation and state.
- `public/js/worker-handler.mjs` — fixed worker fragment; the preview
  build concatenates core + handler into the embedded worker source, and
  the page runs it as a module Worker from a Blob URL.
- `public/js/app.js` + two static pages (`public/index.html`,
  `public/en/index.html`) — bilingual UI with the SPEC-pinned labels,
  error messages, note texts, FAQ, titles and descriptions;
  textContent/value only. Non-applicable fields are disabled per occasion.
- `scripts/` — reproducible preview build (byte-identical across runs),
  static check, generated-output check, loopback-only serve.
- `test/` — core/controller/report tests. `test/fixtures.json` is a
  byte-identical vendored copy of the spec candidate's fixtures.json
  (SHA-256 in VERIFICATION.md) because the spec PR is not yet merged into
  the default branch, so the tests stay self-contained.

## Spec-errata candidate (important — read before reviewing)

The SPEC's normative validity predicate (§inputsOutputs rule 2: an
amount's decimal string must not contain the digit `4`) makes **every**
4xxx amount invalid. Five fixture expectations instead treat NT$4,200 and
NT$4,600 as valid, while the same fixtures treat NT$4,000 and NT$4,800 as
invalid (the `wedding-avoid-four` purpose text says so explicitly). No
consistent reading satisfies both sides: a hundreds-digit-only reading
would make 4,000 and 4,800 valid, contradicting that fixture's stated
range. Following the build rule (the SPEC's stated rule wins over a
conflicting fixture), this implementation follows the predicate verbatim;
the five cases are asserted in `test/core.test.mjs` against rule-derived
values, and the exact deltas are listed in VERIFICATION.md. The SPEC's
§tests prose for `wedding-avoid-four` repeats the same assumption
(snapUp(4,000) = 4,200), so the inconsistency is internal to the SPEC
document set, not an implementation choice. Everything else — the other
four success fixtures, all four error fixtures, all three controller
fixtures — reproduces verbatim.

## Other deviations / interpretations

- The SPEC's implementation section names `src/core.mjs` /
  `src/controller.mjs` / `src/app.mjs` paths (the older template layout).
  This candidate follows the current handbook file contract
  (`public/js/core/`, `public/js/controller.mjs`, `public/js/app.js`),
  which the run's brief mandates; the module split, responsibilities and
  worker architecture are otherwise exactly as the SPEC describes.
- UI occasion switching: the SPEC says non-applicable fields are disabled
  and keep their values, with the core enforcing the matrix. To keep the
  form runnable after a switch, the app normalizes non-applicable draft
  fields to their neutral values (null / true / `"1"`) at switch time and
  disables the controls; core validation is unchanged and still rejects
  programmatic input that carries non-applicable values (the
  `error-full-month-tier-set` fixture and NOT_APPLICABLE tests prove it).

## Next owner

Independent reviewer (not the author) against the fixed candidate commit
of the production PR: the nine predeclared aspects from the SPEC's
acceptance section, with real-browser evidence still NOT_RUN (see
VERIFICATION.md). The spec-errata candidate above also needs a spec-side
decision (fix the predicate or fix the five fixtures) from the spec
reviewer/coordinator.
