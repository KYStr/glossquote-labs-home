# Verification — Taiwan Uniform Invoice Prize Check production candidate v0.1

Mode: **BUILD-FIRST** (see `PRODUCTION-STATUS.md`). The wave's single
registry gate experiment (QR Code Maker) was refused with
`SPEC_UNAVAILABLE` — "Production needs a ready spec or the same
previously consumed spec." — so no production task was registered for
this tool; registration/submission is held for the bulk-review phase.

SPEC: `spec-taiwan-invoice-prize-check-v1`, KYStr/glossquote-labs-home
commit `30f48d87235e8f9c0d7c4ea28f920430b0478ddb`,
`docs/specs/taiwan-invoice-prize-check/SPEC.md`
(SHA-256 5d36e46ec1d0253255ebac105dff92ae8c3f790527f3e028a158fc605bbc2ddd).

## SPEC defect found (one worked fixture vs the tier rule)

SPEC section 4's fixtures state `99994444 ⇒ 六獎 (k=3 via second first
number)`. The longest common suffix of `99994444` and the second
first-prize number `33334444` is **4** digits (`4444`), so step 3 of
the SPEC's own tier rule maps it to **五獎** (amount 1,000) — the same
mapping the neighbouring fixture `00002222 ⇒ 五獎 (k=4)` confirms.
The printed k=3 appears to be a hand-derivation slip. This
implementation follows the rule: `checkFull(W, "99994444")` returns
五獎 with note k=4, firstIndex=1, and the test suite additionally
covers a genuine k=3 case via the second number (`99950444` ⇒ 六獎）.
Every other section 4 fixture matches the rule exactly and is asserted
verbatim. The fixture should be corrected at the spec's bulk review.

## Checks run

- `npm run check` — PASS (structure, house CSP/robots/hreflang heads,
  element-id parity, forbidden-token source audit with the SPEC
  section 2(e) clipboard-write exception documented, i18n parity, and
  the SPEC section 4 worked fixtures re-resolved through the core).
- `npm test` — **24/24 pass** (Node v24.22.1): all consistent SPEC
  fixtures verbatim （特別/特獎/頭獎 exact, k=7 二獎， k=6 三獎， k=4
  五獎， additional-set 六獎， 未中獎， quick 678 possible / 999
  cannot-win, full-width 特別獎）; suffix sweep k=0–8 against a
  constructed first-prize number; precedence (exact beats suffix,
  first-suffix beats additional set); setup validation (duplicates
  across kinds and within additional sets, required/length/non-digit,
  full-width conversion, internal-space rejection, leading zeros
  preserved); quick-mode truth table over all four channels with no
  tier/amount fields present; batch mixed valid/invalid rows with
  reasons, 500-line acceptance and 501-line BATCH_LIMIT error,
  trailing-newline handling, summary counts/totals, determinism;
  controller behaviour through a DOM shim (setup gating, duplicate
  error, full-check rows with rule notes and duplicate counting,
  quick honesty, batch table + limit error, clipboard summary copy,
  clear vs two-step setup reset, English boot).
- Build reproducibility: `npm run build` run twice — dist trees
  byte-identical (combined SHA-256 of the sorted file-hash listing
  `910cb417b2ec90df31271ef2074fea83d72d65ef14c210267afeeb80adef2d7c`).
- Local HTTP probes against the house preview server (serves
  `public/`, byte-identical to dist): `/index.html` and
  `/en/index.html` 200 with exact source hashes; `/` 404 by server
  design; missing file 404; traversal 403; POST 405; HEAD 200; house
  CSP/security headers present.

## NOT_RUN (honest gaps)

- Real-browser evidence does not exist in this environment (no browser
  binary): no screenshots in either language, no keyboard-only
  walkthrough, no paste-from-announcement trial in a live page. The
  controller tests run against a DOM shim and are labelled as such.
- SPEC section 7 GUI/evidence items remain for the bulk-review phase;
  the underlying behaviours are covered at core/shim level. All
  fixtures are the SPEC's synthetic numbers — no real announced
  winning numbers are used anywhere.
