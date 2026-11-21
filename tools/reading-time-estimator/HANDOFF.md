# Reading Time Estimator — Handoff

Tool: `tools/reading-time-estimator/` — estimates silent-reading and
read-aloud time for Chinese, English or mixed text from pinned counting
rules and four adjustable speeds.

## Fixed source

- Spec ID: `spec-reading-time-estimator-20261109`
- Spec PR: https://github.com/KYStr/glossquote-labs-home/pull/254
  (OPEN; head `muse/spec-reading-time-estimator-20261109`,
  candidate commit `131cea60be513f3790bf3327930c6251fd622569`)
- Spec fixtures SHA-256:
  `dad1d90236dd961d76d8d33e1e5123ac895a799edb15d4d371b612df66d00bf4`
  (vendored verbatim as `test/fixtures.json`; `scripts/check.mjs`
  fails if the hash changes)
- Base commit (branch point): `c8ca5fd3bdfd3322891e58e42d710cc2ca4fe33a`
  (`codex/initial-publication` at build time)
- Branch: `muse/reading-time-estimator-production-20261109`

## Files changed (only `tools/reading-time-estimator/`)

```text
package.json
public/index.html
public/en/index.html
public/js/app.js
public/js/controller.mjs
public/js/worker-handler.mjs
public/js/core/reading-time.mjs
public/styles/reading-time.css
scripts/build.mjs
scripts/check.mjs
scripts/check-generated.mjs
scripts/serve.mjs
test/fixtures.json
test/reading-time-core.test.mjs
test/reading-time-controller.test.mjs
test/reading-time-report.test.mjs
dist-preview/ (generated preview, 9 files)
BUILD-MANIFEST.json
HANDOFF.md
VERIFICATION.md
```

## How each SPEC anchor was verified

- §3 counting: CJK counted per code point in the four pinned ranges;
  Latin words are whitespace-split tokens containing at least one ASCII
  letter or digit; one token may contribute to both counts. Verified by
  the 17 literal fixture cases plus hand-derived tests for mixed tokens
  (`中文abc` → 2 CJK + 1 word), NBSP/U+2028/U+2029/U+2003/U+3000 as
  separators, combining sequences (`e` + U+0301 → 0 CJK + 1 word), and
  CJK punctuation / full-width / kana / Hangul counting as zero.
- §3 time: exact BigInt rational seconds, rounded half-up exactly once
  on the total. Verified by `mixed-sum-rounding` (per-part rounding
  would give 2 s, the correct total is 1 s), `half-up-ties` (1.5 → 2,
  2.5 → 3, not banker's rounding), and `hours-format` (3600 s →
  `1:00:00`).
- §3 display: `M:SS` below one hour, `H:MM:SS` at or above; 3599 s →
  `59:59`, 3600 s → `1:00:00`, 36000 s → `10:00:00`.
- §3 validation: field order text → zhSilentRate → zhSpeakRate →
  enSilentRate → enSpeakRate; per field capacity → surrogate → empty
  → grammar → range. Verified by the 4 literal error fixtures plus
  hand-derived tests for the exact 100,000-unit text limit, each rate's
  lower bound 50 and own upper bound, 49 / upper+1 / 0 as RANGE, 9-unit
  rates as INPUT_LIMIT, grammar rejects (`-400`, `+400`, `400.0`,
  `4e2`, `0400`, `00`, full-width digits), lone surrogates as UNICODE,
  and the full SCHEMA gate (extra/missing/wrong-type/accessor/symbol).
- §3 serialization: the `zh-basic` report bytes are asserted exactly
  (`{"cjkChars":6,"latinWords":0,"silentDisplay":"0:01","silentSeconds":1,"speakDisplay":"0:02","speakSeconds":2}\n`)
  in `test/reading-time-report.test.mjs`, including key-order
  independence and the OUTPUT_LIMIT backstop.
- Controller cases: `state-dirty-error` (local RANGE on rerun, no
  second worker, old result revoked on edit), `state-cancel-late`
  (cancel keeps the draft, the late success never revives, reset
  restores defaults), `state-replace-late` (a newer local error is not
  replaced by an older late success). All three pass verbatim from
  `test/fixtures.json`.
- Independent recheck: before writing the core, all 17 core fixture
  expectations were recomputed with an independent Python script
  (exact `Fraction` arithmetic, half-up only on the total, SPEC
  whitespace set and CJK ranges transcribed separately): 17/17 match.
  No fixture disagreed with the SPEC text.

## Deliberate deviations from the sibling template

- No persistent storage anywhere. The SPEC forbids persistent storage
  for this tool ("資料只保留在目前頁面草稿", "禁 … 持久 storage"),
  so the controller takes no storage adapter, `app.js` never touches
  storage, and `scripts/check.mjs` treats storage tokens as forbidden
  in every shipped file.
- No production canonical, hreflang, or absolute URLs in the preview
  pages (SPEC: "無 production canonical、hreflang 或 sitemap"; the
  planned origin https://reading-time-estimator.glossquote.com is not
  yet configured). `scripts/check.mjs` and
  `scripts/check-generated.mjs` assert their absence and that the
  pages contain zero `https://` URLs. Language and home links are
  relative paths only; the home links use `../../` (zh) and
  `../../en/` (en).
- Controller states follow the SPEC's own table
  (empty/dirty/busy/success/error/cancelled) with a real Cancel
  button during `busy`; a Worker failure is `error` with
  `WORKER_ERROR`, not a separate `unavailable` state.

## Errata candidates

None. All 17 core fixture expectations agree with the SPEC normative
text under independent recomputation, and the 3 controller fixtures
agree with the SPEC state table.

## Known limitations (pinned by the SPEC, disclosed in the UI)

- Japanese kana (U+3040–U+30FF) and Korean syllables (U+AC00–U+D7AF)
  count as zero, as do CJK punctuation (U+3000–U+303F) and full-width
  characters (U+FF00–U+FF60). The FAQ and the details disclosure say
  so, and a zero-count result shows an explanatory note.
- Speaking time is an estimate from average rates; it cannot guarantee
  a recording length, and the tool never plays audio.
- The four default speeds are adjustable conventions inside commonly
  published ranges, not constants of nature; the pages say so next to
  each speed field and in the FAQ.

## Next owner

Independent reviewer: verify this same candidate commit against the
nine acceptance aspects in SPEC.md. Real-browser, Network/Storage,
accessibility and formal HTTPS/SEO checks are NOT_RUN (see
VERIFICATION.md). Do not merge, publish, or register this tool; the
draft PR is for review only.
