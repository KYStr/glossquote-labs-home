# 報價單快速製作 / Simple quote builder

Gloss Tools by GlossQuote 的雙語、零依賴報價單工具。填寫雙方名稱、品項、數量、單價、固定折扣及自行選擇的稅率，檢查預覽後下載 quote.html 與可再匯入編輯的 quote.json。金額以 BigInt 固定點逐列進位；單價與數量不經浮點金額中間值。

A bilingual, dependency-free quote worksheet with exact fixed-point amounts, a static HTML export, and editable schema-1 JSON. It does not select tax rates, create invoices, send documents, process payments, or assess legal validity.

## 重現 / Reproduce

需要 Node.js 24+；沒有套件安裝步驟。乾淨 checkout 先建立預覽 dist，因既有離線測試用它建立隔離測資副本：

```text
npm run build
npm test
npm run check
npm run build:release
npm run check:release
```

預覽入口在 dist/index.html、dist/en/index.html；公開發布資產由 release builder 寫到 release-artifacts/site，manifest 位於 sibling。生成目錄不納入 Git。可手動 npm run dev 使用固定 loopback http://127.0.0.1:4237；不要對外暴露本機服務。

## 資料與限制

輸入只在目前頁面記憶體；沒有帳號、網路處理、背景儲存、local/session storage、telemetry、遠端字型或雲端。使用者主動下載 JSON 才保存草稿，匯入經預覽及確認才整份取代。修改立即使舊預覽與下載連結失效。清除不會刪除已下載檔案，也不保證安全抹除記憶體。

最多50項；數量0.001–1000000、最多3位小數；單價0–1000000000、最多2位；固定折扣不超小計。稅率是使用者明示輸入0–100%，工具不確認是否適用。幣別僅是同一文件的顯示標籤，不換匯。JSON匯入與HTML+JSON輸出對各自上限均有512KiB gate。

## 驗證與發布狀態

此儲存庫是已審核原始碼發布；不表示網站已部署或外部驗收通過。Node完整套件49/49；真隔離瀏覽器既有32 PASS、8 NOT_RUN、0 FAIL，未驗範圍保留，見 [VALIDATION](VALIDATION.md)。預定網址是 https://quote.glossquote.com，部署與免費主機驗證由發布者另行完成。

[產品規格](PRODUCT.md)、[技術規格](TECHNICAL.md)、[固定oracle](ACCEPTANCE.md) 與 [UX/SEO](UX-SEO.md) 保留原M1規格歷史；其起頭狀態不覆蓋本README的目前來源狀態。[RELEASE](RELEASE.md) 說明正式資產與安全邊界。
