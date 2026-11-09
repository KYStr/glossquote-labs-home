# 多軌議程衝突檢查

**這是規格，尚未實作。** 輸入同一天的場次、房間、講者與起迄時間，完整檢查場地重疊、講者撞期和不同房間間的轉場不足，並產生每房間/講者議程及修正清單。每一對場次只列一次，巢狀重疊也會檢查。

M1 使用 Node.js 24+、瀏覽器原生 HTML/CSS/ESM，零依賴。沒有帳號、雲端或外部日曆；資料只在頁面記憶體。空房間或空講者名單會標成未指派，相關衝突維度無法判定時會明白說出，不代表安全無衝突。

正式 URL 待主代理決定；M1 noindex。規格與測試 oracle 不代表工具已實作或瀏覽器已驗收。

閱讀順序：[PRODUCT.md](PRODUCT.md) → [TECHNICAL.md](TECHNICAL.md) → [UX-SEO.md](UX-SEO.md) → [ACCEPTANCE.md](ACCEPTANCE.md) → [TASKS.md](TASKS.md)。共通規則見 [AGENTS.md](AGENTS.md) 和 [docs/](docs/)。
