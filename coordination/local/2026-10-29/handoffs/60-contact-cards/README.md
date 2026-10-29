# 名單轉通訊錄

**這是規格，尚未實作。** 把一份 CSV 名單映射到姓名、電話、email、組織與備註，先預覽每筆聯絡人及相同資料群組，再下載一個 vCard 3.0 `.vcf`。姓名保留為完整顯示名稱，不猜姓氏/名字；電話不補國碼、不改前導 `0` 或 `+`。

M1 使用 Node.js 24+、瀏覽器原生 HTML/CSS/ESM，零依賴。CSV 和 VCF 只在目前頁面記憶體處理；沒有雲端/API/帳號，也不自動匯入裝置通訊錄。通訊錄 app 實際匯入相容性尚待手動驗證。

本規格採 RFC 2426 vCard 3.0，輸出 UTF-8；為避免切斷多位元字元，以每條實體行最多 75 UTF-8 bytes 折行。官方依據和產品的相容性界線見 [TECHNICAL.md](TECHNICAL.md)。M1 頁面與 dist 均 noindex，尚未實作。

閱讀順序：[PRODUCT.md](PRODUCT.md) → [TECHNICAL.md](TECHNICAL.md) → [UX-SEO.md](UX-SEO.md) → [ACCEPTANCE.md](ACCEPTANCE.md) → [TASKS.md](TASKS.md)。共通規則見 [AGENTS.md](AGENTS.md) 和 [docs/](docs/)。
