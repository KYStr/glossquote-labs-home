# 文字分段與字數限制專案規則

狀態：SPEC_ONLY。只按當期 TASKS 的 milestone 和 allowed paths 執行。

- 先讀 START-HERE、六份產品文件和 docs/，一次只完成一個階段；失敗不得勾選後續。
- 來源只在目前頁面記憶體；沒有 localStorage/IndexedDB/cookie/URL state/帳號/雲端/API/telemetry/CDN/外部字體/runtime dependencies。
- 每片必須可原樣拼回輸入。CRLF/CR/LF 不 normalize、不 trim、不加分隔符。計數嚴格是 Unicode code point，不是假稱 grapheme/emoji/平台長度。
- 超過 1000 段整份拒絕；不得回傳部分輸出。來源/上限/mode 變更立即清結果。
- 原文是不可信純文字，只用 textContent/value。不得把來源寫入 console/network/storage。
- clipboard async 只由使用者點擊觸發；busy 時鎖編輯，保留 revision/request id；promise reject 需真實選取 fallback，不偽稱成功。
- Node >=24、ESM、built-in node:test；dev server 只 127.0.0.1:4203/public。自動 tests 不取代 browser/clipboard 測試。
- Windows system state 不可為方便更改，嚴守 docs/ENGINEERING。禁止讀憑證、root Git destructive commands、外部 publishing / deployment / homepage edits。
- M2 必須等 primary release gate；M3 由主代理部署。所有結果/缺口在 HANDOFF、TASK-ENTRY 和 project.json 保持一致。
