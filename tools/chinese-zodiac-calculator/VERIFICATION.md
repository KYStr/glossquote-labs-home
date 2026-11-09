# Verification — Chinese Zodiac Calculator （生肖計算機）

## Fixed source

- Spec: `docs/specs/chinese-zodiac-calculator/` (BRIEF.md, SPEC.md, fixtures.json, AUTHOR-CHECK.md), spec candidate `b68311b57e79ddbbae922a0672b4bd8fe299ba3a`, spec task `labs-chinese-zodiac-calculator-spec-20261109`, draft spec PR https://github.com/KYStr/glossquote-labs-home/pull/173.
- Base commit: `c08e3243f0257f80fa512d15b1c37fcbeb6ef962` (tip of `codex/initial-publication` at fetch time); branch `muse/chinese-zodiac-calculator-production-20261109`.
- Environment: Linux, Node v24.22.1.

## Pre-implementation cross-check

Before writing product code, the SPEC's rules were re-implemented in an independent scratch script that parsed the CNY table directly out of SPEC.md: all 12 core fixtures reproduced exactly, the table passed the SPEC's self-consistency checks (every CNY between Jan 21 and Feb 20; adjacent gaps in {353, 354, 355, 383, 384, 385}), and the ganzhi formula anchors (1960 庚子鼠， 1984 甲子鼠， 2024 甲辰龍， 2035 乙卯兔， 2036 丙辰龍） matched. In the product, the CNY table was generated verbatim from SPEC.md into the core (no manual transcription), and the core test re-runs the self-consistency and anchor checks against the shipped data.

## Commands and results

- `npm test` — **44/44 pass** (12 spec core fixtures verbatim, 3 spec controller fixtures verbatim, CNY-table self-consistency, formula anchors, derived endpoint / Ben Ming Nian / validation-order cases, an invariant sweep over every year 1960–2035, canonical report byte literals, page-structure checks).
- Timezone independence: the full suite also passes 44/44 under `TZ=UTC`, `TZ=Asia/Taipei`, `TZ=America/New_York` and `TZ=Pacific/Kiritimati` (the core uses integer day numbers only, never `Date`).
- `npm run check` — pass (required files, package contract, core tables/capacities/defaults/example vs the vendored fixtures, pinned page metadata/FAQ/disclosure strings, syntax of all scripts, worker concatenation, forbidden-capability scan, core purity).
- `npm run build:preview` run twice — **byte-identical** output both times (dist-preview/ file hashes and BUILD-MANIFEST.json identical across runs; 9 files).
- `npm run check:generated:preview` — pass (manifest hashes exact, bilingual metadata, embedded worker source equals the fixed core + handler bytes, deny-all robots.txt).
- Loopback HTTP probe of the preview server on an ephemeral port (60361): `GET /` → 200 with title 「農曆生肖查詢｜Gloss Tools」; `GET /en/` → 200 with title "Chinese Zodiac Calculator | Gloss Tools". Server stopped after the probe.

## Spec-errata candidates

None. No fixture conflicted with the SPEC's stated rules; the implementation follows the SPEC throughout.

## NOT_RUN

- Real-browser verification (page rendering, worker execution in a browser, Blob-URL worker, download flow) — not run in this environment.
- Real-device checks (mobile layout, touch targets, screen readers).
- Network/Storage audit in a live browser (the static capability scan in `npm run check` passed; no live audit was run).
- Production build / production origin — refused by design; the candidate is preview-only, noindex, with no canonical/hreflang.
- Independent nine-aspect review — this is a build-first candidate; acceptance is the reviewer's step, not claimed here.
