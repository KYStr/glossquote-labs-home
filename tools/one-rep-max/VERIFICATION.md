# Verification: One-Rep Max Calculator （最大肌力 1RM 計算機）

## Fixed source under test

- Spec: `docs/specs/one-rep-max/` at candidate commit
  `1514f57f9f70d1812df91aaa0826795042567858` (draft PR
  https://github.com/KYStr/glossquote-labs-home/pull/148), spec task
  `labs-one-rep-max-spec-20261109`.
- Implementation base: `b7ffa5a133ac7a2b3221d0807e61c2c3faa48442`
  (`codex/initial-publication` tip at fetch time).
- The tests import a byte-identical vendored copy of the spec's
  fixtures.json at `test/fixtures.json` (SHA-256
  `b9f282ccb13579b4fdcfe5aa845b86de2d9aed559f782c068c3cf0375da3ca70`),
  because the spec PR is unmerged and `docs/specs/one-rep-max/` is
  absent from this checkout. Equality with the spec candidate's file
  was verified by hash before implementation began.

## Environment

- Node.js v24.22.1, Linux (build VM), no network access used by the
  tool.

## Commands and results

All gates ran in `tools/one-rep-max/` on 2026-11-09 and passed:

- `npm test` — **40/40 passed, 0 failed**: all 11 core fixtures and all
  3 controller fixtures from the spec's fixtures.json, plus 26
  hand-derived tests (1500 kg endpoint and 1500.01 overflow, 1500.00
  boundary, exact pound conversion at 1 rep — 100 lb → 45.4/45.5 and
  the never-pre-rounded 225 lb = 102.05828325 kg case, two-rep
  fractional weight, smallest weight 0.01, EMPTY/INPUT_LIMIT/UNICODE
  precedence, weight and reps grammar matrices, cross-field error
  order, schema variants including accessors, 0.5-step row invariants,
  one-decimal display formatting, page metadata, and the pinned
  bilingual message table through `messageFor`).
- `npm run check` — passed: required files, package contract
  (Node ≥24, ESM, zero dependencies, exact scripts), core constants
  (16 / 150000n / reps 1–30 / high-reps threshold 10), the pinned
  percentage–typical-reps table, the full bilingual error-message set
  (flat and field-specific), the no-export rule for this tool,
  fixtures identity (specId, 11 + 3 cases, first core case reproduced
  exactly), both pages' metadata and candidate rules (noindex, no
  canonical, no hreflang, relative language links, same-language home
  links, draft-loss note, pinned disclaimer / high-reps note / FAQ /
  control labels, element ids), the SPEC-pinned CSP string in the
  preview server, `node --check` syntax for every shipped script, the
  forbidden-capability scan, and core/controller purity.
- `npm run build:preview` run **twice** — `diff` of
  `BUILD-MANIFEST.json` and a recursive `diff -r` of `dist-preview/`
  (7 files) both clean: **byte-identical output**.
- `npm run check:generated:preview` — passed: dist file set, byte
  counts and SHA-256 match the manifest exactly; both pages carry the
  pinned metadata in the generated output; robots.txt denies all.
- Loopback HTTP probe of the built preview (`scripts/serve.mjs`,
  127.0.0.1, ephemeral-range port 43917): `GET /` → 200 with title
  「最大肌力 1RM 計算機｜Gloss Tools」; `GET /en/` → 200 with title
  "One-Rep Max Calculator | Gloss Tools"; `GET /nope` → 404; encoded
  path traversal → 404 (refused); `POST /` → 405; response headers
  carry exactly the SPEC-pinned CSP and
  `X-Robots-Tag: noindex, nofollow`.

## Independent cross-check

Before implementation, every success fixture was recomputed with an
independent exact-fraction script (Python `fractions`, written from
the SPEC's rules, not from the product code): all 7 success cases
matched the fixtures exactly, including the three 0.5-step ties
(57.25 → 57.5, 89.25 → 89.5, 26.75 → 27.0). The extra test
expectations above were derived with the same independent script.

## Spec-errata candidates

None found. All 14 fixtures follow from the SPEC's stated rules as
written (validation order, the reps = 1 definition, the crossover at
r = 10 where both multipliers equal 4/3, the exact pound conversion,
and the three pinned rounding points). No fixture-vs-rule conflict
was encountered.

## NOT_RUN

- Real-browser runs (Chrome/Edge) of the preview pages: this
  environment offers no isolated browser mechanism for the builder
  (NOT_RUN_USER_FOCUS_INCIDENT per the agent handbook). The loopback
  HTTP probe and `node --check` syntax gates ran instead; interactive
  behavior (form flow, focus-on-failed-submit, cancel, table
  rendering) is covered only by the core/controller unit tests, not by
  a real DOM.
- Real-device / touch checks, 200% zoom and reduced-motion visual
  checks, keyboard walk-through.
- Production HTTPS deployment and SEO surfaces: no production origin
  has been approved for this tool (the SPEC names
  https://one-rep-max.glossquote.com as unconfigured); the candidate
  intentionally carries noindex pages and no canonical/hreflang.
- Independent nine-aspect review and acceptance: not performed by the
  builder.
