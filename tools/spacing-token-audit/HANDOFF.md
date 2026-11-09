# Spacing Token Audit — production candidate handoff

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Base branch: `codex/initial-publication`
- Base commit: `8941a010da5722f0b4690487938c4e32d2a2587f`
- Spec: `docs/specs/spacing-token-audit/SPEC.md` (`spec-spacing-token-audit-20261109`, v1, 2026-11-09)
- Brief: `docs/specs/spacing-token-audit/BRIEF.md`
- Fixtures: `docs/specs/spacing-token-audit/fixtures.json` (7 core cases + 3 controller cases)
- Author check: `docs/specs/spacing-token-audit/AUTHOR-CHECK.md`
- House format: `docs/IMPLEMENTATION-CHECKLIST.md`, `docs/SOURCE-LAYOUT.md`,
  `docs/TOOL-DESIGN-BASELINE.md`

## Registry

- Task: `labs-prod-spacing-token-audit-20261109`
- Claim: `muse-main-claim-spacing-token-audit-20261109T075001Z-w2`
  (claimed by the parent actor, workMayStart verified; this builder ran no
  coordination or registry commands)
- The parent submits this candidate to the registry after verifying the PR.

## Allowed scope

`tools/spacing-token-audit/` only. Nothing outside that directory was touched;
no registry writes were made by this builder.

## What was built

A local, bilingual (zh-Hant / en) tool that matches measured pixel spacing
to the nearest design token and reports rows outside tolerance.

- `public/js/core/audit.mjs` — pure core: exact BigInt-thousandths parsing
  and matching, the full error taxonomy (`SCHEMA`, `TOLERANCE`,
  `INPUT_LIMIT`, `UNICODE`, `EMPTY`, `ROW_LIMIT`, `ROW_FORMAT`, `DUP_NAME`,
  `PIXELS`, `OUTPUT_LIMIT`), canonical report serialization (keys sorted by
  UTF-16 code units, compact JSON, one trailing LF, UTF-8, no BOM, fixed
  filename `spacing-token-audit-report.json`, 2,097,152-byte cap).
- `public/js/controller.mjs` — pure draft/generation/resource state machine
  (empty / dirty / busy / success / error / cancelled). Only a result whose
  generation matches the current generation and arrives while busy is
  accepted; late results are discarded. Editing invalidates the old result
  immediately; running while busy restarts with a new generation; cancel,
  edit, reset, and pagehide terminate the worker.
- `public/js/app.js` — safe DOM wiring (`textContent`/`value` only). Work
  runs in a module Worker built from the embedded worker source (fixed core
  bytes + fixed handler, injected by `scripts/build.mjs` into the built
  app.js, instantiated from a Blob URL). If a Worker cannot be created — or
  when serving the unbuilt source tree — a synchronous in-page shim runs the
  same core and preserves the controller contract. Results paginate at 25
  rows; the report downloads only on explicit user action and its Blob URL
  is revoked within 30 seconds or earlier on invalidation.
- `public/index.html`, `public/en/index.html` — separate URLs with the exact
  SPEC titles, descriptions, and H1s; preview `noindex,nofollow` (meta and
  `X-Robots-Tag`); relative self-canonical and reciprocal `hreflang`
  (zh-Hant/en, no `x-default`, no production origin — per SPEC, production
  canonical/sitemap are a later, separately verified step); the SPEC CSP
  verbatim; visible labels; `aria-live` status; the two SPEC FAQs.
- `scripts/build.mjs` (`--mode preview`, `--out`), `scripts/check.mjs`,
  `scripts/check-generated.mjs` (rebuilds and requires byte-identical
  output; extracts the embedded worker source and syntax-checks it as a
  module), `scripts/serve.mjs` (loopback-only, correct MIME, 404s,
  traversal/symlink rejection, no directory listing, security headers).
- `test/` — `node --test` suites for the core (all 7 fixtures + boundaries),
  the controller (all 3 SPEC controller fixtures with a controllable fake
  worker + extras), and the HTML/package/static surface.

## Results

- `npm test`: **49 pass / 0 fail** (Node v24.22.1)
- `npm run check`: pass (package contract, forbidden sinks, core purity,
  exact SPEC strings, CSP, labels, ids, fixture re-check)
- `npm run build:preview` twice: **byte-identical** (per-file SHA-256
  comparison; see VERIFICATION.md)
- `npm run check:generated:preview`: pass (rebuild identity, embedded
  worker source parses as a module and equals core + handler bytes)
- Loopback HTTP probe: `/`, `/en/`, JS, CSS all 200 with correct MIME and
  security headers; missing/traversal paths 404.

## Spec errata

None. All 7 core fixtures reproduce exactly from the SPEC's own rules, and
all 3 controller fixtures replay exactly.

## Interpretations (SPEC silent; recorded for the reviewer to overrule)

1. A missing `tolerance` key defaults to `"1"` (SPEC: “tolerance: string，
   預設 1”); a present but mistyped tolerance is `SCHEMA`, a present but
   ungrammatical/out-of-range tolerance is `TOLERANCE`.
2. `ROW_LIMIT`, `INPUT_LIMIT`, `UNICODE`, `EMPTY`, and `TOLERANCE` errors
   carry `row: null` (whole-field conditions, not a single source row).
3. Per-row checks run row by row in source order (format → duplicate →
   pixels within each row), so the earliest row's error wins.
4. Candidate pages use a relative self-canonical (`./`) and relative
   reciprocal `hreflang`; no `x-default` and no production origin, per the
   SPEC's candidate rules.
5. A malformed result delivered by the worker is reported as `WORKER_ERROR`,
   not `SCHEMA` (`SCHEMA` describes user-input shape).
6. The report is serialized in the controller (main thread) from the
   worker's result; `OUTPUT_LIMIT` is therefore raised as an error state
   with no downloadable artifact. It is unreachable from valid input (at
   most 100 rows), but the path is implemented and tested.
7. `SPEC §8`'s own-repo handoff wording is superseded by the 2026-11-09
   consolidation rules: this tool lives in `tools/<slug>/` in the shared
   repo, and the candidate PR targets `codex/initial-publication`.

## NOT_RUN

Real-browser rendering/interaction (including the Worker path in a real
browser, the spin of busy/cancel, and Blob download bytes), real
devices/touch, assistive tech, measured contrast, 200% zoom, cross-browser
(Chrome/Edge) comparison, network/storage profiling, deployment.

## Next owner

Independent reviewer (parent submits the candidate to the registry first).
