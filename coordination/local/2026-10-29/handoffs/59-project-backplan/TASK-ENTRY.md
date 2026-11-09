# B20-59-M1 — 專案期限倒排

2026-10-23，範圍 T00–T08，僅本工具 M1 授權路徑。已讀本工具 14 份準備文件、根 AGENTS、安全基線及產品論述。工具 DESIGN-SYSTEM 與家族完整文件 SHA-256 相同（935d4cca13c22b8a66688c8b83fdf412b448a0ff5c62d816728f510aeee05ada）。requested gpt-6.1-sol/max；backend 身分未獨立驗證，未變更模型。

可觀察交付：空白初始雙語表單，依賴 DAG 與工作日日曆真正運算，ES/EF/LS/LF、餘裕與關鍵任務，完整 TXT/JSON；Node24 離線 oracle、工具鏈及固定 bytes/SHA。沒有發布或部署。

使用情境：交期固定的小型團隊，桌機/手機偶爾重算計畫；主物件為日程表。Product App 模式，設定與依賴是可返回的編輯區，日程結果為主畫布。高風險不是本工具功能；輸入僅記憶體，匯出由使用者操作。無開始日期欄、外部假日或人力最佳化。

結構依 UX-SEO：

```text
寬：產品/狀態/語言
    日曆與任務（可編輯） | 摘要、全部日期與餘裕表、下載（成長主區）
窄：產品/語言
    [日曆與任務] [日程結果]
    單欄完整編輯；結果改為逐任務的垂直日期列
```

例行決策：raw core input 使用 deadline/workweek/holidays/tasks；每項任務 durationWorkdays 與 predecessors。表單休假以換行或逗號分隔；空白可略過，日期本身不改寫。任務 ID/名稱不 trim。沒有 JSON 匯入。

依派送最新限制，禁止啟動 server；dev 路由會用無 socket 的 Request/Response 離線測試，不能冒稱真 loopback HTTP 或 browser PASS。任何 browser、native、hidden/IAB/CDP、screenshots 均未使用，不以 Node 替代。

詳細結果、未驗 gate 與凍結清單見 HANDOFF.md、evidence/m1/。

## B20-RP-59 / M1B（2026-10-23 追加）

已完整讀 `.runs/batch20-release-prep-2026-10-23/TASK.md`，本次只做發布準備：固定 backplan.glossquote.com、獨立 release-artifacts/site、雙語正式 SEO、完整 bytes/SHA manifest、釘住 M1 public 及 serve header 來源、可重現 build/check 和針對性負例。這是 M1B，不是 GitHub/部署放行。

允許 package/.gitignore/scripts/test/HANDOFF/TASK-ENTRY/M1B-RELEASE/evidence/m1b/release-artifacts；public/dist/舊 evidence/規格及共享路徑不修改。不再開聊天或子代理，不啟動 browser/server，不讀憑證，不安裝或改持久設定。requested gpt-6.1-sol/max，backend未獨立確認。

17項新離線針對性測試已通過；固定版本的完整 npm test/check/build:release/check:release 及環境／保護來源前後快照，見本輪追加 HANDOFF 與 evidence/m1b。M1 歷史結果保留，其 source manifest 是歷史版本，不能把本輪新增工具鏈文件當成原 M1 bytes。
