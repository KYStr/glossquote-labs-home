# Verification — Cron Expression Explainer (build-first candidate)

Spec: `spec-cron-explainer-v1`, KYStr/glossquote-labs-home commit
`ff945fae5776ad5f370d3b635d9e38001b48e3aa` (PR #32 head), path
`docs/specs/cron-explainer/SPEC.md` (15,184 bytes, verified
byte-identical to the author's draft before building; the wave brief's
hash `ff945faefc73b56c5ecdc76b93ee04380eae049` does not resolve on
GitHub — the same stale-hash typo waves 3 and 4 found).

## SPEC defect found by implementation (for the bulk-review errata)

The section 4 headline fixture — `*/15 9-17 * * 1-5` from Friday
2026-10-30 16:59 — prints the next runs as "Fri 2026-10-30 17:00,
then Mon 2026-11-02 09:00, 09:15, 09:30". Under the SPEC's own
normative semantics the hour field `9-17` has value set 9..17 (17
included) and `*/15` has minute set {0, 15, 30, 45}, so Friday 17:15,
17:30 and 17:45 also fire, before the weekend skip. The printed list
appears to treat "9-17" as a window ending at 17:00. The
implementation follows the governing semantics (SPEC section 4's
grammar and day-matching rules, stated normatively and repeatedly);
the rule-derived sequence agrees with the printed fixture on its
first run (Fri 17:00) and on all three Monday runs. The core test
asserts the rule-derived sequence and names this defect; the project
check asserts only the runs on which fixture and rules agree.

## Evidence RUN (this environment, Node v24.22.1)

- **Tests: 22/22 pass** (`npm test`). Core suite (17): the leap-day
  fixture (2027-03-01 → 2028-02-29) and never-fires fixture
  (0 0 31 2 *, zero runs, window exhausted, timing recorded with a
  loose ceiling); the OR-rule fixture `0 12 15 * 5` (Fri Nov 6,
  Fri Nov 13, Sun Nov 15) plus its explanation flag; all seven macros
  and the @reboot/unknown-macro errors; MON-FRI ≡ 1-5 set equality;
  the parser sweep — every error class with field and token identity
  (field count with the count found, unknown name, out of range,
  reversed range, step 0/non-numeric, empty item, malformed item, and
  the dialect tokens ?, #, 15W, L in both day fields); mixed-case
  names; WED/JUL correctly read as names, not dialect; a/n ≡ a-max/n;
  DOW 7 normalisation (7, 0-7, 5-7); starred determination for *, */2,
  ranges and values. The day-matching truth table: hard-coded rows for
  OR (both restricted), AND (one or both starred), plus a sweep over
  five dates × four field-shape pairs checked against the stated rule
  (all 16 starred/match combinations). Enumeration edges:
  strictly-after at an exact firing minute; the 31st skipped in
  February and April-length months; the leap day reachable from 2025
  inside the window. Explanation-model kinds (every/single/range/
  step×3/list/summary) and builder canonicalisation (full set → *,
  runs of 2 vs 3, step forms, step-1 collapse) with shape
  classification incl. the DOW 5-7 wrap-to-values case and custom
  detection. Sync suite (5): parse → classify → rebuild → re-parse
  round trips preserve value sets exactly for eight expressions;
  custom shapes are detected; canonical text matches what the
  controls write; invalid input stops at parse with field identity.
- **Project check: PASS** (`npm run check`) — required paths, package
  identity, CSP and head parity, identical id sets, forbidden-
  capability scan (no dynamic code construction anywhere, no storage,
  no network, no clipboard), core and renderer DOM-freedom, explicit
  presence of all nine core error codes and all 40 explanation phrase
  templates (5 fields × 8 kinds) in both languages, and the check's
  own re-assertion of the enumeration/macro/dialect/OR/canonical
  fixtures.
- **Build: byte-identical across two builds** (combined listing
  SHA-256 in CANDIDATE-MANIFEST.json).
- **HTTP probes** against the local preview server: zh and en pages
  200 byte-equal to sources; house CSP / nosniff / no-referrer /
  no-store headers; missing 404; traversal 403; POST 405; HEAD 200.

## Interpretation rulings (for the bulk review)

- **Dialect detection is token-aware.** `?` and `#` anywhere in a
  field are dialect errors; L/W are dialect only as whole items or
  value suffixes (L, L-3, W, 15W, LW/WL), because WED and JUL are
  legitimate names containing those letters and must parse.
- **The never-fires explanation warning** is computed from the
  enumeration the page actually ran (from the user's chosen start
  moment, defaulting to now), so the warning and the runs table can
  never disagree; with the default start this is exactly the SPEC's
  "enumeration from now".
- **Step-mode builder for DOW value 7**: a typed range touching the
  raw 7 (e.g. 5-7) wraps through Sunday, so it is reflected in values
  mode (checkboxes show the normalised set {0,5,6}) rather than a 0–6
  range control that could not represent it.

## Evidence NOT_RUN (honest — no browser binary in this environment)

- All real-browser GUI items from SPEC section 7: fixtures through
  the real UI in both languages with the browser timezone noted,
  builder round-trips in a live page, error-state screenshots,
  keyboard-only completion.
- The SPEC's 1-second worst-case enumeration bound on a mid-range
  laptop browser: the never-fires scan is timed in the Node suite
  (recorded there with a loose ceiling), which is not a browser
  measurement.
- DST-transition behaviour on real platforms (nonexistent local
  times) — enumeration follows platform Date semantics by
  construction, but no real-zone browser pass was run.
- Deployment: none. Nothing is merged, deployed, published or
  catalogued; the preview build is the only build this candidate ships
  (production builds are refused until an origin is approved).
