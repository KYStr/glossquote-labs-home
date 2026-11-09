# Frame Row Marking — verification

- **Spec:** `docs/specs/frame-row-marking/SPEC.md` (`spec-frame-row-marking-20261109` v1)
- **Candidate commit:** head of PR #115 at submission (this branch head; see below)
- **Base commit:** `5e8fab03c00fba01bca68b1dd80280eb380b9bd6` (`codex/initial-publication`)
- **Environment:** Node v24.22.1, offline, this VM

## Commands (all exit 0)

| Command | Result |
| --- | --- |
| `node --test` | **31 pass / 0 fail** (2 test files: `core.test.mjs`, `flow.test.mjs`) |
| `npm run check` | pass — 113 static `ok` lines, 0 failures |
| `npm run build:preview` (twice) | **byte-identical** (manifest diff clean) |
| `npm run check:generated:preview` | pass |
| `npm run build:production -- --origin https://glossquote.com` (twice) | **byte-identical** (manifest diff clean) |
| `npm run check:generated:production` | pass |
| `node --check` on `app.js`, `core/frame-row-marking.mjs`, all four scripts | syntax OK |

## Test coverage

- All 8 fixtures from `fixtures.json` reproduced verbatim with
  `assert.deepStrictEqual`: 6 solve cases (center, top, exact-gap, short,
  hook-out, fractional-wall) and 2 flow cases (dirty-after-edit,
  cancel-then-late).
- Hand-derived from the SPEC's own rules (never from implementation output):
  half-up rounding (1.25 mm gap → 1.3 mm; 100.5 mm center offset → 100.5),
  hook exactly on the frame edge allowed, hookTop OFFSET, deficit counting
  the minimum gap on every segment, 12-frame cap vs 1/13 RANGE, integer
  bounds (spanMm 0/20001, minGapMm 2001, wMm 0), TYPE cases (string number,
  -0, NaN, null/array root, non-object frame), ENUM, SHAPE (unknown/missing
  root and frame keys), SIZE (>65536 UTF-8 bytes, checked before shape),
  names (U+0020 trim, NFC duplicate, empty/leading-symbol/emoji/25-code-point
  refusals, digit-first allowed), no input mutation, `formatMm`, the form
  helpers' syntax refusals (blanks, leading zeros, full-width digits, signs,
  decimals, exponents, >12 chars), and the flow runId gate (second run while
  busy ignored, unknown runId no-op, cancel outside busy no-op, reset,
  core-error settle, infeasible settle).

## HTTP probe (loopback, `node scripts/serve.mjs 8345`, killed after)

- `/index.html` 200, title 相框掛點定位｜Gloss Tools
- `/en/index.html` 200, title Frame Row Marking | Gloss Tools
- `/js/app.js`, `/js/core/frame-row-marking.mjs`, `/styles/app.css` 200
- Path traversal (`/..%2f..%2fpackage.json`) 404
- Response headers: the SPEC's CSP verbatim and `X-Content-Type-Options: nosniff`

## Spec errata

**None.** All 8 printed fixtures reproduce exactly from the SPEC's own rules.

## Interpretations (SPEC silent or ambiguous; recorded for the reviewer)

1. **Unknown-key SHAPE path:** an unknown key returns SHAPE at the containing
   object's path (root → `""`, frame → `/frames/i`); a missing key returns
   SHAPE at that key's path. This follows the SPEC's wording （未知鍵回該物件
   固定路徑。缺少鍵回該已知鍵路徑。).
2. **Name failure codes:** empty/invalid characters → TYPE; over 24 code
   points → RANGE. The SPEC pins the N shape but not the code per failure.
3. **REF unused:** the SPEC lists a REF code for unresolvable references, but
   this contract has no references; no REF path exists.
4. **Preview canonicals:** `https://glossquote.com/tools/frame-row-marking/…`
   (the SPEC itself names `https://glossquote.com/` as the home page, so no
   domain was invented). The production build rewrites them to the confirmed
   `--origin` and adds robots.txt + sitemap.xml.
5. **Bug found and fixed during this build:** the first draft of
   `parseIntegerField`/`validateNameField` returned the full solve-shaped
   error object inside `{error: …}` instead of the inner `{code, path}`, so
   the app's error display would have read `undefined` codes. Fixed in the
   core (helpers now return the inner `{code, path}`); caught by the new
   helper tests before any commit.

## NOT_RUN

- Real-browser rendering/interaction (Chrome/Edge, keyboard-only, touch,
  320 CSS px, 200% zoom, reduced motion, focus order, reorder-then-recalc)
- Real devices/touch, assistive tech, measured contrast of the tool's own UI
- Network/Storage observation in a real browser (the code has no fetch or
  storage calls; only static audit done here)
- Deployment, production HTTPS header/SEO check on a live origin
- Independent nine-aspect review (pending by design in build-first mode)
