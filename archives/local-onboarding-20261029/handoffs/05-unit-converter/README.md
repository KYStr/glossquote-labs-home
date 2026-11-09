# 常用單位換算

品牌：GlossQuote-Labs。2026-09-29 已完成繁體中文與英文的本機靜態工具實作。人工待驗、命令實測與任務狀態見 [交接](HANDOFF.md) 和 [驗證紀錄](docs/VERIFICATION.md)，尚未發布。

給需要快速比較長度、面積、質量、容量與溫度的人：輸入一個數字，在瀏覽器內換算同一量綱的固定單位，並看見使用的公式與顯示精度。

MVP 的價值是單位定義清楚、結果可核對、不用帳號。不需要第三方 runtime 套件、API、模型或上傳。產品為靜態 HTML/CSS/JavaScript；Node.js 24+ 僅供開發、建置與離線測試。已有 IAB 操作紀錄，其它瀏覽器與完整輔助技術相容性仍待驗。

MVP 有五個類別、數值輸入、來源／目標單位、互換單位、結果與公式、清除。沒有貨幣匯率、醫療劑量、配方、時間／日期、地區坪制、英美容量單位、物理模擬、批次檔案、分享網址、歷史紀錄或自訂公式。負值僅允許溫度；溫度為溫度值，不是溫差。

先完整閱讀 [START-HERE.md](START-HERE.md) 和 [AGENTS.md](AGENTS.md)，再依序讀 [品牌](docs/BRAND.md)、[安全](docs/PRIVACY-SECURITY.md)、[工程](docs/ENGINEERING.md)、[設計](docs/DESIGN-SYSTEM.md)、[產品](PRODUCT.md)、[技術](TECHNICAL.md)、[介面與 SEO](UX-SEO.md)、[驗收](ACCEPTANCE.md)、[任務](TASKS.md)、[交接](HANDOFF.md)。一次只執行一個任務。

本資料夾可單獨複製為新專案；不依賴其他 GlossQuote-Labs 工具。文件完成不代表產品完成或已可發布。

## 本機使用

在本資料夾開啟終端機，確認 Node.js 24+ 後執行 `npm.cmd run dev`（非 Windows 用 `npm run dev`）。不需 npm install。以瀏覽器開啟：

- [繁體中文](http://127.0.0.1:4173/index.html)
- [English](http://127.0.0.1:4173/en/index.html)

伺服器僅綁定 loopback；根路徑 `/` 不自動導向首頁，請使用上方完整路徑。結束預覽以 Ctrl+C 停止伺服器。檔案不能靠直接雙擊 file URL 保證模組正常載入。

`npm.cmd test` 執行離線測試；`npm.cmd run check` 檢查來源與本地引用；`npm.cmd run build` 將 public 複製為獨立 dist 產物。建置不部署。兩頁保留 noindex；正式 URL、canonical、hreflang、sitemap 與發布步驟见 [SEO 發布交接](docs/SEO-RELEASE.md)。
