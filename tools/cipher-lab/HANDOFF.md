# Classical Cipher Lab — production handoff (build-first candidate)

## Fixed spec source

- Repository: `KYStr/glossquote-labs-home`
- Commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (branch `codex/consolidate-20261109`)
- Paths: `docs/specs/cipher-lab/SPEC.md`, `docs/specs/cipher-lab/BRIEF.md`
  (no `fixtures.json` exists for this spec; the fixtures are SPEC section 4's
  V1–V7, reproduced literally in `test/fixtures.test.mjs`.)

## Allowed scope

- Implementation lives **only** in `tools/cipher-lab/` of the same repo.
- No other path was touched; the coordination registry was not written.

## Mode and status

- **Build-first mode**: the implementation was built directly from the fixed
  SPEC without a registry production claim, pending independent bulk review.
  This candidate is **not accepted and not published**; acceptance, merge and
  deployment are separate later steps under existing approvals.
- SPEC section 8's handoff wording (candidate in the tool's own repository
  `KYStr/glossquote-labs-cipher-lab`) is **superseded** by the 2026-11-09
  consolidation rules: new implementations live in `tools/<slug>/` inside
  `KYStr/glossquote-labs-home` (see `docs/SOURCE-LAYOUT.md`).

## What was built

- Pure core (`public/js/core/cipher.mjs`): Caesar (shift 0–25, both
  directions, ROT13 is the shift-13 case), Atbash, Vigenère (key 1–64 ASCII
  letters, normalised to uppercase, key advances only on transformed
  letters, defects refused by named error — never stripped or truncated),
  and the 25-row unranked Caesar brute-force table. Bounds appear once as
  exported constants. Only ASCII A–Z/a–z transform; case is preserved;
  digits, punctuation and all non-ASCII characters (including CJK and
  astral characters) pass through whole at their original positions.
- Bilingual pages (zh-Hant default, English) with the non-dismissible
  educational banner in both languages, field errors for the key, the
  10,000-character input limit with count and truncation note, copy-result
  and swap actions, and the brute-force table as a real table whose rows
  can be clicked (or focused and activated) to fill the output area.
- Zero runtime dependencies, no network, no storage, no analytics; input
  text and key never enter the URL or title. Output is rendered through
  `value`/`textContent` only.

## Next owner

- **Independent reviewer** (not the author): score the nine aspects of SPEC
  section 6 against the fixed candidate commit on this branch's PR, with
  the NOT_RUN items in `VERIFICATION.md` completed or kept blocking.
