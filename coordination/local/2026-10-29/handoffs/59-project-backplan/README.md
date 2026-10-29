# 專案期限倒排

**這是規格，尚未實作。** 輸入交件日、工作週、自己確認的休假、每項任務工期和前置關係，得到最早/最晚起迄日、工作日餘裕和關鍵路徑。工具不要求先猜專案開始日：先算依賴 DAG 的最長工作日長度，再由截止日倒數得到全案起點。

M1 使用 Node.js 24+、原生瀏覽器 HTML/CSS/ESM，零依賴、無帳號、雲端或外部假日 API。假日完全由使用者輸入；工具不分配人力，也不宣稱是資源限制排程。

候選網址與正式索引待主代理決定，M1 預覽 noindex。本規格與手寫 oracle 不代表產品已實作或驗收。

閱讀順序：[PRODUCT.md](PRODUCT.md) → [TECHNICAL.md](TECHNICAL.md) → [UX-SEO.md](UX-SEO.md) → [ACCEPTANCE.md](ACCEPTANCE.md) → [TASKS.md](TASKS.md)。共通規則見 [AGENTS.md](AGENTS.md) 和 [docs/](docs/)。
