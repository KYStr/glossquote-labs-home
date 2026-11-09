# Verification — Overtime Pay Calculator

Environment: Node v24.22.1, Linux VM, 2026-11-09. All commands run inside
`tools/overtime-pay-calculator/`. Product acceptance checks (the SPEC's
nine aspects) remain NOT_RUN for an independent reviewer; the items below
are the builder's own runs.

## Commands and results

- `npm test` (`node --test`): **37 tests, 37 pass, 0 fail.** Suites:
  `test/core.test.mjs` (all 13 literal core fixtures from the vendored
  fixtures.json, deep-compared, plus boundary/validation-order/schema/
  hostile-input cases), `test/controller.test.mjs` (the 3 controller
  fixtures driven by a controllable fake Worker, plus
  generation/worker-failure cases), `test/report.test.mjs` (canonical
  serialization checked against a hand-written literal with matching
  SHA-256, and the OUTPUT_LIMIT branch).
- `npm run check`: **passed** (files, package contract, core
  limits/ranges/defaults/example, pages, syntax, worker concatenation,
  capability scan, core purity).
- `npm run build:preview` twice: **byte-identical** — BUILD-MANIFEST.json
  SHA-256 `be95bbe1ac4abf91d847778a7b7947143eef522fbc08592d0dc4aaa4eeda6600`
  in both runs; 9 files in dist-preview/.
- `npm run check:generated:preview`: **passed** (manifest set, byte
  counts, and SHA-256 exact; bilingual metadata present; worker source
  matches the fixed core + handler bytes; robots.txt denies all).
- Loopback HTTP probe of the built preview (port 49317): **passed** —
  `GET /` 200 with title「加班費計算機｜Gloss Tools」, `GET /en/` 200 with
  title "Overtime Pay Calculator | Gloss Tools", unknown path 404,
  path traversal refused (404), and the SPEC's CSP /
  X-Robots-Tag: noindex, nofollow / nosniff headers present.

## Explicit NOT_RUN list

- Real-browser evidence (Chrome/Edge): example load, typed input,
  error flow, edit-after-success, cancel, reset, Blob download byte
  comparison — NOT_RUN (no isolated browser in the builder environment;
  the loopback HTTP probe only fetches static bytes).
- Real-device / mobile checks, 200% zoom, reduced-motion, screen-reader
  passes — NOT_RUN.
- Network/Storage isolation audit in a clean browser profile (zero
  work requests, storage, console) — NOT_RUN. Static guarantees instead:
  the check script scans shipped sources for forbidden capabilities and
  verifies core purity; the serve script emits the SPEC's CSP.
- Production build, canonical/hreflang/sitemap, production origin
  (`overtime-pay-calculator.glossquote.com` is unconfigured) — NOT_RUN /
  refused by the build script.
- Independent nine-aspect acceptance review — NOT_RUN (reviewer's job,
  on this same fixed head).

## Spec-errata candidates

Recorded in full in HANDOFF.md: (1) the 46/46.5 countedOtHours capNote
boundary the SPEC §tests asks to verify is unreachable under the SPEC's
own pinned field caps (maximum reachable countedOtHours is 20); the
pinned ranges, formula, and threshold are implemented exactly as
written. (2) §implementation's `src/` paths vs the handbook's
`public/js/core/` layout (handbook followed, no behavior difference).
