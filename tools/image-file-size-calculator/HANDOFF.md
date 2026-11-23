# Image File Size Calculator （圖片檔案大小估算）— Production HANDOFF

- Spec: `spec-image-file-size-calculator-20261121`, draft spec PR #407
  (base `codex/initial-publication`, head
  `8c510a9a8a8fcf1658b94e8743d84d4e09885c54`, OPEN at build time).
  Registry rev 1882 (per parent task).
- Spec source (fixed): `docs/specs/image-file-size-calculator/` at the
  spec PR head above — `SPEC.md` (8 sections), `BRIEF.md`,
  `fixtures.json`, `AUTHOR-CHECK.md`. `test/fixtures.json` in this
  tool is a byte-identical vendored copy (SHA-256
  `68f16b6decd4518d843d484a667f17ada8862eba9f5c7eed578e047b621c2a1e`,
  verified against the spec PR head via the GitHub API).
- Production target: `tools/image-file-size-calculator/` in
  `KYStr/glossquote-labs-home`, branch
  `muse/image-file-size-calculator-production-20261121`, base
  `codex/initial-publication`. Build-first (no registry production
  registration in this run, per the run-6 production mode: build +
  draft PR + parent verification + ledger).
- Builder: run-6 production builder subagent, eighth (final) wave
  (parent orchestrator session 9fde18ea-5a97-40bc-adbb-244860a2a5b2).
  User confirmed continuation four times on 2026-11-23 (14:31,
  14:33:56, 14:58:49, 15:04:46); the same execution-risk prompt class
  that stopped the first production wave at clone/fetch re-appeared
  during this build (on the clone of this repo) and was continued
  past under that authorization — glossquote-repo content only, no
  other content, credentials, outbound sends, or deletion involved.

## What was built

- Pure core `public/js/core/image-file-size.mjs`: `run(input)`
  validates in the SPEC order (widthPx → heightPx → bitDepth →
  format; per field capacity INPUT_LIMIT → surrogate UNICODE → EMPTY
  → INTEGER_FORMAT → RANGE/ENUM; then the cross-field total-pixels
  check, RANGE on heightPx over 1,000,000,000). All arithmetic is
  BigInt integer arithmetic — no binary floating point anywhere:
  uncompressedBytes = ceil(W×H×D/8), effectiveBitDepth = min(D, 8)
  for gif, effectiveBytes = ceil(W×H×effective/8),
  estimatedBytes = half-up(effectiveBytes × factor) with the pinned
  rational factors (uncompressed 1/1, jpeg 1/10, png 2/5, webp-lossy
  7/100, webp-lossless 3/10, gif 1/4, avif 1/20), megapixels/sizeKB/
  sizeMB as half-up 2-decimal strings, displaySize B/KB/MB by the
  pinned thresholds. Result shape follows fixtures.json exactly:
  `{displaySize, effectiveBitDepth, estimatedBytes, format,
  megapixels, sizeKB, sizeMB, totalPixels, uncompressedBytes}`.
  Fixed report `image-file-size-report.json` (canonical JSON, UTF-16
  key order, one trailing LF, 2 MiB limit).
- Controller `public/js/controller.mjs`: draft / generation / state
  machine (empty, dirty, busy, success, error, cancelled) with a
  module Worker created from the fixed worker source; late replies
  are dropped, never resurrected.
- Bilingual pages `public/index.html` (zh-Hant) and
  `public/en/index.html` (en): SPEC-pinned titles, descriptions, h1,
  FAQ answers, the estimate note in both languages next to the
  estimated size and in the results panel, preview noindex, no
  canonical/hreflang, same-language home links (`../../` /
  `../../en/`), draft-loss note. All seven formats and all seven bit
  depths are select options with the SPEC defaults (24-bit, jpeg)
  preselected.
- Scripts: `scripts/build.mjs --mode preview` (reproducible,
  byte-identical rebuilds; production refused), `scripts/check.mjs`,
  `scripts/check-generated.mjs --mode preview`, `scripts/serve.mjs`
  (loopback-only, SPEC CSP headers). Zero runtime dependencies,
  Node ≥ 24, ESM.

## Verification (see VERIFICATION.md for the full record)

- `node --test`: 60/60 pass (17 literal core fixtures, independent
  re-derivation of every success fixture, boundary/grammar/schema/
  UNICODE/hostile-input tests, 3 literal controller fixtures plus
  generation-guard unit tests, report byte-literal tests, bilingual
  page-contract tests). Node v24.22.1.
- `node scripts/check.mjs`: pass.
- `node scripts/build.mjs --mode preview` run twice, byte-identical
  (BUILD-MANIFEST.json SHA-256 recorded in VERIFICATION.md);
  `node scripts/check-generated.mjs --mode preview`: pass after each
  build.
- Real-browser checks (Chrome/Edge, Network/Storage, keyboard, zoom,
  reflow): NOT_RUN — no isolated browser mechanism was available to
  this builder; recorded as NOT_RUN in VERIFICATION.md, not claimed.

## Spec-errata candidates (spec problems found; the spec was NOT silently changed)

1. **Format has no pinned raw capacity, and the house 8-unit cap
   would reject legal formats.** SPEC §inputsOutputs pins "raw 最多
   8 單元" only for widthPx, heightPx and bitDepth; for format it
   only says "非空字串，必須是 … 之一". The legal values run to 13
   units (`webp-lossless`) and 12 (`uncompressed`). Applying the
   run-5 house pattern (8-unit INPUT_LIMIT on every field) to format
   would reject those two legal formats as INPUT_LIMIT. The
   implementation applies no INPUT_LIMIT to format (UNICODE → EMPTY
   → ENUM). The spec should either pin an explicit format capacity
   (≥ 13) or state that none applies. Found by the builder's own
   1-bit test failing on `format: "uncompressed"`; fixed in the core
   and pinned by a test asserting a long unknown format is ENUM.
2. **No literal fixture exercises the odd-bit ceil branch.** SPEC
   §3 calls out the 1-bit odd-total-bits ceil ("1-bit 且總位元數為
   奇數時進位到整數位元組"), but the only 1-bit fixture
   (`mono-1bit`, 2480×3508) has 8,699,840 total bits — exactly
   divisible by 8 — so the ceil path is never hit by a literal
   fixture. The product adds a hand-derived test (3×1, 1-bit →
   uncompressedBytes 1, display "1 B"); the spec's fixture set
   should gain an odd-bit case.
3. **UNICODE position for format is unspecified.** The SPEC's general
   order ("先容量、再空值、再該欄文法") and error list name UNICODE
   for unpaired surrogates, but no per-field order is spelled out
   for format. The implementation checks UNICODE before EMPTY for
   format (same as the other fields); the order is unobservable for
   EMPTY (a lone surrogate is non-empty by definition), so this is a
   documentation gap only.

## Production PR

- Draft PR #443: https://github.com/KYStr/glossquote-labs-home/pull/443
  (OPEN, draft; head `68cd4a7dc9ba18a87c1a1e1c27015392002869c0`,
  read back with `gh pr view`).
- Base: `codex/initial-publication`. Never merge, never publish.
  No registry production registration was done (run-6 production
  mode).

## Next owner

- Independent reviewer: verify this same PR head against the nine
  acceptance facets; real-browser evidence (Chrome/Edge, both
  languages, Network/Storage, keyboard, 200% zoom, 320px reflow) is
  still NOT_RUN and must be gathered with an isolated browser
  mechanism before any acceptance claim.
- If errata candidate 1 or 2 is accepted by the spec author, the
  spec fixtures (and this tool's vendored copy + tests) need the
  matching update; the core's format-capacity choice must be
  re-checked against the revised spec.
