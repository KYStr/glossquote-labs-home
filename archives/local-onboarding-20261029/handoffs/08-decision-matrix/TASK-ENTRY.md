# 權重決策矩陣：獨立對話開工入口

建立：2026-10-10。任務 ID：THREAD-08-decision-matrix。

## 任務與驗收

本工具尚未實作。請從 TASKS.md 的 T00 開始實際建置，不只提供計畫；逐一通過各 milestone，再持續完成既定 MVP、繁中／英文、SEO 建置、必要驗收及已授權的獨立 GitHub 公開來源。首個可驗收 milestone：Node 24+ 的原生 ESM 靜態骨架、有效 test/check/build、限定 public 的 loopback server、穿越拒絕與預覽 noindex，並記錄真實結果。最終產出 docs/RELEASE-CANDIDATE.md 及 HANDOFF 的 READY_FOR_INTEGRATION（或具體 BLOCKED）；正式網站部署由主對話驗收後統一進行。

## 固定目錄與資源

- 工具：`<LOCAL_WORKSPACE>/tool-projects/08-decision-matrix`
- 新對話名稱：權重決策矩陣
- 明確模型配置：`gpt-6.1-sol`，推理 `max`。
- 專用證據：`<LOCAL_WORKSPACE>/.runs/decision-matrix`（已有同名記錄只能追加，不覆寫）。
- 發布副本：`<LOCAL_WORKSPACE>/.runs/github-publish/glossquote-labs-decision-matrix`（先讀現況，保留已有歷史）。
- 本次分配 loopback 預覽埠：`127.0.0.1:4188`；測試 fixture／spike 埠：`127.0.0.1:5188`。這是多任務避免衝突的明確例外，取代舊藍圖固定 4173／4174 的埠。檢查空閒後使用；佔用時改用系統分配的空閒 loopback 埠並記錄，不終止占用者。server 和相依測試／文件一起保持一致。
- 候選（尚未上線）網址：`https://decide.glossquote.com/index.html`、`https://decide.glossquote.com/en/index.html`。

## 本次共同決策

- 使用者在 2026-10-10 明確要求每個已規劃功能在本專案有自己的功能資料夾與同名新對話，由 GPT-6.1 Sol / max 實作；沿用現有功能目錄，不複製或重新產生已完成產品。
- 這是多個獨立功能對話的分工。每個對話在自己的目錄內，依 TASKS.md 一次完成一個 milestone，再推進下一項；不同功能目錄可各自前進。不得再建立子代理或新對話，避免任務數倍增。原有最多兩名實作子代理的限制沒有改成無上限；本次功能對話是使用者要求的獨立任務。
- 每個對話是自己工具的實作及驗收負責人；使用同一工作區但沒有 Worktree 隔離。只改本工具與下方指定的專用證據／發布副本。不得 git checkout/switch/reset/clean/stash 或在孵化器根目錄 commit/push，不得重寫、回退他人工作。
- 首先讀根 AGENTS.md、docs/SECURITY-BASELINE.md、本工具 AGENTS.md、START-HERE.md、HANDOFF.md 和當前 TASKS.md；再按相關性讀 PRODUCT、TECHNICAL、ACCEPTANCE、ENGINEERING、PRIVACY-SECURITY。首次介面工作完整讀根 docs/GLOSS-TOOLS-DESIGN-SYSTEM.md 及本工具品牌／設計／UX-SEO。舊藍圖的『尚未授權發布／只有中文』不覆蓋較新的使用者雙語及來源發布授權。
- 主代理、工具名稱與需求不要靠模型自述推斷。此任務要求 model=gpt-6.1-sol、thinking=max；記錄工具已接受的配置與實際可驗證的資訊。不能驗證後端路由時寫未確認，不要改成 Astra 或 Luna。
- 保留繁體中文＋英文完整介面與靜態 SEO 內容，使用 index.html 與 en/index.html；兩語均有同語言首頁連結。需加入語系檔與發布工具鏈時，先在自己的 TASKS.md 寫明新增任務及 allowed paths，再實作。允許本工具內 public/**、scripts/**、test/**、docs/**、TASKS.md、HANDOFF.md、README.md、project.json、package.json、必要鎖定檔／.gitignore／wrangler.jsonc；每個既定任務仍只改該任務相關檔案。此段是本次雙語與發布準備的明確範圍。
- 不增加帳號、雲端處理、遙測、遠端字型、隱藏網路請求或付費依賴。工作內容留在使用者裝置。媒體公開程式／模型資產只能照既有 T01/T02 固定版本、來源、授權、預算及明示規則取得；不得改成遠端 API。
- 未完成產品維持預覽 noindex；可以準備正式 SEO 建置參數，但不得把候選網址宣稱已部署。canonical、雙向 hreflang、x-default、sitemap、robots、404、MIME/security headers 必須可驗證，不能虛構搜尋收錄、測試或效能。
- 驗收比例適當：實作與測試同一負責人，執行需求涵蓋的 npm.cmd test、npm.cmd run check、npm.cmd run build；最終變更只跑必要 gate 一次，失敗或受影響的修改才重跑。真正瀏覽器流程與靜態／模擬結果分開記錄。使用者已允許保留人工 NOT_RUN；不得把演算法或媒體必要可行性 gate 的 FAIL 當人工例外略過。
- 長時間建置／測試／安裝前後執行使用者 .codex/check-persistent-environment.ps1，記錄 HKCU/HKLM PATH 雜湊、型別、長度、ephemeral-entry count 與完整 Environment-key fingerprint。不得改持續環境、PATH、TEMP/TMP、registry、服務、pagefile、BCD；不得殺其他任務或使用者的伺服器。
- 本次功能實作對話不得讀取任何憑證，包括已授權部署 Token 檔。正式部署由原主對話統一負責。來源公開可用既有 gh 登入狀態執行，不得 gh auth token、搜尋或列印憑證。
- 本機必要驗收通過後，依根 AGENTS 的既有授權用經審查的独立發布副本上傳該工具至 KYStr/glossquote-labs-<tool-slug>，驗證 PUBLIC、遠端 HEAD 與發布清單。只公布該工具的來源／必要說明／授權，不帶 .runs、私密資料、憑證或其他工具。來源發布成功和網站上線分開紀錄。
- **共享發布邊界：不得修改 tool-projects/00-home/**、任何其他工具、根 .codex/config.toml、根 AGENTS.md、GlossGate、040141.xyz、DNS、Cloudflare 帳戶或正式 Worker。首頁、憑證載入與正式部署不是此平行實作任務的寫入範圍。完成後產出 docs/RELEASE-CANDIDATE.md，供原主對話獨立審查與依序部署；這是整合驗收等待，不是要求使用者再授權。
- 使用瀏覽器時建立自己的分頁，不操控使用者或其他任務分頁；不共用／覆寫別人的測試產物。若共享能力衝突，記清阻塞並繼續其他獨立工作。
- 必須停止並回報的情況：需要超出目錄／現有依賴候選／付費／新權限；規格重大矛盾；必要技術 gate 失敗或無法量測；持續環境異動；發現其他任務正在改自己的檔案；同一問題兩輪無進展。停止受影響部分並保留證據，不虛構成功。
- 每項交接至少包含實際改檔、命令與退出碼、PASS/FAIL/NOT_RUN、人工未驗、風險與決策、來源 URL/commit/可見性、hosting 狀態，以及下一步。已測過且未變動的證據可引用，不必反覆跑全面驗收。

