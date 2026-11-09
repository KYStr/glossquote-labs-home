# 大量預案補庫 M1（2026-11-09）

本輪只製作規格文件；禁止寫產品實作、開新產品 repo、改既有 owner 或標產品 accepted。預案作者與文件 reviewer 分離，產品驗收全為 NOT_RUN。先讀根 AGENTS、docs/CLOUD-LOCAL-WORKFLOW、COORDINATION-COMMANDS 與最新 registry。

A 組：20 個工作文件、資料整理、開發/設計工作流的新工具完整預案。B 組：20 個日常/活動/小商務/手作空間規劃的新工具完整預案。每件明列與既有130spec的差異，不以同義改名湊數。每件以使用者實際任務為起點，不依賴伺服器、AI API、平台擷取、外部資料集或新runtime套件；資料記憶體內處理，雙語獨立靜態頁、Node24 ESM built-in tests。

每份 docs/specs/<slug>/SPEC.md 八節：goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。明列行動/桌面使用情境、非目標、欄位型別/語法/單位/上限/預設/錯誤、確定算法/排序/四捨五入/Unicode/精確整數策略、空/dirty/error/busy/cancel/reset狀態、至少6個可由第三者逐項重算的字面案例（正常、邊界、錯誤、舊結果失效等）。另提供 BRIEF.md、fixtures.json 與 AUTHOR-CHECK.md；fixtures.json 必須具有穩定case ID、literal input與expected，不填尚未執行的產品PASS。

預定九面向functionality/boundaries/privacy/security/usability/accessibility/localization-seo/toolchain-provenance/compatibility，必要面向逐項>=90、不可替作者自評。文件ready要求八節完整且非作者審查；不要求尚不存在的產品已實測。預覽noindex；正式HTTPS+SEO+Network/Storage與Chrome/Edge隔離實測另gate；NOT_RUN不冒稱PASS。

製作目的地 tools/<slug>/，同一 KYStr/glossquote-labs-home repo、新 codex/<task>-<actor> 分支與PR。舊 repo 保留追溯；本輪不改現有部署。交驗固定candidate，原作者修正，主代理整合發布。遵守唯一claim和40 ready/5held/1working規則。

停止：與已有scope重複、需要新依賴/付費/權限、會讀取憑證或持久環境、需桌面或本機互動瀏覽器、無法明確定義正確性時停止該件並報主代理。不得遞迴委派。
