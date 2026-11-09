# Provenance — vendored Unicode case folding table

Per SPEC sections 4 and 5, the case folding table ships as a
generated data module (`public/js/core/casefold.mjs`), produced by
`scripts/fetch-casefolding.mjs` from the Unicode `CaseFolding.txt`
for the pinned version below. It is never fetched at runtime or in
tests.

- Source: https://www.unicode.org/Public/16.0.0/ucd/CaseFolding.txt
- Unicode-Version: 16.0.0
- Retrieved: 2026-11-02
- Source-SHA-256: 6f1f9c588eb4a5c718d9e8f93b782685e5c7fec872cf05e8e6878053599e09bb
- Entries: 1484
- Count-C: 1453
- Count-S: 31
- Table-SHA-256: 0478c5bf88872a05df2917e321fe1c0e2442fc7b4e3e94aed4d9f408de4c392b

## Unicode 16 simple case folding

SPEC section 4 defines the token key fold as **Unicode simple case
folding** and states behaviourally that İ (U+0130) "has no simple
fold mapping and is unchanged by the fold", that Σ and ς both fold
to σ, and that `I` folds to `i` with no Turkish special case. In
`CaseFolding.txt`, simple case folding is exactly the status **C**
and **S** entries (S overriding C where both exist): İ carries
only an F (full folding) entry, so it is unchanged under C+S, and
every behavioural statement in the SPEC holds.

The [maintenance errata](ERRATA.md) resolves the conflicting parenthetical
in the frozen specification. The shipped table uses the 1,484 C+S entries.
The F entry for İ would expand it to `i` + U+0307 under full case folding.

The Table-SHA-256 is the SHA-256 of the sorted `HEXKEY<TAB>folded`
lines joined with LF (UTF-8), recomputed by the project check from
the shipped module on every run; the check fails if the shipped
entry count or checksum differs from the values recorded here.

The bundled stopword defaults ship as data modules too
(`public/js/core/stopwords-en.mjs`,
`public/js/core/stopwords-cjk.mjs`); they are small curated lists
written for this tool, printed in full in the product's help, and
editable in the session UI.
