# Handoff — Game Night Scorecard (production candidate)

- **Tool:** `tools/game-night-scorecard/` in `KYStr/glossquote-labs-home`
- **Fixed spec source:** `docs/specs/game-night-scorecard/` (`spec-game-night-scorecard-20261109`, v1)
  - `SPEC.md`, `BRIEF.md`, `fixtures.json`, `AUTHOR-CHECK.md`
  - Read from base commit `23c1d5f70db16e8bd0086259156243c5a57f8785` (`codex/initial-publication`)
- **Registry task:** `labs-prod-game-night-scorecard-20261109`
- **Claim:** `muse-main-claim-game-night-scorecard-20261109T082402Z-w5`
  (claimed by the parent actor; this builder ran no registry commands)
- **Candidate:** see VERIFICATION.md for the fixed commit SHA and draft PR.
- **Allowed scope:** only `tools/game-night-scorecard/` was touched.

## What was built

Pure core `solve(data)` per the SPEC: 2–12 players, 1–30 rounds, integer
scores in [-999, 999], high/low win, drop 0–3 (strictly fewer than the
rounds). Each player drops their own worst rounds (ties drop the earlier
round first); dropped names are listed in round input order; standings sort
by kept total then best kept round in the mode direction; rank is
1 + the number of strictly better players, so shared ranks such as 1, 1, 3
occur. Validation order: root type → SIZE (65,536 UTF-8 bytes) → SHAPE →
per-field in table/array order → cross-field scores-row length (RANGE)
before drop < rounds.length (ORDER). All 8 literal SPEC fixtures
reproduce exactly via `deepStrictEqual`.

The app is a bilingual (zh-Hant / en) form: dynamic player rows, high/low
choice, drop count, and a per-round score grid. The core runs on the next
event-loop work item (`setTimeout(0)`) under a runId guard, so an edit or
cancel before that item revokes the scheduled work and a late reply can
never revive a result. Cancel returns to dirty and keeps the draft. No
network, no storage, no analytics, no remote fonts; user text is rendered
with `textContent`/`value` only. The serve script sends the SPEC-pinned
CSP plus `X-Content-Type-Options: nosniff`.

## Format notes for the reviewer

- This candidate follows the consolidated handbook format
  (`public/js/...`, preview-only build, `dist/` + `BUILD-MANIFEST.json`).
  The SPEC's handoff section lists a `src/` layout and `build:production`
  scripts; those are superseded by the consolidated format, and no
  production origin is approved, so `build:production` is refused.
- Preview pages use relative canonical + hreflang (x-default → zh-Hant)
  and `noindex, nofollow`; robots denies all crawling. The same-language
  home links use the SPEC-pinned `https://glossquote.com/...` URLs.
- **Spec errata: none.** Every printed fixture reproduces exactly from
  the SPEC's own rules.
- SPEC-silent interpretations recorded in VERIFICATION.md: a blank score
  field is a form-level `SYNTAX` error (raw integer syntax); a blank
  player/round name is reported by the core as `RANGE` (empty after
  trim); non-string `mode` is `ENUM`; the sample loader loads the
  `high-tiebreak` fixture as a dirty draft.

## Next owner

Independent reviewer: review this fixed candidate against the SPEC's nine
aspects (functionality, boundaries, privacy, security, usability,
accessibility, localization-seo, toolchain-provenance, compatibility).
The parent submits the candidate to the registry. Accepted ≠ published;
deployment is a separate, separately approved step.
