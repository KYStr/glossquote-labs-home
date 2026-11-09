# Classical Cipher Lab — build-first verification record

Environment: Node v24.22.1, zero dependencies, worktree at base commit
`7a0e9bf896e3b3a318244eb6f5006ebd40787b2c` of `KYStr/glossquote-labs-home`.

## Commands run (all from `tools/cipher-lab/`)

| Command | Exit | Result |
| --- | --- | --- |
| `npm test` (`node --test`) | 0 | **30 pass / 0 fail** (fixtures 7, core/bounds 16, audit 2, scaffold 4 — see suite files) |
| `npm run check` | 0 | `check ok` — required files, zero deps, noindex/hreflang/banner present, no external resources, no `innerHTML`, pure core |
| `npm run build:preview` (twice) | 0 | sha256 manifest of `dist-preview/` compared across both runs: **byte-identical** |
| `npm run check:generated:preview` | 0 | 5 generated files identical to `public/` sources |
| Loopback HTTP probe (`PORT=8471 node scripts/serve.mjs`, then `curl`, server killed) | — | `GET /` → 200 (zh-Hant page), `GET /en/` → 200 (English page), `GET /js/app.js`, `/js/core/cipher.mjs`, `/styles/app.css` → 200 |

## Coverage notes

- Fixtures V1–V7 from SPEC section 4 are asserted literally, including the
  canonical Vigenère LEMON example and the key-advancement case V5.
- Round trips: Caesar at all 26 shifts, Vigenère with six keys (incl. a
  64-letter key), Atbash/ROT13 self-inverse — over a text mixing case,
  digits, punctuation, CJK and an astral character.
- Refusals: shift −1/26/2.5/non-numeric; key empty / `K3Y` / `KEY KEY` /
  non-ASCII letter / 65 letters — each with its named error code.
- The section 5 string audit runs as tests over both pages and both JS
  files (banner content required; forbidden self-descriptions absent
  outside the banner).

## Spec errata candidates

- None. Every printed fixture (V1–V7) agrees with the SPEC's own rules as
  written; no rule/fixture contradiction was found.

## NOT_RUN (blocking for acceptance, per SPEC sections 6–7)

- Real-browser rendering and interaction (banner visibility without
  scrolling at mobile width, brute-table row click in a live browser,
  key-error state for `K3Y` in the GUI, swap round trip in the GUI).
- Real devices / touch input; assistive-technology pass; measured
  contrast ratios; 200% zoom layout check.
- Cross-browser result comparison (Chrome/Edge/Firefox/Safari).
- Deployment / catalog publication (not authorised; build-first only).
