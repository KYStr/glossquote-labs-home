# Handoff — Range Coverage Audit (production candidate)

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Base branch: `codex/initial-publication`, base commit `8941a010da5722f0b4690487938c4e32d2a2587f`
- Spec: `docs/specs/range-coverage-audit/SPEC.md` (`spec-range-coverage-audit-20261109`, v1, 2026-11-09)
- Brief: `docs/specs/range-coverage-audit/BRIEF.md`
- Fixtures: `docs/specs/range-coverage-audit/fixtures.json` (7 core + 3 controller cases)
- Handbook: `docs/IMPLEMENTATION-CHECKLIST.md`, `docs/SOURCE-LAYOUT.md`, `docs/TOOL-DESIGN-BASELINE.md` (same base commit)

## Registry

- Task: `labs-prod-range-coverage-audit-20261109`
- Claim: `muse-main-claim-range-coverage-audit-20261109T075001Z-w2` (claimed by the parent actor; workMayStart verified by the parent)
- This build made **no registry writes**. The parent submits the candidate after verifying the PR.

## Allowed scope

Only `tools/range-coverage-audit/` was created or changed. Nothing outside it was
touched; `docs/specs/` is untouched.

## What was built

Half-open `[lo, hi)` decimal range audit over one domain, per the SPEC:

- `public/js/core/range.mjs` — pure validation, sweep, formatting, and report
  serialisation. Endpoints are BigInt thousandths (grammar
  `-?(0|[1-9][0-9]{0,9})(\.[0-9]{1,3})?`, range ±1,000,000,000, `-0` → `0`).
  Sweep walks distinct endpoints; touching endpoints never overlap; adjacent
  spans with identical source lines merge. `covered + uncovered = end − start`
  always; overlap length is counted once per position regardless of depth.
  Report is canonical JSON (keys sorted by UTF-16 code units, recursively),
  compact, one trailing LF, capped at 2,097,152 bytes (`OUTPUT_LIMIT`).
- `public/js/core/controller.mjs` — pure state machine
  (empty/dirty/busy/success/error/cancelled) with generation gating: edits
  revoke the old result and download, cancel/reset bump the generation, and
  late results can never resurrect a superseded result or error. The async
  work is injected, so the three controller fixtures are tested with a
  controllable fake runner.
- `public/js/worker-source.mjs` — module Worker entry (`handleWorkerMessage`).
  The build concatenates the core source with this handler into one fixed
  bundle string embedded in the preview `app.js`; the app creates the Worker
  from a Blob URL of that string. User input only ever travels as message
  data — never code, no `eval`, no dynamic import.
- `public/js/app.js` — DOM wiring (`textContent`/`value` only), bilingual
  messages, 25-row pagination of the span table, download only on explicit
  click (Blob URL revoked within 30 s or on invalidation), Worker terminated
  on cancel/reset/edit-while-busy/pagehide.
- `public/index.html` / `public/en/index.html` — independent URLs, exact
  SPEC-pinned titles/descriptions/H1/FAQs, preview `noindex`, relative
  canonical + hreflang, same-language home links (`../../` / `../../en/`),
  CSP meta (`worker-src blob:`, everything else `self`/`none`).
- `scripts/build.mjs` — reproducible preview build into `dist-preview/`
  (byte-identical across runs, manifest with sorted SHA-256 hashes).
- `scripts/check.mjs`, `scripts/check-generated.mjs`, `scripts/serve.mjs`
  (loopback-only, security headers, traversal/symlink rejection, directory
  index handling, no listing, no request-content logging).

## Recorded interpretations (SPEC silent or ambiguous)

1. **EMPTY vs ENDPOINT**: an empty start/end field is reported as `EMPTY`
   ("缺內容"), a non-empty malformed value as `ENDPOINT`. The SPEC lists
   EMPTY for missing content without pinning the exact trigger.
2. **Preview canonical/hreflang**: the SPEC says the candidate carries no
   *production* canonical/hreflang/sitemap. The preview uses relative-path
   canonical + hreflang (house format) and no fabricated production domain;
   formal absolute canonicals/sitemap remain a later production step.
3. **Run while busy**: the app disables the run button while busy; the
   controller ignores a duplicate run. Starting newer work goes through an
   edit (which terminates the old work) followed by a run — this is how the
   `state-replace-late` fixture is exercised.
4. **OUTPUT_LIMIT path**: the app runner enforces the report cap after a
   successful Worker result, so an over-cap result surfaces as an
   `OUTPUT_LIMIT` error and never produces a download. (Through `runAudit`
   alone the cap is unreachable: 200 rows bound the report to ~24 KB; the
   cap is unit-tested directly on `buildReport` with a synthetic result.)

## Verification summary

- `npm test`: 42 pass / 0 fail (7 literal core fixtures, grammar/boundary/
  error-ordering, conservation invariants, exact report bytes, all 3
  controller fixtures, worker entry, static page checks, build determinism).
- `npm run check`: pass. `npm run build:preview` ×2: byte-identical.
  `npm run check:generated:preview`: pass.
- Loopback HTTP probe: `/` 200, `/en/` 200, `/en/index.html` 200,
  `/js/app.js` 200, `/js/core/range.mjs` 200, traversal 404, missing 404,
  HEAD 200; CSP / nosniff / Permissions-Policy / X-Robots-Tag headers present.
- Spec errata: **none** — all 7 core fixtures and all 3 controller fixtures
  reproduce exactly as printed.
- Full detail: `VERIFICATION.md`.

## NOT_RUN (explicit)

Real-browser rendering/interaction (including the actual Worker run, Blob
download byte check, and the 200% zoom / touch / reduced-motion checks),
real devices, assistive technology, measured contrast of the tool's own UI,
cross-browser (Chrome/Edge) evidence, deployment, and the independent
nine-aspect review (pending by design; the parent submits this candidate).

## Next owner

Independent reviewer (not the author). The parent submits this candidate
(commit + PR) to the registry under the claim above; the reviewer verifies
the same PR head against the SPEC's nine aspects.
