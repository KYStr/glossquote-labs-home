# 補貨數量試算

依已知期間用量、現貨、到貨天數、安全備量與每包數量，估算本次補貨包數、到貨前可能短缺和目前現貨可用整天數。

這是一份 M0 產品規格；產品尚未實作、測試、發布或部署。MVP 是一個本機處理資料的雙語靜態工具，最多 30 個品項，不需要服務或執行期套件。計算使用精確整數數學，並明確採固定平均耗用假設；零觀測用量合法，仍會依安全備量計算補貨量，但不估算現貨可用天數。

主要使用者是要為家庭或小型工作室補耗材的人。最大價值是不用逐品項手算並重複換算包裝數量；結果仍取決於輸入假設，不包含在途訂單、可變耗用或單位換算。

實作難度中等：表單本身直接，但錯誤優先序、BigInt 精確計算、30 列上限、資料失效和完整報告需要精確處理。Node.js 24+ 只用內建模組做測試/建置/本機伺服器；沒有 runtime 或開發依賴。

請依序閱讀：[PRODUCT.md](PRODUCT.md)、[TECHNICAL.md](TECHNICAL.md)、[UX-SEO.md](UX-SEO.md)、[ACCEPTANCE.md](ACCEPTANCE.md)、[TASKS.md](TASKS.md)。共同契約在 [AGENTS.md](AGENTS.md)、[BRAND.md](docs/BRAND.md)、[ENGINEERING.md](docs/ENGINEERING.md)、[PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md)、[DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) 和 [RELEASE.md](docs/RELEASE.md)。

推薦正式網址為 `https://restock.glossquote.com/index.html` 與 `https://restock.glossquote.com/en/index.html`；目前尚未部署。M1 本機頁必須 noindex。請勿把規格、範例或待驗項目描述成產品已通過驗收。
