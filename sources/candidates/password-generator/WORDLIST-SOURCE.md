# Wordlist source and licence

The passphrase word list shipped in `public/js/core/wordlist.mjs` is the
**EFF Large Wordlist** published by the Electronic Frontier Foundation
for its diceware-style passphrase method.

- Source file: `eff_large_wordlist.txt`
- Official URL: https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt
- Retrieved: 2026-11-02
- SHA-256 of the retrieved source file:
  `addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e`
- Format: 7,776 lines of `NNNNN<TAB>word` (five dice digits and a word).
  The data module carries the word column verbatim, in source order;
  tests assert exactly 7,776 unique entries, first `abacus`, last
  `zoom`.
- Licence: the EFF word lists are published by the Electronic Frontier
  Foundation under the Creative Commons Attribution 3.0 United States
  licence (CC BY 3.0 US); this file is the attribution record.

Noted honestly: four entries contain a hyphen (`drop-down`, `felt-tip`,
`t-shirt`, `yo-yo`). The list is shipped verbatim anyway — it is the
canonical 7,776-word list the specification's size and entropy
accounting (words × log2(7776)) refer to; altering it would silently
change the artefact's identity. The hyphenated entries behave like any
other word in selection and in the checker's dictionary scan.
