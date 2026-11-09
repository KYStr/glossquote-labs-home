# Verification — Coffee Brew Ratio Calculator (build-first candidate)

Environment: Node v24.22.1, Linux, no dependencies installed (zero-dependency
tool). All commands run in `tools/coffee-brew-ratio/`. Sources: fixed spec
candidate `ea00dfbb1d076eb3eedd47e1f3d4afae204d578d` (spec task
`labs-coffee-brew-ratio-spec-20261109`, draft spec PR #145); implementation
base `codex/initial-publication` @ `b7ffa5a133ac7a2b3221d0807e61c2c3faa48442`.
The spec fixtures are vendored verbatim at `test/fixtures.json` because the
spec PR is not merged into the base branch.

## Commands and results

| Command | Result |
| --- | --- |
| `npm test` (`node --test`) | PASS — 34 tests, 0 fail |
| `npm run check` | PASS — files, package contract, core ranges/presets/defaults/example vs vendored fixtures, bilingual metadata, syntax incl. worker concatenation, forbidden-capability scan, core purity |
| `npm run build:preview` (run twice) | PASS — byte-identical: `BUILD-MANIFEST.json` unchanged between runs (diff clean) |
| `npm run check:generated:preview` | PASS — 9 files, hashes exact, bilingual metadata present, worker source matches fixed bytes |
| Loopback probe (`node scripts/serve.mjs --host 127.0.0.1 --port 43173 --dir dist-preview`) | PASS — see below |
| Embedded worker source executed in Node with a fake `self` | PASS — see below |

### npm test breakdown (34)

- `test/core.test.mjs`: the 9 literal core fixtures from fixtures.json,
  deep-equal against the product's `run` (dose/water solving, remainders
  0/1/2, boundaries, RANGE/DECIMAL_FORMAT/ENUM first errors); a structural
  invariant over every success fixture (4 steps, kinds bloom/pour/pour/
  pour, adds sum to the total, step 4 cumulative == total); hand-derived
  cases (dose 15 g @1:14 rem 0; water 1000 ml @1:12.5 rem 1; water 25 ml
  @1:20 solving to exactly 1.25 g → half-up 1.3; minimum dose/ratio with
  zero bloom); SCHEMA classes (null, array, missing, extra, wrong type,
  accessor); validation order across fields and within a field
  (INPUT_LIMIT → UNICODE → EMPTY → grammar → RANGE); grammar rejects;
  just-outside range edges for every bound; display formatting.
- `test/controller.test.mjs`: the 3 literal controller fixtures verbatim
  (state-dirty-error, state-cancel-late, state-replace-late) via a fake
  worker with controllable completion, plus edit-during-busy, run-while-
  busy replacement, cancel no-op, worker error → WORKER_ERROR,
  createWorker throw → WORKER_ERROR, loadExample (fills fixture case 1,
  waits for manual run), reset from success, edit from empty/error, and
  mode switch as a result-revoking draft edit.
- `test/site.test.mjs`: both pages' lang/title/description/h1, preview
  noindex, no canonical/hreflang, relative language link, same-language
  home link, draft-loss note, pinned FAQ answers, results heading, all
  control/error ids, all seven ratio presets, and no download affordance
  (the SPEC gives this tool no download artifact).

### Loopback probe

Served `dist-preview/` on 127.0.0.1:43173 (ephemeral, loopback only):

- `GET /` → 200, `<title>手沖咖啡沖煮比例｜Gloss Tools</title>`
- `GET /en/` → 200, `<title>Coffee Brew Ratio Calculator | Gloss Tools</title>`
- `GET /js/app.js`, `GET /js/worker-source.js`, `GET /styles/app.css` → 200
- `GET /robots.txt` → 200 (deny-all body)
- `GET /../../package.json` (path-as-is traversal) → 404
- `GET /nope.html` → 404

### Embedded worker source (Node harness)

Imported `WORKER_SOURCE` from the built `dist-preview/js/worker-source.js`,
wrote it to a temp module, installed a fake `self`, and invoked the
handler: the `water-solve-dose` snapshot (500 ml, 1:16, bloom 2) returned
generation 7 with doseGrams 31.3 and final cumulative 500; an over-range
snapshot returned the pinned RANGE/amount error. This exercises the exact
bytes the page turns into a module Worker; it does not replace a real
browser Worker check (still NOT_RUN below).

## Build manifest (preview)

`BUILD-MANIFEST.json` — 9 files. SHA-256 highlights:

- `index.html` — `9e68ff146ce005245308b2ec79d2d4d86d32c4f31ed0e3e9a02af717cec10e83`
- `en/index.html` — `4cf268a7529ed4bb5c60af581abb2c06584e44b3fa07972e211731564521fbc4`
- `js/core/brew.mjs` — `e0e43497fd16e35f71064ebfe79b916497cc507110beea326313eb85e19a1115`
- `js/worker-source.js` — `e1a0ca77ca7e632d005f1c68d664628fa93f5865f2b3114dfe04347f91dd86b6`
- `styles/app.css` — `41482d14dd064f55be5d33c3f43b9111b3ba4bd4812c6d6b1fd165b400d8f1a5`

## Spec errata candidates

None. Every literal fixture reproduces from the SPEC's stated integer
formulas, including the three remainder classes (rem 2 in
`dose-preset-15`, rem 1 in `pour-remainder-one`, rem 0 in
`water-custom-ratio`) and the pinned half-up case (`water-solve-dose`,
31.25 → 31.3).

## NOT_RUN (explicit)

- Real-browser (Chrome/Edge) rendering and interaction in both languages,
  including the live module Worker created from a Blob URL, keyboard-only
  flow, focus movement on error, 320 px reflow, real 200% zoom, reduced
  motion, and touch targets — no isolated browser mechanism was used.
- Measured contrast ratios and assistive-technology checks.
- Network/Storage observation in a real browser profile (zero-request,
  storage, cookie, service-worker checks).
- Real-device checks (phone on a counter, one-handed use).
- Production build (`--mode production` is refused: no approved origin),
  deployment, catalog integration, and the independent nine-aspect review
  (pending by design in build-first mode; all nine aspects remain null /
  NOT_RUN).

## Next owner

Independent reviewer, after the parent verifies the PR head. 
