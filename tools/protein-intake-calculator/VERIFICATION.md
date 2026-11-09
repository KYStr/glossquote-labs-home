# Verification — Protein Intake Calculator (build-first candidate)

Environment: Node v24.22.1, Linux, no dependencies installed
(zero-dependency tool). All commands run in
`tools/protein-intake-calculator/`. Sources: fixed spec candidate
`6493df72ecb2c7a583d836fdcb9731b550168b40` (spec task
`labs-protein-intake-calculator-spec-20261109`, draft spec PR #150);
implementation base `codex/initial-publication` @
`b7ffa5a133ac7a2b3221d0807e61c2c3faa48442`. The spec fixtures are
vendored verbatim at `test/fixtures.json` (SHA-256
`12cfee6a2277f56f1c1f406c92401b7a884ecc8cd47e4cba90455a1a98a0c24c`,
byte-identical to the spec candidate's file) because the spec PR is not
merged into the base branch.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 39 tests, 0 fail |
| `npm run check` | PASS — files, package contract, core fields/factors/ranges/defaults/example vs vendored fixtures, report contract, bilingual metadata, syntax incl. worker concatenation, forbidden-capability scan, core purity |
| `npm run build:preview` (run twice) | PASS — byte-identical: `BUILD-MANIFEST.json` and the full per-file SHA-256 tree unchanged between runs |
| `npm run check:generated:preview` | PASS — 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes |
| Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 43217 --dir dist-preview`) | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown (39)

- `test/core.test.mjs` (21): the 9 literal core fixtures from
  fixtures.json, deep-equal against the product's `run` (strength
  example, remainders 1 and 2, the pinned half-up case 137.5 → 138,
  min-weight boundary, RANGE/DECIMAL_FORMAT/EMPTY/ENUM first errors); a
  structural invariant over every success fixture (low ≤ daily ≤ high,
  per-meal length, per-meal sum == daily); hand-derived cases (maximum
  weight 300.0 with maximum custom factor 4.0; custom factor 0.1
  clamping the range low to 0; factor normalization `"2"` → `"2.0"`; a
  non-custom goal ignoring a garbage customFactor value entirely; the
  16-unit `regular-exercise` code validating despite the 8-unit
  weight capacity; maximum weight boundary); SCHEMA classes (null,
  array, missing, extra, wrong type, accessor); validation order across
  fields and within a field (INPUT_LIMIT → UNICODE → EMPTY → grammar →
  RANGE); grammar rejects; just-outside range edges for every bound.
- `test/controller.test.mjs` (12): the 3 literal controller fixtures
  verbatim (state-dirty-error, state-cancel-late, state-replace-late)
  via a fake worker with controllable completion, plus edit-during-busy,
  run-while-busy replacement, cancel no-op, worker error →
  WORKER_ERROR, createWorker throw → WORKER_ERROR, loadExample (fills
  fixture case 1, waits for manual run), reset from success, edit from
  empty/error, and a goal switch as a report-revoking draft edit.
- `test/report.test.mjs` (4): report bytes and SHA-256 against literal
  expectations written from the SPEC (sorted keys, compact, one LF, no
  BOM) for the strength-example and min-weight results, a live-run
  integration check against the same literal, and refusal of non-plain
  results.
- `test/site.test.mjs` (2): both pages' lang/title/description/h1,
  preview noindex, no canonical/hreflang, relative language link,
  same-language home link, draft-loss note, the pinned nutrition
  disclaimer verbatim, pinned FAQ answers, results heading, all
  control/error ids, all seven goal options, and the download button.

### Loopback probe

Served `dist-preview/` on 127.0.0.1:43217 (ephemeral, loopback only):

- `GET /` → 200, `<title>蛋白質攝取量計算機｜Gloss Tools</title>`,
  CSP + `X-Robots-Tag: noindex, nofollow` present
- `GET /en/` → 200, `<title>Protein Intake Calculator | Gloss Tools</title>`
- `GET /js/app.js`, `GET /js/worker-source.js`, `GET /styles/app.css`,
  `GET /robots.txt` → 200
- `GET /nope.html` → 404
- `GET /%2e%2e%2fpackage.json` (encoded traversal) → 403

### Embedded worker source (Node harness)

Imported `WORKER_SOURCE` from the built `dist-preview/js/worker-source.js`,
wrote it to a temp module, installed a fake `self`, and invoked the
handler: the strength-example snapshot returned generation 7 with the
exact fixture result (112 g, 98–126, [28,28,28,28]); an over-range
snapshot returned the pinned RANGE/weight error. This exercises the
exact bytes the page turns into a module Worker; it does not replace a
real browser Worker check (still NOT_RUN below).

## Build manifest (preview)

`BUILD-MANIFEST.json` — 9 files. SHA-256 highlights:

- `index.html` — `c0cd24d0330e1fd7134b03bd45cf0cbeb30fb4aa2bd350ca3307f6fd88e3c78f`
- `en/index.html` — `0ddce4c2e78fc6dccca24ed36081fa4f9682444597101d21a007513b3a1754b1`
- `js/core/protein.mjs` — `63648a8427f44bcd14ae6728099657fe5232e8f38886ad955dc0a7cba3a5a9ca`
- `js/worker-source.js` — `9bac1a77103ad00b881a0d2876d9be846c071f666ce79b498bf34fda3f191b95`
- `styles/app.css` — `7d394e56111112d7e4bf1bf637997a5e4934593450c317ef8161489e3b91d237`

## Spec errata candidates

One minor candidate: the SPEC's generic per-field validation order
lists INPUT_LIMIT first for every field, but the 8-unit capacity is
pinned only in the `weight` field definition (customFactor inherits it
via "same grammar as weight"). An 8-unit capacity on `goal` would
reject the SPEC's own valid code `regular-exercise` (16 UTF-16 units),
so the capacity is enforced for weight and customFactor only, and
goal/meals validate UNICODE → EMPTY → ENUM. No literal fixture
conflicts with the SPEC's stated rules.

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both
  languages, including the live module Worker created from a Blob URL,
  the native download dialog, keyboard-only flow, focus movement on
  error, 320 px reflow, real 200% zoom, reduced motion, and touch
  targets — no isolated browser mechanism was used.
- Measured contrast ratios and assistive-technology checks.
- Network/Storage observation in a real browser profile (zero-request,
  storage, cookie, service-worker checks).
- Real-device checks.
- Production build (`--mode production` is refused: no approved
  origin), deployment, catalog integration, and the independent
  nine-aspect review (pending by design in build-first mode; all nine
  aspects remain null / NOT_RUN).

## Next owner

Independent reviewer, after the parent verifies the PR head.
