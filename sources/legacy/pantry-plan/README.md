# 食材差額採買單 · Pantry-aware shopping list

把數道料理的材料需求合併，扣掉現有庫存，得到還要買多少、已有足夠的項目及來源明細。支援繁體中文與英文；輸入只留在目前頁面記憶體，沒有帳戶、自動保存或上傳。

Combine ingredient needs from several dishes, subtract stock once per compatible ingredient group, and export what is still needed. Chinese and English are included. Inputs remain in page memory without accounts, automatic storage or uploads.

這個 repository 提供 0.1.0 原始碼。原始碼公開、正式網站部署與外部驗收分開記錄；此版本的 hosting 尚待主代理處理，外部驗收尚未通過。驗證與限制見 [HANDOFF](HANDOFF.md)。

## 使用與界線

- 輸入料理材料與現有庫存，產生採買清單，查看足夠項目及材料來源。
- 僅 g/kg、ml/L 互換；重量與體積分開，piece 與不同自訂計數標籤分開。材料名按 NFC/trim 後精確比對，不猜同義詞。
- 可下載採買 TXT、完整 JSON 報告與可再匯入的專案 JSON。匯入先預覽，確認後才替換；已買勾選不寫入專案。
- 重新整理、離頁或切換語言會失去未匯出的內容。此工具不判斷飲食、營養或保存安全。

## 離線開發與驗證

需要 Node.js 24+ 和隨附 npm；零外部 runtime/dev dependencies，不需要 npm install。

```text
npm test
npm run check
npm run build
npm run build:release
npm run check:release
```

`build` 產生 noindex 預覽 `dist/`。`build:release` 產生正式網站候選 `release-artifacts/site/` 與外部 `manifest.json`；產物不追蹤進 Git，應從固定 commit 重建。`check:release` 核對固定來源、設定、SEO、allowlist、全部 bytes 與 SHA-256。既有受損或不完整產物會拒絕，程式不自行刪除或修復。

選用 `npm run dev` 是 loopback-only 開發伺服器，預設 `127.0.0.1:4234`；本次發布驗證沒有啟動伺服器或瀏覽器。

固定部署設定見 [wrangler.jsonc](wrangler.jsonc)：assets-only、`shopping-list.glossquote.com`、2026-10-24，Workers.dev／preview URLs／metrics／observability 均停用。這個設定不是已部署的證據。

設計規格見 [PRODUCT](PRODUCT.md)、[TECHNICAL](TECHNICAL.md)、[UX-SEO](UX-SEO.md)、[ACCEPTANCE](ACCEPTANCE.md)。規格描述預定契約；實際已驗範圍以 [HANDOFF](HANDOFF.md) 為準。
