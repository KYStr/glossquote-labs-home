# 常用單位換算：維護接手狀態

日期：2026-10-10（Asia/Taipei）。任務：`THREAD-05-unit-converter`。本次 milestone：維護接手紀錄；唯一寫入路徑為本文件。驗收條件是現況、公開來源、正式網址、證據、人工待驗與接續界線可追溯，既有檔案不變。

## 現況與來源

| 項目 | 核對結果 |
|---|---|
| 本機功能 | 已實作繁中／英文靜態介面、五類別／20 單位、公式、錯誤、互換與清除；完整 MVP 人工驗收仍有 NOT_RUN |
| 公開來源 | [KYStr/glossquote-labs-unit-converter](https://github.com/KYStr/glossquote-labs-unit-converter)，2026-10-10 公開 API 確認 `visibility=public`、`private=false` |
| 分支與 commit | `codex/initial-publication`；[aaea80ab9c02a713b3b58cefdfee101c37814f08](https://github.com/KYStr/glossquote-labs-unit-converter/commit/aaea80ab9c02a713b3b58cefdfee101c37814f08)；本次 API 遠端 HEAD 與發布副本 HEAD 相同 |
| 正式繁中 | [https://units.glossquote.com/index.html](https://units.glossquote.com/index.html) |
| 正式英文 | [https://units.glossquote.com/en/index.html](https://units.glossquote.com/en/index.html) |
| hosting | 2026-10-07 已完成 M11 正式發布；免費 Cloudflare Workers Static Assets，已記錄版本 `1ed0601d-75ed-46da-95d9-f6c2ce5c61af`；2026-10-10 兩語 GET 均為 200 |
| 本次變更 | 僅新增維護文件，未提交／推送、建置、部署或調整正式主機；本文件不在公開產品發布清單 |
| 模型配置 | 建立此對話的交辦紀錄明載工具已傳入並接受 `model=gpt-6.1-sol`、`thinking=max`；本對話未取得後端有效 model／effort metadata，實際路由 **未確認**。未修改設定或改用其他模型 |

發布副本：`C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs/.runs/github-publish/glossquote-labs-unit-converter`。本次唯讀檢查為乾淨工作樹；發布紀錄共有 28 份遠端檔案，其中 26 份實作檔的 SHA256 已逐檔對照現有工具及發布副本，差異為 0。最後 commit 的發布說明更新與已部署產品資產分開看待。

## 證據與判讀順序

1. [TASK-ENTRY](../TASK-ENTRY.md) 限定本次只有接手 milestone，不重新實作、不重新部署，不建立子代理、新對話或傳訊其他任務。
2. [HANDOFF 最終 M11](../HANDOFF.md) 與[正式發布整合紀錄](../../DEPLOYMENT-MILESTONE.md) 的 2026-10-07 最終 PASS 是目前發布基準；下面保留的「尚未上線」段落是歷史。
3. [M11 本機驗收](../../../.runs/site-launch/unit/implementation.md)、[主代理測試 log](../../../.runs/site-launch/unit-parent-test.log) 與[Wrangler dry-run log](../../../.runs/site-launch/unit-dry-run.log)：既有 65 PASS／0 FAIL／0 skipped、check 24 來源檔、preview build 9 檔、production build／check 13 檔及 dry-run 通過。這些命令的退出碼 0 由 M11 交接記錄確認，未宣稱是本次重新執行。
4. [正式 HTTP 證據](../../../.runs/site-launch/unit-live-verification.json)：2026-10-07 的 32 筆 GET／HEAD 記錄，11 份公開資產與 production build 位元組一致；涵蓋 MIME、安全標頭、SEO、robots／sitemap、301 與 404。
5. [正式瀏覽器流程](../../../.runs/site-launch/live-browser-verification.json)：兩語 1 m → 100 cm、首頁 → 單位 → 日期 → 首頁已有實際互動證據。[Cloudflare UI 證據](../../../.runs/site-launch/unit-cloudflare-ui.txt) 記錄純 Static Assets、bindings 0、workers.dev／previews／logs／traces disabled；本次未重新登入或查詢帳戶設定。
6. [公開來源驗證清單](../../../.runs/site-launch/github-verification.json) 與本次公開 API、HEAD／26 檔雜湊核對共同支持來源現況；[VERIFICATION](VERIFICATION.md) 保留 T08 邊界修正、M02–M05 功能及人工限制。

本次直接 HTTPS GET 僅補確認兩語 200、`Content-Type: text/html`、自指 canonical、`robots=index, follow`、含 `connect-src 'none'`／`frame-ancestors 'none'` 的 CSP，以及各自語言首頁錨點。沒有重跑 32 項完整線上驗收或瀏覽器互動，亦不以 HTTP／CSP 取代人工隱私檢查。可索引設定不代表搜尋引擎已收錄。

## 保留的產品契約

實際閱讀 [PRODUCT](../PRODUCT.md)、核心 `units.mjs`／`numbers.mjs`／`convert.mjs` 與 app 事件／安全文字呈現後，接手應保留：

- 五類別固定單位表、初始長度 m → cm 與空輸入；原始文字最多 64 UTF-16 code units，只接受既定 ASCII 數字文法。
- 非零輸入範圍含端點 `[1e-12, 1e12]`；非零結果含端點 `[1e-18, 1e18]`；非溫度不得為負，溫度來源單位的絕對零度下限嚴格判定。
- 最多 12 位有效數字的近似顯示；T08 非溫度邊界以有界 BigInt 分數判定，四組恰等於 `1e-18` 的修正不可回退，也不能改用通用 epsilon 放寬超界。
- 互換只交換單位、不改輸入；清除保留類別／單位並聚焦數值；切類別、切語言及重新整理恢復相應空狀態。
- 工作資料限本頁記憶體；維持安全文字 DOM、無帳號、遠端計算、遙測、遠端字型或新 runtime 依賴，以及同語言首頁連結。

## 已知人工待驗

以下延續 [VERIFICATION](VERIFICATION.md)、[SEO-RELEASE 補驗方式](SEO-RELEASE.md) 及 [ACCEPTANCE](../ACCEPTANCE.md)，均為 **NOT_RUN**；使用者已允許保留，不代表已通過或已有確認缺陷。

| 待驗項 | 補驗與驗收重點 |
|---|---|
| U23 真實 200% 縮放 | 兩語使用一般瀏覽器的真正頁面縮放，完成換算／互換／清除；欄位、結果、錯誤及焦點可讀，無整頁橫向捲動；記錄版本與 viewport，不能用縮小 viewport 代替 |
| 輔助技術／螢幕閱讀器 | label、錯誤關聯、有效性變更與 change 時的播報節奏；既有 DOM／鍵盤 PASS 不替代 AT 實測 |
| U20／U21 完整 Network／Storage | 以假數值清空 Network 後操作，確認換算／互換／清除無新請求；Local／Session Storage、IndexedDB、Cache、URL／console 不含工作標記；重整恢復空狀態 |
| 已載入頁面斷網 | 斷網後換算可用；不宣稱首次離線可開啟或離線 App |
| 真正 BFCache 命中 | 明確觀測 `pageshow.persisted`，返回後初始空狀態與單次事件行為正確；既有普通離開／返回僅是有限證據 |
| 其他瀏覽器與實體行動裝置 | 記錄瀏覽器／OS／裝置及兩語流程；特別驗證 decimal 鍵盤能否輸入負號與 e/E；IAB 引擎版本仍未確認 |
| 英文標籤額外加長 40% | 尚未另注入測試；既有自然長英文與 320px PASS、繁中加長案例不能替代 |
| 搜尋收錄／正式效能資料 | Google／Search Console 收錄及正式 Core Web Vitals 未驗證；提交 Search Console 不在本次範圍 |

U24 已有兩語真正模組載入失敗 fallback 的 PASS；未驗證「禁用全部 JavaScript」這個替代情境，不抹除已存在的有限通過證據。

## 接續待辦、風險與界線

1. 首個有證據的維護待辦是補上上述人工驗收記錄，優先真 200%、AT、Network／Storage／斷網；本次沒有新增功能任務，完成接手後不自行啟動功能或重部署。
2. 歷史文件的時間層次需注意：[TASKS](../TASKS.md) 的「最新」仍指 T08、[GITHUB-PUBLISH](GITHUB-PUBLISH.md) 記到 `29e3d31`、[SEO-RELEASE](SEO-RELEASE.md) 仍描述未部署；[PRODUCT](../PRODUCT.md) 的「尚未實作」也是藍圖文字。以本文件的最新核對及 HANDOFF 最終 M11 為準；本次不越界改寫那些文件。
3. [project.json](../project.json) 仍為 `in-progress`，符合完整 MVP 人工驗收未完成；不得僅因上線而宣稱全部人工驗收通過。現有證據未發現阻止使用的具體功能缺陷。若後續重現缺陷，先記假資料步驟、預期／實際、兩語及所涉 allowed paths，交原主對話整合決定。
4. 本對話專用預覽為 `127.0.0.1:4185`，fixture／spike 為 `127.0.0.1:5185`。實際 [serve.mjs](../scripts/serve.mjs) 的 `npm.cmd run dev` 仍固定 4173（第 9、156–169 行），不能假稱已改成 4185。後續獲准預覽時可使用既有 `createStaticServer` 匯出另行綁定分配埠；佔用則選空閒 loopback 埠並記錄。本次未啟動 server、未檢查埠可用性，也未終止既有進程。
5. 新證據的分配路徑為 `.runs/unit-converter`，本次核對時尚不存在；這不代表舊證據遺失。既有證據仍在 `.runs/site-launch`／`.runs/unit-audit-fix`。本次只寫本文件，不建立或覆寫證據目錄。
6. 後續 source 更新須用經審查的既有獨立發布副本；Git push 與正式 hosting 是兩步，沒有 Git 自動部署。首頁、catalog、DNS、正式 Worker、憑證及部署由原主對話統一整合。本次不讀憑證、不改 00-home／其他工具／根設定／GlossGate／040141.xyz，也不操作根 Git index／分支／提交。

需要決策事項：目前無阻塞接手的決策；若要啟動功能變更或正式部署，先由原主對話確立該 milestone 與 allowed paths。既有免費 hosting 授權不需重問；這裡是整合分工界線。

## 本次命令與結果

| 實際執行 | 結果 |
|---|---|
| `Get-Content -LiteralPath ...`、`rg --files`／`rg -n ...` | 必讀契約、任務、產品、核心及所引證据讀取成功，退出 0。初次列 `.runs/unit-converter` 顯示目錄不存在；該 PowerShell 批次因後續 status 成功仍為退出 0，不把缺目錄當成功讀取 |
| `git --no-optional-locks status --short -- tool-projects/05-unit-converter` | 退出 0；開工前本工具整個目錄為既有 untracked。此輪差異另用檔案 SHA256 基線核對，不能把整個 untracked 目錄宣稱本次新增 |
| `Invoke-RestMethod` GET 公開 GitHub repo／default-branch commit API | 退出 0；PUBLIC、上述分支及 HEAD 確認，沒有使用或讀出認證資料 |
| `Invoke-WebRequest` GET 兩語正式網址，15 秒 timeout、禁止自動 redirect | 退出 0；兩頁 200 與上述 MIME／SEO／CSP／首頁錨點確認 |
| `Get-FileHash` 對照 M11 unit manifest；`git --no-optional-locks -C <發布副本> rev-parse HEAD`／`status --short` | 退出 0；26/26 實作檔與來源／發布副本相同，差異 0；HEAD 相同，工作樹乾淨 |
| `web.open` 初次兩語網站／GitHub 抽讀 | 工具對兩語回報不可讀，GitHub 結果為過期內容；無 shell 退出碼。改用上列直接 HTTPS／公開 API 取得當前證據，未據此判網站故障 |
| `npm.cmd test`／`run check`／`run build`、Wrangler、瀏覽器流程 | 本次 NOT_RUN；產品未改且 26 份實作雜湊吻合，沿用 M11 必要驗收，沒有重新安裝／建置或部署 |

持續環境 guard 寫入前後均執行 `& "$env:USERPROFILE\.codex\check-persistent-environment.ps1"`，各退出 0、PASS；完整 `Snapshots` 逐欄相同，包含 TEMP／TMP 型別、長度與 hash。下表為前後相同值；未更改既有重複 PATH。

| 範圍 | PATH 型別／長度／ephemeral count | PATH SHA256 | 全 Environment-key fingerprint |
|---|---|---|---|
| HKCU | ExpandString／834／0 | `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb` | `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a` |
| HKLM | String／1227／0 | `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8` | `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82` |

文件終檢：PowerShell UTF-8 嚴格解碼、必要欄位、21 個本地 Markdown 連結與行尾空白檢查 **PASS，退出 0**。SHA256 基線核對：既有 59 份工具檔案全部不變，刪除 0，只新增本文件。首輪文件檢查腳本退出 1，原因是 `Split-Path -LiteralPath ... -Parent` 的 PowerShell 參數集不相容；改用 `System.IO.Path.GetDirectoryName` 後成功，未修改產品或放寬檢查。

milestone 判定：**MAINTENANCE_HANDOFF_READY／接手就緒，PASS**。公開來源與兩語正式網站已分別核對；本機維護文件完成。完整 MVP 人工驗收保留上列 NOT_RUN，本次沒有新功能發布或 hosting 變更；目前無需使用者決策。
