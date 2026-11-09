# Archive Member Path Preflight — Handoff

## Fixed sources

- Repo: `KYStr/glossquote-labs-home`
- Base branch: `codex/initial-publication`
- Base commit: `8941a010da5722f0b4690487938c4e32d2a2587f`
- Spec: `docs/specs/archive-path-preflight/SPEC.md` (`spec-archive-path-preflight-20261109`, v1, 2026-11-09)
- Brief: `docs/specs/archive-path-preflight/BRIEF.md`
- Fixtures: `docs/specs/archive-path-preflight/fixtures.json` (7 core + 3 controller cases)
- Author check: `docs/specs/archive-path-preflight/AUTHOR-CHECK.md`
- House format: `docs/IMPLEMENTATION-CHECKLIST.md`, `docs/SOURCE-LAYOUT.md`, `docs/TOOL-DESIGN-BASELINE.md`

## Registry

- Task: `labs-prod-archive-path-preflight-20261109`
- Claim: `muse-main-claim-archive-path-preflight-20261109T075001Z-w2` (claimed by the parent actor; workMayStart verified by the parent)
- This builder ran **no** coordination/registry commands. The parent submits the candidate to the registry after verifying the PR.

## Allowed scope

`tools/archive-path-preflight/` only. Nothing outside this directory was
touched. No registry writes, no catalog changes, no deployment.

## What was built

A local-only archive manifest preflight tool: paste `F`/`D` + Tab + relative
path rows; the pure core (`public/js/core/validate.mjs`) validates the
manifest against the SPEC's ASCII portable-path policy, reports the first
violation per row, and derives CASE_ALIAS / SAME_MEMBER / PARENT_FILE
conflicts from a lowercase-keyed trie. A generation-disciplined controller
(`public/js/controller.mjs`) runs the core in a module Worker built from the
fixed embedded core bytes, so late or superseded results can never revive.
The report downloads as `archive-path-preflight-report.json` (compact,
recursively key-sorted JSON, one trailing LF, 2,097,152-byte cap).

Bilingual static pages (`public/index.html` zh-Hant, `public/en/index.html`
en) with the exact SPEC title/description/H1/FAQ strings, preview
`noindex,nofollow`, CSP, and no external assets.

## Deliberate format decisions (SPEC over generic template)

- **Preview has no canonical/hreflang/sitemap.** The SPEC's tests section
  says the candidate pages carry robots meta + X-Robots-Tag `noindex,nofollow`
  and no production canonical/hreflang/sitemap; language links are path-only.
  The generic "canonical + hreflang" brief line is superseded for preview.
- **Home links are relative** (`../../` / `../../en/`), matching the
  consolidated-repo convention. The SPEC's absolute home URLs
  (`https://glossquote.com/index.html`, `.../en/index.html`) and the planned
  origin `https://archive-path-preflight.glossquote.com` belong to the formal
  production build, once the coordinator confirms the origin.
- **Implementation layout follows the parent brief's file contract**
  (`public/js/core/`, `public/js/app.js`, `scripts/`), not the SPEC's
  `src/core.mjs` / `src/controller.mjs` / `src/app.mjs` naming — same
  behaviour, same Worker discipline (fixed core bytes embedded at build
  time, Blob-URL module Worker, terminate + revoke on cancel/edit/reset/
  pagehide, bfcache restore resets).

## Interpretations where the SPEC is silent (for the reviewer to overrule)

1. A row whose path part is empty (`F\t`) is `ROW_FORMAT` (the row does not
   carry a path), not a path-level error.
2. `SCHEMA` errors carry `field: null, row: null` (SPEC pins this).
   `INPUT_LIMIT`, `UNICODE`, `EMPTY`, `ROW_LIMIT` carry
   `field: "entries", row: null` (SPEC does not pin field/row for these).
3. `OUTPUT_LIMIT` is enforced when the report is serialized; the controller
   turns it into an error state with no download, rather than a success
   with a missing download.
4. Editing the draft to an empty string returns the state machine to
   `empty`; any other edit returns it to `dirty`. Both invalidate the old
   result and download immediately.

## Spec errata found

None. All 7 printed core fixtures and all 3 controller fixtures reproduce
exactly from the SPEC's own rules.

## Verification

See `VERIFICATION.md` for commands, exit codes, test counts, build
byte-identity, and the HTTP probe. Real-browser rendering/interaction,
real devices/touch, assistive tech, measured contrast, and deployment are
NOT_RUN (listed there).

## Next owner

Independent reviewer. The parent submits this candidate (commit + PR) to
the registry; review is against the same fixed candidate commit, nine
aspects, each ≥90 with evidence. Not accepted, not merged, not published.
