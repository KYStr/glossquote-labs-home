# 詞彙與字元頻率計數 · Word and Character Frequency Counter

完全在本機瀏覽器運算的頻率計數工具：詞彙表收所有非漢字類的 Unicode
字母與數字詞（希臘、西里爾都在內），字元表逐字計漢字、假名、諺文，
雙字元組只取連續漢字對。計數規則固定、公開、可手算重現。

A frequency counter that runs entirely in your browser. The Words
table takes every Unicode letter/number token outside the CJK
classes (Greek and Cyrillic included), the Characters table counts
Han, kana and Hangul one by one, and Bigrams take adjacent pairs
inside Han runs. The counting rules are fixed, published, and
reproducible by hand.

## 規則摘要 · Rules in brief

- 詞彙比對用 Unicode 簡單摺疊（CaseFolding.txt 16.0.0 的 C 與 F
  條目，vendored 為資料檔，來源與雜湊在 `PROVENANCE.md`）：Σ 與 ς
  都摺成 σ，轉小寫做不到這一點。顯示形式取最常見的原始寫法。
- Word matching uses Unicode simple case folding (the C and F
  entries of CaseFolding.txt 16.0.0, vendored as data; source and
  hashes in `PROVENANCE.md`): Σ and ς both fold to σ, which
  lowercasing cannot reproduce. Display forms are the most frequent
  original casings.
- 中文不做斷詞：逐字與雙字元組取代分詞，標點斷段；字元表不做
  Unicode 正規化。停用詞（英文＋中文字元，資料檔出貨、可在頁面
  編輯）在計總數前排除，總數是篩選後總數。
- Chinese is not segmented: characters and bigrams stand in for
  word segmentation, punctuation ends runs, and the Characters
  table does not normalise. Stopwords (English + Chinese
  characters, shipped as data, editable in the page) apply before
  totals, so totals are after filters.
- CSV 永遠匯出完整篩選表；輸入上限 200,000 字元，超過拒絕。
- CSV always exports the full filtered table; input is capped at
  200,000 characters and refused beyond it.

## 本地開發 · Local development

```sh
npm run dev    # serve public/ locally
npm test       # node:test suites (core + controller, deterministic fakes)
npm run check  # project policy + fold-table provenance + fixture re-assertion
npm run build  # preview build into dist/ (production refused: no approved origin)
```

零相依套件，Node 24。Zero dependencies, Node 24. The fold table is
generated at authoring time by `scripts/fetch-casefolding.mjs` and
never fetched at runtime or in tests.

## 規格 · Specification

實作依 `KYStr/glossquote-labs-home` 的
`docs/specs/word-frequency/SPEC.md`（修訂後候選）。本 repo 為
build-first 候選：登記簿的製作登記與送審保留到之後的整批審查階段，
狀態見 `PRODUCTION-STATUS.md`，證據見 `VERIFICATION.md` 與
`CANDIDATE-MANIFEST.json`。

Built to `docs/specs/word-frequency/SPEC.md` in
`KYStr/glossquote-labs-home` (the revised candidate). This
repository is a build-first candidate: registry production
registration and submission are held for the later bulk-review
phase — see `PRODUCTION-STATUS.md`; evidence is in
`VERIFICATION.md` and `CANDIDATE-MANIFEST.json`.
