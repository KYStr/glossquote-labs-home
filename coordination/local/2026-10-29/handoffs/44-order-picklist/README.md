# 訂單揀貨與裝箱單

**English:** Order picking and packing lists  
**狀態：** 產品規格，尚未實作。

## 你要完成的工作

小店把多筆訂單匯出後，通常先去貨架集中揀商品，再逐張訂單檢查裝箱。這個工具從 CSV 對應訂單編號、SKU、品名和數量，產生 SKU 總揀貨表，以及每張訂單的裝箱清單。

MVP 一句話：把可核對的訂單明細轉成一份依 SKU 彙總的揀貨表和逐單裝箱表，同名異 SKU 仍分開，矛盾品名會停止生成。

## 為什麼有用

它串起「匯出明細 → 找出欄位 → 合併相同 SKU 數量 → 倉庫集中揀貨 → 逐單打包核對」完整流程。它不是庫存系統、訂單管理平台或單純加總器，且不接觸付款或客戶地址。

## 環境與難度

一般瀏覽器、Node.js 24+ 開發／測試；靜態 HTML/CSS/ESM，沒有 runtime 依賴、API、帳戶或上傳。中等難度，重點是嚴格 CSV、SKU 字串不變、穩定彙總順序和防止品名歧義。

## 不包含

- 不連 Shopify、POS、倉庫或物流；不讀取地址、付款或客戶聯絡資訊。
- 不扣實際庫存、不處理退貨、運費或部分出貨。
- 不依品名合併 SKU，不把 `001` 和 `1` 視為相同。
- 不匯出可執行 HTML、CSV 公式或列印標籤。

## 閱讀順序

[產品需求](PRODUCT.md)、[技術契約](TECHNICAL.md)、[介面與搜尋資料](UX-SEO.md)、[驗收 oracle](ACCEPTANCE.md)、[實作順序](TASKS.md)。共用規則見 `docs/BRAND.md`、`docs/ENGINEERING.md`、`docs/PRIVACY-SECURITY.md`、`docs/DESIGN-SYSTEM.md`。

English summary: Convert a local order-lines CSV into a consolidated SKU pick sheet and per-order packing lists. Exact IDs stay strings, quantity conflicts stop the run, and the tool never connects to customers or inventory systems.
