# UUID 產生器與檢查器 · UUID Generator and Inspector

完全在本機瀏覽器運算的 UUID 工具：依 RFC 9562 產生版本 4（隨機）與版本 7
（Unix 時間）的 UUID，可選大小寫與連字號、整批複製或下載；檢查器則嚴格
驗證貼上的值，報告格式、版本、變體，以及 v1 / v7 內嵌的時間。

A UUID tool that runs entirely in your browser. It generates RFC 9562
version 4 (random) and version 7 (Unix time) UUIDs with case and hyphen
options, copy-all and download, and strictly inspects any pasted value:
well-formedness, version, variant, and the time a v1 or v7 value encodes.

## 規則摘要 · Rules in brief

- 產生：v4 與 v7 僅此兩種；每批 1–1000 個；亂數只來自
  `crypto.getRandomValues`，整批共用一次批次呼叫。批次文字以 LF 連接
  並以 LF 結尾，下載檔名 `uuids.txt`。
- Generation: v4 and v7 only; batches of 1–1000; randomness comes only
  from `crypto.getRandomValues`, filled in one batched call. Batch text
  joins values with LF and ends with a final LF; the download is named
  `uuids.txt`.
- 檢查：只接受 36 字元含連字號或 32 字元純十六進位形式；錯誤依
  「空白 → 長度 → 連字號位置 → 非十六進位字元」的順序報告第一項。
  v1 時間以 BigInt 精確換算並截斷到毫秒；v6 辨識但不解碼時間。
- Inspection: only the 36-character hyphenated form or the 32-character
  hex form is accepted; the first error is reported in the order empty,
  length, hyphen position, non-hex character. v1 timestamps use exact
  BigInt arithmetic truncated to milliseconds; v6 is recognised but its
  timestamp is not decoded.
- UUID 是識別碼，不是密碼或權杖；檢查結果只代表「格式正確」，不代表
  真實或屬於任何人。
- UUIDs are identifiers, not passwords or tokens; a "well-formed"
  verdict says nothing about authenticity or ownership.

## 本地開發 · Local development

```sh
npm run dev    # serve public/ locally
npm test       # node:test suites (core + controller, deterministic fakes)
npm run check  # project policy + normative fixture re-assertion
npm run build  # preview build into dist/ (production refused: no approved origin)
```

零相依套件，Node 24。Zero dependencies, Node 24.

## 規格 · Specification

實作依 `KYStr/glossquote-labs-home` 的 `docs/specs/uuid-tools/SPEC.md`
（RFC 9562）。本 repo 為 build-first 候選：登記簿的製作登記與送審保留到
之後的整批審查階段，狀態見 `PRODUCTION-STATUS.md`，證據見
`VERIFICATION.md` 與 `CANDIDATE-MANIFEST.json`。

Built to `docs/specs/uuid-tools/SPEC.md` in `KYStr/glossquote-labs-home`
(RFC 9562). This repository is a build-first candidate: registry
production registration and submission are held for the later bulk-review
phase — see `PRODUCTION-STATUS.md`; evidence is in `VERIFICATION.md` and
`CANDIDATE-MANIFEST.json`.
