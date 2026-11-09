# Handoff — SVG to PNG Converter (production candidate, build-first)

## Fixed specification source

- Repository: `KYStr/glossquote-labs-home`
- Commit: `7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` (branch `codex/consolidate-20261109`)
- Paths: `docs/specs/svg-to-png-converter/SPEC.md` and `docs/specs/svg-to-png-converter/BRIEF.md`
- Implemented exactly: closed sanitisation contract (§4), intrinsic-size rules 1–4, sizing modes with half-away-from-zero rounding and pre-render caps, background handling, canvas PNG export path, bilingual UI and error classes.

## Allowed scope

- Only `tools/svg-to-png-converter/` was created. No other path in the repo was touched; the coordination registry was not written.

## Mode and status

- Build-first mode: this candidate is submitted for independent bulk review. It is **not accepted, not published, not deployed**, and no catalog or registry state was changed.
- SPEC §8's own-repo handoff wording (a separate `KYStr/glossquote-labs-svg-to-png-converter` repository) is superseded by the 2026-11-09 consolidation rules (`docs/SOURCE-LAYOUT.md`): new implementations live in `tools/<slug>/` of this repository, which is where this candidate sits.
- Next owner: the independent reviewer (non-author), scoring the nine aspects of SPEC §6 against the fixed candidate commit on this PR.

## Design notes for the reviewer

- The XML parser/serialiser is a small strict parser in `public/js/core/xml.mjs` (no DOM), so the whole parse → sanitise → intrinsic pipeline is unit-tested in Node; the browser uses the same core, and only rasterisation (canvas) lives in `public/js/app.js`.
- The user's SVG reaches the page only as a `blob:` image of the serialised sanitised document; raw input is never assigned to any DOM sink.
- Recorded interpretations (SPEC silent, safety-conservative, also in VERIFICATION.md): DOCTYPE with an internal subset is refused under the not-well-formed class; banned elements match by local name in any namespace (plus all XHTML-namespace elements); `url()` targets in style content follow the same allowlist as `href` (fragments and the four raster `data:image/` types).
- No spec errata candidates were found: fixtures F1–F7 were re-derived from the §4 rules and all agree with the printed values.
