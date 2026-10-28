# 批次文字套版

**English:** Personalized text batch  
**狀態：** 產品規格，尚未實作。

## 你要完成的工作

活動主辦人拿到 CSV 名單和一段通知範本，想產生每個人各自的文案，避免手動複製貼上時改錯姓名或漏資料。這個工具逐列預覽、單筆複製，並一次下載全部 TXT 或 JSON。

MVP 一句話：用 `{{欄名}}` 將 CSV 的字串值單次套入靜態範本；空值或未知欄位會先擋下並指出問題，不會替你寄送。

## 為什麼有用

它完成「名單 → 個人化文案 → 人工檢查 → 本機匯出」整段工作，包含缺值診斷和逐筆核對。它不是文字取代器，也不含寄信／傳訊功能；欄位值不會再被當成模板指令執行。

## 環境與難度

一般桌面瀏覽器、Node.js 24+ 開發／測試；靜態 HTML/CSS/瀏覽器 ESM，無 runtime 套件、帳戶、API 或上傳。難度中等：CSV quoting、template scanner、輸出 byte cap 和文字安全需同時一致。

## 不包含

- 不寄信、不發訊、不連接 CRM 或通訊平台。
- 不支援條件、迴圈、函式、巢狀模板或 eval。
- 不會用姓名組檔名、不讀剪貼簿、不自動送出。
- 不會推測缺值、產生不存在的個人資訊或保存名單。

## 閱讀順序

看 [產品需求](PRODUCT.md)、[技術契約](TECHNICAL.md)、[介面與搜尋資料](UX-SEO.md)、[驗收 oracle](ACCEPTANCE.md)、[實作順序](TASKS.md)。共用規則見 `docs/BRAND.md`、`docs/ENGINEERING.md`、`docs/PRIVACY-SECURITY.md`、`docs/DESIGN-SYSTEM.md`。

English summary: Turn a CSV list and a literal `{{column}}` message template into reviewed per-row text. Missing values block generation by default. Copy or download the results locally; nothing is sent.
