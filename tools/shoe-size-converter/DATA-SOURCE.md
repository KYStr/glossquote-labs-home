# Data source and transcription record — Shoe Size Converter

This file is the provenance gate required by SPEC section 4. The build
(`scripts/build.mjs`), the static check (`scripts/check.mjs`) and the test suite
(`test/data-gate.test.mjs`) all re-read the machine-checkable block below and fail on
any mismatch with the shipped data file, so a silent table edit cannot pass unnoticed.

## Source

- Source name: Wikipedia, "Shoe size" — the ISO/TS 19407-based conversion tables
  reproduced in that article.
- Source URL: https://en.wikipedia.org/wiki/Shoe_size
- Access date (specification drafting fetch): 2026-11-02
- Access date (this candidate's transcription, re-verified against the article as
  retrieved; every SPEC fixture and pinned endpoint row matched): 2026-11-09
- Data file: `public/js/core/tables.mjs`

## Machine-checkable record

- Adult table rows: 22
- Kids table rows: 16
- SHA-256: 82c0cf6d743ecc955eed5d81b0849f1f108f680fe400314b74a4bd91ab3e5f13

## What was transcribed

Adult table (22 rows, Mondopoint 215–320 mm in 5 mm steps): the article's
"Mondopoint conversion" table, columns Mondo / EUR / UK / US men / US women.
It begins 215 → EUR 34, UK 2.5, US men 3.5, US women 4.5 and ends
320 → EUR 50, UK 15, US men 16, US women 17, exactly as SPEC section 4 pins.
Category `men` reads the US men column, `women` reads US women; EUR and UK are
shared. The article's large "Size equivalence table, adult" is a merged
multi-increment grid and is NOT the pinned source; the Mondopoint-keyed
conversion table is. The JP label is not stored: JP = mondo ÷ 10 by definition.

Kids table (16 rows, Mondopoint 120–195 mm in 5 mm steps): the article's
ISO/TS 19407 "Size equivalence table, children", taking the rows keyed by
Mondopoint, with EUR / UK kids / US kids exactly as printed on each such row.

Transcription limits, recorded honestly rather than patched over:

1. On some Mondopoint rows the source children's table assigns no label in one
   system (the merged grid's UK/US increments do not intersect every 5 mm step).
   Those cells are `null` in the data file — US kids is unassigned on Mondopoint
   130, 140, 145, 160, 180 and 195; UK kids is unassigned on Mondopoint 150.
   No value was interpolated, rounded from a formula, or borrowed from a
   neighbouring row. The UI shows "—" for such a cell and says why.
2. The source's 200, 205 and 210 mm rows carry UK/US values in parentheses on the
   adult scales, not kids labels, so the kids table ends at 195 mm.
3. The source children's table carries an editorial notice that it may require
   cleanup and does not match its companion figure. The transcription follows the
   printed cells exactly; the notice is recorded here for the reviewer.

## Reviewer spot-check

Per SPEC sections 4 and 6, the independent reviewer should spot-check at least
five rows against the source, including the fixture rows: adult Mondopoint
270 (D1), 265 (D2), 245 (D3), 280 (D4) and 215 (D5), plus any kids rows.
