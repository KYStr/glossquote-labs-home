# Verification — Child Height Predictor

Environment: Node v24.22.1 (Linux), zero dependencies, tool directory
`tools/child-height-predictor/`. All commands run 2026-11-21 by the builder.
Production base `codex/initial-publication` @
`c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`, verified as the fresh
`FETCH_HEAD` before building.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 47/47 tests |
| `npm run check` (`node scripts/check.mjs`) | PASS — all static checks |
| `npm run build:preview` (run twice) | PASS — preview written to `dist-preview/` both times; the two `dist-preview/` trees and the two `BUILD-MANIFEST.json` files are byte-identical |
| `npm run check:generated:preview` | PASS — dist-preview matches a fresh build byte for byte (7 files); BUILD-MANIFEST.json matches dist-preview (7 files) |
| Loopback HTTP probe of `dist-preview` via `scripts/serve.mjs` (ephemeral port 32799) + curl | PASS — `GET /` 200 `text/html` with `<title>兒童身高預測｜Gloss Tools</title>`; `GET /en/` 200 with `<title>Child Height Predictor \| Gloss Tools</title>`; `GET /styles/app.css` 200 `text/css`; missing file 404; CSP includes `worker-src blob:`, `X-Robots-Tag: noindex, nofollow` |

## Test breakdown (47)

- Core fixtures: all 14 SPEC core cases deep-equal (6 success, 8 errors;
  first-error-wins, field pointers, INPUT_LIMIT-before-grammar,
  SCHEMA with field null).
- Core rules derived by hand from the SPEC, never from the core's output:
  100.0/230.0 endpoints legal, 99.9/230.1 RANGE (plus grammar-valid `0`
  → RANGE); grammar accept/reject set (`178`, `172.5` valid; `.5`, `5.`,
  `0175`, `007`, `178.55`, `+178`, `-178`, `1e3`, spaces, `178,5` invalid);
  half-up tie hand-computed (170.0/160.5 boy → 171.8, 163.3–180.3);
  invariants boy−girl = 13.0 and rounded range width = 17.0 on four
  parent pairs; SCHEMA for wrong types / missing / extra field / accessor
  property; validation order (INPUT_LIMIT before UNICODE/grammar,
  father before mother, ENUM after both heights). All six success
  fixtures were additionally re-derived with independent exact Fraction
  arithmetic before the core was written (6/6 agree).
- Controller fixtures: all 3 SPEC state cases (dirty→error invalidation,
  cancel + late-result rejection + reset, replace + older-late rejection),
  plus edit-during-busy termination.
- Report: byte-exact serialization for boy-typical and girl-same-parents
  (sorted keys, trailing LF, no BOM), SHA-256 of the bytes matches the
  hash of the literal expected text, recursive key sorting with array
  order preserved.
- Pages: both languages' lang/title/H1/description, the fixed disclaimer
  in full on both pages, the four SPEC FAQs on both pages, noindex, no
  canonical or hreflang in the candidate, no external assets,
  same-language `../../` home links, full control set and status semantics.
- Build: two builds byte-identical (sorted SHA-256 lists equal and
  BUILD-MANIFEST.json byte-identical); Worker token replaced; the
  embedded Worker source driven end to end through a `self` shim returns
  the fixture-exact outcome for boy 178/165.
- App (fake DOM, built app): default example renders the exact success
  sentence and values with the disclaimer, Worker terminated after
  delivery, late results/errors ignored; empty-field failure associates
  the field (`aria-invalid`/`aria-errormessage`) and focuses it; Worker
  onerror/construct/post failures settle to WORKER_ERROR and can run
  again; reset/cancel/edit invalidate and ignore late results; old
  Worker results cannot disturb the new Worker; zh-Hant app renders the
  same completed result with the zh disclaimer.
- Serve: real HTTP on an ephemeral loopback port — both pages 200 with
  titles, CSS MIME, CSP includes `worker-src blob:`, `X-Robots-Tag`
  noindex, 404, `..%2f` traversal rejected with 404 (test) and missing
  file 404 (curl probe).

## Spec errata candidates

None. Every fixture value follows from the SPEC's stated rules; no
fixture-versus-rule conflict was found.

## Execution-risk notice during this build

While running `git fetch origin codex/initial-publication`, the runtime
flagged the command output with an execution-risk notice. The builder
continued only the already-authorized clone/build/push steps, per the
task's authorization clause: the user had confirmed on 2026-11-21 15:45,
with knowledge of the earlier identical notice, that the remaining 24
productions (including this one) should proceed. No different prompt
appeared and no step outside clone/build/push was taken.

## NOT_RUN (still open for the independent reviewer)

- Real-browser evidence (isolated Chrome and Edge, both languages):
  example load, typing, error focus, edit-after-success, sex switch,
  cancel, reset, real Blob download byte check.
- Accessibility in a real browser: keyboard order, visible focus, 200%
  zoom, 320 CSS px reflow, reduced motion, contrast measurement, touch
  target measurement.
- Network/Storage observation in a clean browser profile (zero work
  requests, storage/URL/console inspection) and offline-after-load use.
- Real-device / mobile checks.
- Production HTTPS/SEO gate: self-canonical pair, reciprocal hreflang,
  sitemap, robots.txt and the planned origin
  `https://child-height-predictor.glossquote.com` (not configured).
- Native OS download dialog handling (manual only).

Product checks remain NOT_RUN; the nine acceptance aspects are unscored
(null) pending independent review of this candidate.
