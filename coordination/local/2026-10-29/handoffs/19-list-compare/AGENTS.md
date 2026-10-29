# 名單比對與合併專案規則

本檔僅適用於此產品資料夾；根專案 AGENTS.md、Windows 環境安全規則、GlossQuote 工具家族交付契約仍優先適用。產品目前為 SPEC_ONLY，不能把規格狀態寫成已實作或已驗收。

## 工作所有權

- M1 實作者只修改本資料夾中 TASKS.md 明列的 M1 允許路徑。
- 專用證據只能放在孵化器根的 .runs/list-compare/；不得把個人輸入、貼上名單、瀏覽器資料或秘密寫入證據。
- M2 來源發布暫存只能使用 .runs/github-publish/glossquote-labs-list-compare/；M2 未放行前不得建立或更新公開 repo。
- 不操作根 Git、不改共用首頁、不改其他產品、不部署、不購買服務、不讀取憑證或瀏覽器保存資料。
- 不新增執行期依賴。使用 Node.js ESM 與內建模組；瀏覽器 UI 以原生 HTML/CSS/JavaScript 為主。

## 行為不變條件

- A/B 是兩組資料集合，逐行記錄不是 diff 對齊。重複項目在各側去重，但需留下該側重複次數與首次行號。
- 預設大小寫敏感；忽略大小寫僅使用 JavaScript String.prototype.toLowerCase，無 locale、NFKC 或其他 Unicode 正規化。
- 輸出順序固定、可重現，不洗牌。A 的順序主導 A-only、交集與合併的 A 部分；B-only 按 B 順序；合併先 A 再加 B 中未見鍵。
- 結果不能暗中沿用舊版。輸入、trim 或大小寫選項每次變更立刻清除結果並停用複製。
- 不存檔、不上傳、不使用 localStorage、sessionStorage、IndexedDB、cookie、遙測或外部網路。
- 將使用者文字以文字節點呈現；不得透過 innerHTML 建立使用者名單內容。
- 複製只能由使用者明確觸發；失敗時提供唯讀可選取文字，不自動回退下載。

## 停止條件

若要放寬輸入上限、改變正規化/比較語義、加入檔案上傳、持久化、regex、分享、外部函式庫、額外網路、付費功能、憑證或權限，停止並向主代理說明原因與最小問題。不要自行擴大規格。
