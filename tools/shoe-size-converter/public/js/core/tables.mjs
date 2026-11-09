// Shoe-size conversion tables — auditable data, transcribed from one named source.
// Source: Wikipedia, "Shoe size" (en.wikipedia.org/wiki/Shoe_size), the ISO/TS 19407-based
// conversion tables, as fetched on 2026-11-02 for the specification and re-verified at
// transcription on 2026-11-09. Provenance, row counts and this file's SHA-256 are recorded
// in DATA-SOURCE.md (tool root); the build and the test suite verify them and fail on drift.
//
// Adult rows: the article's "Mondopoint conversion" table — Mondo 215-320 mm in 5 mm steps,
// columns EUR / UK / US men / US women. Category men reads usMen, women reads usWomen;
// EUR and UK are shared. The JP label is never stored: it is mondo / 10 by definition.
// Kids rows: the article's ISO/TS 19407 "Size equivalence table, children", taking the rows
// keyed by Mondopoint (120-195 mm in 5 mm steps) with EUR / UK kids / US kids as printed on
// each such row. Where the source table assigns no label on a Mondopoint row, the cell is
// null here — no value is interpolated or borrowed from a neighbouring row. The source's
// 200-210 mm rows carry adult-scale values in parentheses, not kids labels, so the kids
// table ends at 195 mm. See DATA-SOURCE.md for the full transcription note.

export const ADULT_ROWS = [
  { mondo: 215, eur: 34, uk: 2.5, usMen: 3.5, usWomen: 4.5 },
  { mondo: 220, eur: 35, uk: 3, usMen: 4, usWomen: 5 },
  { mondo: 225, eur: 35.5, uk: 3.5, usMen: 4.5, usWomen: 5.5 },
  { mondo: 230, eur: 36.5, uk: 4, usMen: 5, usWomen: 6 },
  { mondo: 235, eur: 37, uk: 4.5, usMen: 5.5, usWomen: 6.5 },
  { mondo: 240, eur: 38, uk: 5.5, usMen: 6.5, usWomen: 7.5 },
  { mondo: 245, eur: 38.5, uk: 6, usMen: 7, usWomen: 8 },
  { mondo: 250, eur: 39.5, uk: 6.5, usMen: 7.5, usWomen: 8.5 },
  { mondo: 255, eur: 40, uk: 7, usMen: 8, usWomen: 9 },
  { mondo: 260, eur: 41, uk: 7.5, usMen: 8.5, usWomen: 9.5 },
  { mondo: 265, eur: 41.5, uk: 8.5, usMen: 9.5, usWomen: 10.5 },
  { mondo: 270, eur: 42.5, uk: 9, usMen: 10, usWomen: 11 },
  { mondo: 275, eur: 43, uk: 9.5, usMen: 10.5, usWomen: 11.5 },
  { mondo: 280, eur: 44, uk: 10, usMen: 11, usWomen: 12 },
  { mondo: 285, eur: 44.5, uk: 10.5, usMen: 11.5, usWomen: 12.5 },
  { mondo: 290, eur: 45.5, uk: 11, usMen: 12, usWomen: 13 },
  { mondo: 295, eur: 46, uk: 12, usMen: 13, usWomen: 14 },
  { mondo: 300, eur: 47, uk: 12.5, usMen: 13.5, usWomen: 14.5 },
  { mondo: 305, eur: 47.5, uk: 13, usMen: 14, usWomen: 15 },
  { mondo: 310, eur: 48.5, uk: 13.5, usMen: 14.5, usWomen: 15.5 },
  { mondo: 315, eur: 49, uk: 14, usMen: 15, usWomen: 16 },
  { mondo: 320, eur: 50, uk: 15, usMen: 16, usWomen: 17 },
];

export const KIDS_ROWS = [
  { mondo: 120, eur: 20, uk: 4, us: 4.5 },
  { mondo: 125, eur: 20.5, uk: 4.5, us: 5 },
  { mondo: 130, eur: 21.5, uk: 5.5, us: null },
  { mondo: 135, eur: 22.5, uk: 6, us: 6.5 },
  { mondo: 140, eur: 23, uk: 6.5, us: null },
  { mondo: 145, eur: 24, uk: 7.5, us: null },
  { mondo: 150, eur: 24.5, uk: null, us: 8 },
  { mondo: 155, eur: 25, uk: 8, us: 8.5 },
  { mondo: 160, eur: 26, uk: 9, us: null },
  { mondo: 165, eur: 27, uk: 9.5, us: 10 },
  { mondo: 170, eur: 27.5, uk: 10, us: 10.5 },
  { mondo: 175, eur: 28.5, uk: 11, us: 11.5 },
  { mondo: 180, eur: 29, uk: 11.5, us: null },
  { mondo: 185, eur: 30, uk: 12, us: 12.5 },
  { mondo: 190, eur: 30.5, uk: 12.5, us: 13 },
  { mondo: 195, eur: 31.5, uk: 13.5, us: null },
];
