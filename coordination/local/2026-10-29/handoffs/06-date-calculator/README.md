# 日期差與加減天數

GlossQuote-Labs 的獨立靜態日期工具。規劃日：2026-09-23；實作開始：2026-09-29。目前實際進度與待驗事項見 [HANDOFF](HANDOFF.md) 和 [驗收紀錄](docs/VERIFICATION.md)。

2026-10-06：Cloudflare Free正式網站已上線：[繁中](https://date.glossquote.com/index.html)、[English](https://date.glossquote.com/en/index.html)。DNSSEC、24正式HTTP案例、10檔位元組比對及雙語真瀏覽器計算PASS。公開GitHub9b7dc6d已同步正式連結。手動CLI部署，Git自動部署尚未連接；人工保留項見 [驗收紀錄](docs/VERIFICATION.md)。

為需要計算兩個日期相隔幾天、或指定日期往前／往後幾天的人，提供純公曆日期工具。MVP 只有「日期差」與「加減天數」兩種工作，並清楚區分日期差與包含起訖日的日期數。

產品採原生 HTML/CSS/瀏覽器 JavaScript ESM，不需套件或外部服務。Node.js 24+ 僅用於開發、node:test 與靜態建置。日期計算採純整數公曆 ordinal；不用 Date、時區或毫秒差，輸入不送出、不儲存。

## 本機啟動

在此資料夾執行（不需要 npm install）：

```powershell
npm run dev
```

開啟繁中 `http://127.0.0.1:4174/index.html` 或英文 `http://127.0.0.1:4174/en/index.html`。僅監聽 loopback，根路徑 `/` 回 404，請使用完整 HTML 路徑。關閉終端中的服務會停止預覽；雙擊 HTML 的 file:// 模式不是支援的啟動方式。

```powershell
npm test
npm run check
npm run build
```

預設建置輸出到本工具的 `dist/`，只包含 `public/` 產品檔案，保留noindex。明確提供`--production --site-url https://真實主機/部署目錄/`才產生正式SEO metadata與sitemap；完整命令與主機驗收見 [發布清單](docs/SEO-RELEASE.md)。兩語使用同一計算核心；切換語言、模式、重整或清除會移除工作輸入。說明和 FAQ 為靜態 HTML，JavaScript 不可用時不能計算。

## 發布狀態

2026-09-30已公開上傳原始碼：[GitHub倉庫](https://github.com/KYStr/glossquote-labs-date-calculator)。公開副本含獨立執行所需程式、測試與雙語README；發布驗證見 [T07紀錄](docs/GITHUB-PUBLICATION.md)。

正式網域date.glossquote.com已部署並通過必要主機驗收；預覽仍保留noindex，正式SEO使用production建置。搜尋引擎收錄尚未驗證。發布規則見 [發布清單](docs/SEO-RELEASE.md)。

不計算時區、時分秒、夏令時間、工作天、假日、年齡、農曆、法定期限或每月週期。日期範圍為延伸公曆 0001-01-01 至 9999-12-31；不宣稱符合各地歷史曆法或法律計日規則。

依序閱讀 [開工](START-HERE.md)、[代理規範](AGENTS.md)、[品牌](docs/BRAND.md)、[安全](docs/PRIVACY-SECURITY.md)、[工程](docs/ENGINEERING.md)、[設計](docs/DESIGN-SYSTEM.md)、[產品](PRODUCT.md)、[技術](TECHNICAL.md)、[介面與 SEO](UX-SEO.md)、[驗收](ACCEPTANCE.md)、[任務](TASKS.md)、[交接](HANDOFF.md)。一次一項任務，文件可獨立複製，不依賴兄弟專案。
