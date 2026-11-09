# HTML 實體編碼與解碼 · HTML Entity Encoder and Decoder

完全在本機瀏覽器運算的 HTML 字元參照轉換工具：編碼可只處理五個必要
字元，或連非 ASCII 一併轉換（命名／十進位／十六進位三種形式）；解碼
照 WHATWG 標準規則，附逐筆變更清單與無法解析清單，遺失的轉換從不
沉默。

An HTML character-reference converter that runs entirely in your
browser. Encoding escapes just the mandatory five, or every non-ASCII
character too (named, decimal, or hexadecimal forms); decoding follows
the WHATWG rules and reports every replacement and every unresolved
token, so a lossy conversion is never silent.

## 規則摘要 · Rules in brief

- 命名表是完整的 WHATWG 命名字元參照集（2,231 條，其中 2,125 個
  分號形式），vendored 為資料檔，來源、條目數與雜湊記錄在
  `PROVENANCE.md`，專案檢查每次重算驗證。解碼只查分號形式；
  省略分號的舊式寫法保持原樣。
- The named table is the complete WHATWG set (2,231 entries, 2,125 of
  them semicolon forms), vendored as data; source, counts and hashes
  are recorded in `PROVENANCE.md` and re-verified by the project check
  on every run. Decoding looks up semicolon forms only; semicolon-less
  legacy forms stay literal.
- 數字參照：0、代理對、超過 U+10FFFF → U+FFFD；0x80–0x9F 經 C1
  對照表；缺少分號仍轉換但會標明。變更位置以字碼點計。
- Numeric references: 0, surrogates and values above U+10FFFF become
  U+FFFD; 0x80–0x9F go through the C1 remap table; a missing semicolon
  still converts but is flagged. Change positions are code-point
  indices.
- 解碼是看懂文字，不等於淨化；輸出看似標記也只會以文字呈現。
- Decoding shows what the text says; it is not sanitisation, and
  markup-looking output renders as inert text.

## 本地開發 · Local development

```sh
npm run dev    # serve public/ locally
npm test       # node:test suites (core + controller, deterministic fakes)
npm run check  # project policy + provenance + normative fixture re-assertion
npm run build  # preview build into dist/ (production refused: no approved origin)
```

零相依套件，Node 24。Zero dependencies, Node 24. The entities table
is generated at authoring time by `scripts/fetch-entities.mjs` and
never fetched at runtime or in tests.

## 規格 · Specification

實作依 `KYStr/glossquote-labs-home` 的
`docs/specs/html-entity-tools/SPEC.md`（WHATWG HTML 標準字元參照規則）。
本 repo 為 build-first 候選：登記簿的製作登記與送審保留到之後的整批
審查階段，狀態見 `PRODUCTION-STATUS.md`，證據見 `VERIFICATION.md` 與
`CANDIDATE-MANIFEST.json`。

Built to `docs/specs/html-entity-tools/SPEC.md` in
`KYStr/glossquote-labs-home` (WHATWG HTML character-reference rules).
This repository is a build-first candidate: registry production
registration and submission are held for the later bulk-review phase —
see `PRODUCTION-STATUS.md`; evidence is in `VERIFICATION.md` and
`CANDIDATE-MANIFEST.json`.
