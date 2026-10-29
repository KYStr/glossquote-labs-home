# 報價單快速製作

**這是規格，尚未實作。** 本工具讓接案者把雙方名稱、最多 50 項品項、數量、單價、固定折扣及自訂稅率整理成一份可預覽的靜態報價單，並下載 HTML 與可再匯入編輯的 JSON。計算以整數分處理，不把報價說成發票，也不判斷稅務或法律效力。

M1 是雙語、靜態、離線候選工具；Node.js 24+、原生 ESM、HTML、CSS、瀏覽器 API，零依賴。資料留在目前頁面記憶體；只有明確按下載時才交給瀏覽器下載。沒有帳號、雲端、匯率、付款、寄送或背景儲存。

正式網域與索引設定待主代理的 M2/M3 發布決定。M1 預覽必須 `noindex`。目前沒有可執行產品或已通過驗收的聲明。

閱讀順序： [PRODUCT.md](PRODUCT.md) → [TECHNICAL.md](TECHNICAL.md) → [UX-SEO.md](UX-SEO.md) → [ACCEPTANCE.md](ACCEPTANCE.md) → [TASKS.md](TASKS.md)。共通規則見 [AGENTS.md](AGENTS.md)、[docs/ENGINEERING.md](docs/ENGINEERING.md)、[docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md) 與 [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md)。
