# Group Generator — Handoff

Tool: `tools/group-generator/` — paste a name list, choose a group count
or a group size, and deal everyone into balanced groups with a
reproducible seeded (mulberry32) shuffle.

## Fixed source

- Spec ID: `spec-group-generator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/256
  (candidate commit `93c1a8a8b12930270b611850a6b85007da4f5c4d`)
- Spec fixtures SHA-256:
  `51fd1ac04063da885fde5ebf4a287599283cca837de03d3075ca92f60ce976fb`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/group-generator-production-20261109`

## Files changed (only `tools/group-generator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/group-generator.mjs
public/styles/group-generator.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/group-generator-core.test.mjs
test/group-generator-controller.test.mjs
test/group-generator-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §3 worked anchors: `basic-count` (8 names, seed 42, 3/3/2),
  `trace-five` (hand shuffle trace), `balance-ten-three` (4/3/3,
  larger groups first), `size-mode-balanced` (4/3/3, balanced not
  chunked) and `size-single-group` are literal fixture cases in
  `test/group-generator-core.test.mjs`; all 17 core cases and all 3
  controller cases pass verbatim from `test/fixtures.json`.
- §3 PRNG: mulberry32 first 8 draws for seed 42 match the
  AUTHOR-CHECK integer table
  (2581720956, 1925393290, 3661312704, 2876485805, 750819978,
  2261697747, 1173505300, 2683257857), asserted in the core tests and
  in `scripts/check.mjs`; the constant is the single definition
  `PRNG_INCREMENT = 0x6D2B79F5`, bit-for-bit the
  lottery-number-picker pinned constant. All 10 success fixtures were
  also recomputed with an independent Python integer implementation
  before building (all matched, including the `state-unseeded-fill`
  seed 20261109 result).
- §3 serialization: the `basic-count` report bytes are asserted
  exactly in `test/group-generator-report.test.mjs`
  (`{"groupCount":3,"groups":[{"members":["黃小芬","劉小玉","吳阿國"],"number":1,"size":3},...],"mode":"count","seed":42,"totalNames":8}\n`),
  including key-order independence and the OUTPUT_LIMIT backstop;
  the zh-Hant and English text lists are asserted byte-exact
  (headings, the singular `1 member` form, exactly one blank line
  between groups, no trailing LF).
- Controller cases: `state-unseeded-fill` (fillSeed stub 20261109,
  seed field filled and shown, rerun identical),
  `state-dirty-error` (edit invalidates the old result, rerun gives
  EMPTY) and `state-cancel-late` (late result never resurrects,
  reset restores the defaults) pass verbatim from the fixtures.
- Boundaries (hand-derived, in the core tests): raw 32768/32769
  units, name 40/41 units, N=500 success (72/72/72/71/71/71/71
  for K=7) and 501 ROW_LIMIT row 501, K=N and K=1, seed 10/11
  units, groupCount 501 RANGE, lone-surrogate UNICODE with row,
  inactive-field capacity precedence, schema rejections
  (missing/extra/wrong-type/accessor).

## Spec-errata candidates

None. The SPEC normative text and all 20 fixtures agree: the 10
success core fixtures and the controller fill case were recomputed
independently (Python integer arithmetic) and match exactly. The
AUTHOR-CHECK note about the placeholder-text-generator spec's
"truncated" wording concerns that other document's display wording,
not this spec, and does not affect this tool.

## Known limitations

- Real-browser and real-device checks are NOT_RUN (see
  VERIFICATION.md): no isolated-browser mechanism is available to
  this builder. The Worker path is exercised in Node through the
  controller with a controllable fake worker; the page CSP meta
  carries `worker-src blob:` as the SPEC pins, so the blob-URL
  module Worker is permitted by the page's own policy, but that
  interaction is still unproven in a real browser.
- The seed-fill failure path (platform entropy unavailable) is
  covered in the controller tests with a stub; the real-browser
  message is the pinned string in the app.
- No persistence by design: the SPEC pins the draft to the current
  page only, so there is no localStorage/sessionStorage use anywhere
  in this tool; leaving the page discards the draft.

## Next owner

Independent reviewer: verify this candidate commit against the nine
SPEC §6 aspects, then the coordinator owns registry submission,
merge, publish and deploy. Do not merge or publish from this branch.
