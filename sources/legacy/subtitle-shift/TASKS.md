# 里程碑任務

## 責任與完成條件

本資料夾目前是 M0 規格。原功能對話在主代理派工後負責實作，並依派工模型設定執行。主代理負責獨立驗收與整合，再負責 M3 部署及首頁更新。不得跳過里程碑，也不得把本機候選版說成已部署。

所有測試均使用產生式假字幕資料並離線執行。runtime dependencies 維持零。遵守根層 Windows 環境、Git 設定、原始碼發布及焦點事件規則。不得讀取憑證、改持久系統設定、在 gate 前發布，或在目前 UI 狀態為 NOT_RUN_USER_FOCUS_INCIDENT 時啟動本機瀏覽器／原生 UI 測試。

## M0 — 完整規格

交付檔案：README.md、PRODUCT.md、TECHNICAL.md、UX-SEO.md、ACCEPTANCE.md、TASKS.md。

允許路徑：只限 tool-projects/36-subtitle-shift/ 下述六個檔案。

驗收：六檔齊全；parser、錯誤、輸出、Worker、URL 契約一致；至少 24 個精確核心 oracle 及至少 20 個 app／瀏覽器檢查；不宣稱產品已實作或測試。

## M1 — 本機 CLI candidate

負責人：派工後的原 subtitle-shift 功能對話；派工明確要求 gpt-6.1-sol/max，requested model 設定不代表 backend identity 已獨立驗證。

允許來源路徑：

- package.json
- .gitignore
- public/**
- scripts/**
- test/**
- tests/**
- dist/**
- HANDOFF.md
- TASK-ENTRY.md
- project.json

實作者只能在以上路徑新增或更新檔案，且 HANDOFF.md、TASK-ENTRY.md、project.json 僅記錄本工具真實狀態。不得修改其他共用專案文件、共用首頁／catalog、secret、Git 設定或其他工具資料夾。來源程式與相關測試要一併交付。M1 不做正式模板／輸出、GitHub 發布或部署。

必要實作：

- 純 ESM 核心，符合精確 schema、parser 子集合、限制、錯誤順序與序列化契約。
- 同源專用 module Worker，使用 revision/jobId/page generation 失效機制，沒有同步或雲端 fallback，固定 10 秒 timeout。
- 獨立 zh-Hant 與英文路由、可及響應式 UI、完整輸出、明確下載生命週期、頁內清除與切換語言確認。
- 只在記憶體處理，不用遠端資產或網路呼叫。
- Node 24 內建測試、check、build、dev scripts 與離線假資料。

對應檔案與 script 已建立且檢查後才可執行：

    npm test
    npm run check
    npm run build
    npm run dev

預覽建置只輸出 dist/。dev server 只綁 127.0.0.1:4216。可做本機靜態 HTTP 檢查。焦點事件期間瀏覽器 UI 檢查受阻，必須記為 NOT_RUN_USER_FOCUS_INCIDENT。CLI gate 通過不能關閉 UI 驗收，也不得冒稱 M1 完成。

M1 交付：實作、精確測試證據、變更檔案清單、凍結本機候選版 hashes，以及原功能對話在允許路徑更新的 HANDOFF、TASK-ENTRY.md、project.json 真實狀態和最終回報。主代理另負責獨立驗收與整合。

## M2 — 正式候選版與公開原始碼

負責人：原功能對話，且僅在主代理明確記錄 M2 GO 後開始。主代理先審查具體 M1 候選版。

可新增的路徑：

- package.json
- scripts/production.mjs
- scripts/release-check.mjs
- test/production.test.mjs
- dist-production/**

正式工具只產生獨立候選版，絕不覆寫 dist/。候選 server 只綁 127.0.0.1:5216。建置／檢查 closed static output、雙語正式 SEO、精確 CSP/headers、robots/sitemap/404 noindex 與發布白名單。除非主代理核准特定修正並重跑受影響測試，M1 app/core bytes 必須維持不變。

所有必要 M2 gate 通過後，主代理才可依既有 repo 契約授權原始碼發布。公開 repository 目標為 KYStr/glossquote-labs-subtitle-shift。使用已審閱的發布副本與 Git settings guard；不得修改 global/system auth 設定。主代理在其 HANDOFF 記錄已驗證的 repository URL、commit 與 visibility。發布原始碼不代表網站已部署。

M2 交付：正式候選版、獨立 release checks、公開來源發布證據、更新後 HANDOFF、明列人工 NOT_RUN 項目。M2 不部署 hosting，也不改共用首頁。

## M3 — 部署與首頁整合

負責人：主代理。必須在 M2 獨立驗收完成，且既有政策所需部署授權／憑證可用後才能開始。

允許路徑：主代理明確指派的正式部署設定與共用雙語首頁／catalog 檔案。M1/M2 的功能實作者不得編輯這些路徑。

主代理先驗證 live host 與兩個語言頁，再將 catalog 項目由 draft 改為 published。驗證來源 repository、commit、實際 live HTTP 行為、兩個語言路由，以及回到相同語言 GlossQuote 首頁的連結。分開回報來源發布、live-host 狀態、瀏覽器驗收及 NOT_RUN 人工檢查。

若使用者焦點事件仍阻擋 live browser checks，保留 NOT_RUN_USER_FOCUS_INCIDENT。不得以 CLI/HTTP 斷言取代缺少的 UI 證據，也不能因來源已公開就宣稱工具已完整驗收或部署。
