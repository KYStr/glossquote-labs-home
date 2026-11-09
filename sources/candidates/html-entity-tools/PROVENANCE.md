# Provenance — vendored WHATWG named character reference table

Per SPEC sections 2 and 5, the named character reference table ships
as a generated data module (`public/js/core/entities.mjs`), produced
by `scripts/fetch-entities.mjs` from the official WHATWG list. It is
never fetched at runtime or in tests.

- Source: https://html.spec.whatwg.org/entities.json
  (WHATWG HTML Standard, named character references)
- Retrieved: 2026-11-02
- Source-SHA-256: d741d877ac77c4194c4ad526b5b4a19aef8dfe411ab840a466891cdbb9f362e6
- Entries: 2231
- Semicolon-Forms: 2125
- Table-SHA-256: 4f298bdc8c2f4ba6f3e9783ea0f756e7600bc6497c2a1a6caf9162044e803df6

The 2,231 entries are the complete published set: 2,125 reference
names in their semicolon form plus the 106 legacy semicolon-less
forms, whose mappings are identical to their semicolon counterparts
(verified at generation time). The table ships all 2,231 verbatim;
the decoder only ever looks up semicolon-terminated names, per SPEC
section 4, and the encoder's canonical-name map is built from the
semicolon forms only.

The Table-SHA-256 is the SHA-256 of the sorted `key<TAB>characters`
lines joined with LF (UTF-8), recomputed by the project check from
the shipped module on every run; the check fails if the shipped
entry count or checksum differs from the values recorded here.
