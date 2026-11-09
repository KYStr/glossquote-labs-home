# Morse Code Translator — production candidate handoff

## Fixed specification source (read this first)

**Governing contract: the REVISED specification** in `KYStr/glossquote-labs-home`,
branch `muse/morse-code-translator-spec-20261102`, commit
`b612c14d1c69ea9366a3312a2ca60a8ae887481c`, path
`docs/specs/morse-code-translator/SPEC.md` (with `BRIEF.md` and
`AUTHOR-CHECK.md` at the same commit). This implementation follows that
revised text exactly, including:

- raw-input validation **before** any normalisation (fixture 7: `ß` refused
  at its raw position, never case-expanded to `SS`);
- prosigns exist **only** in tagged form (`<AR>` → `<.-.-.>` → `<AR>`); bare
  colliding tokens decode to the punctuation character (`+`, `&`, `(`) with a
  prosign ambiguity **note** that is never part of the decoded string;
- unknown tokens decode to `�` and are listed by index; an unknown bare token
  equal to a non-colliding prosign run (SOS, SK) carries a prosign-hint note;
- the Play validity rule: Play is disabled, with the reason shown, while the
  Morse pane is stale (frozen after an encoding error) or contains unknown
  tokens;
- fixtures 1–8 as the test corpus (`test/` asserts them literally).

### Discrepancy flagged for the coordinator / reviewer

The SPEC copy stored at `docs/specs/morse-code-translator/SPEC.md` **on the
consolidation branch** (`codex/consolidate-20261109`) is the **superseded
pre-fix draft**: it promises an untagged prosign round-trip that is jointly
unsatisfiable with its own character table, and it contradicts itself on `ß`
handling. That copy was **not** implemented and **not** modified (this task's
scope is `tools/morse-code-translator/` only). The coordinator/reviewer
should reconcile `docs/specs/` with the revised commit above through the
normal spec-correction flow.

## Scope and mode

- Allowed scope: `tools/morse-code-translator/` only. Nothing outside that
  directory was created or modified; `docs/specs/` is untouched; the
  coordination registry was not written to.
- Mode: **build-first**. This is a production *candidate* awaiting an
  independent bulk review. It is **not accepted, not published, not
  deployed**, and no catalog or registry state claims otherwise.
- SPEC §8's own-repository handoff wording (a candidate in a separate
  `KYStr/glossquote-labs-morse-code-translator` repository) is **superseded
  by the 2026-11-09 consolidation rules** (`docs/SOURCE-LAYOUT.md`,
  `AGENTS.md`): new tools are implemented in `tools/<slug>/` of
  `KYStr/glossquote-labs-home` and handed over via a branch + draft PR
  against `codex/consolidate-20261109`.

## What was built

Zero-dependency, Node ≥ 24, ESM. Pure core in `public/js/core/`
(`table.mjs` auditable data; `encode.mjs` / `decode.mjs` grammars;
`timing.mjs` interval expansion consumed identically by the duration display
and by playback), DOM + WebAudio layer in `public/js/app.js` (textContent /
value only, never innerHTML with user input), bilingual pages
(`public/index.html` zh-Hant, `public/en/index.html` English) with preview
noindex, canonical + hreflang cross-links and same-language home links.
Playback schedules oscillators on the audio clock from the timing expansion;
the timing expansion logic itself lives in the pure core so tests assert
fixture durations exactly.

Commands (run inside this directory): `npm test`, `npm run check`,
`npm run build:preview`, `npm run check:generated:preview`,
`npm run serve` (loopback-only probe server). Results: see `VERIFICATION.md`.

## Next owner

An **independent reviewer who is not the author**, scoring the nine aspects
of SPEC §6 against this fixed candidate commit (each ≥ 90, all mandatory
checks complete; unrun checks stay NOT_RUN — the browser/device items are
listed as NOT_RUN in `VERIFICATION.md`). Acceptance, merge, deployment and
catalog publication are separate later steps under existing approvals.
