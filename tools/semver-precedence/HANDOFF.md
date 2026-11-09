# SemVer Precedence Comparison — Handoff

## Fixed sources

- Repo: `KYStr/glossquote-labs-home`
- Base branch: `codex/initial-publication`
- Base commit: `8941a010da5722f0b4690487938c4e32d2a2587f`
- Spec: `docs/specs/semver-precedence/SPEC.md` (spec `spec-semver-precedence-20261109`, v1)
- Brief: `docs/specs/semver-precedence/BRIEF.md`
- Fixtures: `docs/specs/semver-precedence/fixtures.json` (9 core + 3 controller cases)
- Author check: `docs/specs/semver-precedence/AUTHOR-CHECK.md`
- Design tokens: `docs/TOOL-DESIGN-BASELINE.md`
- Implementation contract: `docs/IMPLEMENTATION-CHECKLIST.md`, `docs/SOURCE-LAYOUT.md`

## Registry

- Task: `labs-prod-semver-precedence-20261109`
- Claim: `muse-main-claim-semver-precedence-20261109T075001Z-w2`
  (claimed by the parent actor; workMayStart verified by the parent.
  This builder ran **no** coordination/registry commands.)
- The parent submits this candidate to the registry after verifying the PR.

## Allowed scope

`tools/semver-precedence/` only. Nothing outside it was touched.

## What was built

SemVer 2.0.0 precedence comparison for one version pair, exactly per the
SPEC:

- `public/js/core/semver.mjs` — pure `run({ left, right })`, `parseVersion`,
  `compareParsed`, `canonicalJson`, `serializeReport`. Manual (regex-free)
  parsing so a trailing LF can never be silently accepted by a `$` anchor;
  validation order per field: EMPTY, INPUT_LIMIT (256 UTF-16 units),
  UNICODE (unpaired surrogate), SEMVER_SYNTAX, IDENTIFIER_LIMIT (core
  fields 32 digits; prerelease/build 16 identifiers of at most 32 chars);
  left fully validated before right; comparison by canonical digit-string
  length then ASCII (exact beyond 2^53); build metadata ignored.
- `public/js/controller.mjs` — empty/dirty/busy/success/error/cancelled
  state machine. Work runs in a Worker; every run bumps a generation and
  only replies matching the live generation while busy are accepted, so
  late replies can never revive a result. Editing, cancelling, resetting,
  or starting a new run terminates the old worker.
- `public/js/worker-source.mjs` — **generated** by `scripts/build.mjs`
  from the core source embedded verbatim plus a fixed onmessage handler.
  The page creates a module Worker from this string via a Blob URL (no
  fetch). `check.mjs` verifies the committed file matches a fresh
  regeneration.
- `public/index.html` / `public/en/index.html` — independent bilingual
  pages (zh-Hant / en) with the SPEC's exact titles, descriptions, H1,
  FAQ, and limits; preview noindex; relative self-canonical and
  hreflang (zh-Hant/en/x-default); same-language home links.
- `public/js/app.js` — DOM wiring with textContent/value only; result
  summary, deciding identifier, field-by-field breakdown table, and
  `semver-precedence-report.json` download (Blob URL revoked within
  30 s or on invalidation; bfcache return resets).
- `scripts/build.mjs` (`--mode preview` → `dist-preview/` + manifest),
  `scripts/check.mjs`, `scripts/check-generated.mjs`, `scripts/serve.mjs`
  (loopback-only; CSP exactly as the SPEC pins it; X-Robots-Tag
  noindex,nofollow on HTML).
- `test/` — 39 tests, all passing (see VERIFICATION.md).

## Recorded interpretations

- Workers are created per run from the fixed embedded source, not held
  idle from page load; each run terminates the previous worker. This
  keeps the SPEC's "fixed source bytes → Blob URL Worker" rule while
  avoiding an idle worker.
- `1.0.0--` is a **valid** version per the official grammar (a lone `-`
  is a legal prerelease identifier); it compares below `1.0.0` with
  kind `release`. A test pins this; it is not a spec errata (the SPEC
  never claims `--` is invalid).
- The SPEC's 25-row pagination rule does not apply: this tool compares
  one pair, so no long table exists.
- Canonical/hreflang are relative paths in preview; no production
  origin is fabricated (the SPEC's planned origin
  `semver-precedence.glossquote.com` is not configured).

## Spec errata

None found. All 9 printed core fixtures and all 3 controller fixtures
reproduce exactly as printed.

## Verification

See `VERIFICATION.md`. 39/39 tests pass; build:preview run twice is
byte-identical; loopback HTTP probe passed. Real-browser interaction,
real devices/touch, assistive tech, measured contrast, and deployment
are NOT_RUN.

## Next owner

Independent reviewer (parent submits the candidate to the registry).
Build-first mode: not accepted, not merged, not published.
