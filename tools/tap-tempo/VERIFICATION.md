# Verification: Tap Tempo （點按節拍 BPM 偵測）

## Fixed source under test

- Spec: `docs/specs/tap-tempo/` at candidate commit
  `c4383d24d8bf188d22e75a021ac50cdcf0bff3fe` (draft PR
  https://github.com/KYStr/glossquote-labs-home/pull/162), spec task
  `labs-tap-tempo-spec-20261109`.
- Implementation base: `40b82fed10d2a68e9b93caf2c6a203850e2fd4cc`
  (`codex/initial-publication` tip at fetch time).
- The tests import a byte-identical vendored copy of the spec's
  fixtures.json at `test/fixtures.json` (SHA-256
  `d4db571e5137c721a2922d265e6a215fe575ad6afd2b95f984a71574d1e84a31`),
  because the spec PR is unmerged and `docs/specs/tap-tempo/` is absent
  from this checkout. Equality with the spec candidate's file was
  verified by hash before implementation began.

## Environment

- Node.js v24.22.1, Linux (build VM), no network access used by the tool.

## Commands and results

All gates ran in `tools/tap-tempo/` on 2026-11-09 and passed:

- `npm test` — **47/47 passed, 0 failed**: all 17 core fixtures and all
  4 controller fixtures from the spec's fixtures.json, plus 26
  hand-derived tests (reset boundaries at 1999/2000/2001 ms, multiple
  resets, window order, 512-tap cap, RANGE before NON_MONOTONIC on the
  same element, schema variants including accessors, import-text error
  rows, display-string formats, canonical report bytes, OUTPUT_LIMIT).
- `npm run check` — passed: required files, package contract
  (Node ≥24, ESM, zero dependencies, exact scripts), core constants
  (512 / 10^13 / 2000 / 8 / 16, report name and byte limit), the seven
  pinned bilingual error messages, fixtures identity (specId, 17 + 4
  cases, first core case reproduced exactly), both pages' metadata and
  candidate rules (noindex, no canonical, no hreflang, relative language
  links, same-language home links, draft-loss note, both FAQs, element
  ids), the SPEC-pinned CSP string in the preview server, `node --check`
  syntax for every shipped script, the forbidden-capability scan, and
  core/controller purity.
- `npm run build:preview` run **twice** — `diff` of `BUILD-MANIFEST.json`
  and a recursive `diff -r` of `dist-preview/` (7 files) both clean:
  **byte-identical output**.
- `npm run check:generated:preview` — passed: dist file set, byte counts
  and SHA-256 match the manifest exactly; both pages carry the pinned
  metadata in the generated output; robots.txt denies all.
- Loopback HTTP probe of the built preview (`scripts/serve.mjs`,
  127.0.0.1): `GET /` → 200 with title
  「點按節拍 BPM 偵測｜Gloss Tools」; `GET /en/` → 200 with title
  "Tap Tempo — BPM Detector | Gloss Tools"; `GET /nope` → 404; encoded
  path traversal → 403; `POST /` → 405; response headers carry exactly
  the SPEC-pinned CSP and `X-Robots-Tag: noindex, nofollow`.

## Spec-errata candidates

None found. All 21 fixtures were hand-traced against the SPEC's stated
rules before implementation (median/mean rounding ties, the 2000 ms
reset boundary, the window rule, validation order, controller
checkpoints) and every expected value follows from the rules as written.
The rounding formula in SPEC §4 was additionally spot-checked by
independent hand computation (e.g. interval 680 ms → BPM 88.2; mean
500.25 ms → display 500.3 with bpmMean 119.9 from the exact mean).

## NOT_RUN

- Real-browser runs (Chrome/Edge/Firefox) of the preview pages: this
  environment offers no isolated browser mechanism for the builder
  (NOT_RUN_USER_FOCUS_INCIDENT per the agent handbook). The loopback
  HTTP probe and `node --check` syntax gates ran instead; interactive
  behavior (pointer tap capture, live announcement, Blob download) is
  covered only by the core/controller unit tests, not by a real DOM.
- Real-device / touch checks, 200% zoom and reduced-motion visual
  checks.
- Production HTTPS deployment and SEO surfaces: no production origin
  has been approved for this tool (§2 of the SPEC); the candidate
  intentionally carries noindex pages and no canonical/hreflang.
- Native download-dialog behavior of `tap-tempo-report.json` (the
  serialization bytes are unit-tested; the OS dialog is not).
