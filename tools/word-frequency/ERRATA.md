# Word frequency specification errata

The 2026-11-09 [maintenance decision](../../docs/repairs/blocked-four-2026-11-09/SPEC-ERRATA.md)
clarifies the frozen [word frequency specification](https://github.com/KYStr/glossquote-labs-home/blob/6598ac51cddee252a83685d461589537d56fa3e0/docs/specs/word-frequency/SPEC.md).

- Apply enabled stopwords before counting. Apply the pure-number and minimum
  folded word length settings to the Words table before counting.
- Apply the minimum occurrence count after counting. It filters displayed and
  exported rows. Each percentage divides the row count by the table's counted
  total. The unique item count also covers all counted items. For
  `alpha alpha beta` with a minimum of 2, the total is 3, with two unique items
  and one result row. Alpha appears twice (66.7%).
- Display the top 100 eligible rows by default and export every eligible row
  in the active table as CSV.
- Use the Unicode 16.0.0 simple case folding C+S entries. İ stays İ and ẞ
  folds to ß. See [table provenance](PROVENANCE.md).
