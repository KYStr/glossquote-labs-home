# Handoff — Event Ticket Range Check

Production candidate for the GlossQuote Labs consolidated format.

## Fixed source

- Repository: `KYStr/glossquote-labs-home`
- Spec: `spec-event-ticket-ranges-20261109` v1 — `docs/specs/event-ticket-ranges/`
  (`SPEC.md`, `BRIEF.md`, `fixtures.json`, `AUTHOR-CHECK.md`), read at base
  commit `23c1d5f70db16e8bd0086259156243c5a57f8785` on `codex/initial-publication`.
- Registry production task: `labs-prod-event-ticket-ranges-20261109`
- Claim: `muse-main-claim-event-ticket-ranges-20261109T082402Z-w5`
  (claimed by the parent actor; this build ran no registry commands)
- Branch: `muse/event-ticket-ranges-production-20261109`
- Base: `23c1d5f70db16e8bd0086259156243c5a57f8785` (`codex/initial-publication`)
- Candidate commit: `744739995046e46bbc6855701794830bef22cc7e` (tool commit)
- Draft PR: https://github.com/KYStr/glossquote-labs-home/pull/126
  (base `codex/initial-publication`, OPEN + draft, head verified == candidate)

## Allowed scope

Only `tools/event-ticket-ranges/` was added or changed. Nothing outside the
tool directory was touched; `docs/specs/` was read, never edited.

## What was built

`tools/event-ticket-ranges/` per `docs/IMPLEMENTATION-CHECKLIST.md`:

- `package.json` — Node >= 24, ESM, zero dependencies; scripts `test`,
  `check`, `build:preview`, `check:generated:preview` (plus `dev`).
- `public/index.html` / `public/en/index.html` — bilingual pages with the
  SPEC-pinned titles, descriptions, H1, preview `noindex,nofollow`,
  relative canonical + hreflang (`zh-Hant`/`en`/`x-default`), and
  same-language home links (`../../` / `../../en/`).
- `public/js/core/solve.mjs` — pure `solve(data)`: strict validation
  (SIZE → shape → fields in table order → DUPLICATE → ORDER) and the
  endpoint-sweep audit (no per-ticket expansion; at most 130 endpoints).
- `public/js/core/flow.mjs` — pure run-state machine
  (empty/dirty/busy/ready/error) with runId-gated settle.
- `public/js/core/i18n.mjs` — bilingual UI strings (status, errors with
  fix guidance, result headings).
- `public/js/app.js` — DOM wiring with `textContent`/`value` only; the core
  runs as the next event-loop work item (`setTimeout(0)`) with a real
  cancel; edits revoke the pending work item.
- `public/styles/app.css` — shared Gloss Tools tokens, single column below
  48rem, two-column workspace at 48rem and up.
- `scripts/build.mjs`, `scripts/check.mjs`, `scripts/check-generated.mjs`,
  `scripts/serve.mjs` (loopback only; sends the SPEC-pinned CSP + nosniff).
- `test/core.test.mjs` — 36 tests: all 8 literal SPEC fixtures imported
  from `docs/specs/event-ticket-ranges/fixtures.json` plus hand-derived
  validation, boundary, algorithm and flow cases.
- `HANDOFF.md`, `VERIFICATION.md` (this file's companion).

## Spec-silent interpretations (for the reviewer)

1. **DUPLICATE order.** The SPEC pins cross-field constraints after all
   field types are valid, and pins ORDER checks in the implementation
   section, but does not place DUPLICATE relative to ORDER. This build
   checks DUPLICATE (second occurrence, input order) after all field
   validations and before the ORDER checks.
2. **Name failure codes.** A name that is empty or over 24 code points
   after U+0020-trim and NFC is `RANGE`; a name whose first or later
   characters break the character class is `TYPE`.
3. **Serial failure codes.** A non-string serial is `TYPE`; a string of
   the wrong width or with non-ASCII-digit characters is `SYNTAX`
   (the fixture `wrong-width` pins SYNTAX for the width case).
4. **Preview SEO.** The SPEC's SEO table lists `https://glossquote.com`
   same-language home URLs. Those are the production values. In preview
   this build uses relative canonical/hreflang and relative home links
   (`../../`, `../../en/`), matching the sibling tools' verified preview
   practice; the production build is refused because no production origin
   has been approved for this tool.
5. **No worker.** The SPEC's handoff file list mentions a worker layout,
   but the implementation section pins the core to run "in the next
   event-loop work item" with revoke-on-cancel/edit. The work is bounded
   (≤ 130 endpoints), so the app uses a runId-guarded `setTimeout(0)`
   settle instead of a separate worker file; cancel and late-reply
   behaviour are covered by tests.
6. **Raw digits syntax.** The form rejects non-ASCII-integer digits text
   (including leading zeros, decimals, signs) as `SYNTAX` at `/digits`
   before calling the core; a syntactically valid integer outside 1–9
   reaches the core and returns `RANGE`.

## Spec errata

None — all printed fixtures reproduce exactly from the SPEC's own rules.

## Next owner

Independent reviewer (the parent submits this candidate to the registry).
Product acceptance needs the fixed nine-aspect review of the candidate
commit; see VERIFICATION.md for the explicit NOT_RUN list.
