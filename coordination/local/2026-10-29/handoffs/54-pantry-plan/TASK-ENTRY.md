# B20-54 M1 — 食材差額採買單

範圍：只在本工具允許路徑完成 T00 → T04。已讀 14 份本工具契約及根 AGENTS、安全、產品與設計契約；本工具 DESIGN-SYSTEM 與根設計契約 SHA-256 相同。

完成條件：可操作繁中/英文靜態候選、精確核心、實際 TXT/JSON 產物、離線 Node/check/build 與固定來源清單。M1 交主代理獨立驗收；無 M2 放行，不公開 GitHub、不部署、不改首頁。配置請求 gpt-6.1-sol/max；未獨立驗證 backend。

使用者：為數道料理一次備料的人；情境：桌機或手機反覆編輯本次實際需求與現有庫存。最重要物件為按食材整理的採買清單。風險：不相容單位誤合併、舊結果誤下載。介面為 Product App；本機記憶體，無自動保存。

桌面：短頂列 → 料理需求（主要可伸展畫布）＋可摺庫存 → 產生清單 → 還要買／足夠／來源 → 匯出。
手機：短頂列 → 料理逐列編輯 → 庫存 → 產生清單 → 結果 → 匯出。常用新增/編輯可見，單項來源與專案匯入放在明確 disclosure。共享 paper/ink/acid、系統字型、flat separators；無自訂裝飾 tokens。

判定：使用者自行填本次需求，不做份數縮放；庫存不分配到個別料理順序，僅對同一合併鍵扣抵一次，來源列保留原量。各合併鍵的總需求、庫存均以標準顯示單位 1,000,000,000 為上限。控制字元拒絕 C0/C1、雙向覆寫/隔離與無配對 surrogate；可見 Unicode 保留 NFC。數字顯示使用 locale-aware formatting；可攜檔案數量使用不含分組的 ASCII 精確字串。

有界欄位：料理名稱與 id 同採 1–120 個 Unicode code points；匯入 id 經 NFC/trim 後必須唯一。schema1 精確根欄位為 schema/meals/stock；各材料列 ingredient/quantity/unit/unitLabel 全部必要，非自訂單位的 unitLabel 為空字串。空白頁與空料理可存在；產生清單須至少有一列需求或庫存。專案可保留 0 數量，不存進度勾選。零需求列會列於已有足夠，只有庫存的鍵另外列出。

工具鏈執行只用既有 Node/npm，child 為 shell:false、windowsHide:true。最終 npm 驗證使用 --offline --no-update-notifier --no-audit --no-fund 暫時命令參數，不改任何持久設定。check 的文字掃描屬有限靜態檢查，與實際匯入/生命周期負例、核心與 app adapter 測試合併提供 M1 證據，不能代替瀏覽器 Network/Storage/版面驗收。

未執行：不得啟動 server/browser、CUA、hidden IAB 或桌面互動。B01–B05/原生/真機逐項 NOT_RUN_USER_FOCUS_INCIDENT。無帳戶驗證、遠端處理或權限擴充；不以 Node mock 宣稱瀏覽器通過。

## B20-RP-54 M1B 追加 — 2026-10-23

本輪以 `.runs/batch20-release-prep-2026-10-23/TASK.md` 的 10 項契約及原功能對話最新派送為準，只擴充離線 release 工具鏈。允許本工具 package.json/.gitignore/scripts/test/HANDOFF/TASK-ENTRY/M1B-RELEASE、evidence/m1b、release-artifacts；public、dist、原 evidence/m1、唯讀契約、兄弟與共享檔案全部保持不變。主代理已驗收 M1 核心/CLI；此輪未放行 M2。

完成條件：`build:release` / `check:release` 的固定 origin、精確 allowlist、M1 來源 pin、僅 head SEO 轉換、獨立 release site/manifest、反竄改與預檢後無覆寫。原 test/check/build/dev 不改命令語義；舊工具鏈測試暫存只改到 evidence/m1b，避免觸及歷史證據。

唯一預定 origin 為 `https://shopping-list.glossquote.com`，toolSlug 為 pantry-plan，均為常數，無 CLI/environment 代入。程式固定 14 檔 M1 public records SHA-256 `bd7f4bed29d52631cc9f24b3b93bcb226e441b3a7657eeb4c274f21dc7db4a56`；產物 15 檔（去重原檔＋sitemap），審核 manifest 在 sibling，不進 site。禁止不受管／被改動輸出覆寫，不做遞迴刪除或自動修復。

針對性測試完成後，對最終固定來源執行一次完整 npm test、npm run check、npm run build:release、npm run check:release；不重建未變的 preview dist。所有子程序 shell:false/windowsHide:true，npm 暫時 --offline --no-update-notifier --no-audit --no-fund。前後比對持久環境及 101 個 protected files，含完整 public/dist/舊 evidence/m1/唯讀契約；新證據只寫 evidence/m1b。不得 server/browser/CUA/IAB/CDP/native、憑證、GitHub、部署、付費、新服務或子代理。配置明確請求 gpt-6.1-sol/max，backend 身分未獨立證實。

## B20-54-M2A — 2026-10-27

root 已回收 b20-54-r2：36 PASS／16 NOT_RUN／0 FAIL、prohibited=[]、v7 isolation、parent cleanup PASS。依新派送，只修改 `tool-projects/54-pantry-plan/` 及 `.runs/batch20-completion-2026-10-27/owner-54-release/`，準備正式發布來源與離線產物。root 獨立驗收後另派 M2B；此輪沒有 push／deploy／首頁或 owner 瀏覽器授權。

完成條件：固定 assets-only wrangler.jsonc（2026-10-24、shopping-list.glossquote.com、可觀測性全關）、三條精確 301 _redirects、release-only 精確移除四段候選 suffix、16 檔 manifest/allowlist/反竄改一致，完整離線 fake-data test/check/build/build:release/check:release 通過，actual diff、完整來源／產物 SHA、舊檔與環境前後一致及 HANDOFF。Runtime/CSP/已驗行為不變，14 檔 public M1 pin 不變，16 項 NOT_RUN 保留。

全程既有 Node/npm、shell:false/windowsHide:true、暫時 offline flags，不安裝或啟動服務。不接觸任何憑證、全域 Git/auth、持久 Windows 設定，不開子代理。原 M1B 產物先核驗後完整保存於本輪 baseline；不放寬 builder 既有輸出拒絕規則。詳見 [M2A-RELEASE](M2A-RELEASE.md)。
