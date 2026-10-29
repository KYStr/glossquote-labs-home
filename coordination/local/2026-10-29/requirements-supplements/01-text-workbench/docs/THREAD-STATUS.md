# 文字整理與統計：維護接手狀態

接手日期：2026-10-10（Asia/Taipei）。任務 ID：`THREAD-01-text-workbench`；獨立對話名稱：文字整理與統計。

最新維護：2026-10-11 [AUDIT-TEXT-01 稽核補驗](AUDIT-2026-10-11.md)，英文五個 UI 子項及 SEO 文件矛盾修正完成；完整原生競態與人工 NOT_RUN 保留。詳見文末最新狀態，以下 2026-10-10 接手紀錄保留作歷史證據。

2026-10-10 接手 milestone 交付本文件，供後續維護直接接續。當時唯一寫入範圍是 `docs/THREAD-STATUS.md`；功能、測試、建置產物、HANDOFF、發布副本與正式主機均未變更。該次未建立子代理或其他對話、未傳訊其他任務、未讀取憑證、未啟動伺服器。

建立對話的委派訊息記錄工具已接受 `model=gpt-6.1-sol`、`thinking=max`。本次沒有取得可驗證的後端模型路由回傳，因此實際路由為 **未確認**；沿用指定配置。既有驗收中的 Luna 委派記錄屬先前實作，不是本對話的模型證據。

## 現況與來源

產品狀態：**LIVE — PASS WITH USER-AUTHORIZED MANUAL EXCEPTIONS**。依最新 [HANDOFF](../HANDOFF.md)、[正式驗收](VERIFICATION.md) 與 [M13 完成紀錄](../../../.runs/text-workbench/REPORT.md)，T00–T07 已收斂，沒有本工具尚未完成的程式實作任務。本次維護接手不重新啟動 T00–T07。

| 項目 | 狀態／識別 |
|---|---|
| 公開來源 | [KYStr/glossquote-labs-text-workbench](https://github.com/KYStr/glossquote-labs-text-workbench)，本次確認 `PUBLIC` |
| 預設分支 | `codex/text-workbench` |
| 最新遠端／發布副本 HEAD | `8b30f87769e5907524a41652da749890799a11d7`，本次確認一致；發布副本工作樹乾淨 |
| 已部署功能來源 | `6f994d40c2e28f64df3f5473e158277146b68b97`；後續 `8b30f87` 僅更新文件 |
| 正式繁中 | [文字整理與統計](https://text.glossquote.com/index.html) |
| 正式英文 | [Text Cleaner and Counter](https://text.glossquote.com/en/index.html) |
| 既有部署版本 | Cloudflare Worker `513bcb01-1f0e-45d3-b9cc-0603179997c9`，引用既有發布證據，本次未查詢帳戶或部署 |
| 同語言首頁 | [繁中](https://glossquote.com/index.html)／[English](https://glossquote.com/en/index.html)；本次確認文字頁 HTML 保留對應首頁連結 |
| 本機狀態 | `project.json` 為 `local-mvp-complete`；本次只新增維護文件，未新增 Git commit／push |

本次依 [發布清單](../../../.runs/text-workbench/publication-manifest.json) 逐檔比較 SHA-256：26 個受審發布檔與本工具目錄、發布副本及清單全部一致。公開來源已存在、既有本機驗收完成、網站已發布，是三項分別有證據的狀態；本次文件新增未發布。

首頁在 2026-10-09 的歷史整合證據為來源 `8635f003601514f824a348344620469b78545790`、部署版本 `8f481496-07e2-4284-9457-6ad9b5be1195`、五工具目錄與 20 項 HTTPS 檢查通過。本次沒有重新核對首頁最新 HEAD、目前工具數或首頁完整驗收，不把該歷史數量當成今日觀察。

## 本次正式頁面確認

2026-10-10 10:18:41（Asia/Taipei；`2026-10-10T02:18:41.802Z`）以 Node 原生 `fetch` 讀取以下兩頁，HTTP 均為 `200`、MIME 均為 `text/html`；canonical 正確，且保留同語言首頁連結。HTML 位元組雜湊與 [既有正式 HTTPS 驗收](../../../.runs/text-workbench/text-live-verification.json) 一致。

| 路徑 | bytes | SHA-256 |
|---|---:|---|
| `/index.html` | 10807 | `16118146581fea505fcb03c04c29e1992c0b30eb7a553d570b40372bd6307535` |
| `/en/index.html` | 11405 | `4655a63c9afa4668b56c8e624cbe94a2c03364812aa6ab605156a83973df5a35` |

這是兩頁可達性、頁面內容與既有發布一致性的確認，沒有重跑全部 34 項 HTTPS gate 或本輪真實瀏覽器 Worker 流程。網頁讀取工具對兩頁回傳 `Internal Error / not accessible via this tool`；Node HTTP 讀取成功，該工具限制不記為網站故障。

## 實際實作與不可破壞行為

本次讀取 [文字核心](../public/js/core/text.mjs)、[匯出](../public/js/core/export.mjs)、[app](../public/js/app.mjs)、[Worker](../public/js/worker.mjs)、兩語 HTML、package/project 設定與相關規格，確認已有實作，保留以下維護界線：

- 單一純文字輸入；原文保留，按下整理才產生結果。原始輸入同時受 200,000 UTF-16 code units／262,144 UTF-8 bytes 限制，拒絕未配對 surrogate，不截斷輸入。
- CRLF／CR 固定轉 LF；三個選項預設皆關閉，順序為 ASCII 空格／Tab trim → 空行移除 → 保留首次出現的完全相同行去重。碼點統計不是語言字數，不做大小寫或 Unicode 正規化。
- 每次工作建立 dedicated module Worker；5 秒上限、取消／清除／輸入或選項變更失效、舊回覆拒絕。清除重設選項並回到輸入焦點。
- 成功的空結果仍可複製，下載停用；非空下載固定 `cleaned-text.txt`，UTF-8 無 BOM、不另加尾端換行。複製只由明確點擊觸發，拒絕時保留可選取結果。
- 工作內容留在記憶體，不新增 storage、帳號、分析、遠端字型、雲端處理或其他依賴。新 Worker 可能需要載入同源靜態模組，沒有保證離線可用。
- 兩語為獨立頁，切換語言重設工作；來源／預覽 `noindex` 與正式建置的索引設定不同，不把來源 HTML 的 `noindex` 誤判成正式站缺陷。

## 沿用的驗收證據

下表是 **2026-10-09 已完成的驗收，本次未重跑**。26 個發布檔一致性支持沿用這些未變動輸入的結果。

| 類別 | 結果與證據 |
|---|---|
| 最終自動 gate | `npm.cmd test`：56/56 PASS；`npm.cmd run check`：10 public assets／17 JS PASS；preview build：10 檔；production build＋exact check：14 檔，均 exit 0。[HANDOFF](../HANDOFF.md)／[VERIFICATION](VERIFICATION.md) |
| 真實 IAB | 兩語原生 Worker、HTML-looking 文字安全呈現、結果失效、空結果、鍵盤清除／焦點、320px、1024px 與語言切換已記錄。[T03](../../../.runs/text-workbench/t03-browser.json)／[T07](../../../.runs/text-workbench/t07-browser.json) |
| 匯出 | 原生下載 bytes `[231,148,178,10,65]`；空結果按鈕狀態 PASS。[T04](../../../.runs/text-workbench/t04-browser.json) |
| 受控 harness | cancel／clear／stale reply、4,999 ms 接受／5,000 ms 拒絕、watchdog、malformed reply、缺 Worker、注入剪貼簿拒絕 PASS。這些是合成時序／故障，不是 OS 權限或裝置休眠的驗收 |
| 正式主機 | 12 公開資產逐位元組比對、34 項 HTTPS GET／HEAD、MIME、安全標頭、SEO、redirect／404 PASS。[HTTPS 證據](../../../.runs/text-workbench/text-live-verification.json) |
| 正式 IAB／首頁互鏈 | 兩語原生 Worker 與兩語首頁往返已驗證。[正式瀏覽器](../../../.runs/text-workbench/live-browser.json)／[首頁瀏覽器](../../../.runs/text-workbench/home-live-browser.json) |

保留歷史失敗：英文相對資產路徑曾被 checker 誤拒，修復並補真實來源回歸後 56 項／build 通過；首次部署立即驗證曾遇 Cloudflare 500 `Script not found`，同一部署恢復可達後完整驗收通過。兩者已有收斂證據，沒有據此重新部署或回退。

## 人工 NOT_RUN 與可接續待辦

下列均保持 **NOT_RUN**，使用者已允許保留，不因本次 HTTP 成功或來源一致而改成 PASS。

| 待驗 | 已有證據／缺口 | 接續驗收範圍 |
|---|---|---|
| TX-18：完整 DevTools Network／Storage／離線 | 程式審查、CSP、成功 Worker 不替代實際網路／儲存觀察；新 module Worker 可能載入靜態資產 | 優先記錄同源模組載入與內容處理請求、合成標記是否進入 storage／URL／console、已載入頁面離線行為、Blob 清理。TX-16 的完整 Network 子斷言也尚未驗證 |
| TX-19：真實 OS clipboard 權限拒絕 | 原生下載及注入拒絕已 PASS；真實 OS 拒絕未驗 | 以假內容驗證拒絕提示、結果可選取及下載保留，不讀使用者剪貼簿內容 |
| TX-22：真正 200% 縮放 | 320 CSS px 已 PASS；縮窄 viewport 不等於瀏覽器 zoom | 真正瀏覽器 200%＋長行、控制可達、焦點與無頁面橫向溢位 |
| JavaScript 停用閱讀 | [HANDOFF T05/T06](../HANDOFF.md) 明列 NOT_RUN；靜態 HTML 可讀性已審查 | 實際停用 JS 後，確認兩語方法／FAQ 與 fallback 仍可讀 |
| Firefox／Safari、實體手機、讀屏、實際 BFCache 命中 | IAB／受控 harness 不能代表上述設備及還原流程 | 記錄瀏覽器／OS／裝置版本，驗證相同流程及頁面還原時資料生命週期 |
| Lighthouse／Core Web Vitals、Search Console／實際收錄 | 尚無實測／帳戶證據 | 只記取得的量測或可核實的收錄結果；不把 canonical／sitemap 當已收錄，不自行使用帳戶或付費服務 |

建議下一個有證據的維護 milestone 先處理 TX-18，接著補縮放／停用 JS／clipboard；其餘依可用設備安排。這是接續清單，本輪沒有新功能範圍。若實測發現產品缺陷，先列重現步驟、預期／實際、證據與擁有任務（例如 T03 或 T04），由原主對話整合範圍後處理。本次未發現具體阻止正式使用的缺陷；這不等於完整安全或跨瀏覽器認證。

## 已知維護差異、風險與決策

1. 本次 [TASK-ENTRY](../TASK-ENTRY.md) 指定預覽 `127.0.0.1:4181`、fixture／spike `127.0.0.1:5181`。既有 [serve.mjs](../scripts/serve.mjs) 第 9 行仍固定 `PORT = 4173`，`npm.cmd run dev` 直接使用它，沒有 `--port`／環境變數解析。後續預覽需以已匯出的 `createPreviewServer()` 在本程序綁指定 loopback 埠；先確認空閒，衝突時用系統分配空閒埠並記錄。這是維護啟動差異，未影響正式站；本輪沒有啟動服務或修改腳本。
2. START-HERE／PRODUCT／ACCEPTANCE 的「尚未實作」及 HANDOFF 早期 T02 表格是歷史藍圖／階段紀錄。以 HANDOFF 最終收斂段與最新正式驗收為準，不重新 scaffold，不將早期待審當現有阻塞。本輪不改這些文件。
3. TX-18 的離線／網路要求尚未完成實測，不能宣稱零總網路流量或離線保證。保持 [既有決策](../../../.runs/text-workbench/DECISIONS.md) 與 [隱私契約](PRIVACY-SECURITY.md)，不加入 blob/eval Worker、Service Worker、隱藏預載或遠端備援以改變驗收含義。
4. 本對話只負責本工具；不得修改首頁／其他工具／根規範／GlossGate／040141.xyz，不操作根 Git 分支、index 或提交。正式主機、憑證與首頁整合仍由原主對話處理。後續發布需遵循既有授權與審查，不需要重問已授權的來源公開／免費主機權限。

本 milestone **無需使用者決策**；預覽差異與人工缺口已記錄，沒有擴大範圍的實作。

## 本次命令與結果

命令工作目錄均為 `C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs`，檔案讀取／雜湊只限本工具及既有專用證據／發布副本；Git 命令皆為唯讀。

| 實際命令／執行內容 | 結果 |
|---|---|
| `Get-Content -Raw -LiteralPath ...`、`rg --files`、相關段落的 `rg -n` | exit 0；讀取任務入口、根安全契約、本工具 AGENTS／START-HERE／HANDOFF／TASKS／驗收、相關規格／實作與既有證據 |
| `git status --short` | exit 0；既有根 AGENTS／GlossGate 等修改與未追蹤目錄保留 |
| `gh repo view KYStr/glossquote-labs-text-workbench --json nameWithOwner,url,visibility,defaultBranchRef` | exit 0；PUBLIC、URL、預設分支如上 |
| `git -C '.runs/github-publish/glossquote-labs-text-workbench' status --short`／`rev-parse HEAD`／`log -2 --format='%H %s'` | 各 exit 0；clean，最新文件 commit 與前一功能 commit 如上 |
| `git ls-remote 'https://github.com/KYStr/glossquote-labs-text-workbench.git' 'refs/heads/codex/text-workbench'` | exit 0；遠端 HEAD `8b30f87769e5907524a41652da749890799a11d7` |
| PowerShell `Get-FileHash -Algorithm SHA256` 比較發布清單的 26 檔 | exit 0；來源／發布副本／既有 manifest 差異均為 0 |
| PowerShell here-string 傳入 `node --input-type=module`，原生 `fetch` 兩正式頁並以 `node:crypto` 比對既有 SHA-256 | exit 0；兩頁 HTTP 200、雜湊一致、同語言首頁連結存在 |
| `web.run open` 兩正式頁 | 工具回傳 Internal Error；沒有計入網站 FAIL 或瀏覽器 PASS，已用上述 HTTP 讀取取得頁面證據 |
| `npm.cmd test`／`npm.cmd run check`／`npm.cmd run build`、34 項正式 HTTPS gate、真實瀏覽器操作、來源 push／部署 | 本次 NOT_RUN；沒有程式變更，沿用既有驗收，不重跑建置或正式發布 |

文件建立後，執行 `node --input-type=module` 文件檢查（UTF-8、LF、尾端換行、無行尾空白、22 個本機 Markdown 連結存在），exit 0／PASS。PowerShell 全目錄 SHA-256 比對：接手前 54 個既有檔案全部未變更或刪除；接手後 55 檔，唯一新增 `docs/THREAD-STATUS.md`。根 Git 唯讀狀態與接手前相同，發布副本仍 clean；未以根 Git 的 untracked 狀態冒充完整差異檢查。

本次前／後各執行 `& "$env:USERPROFILE\.codex\check-persistent-environment.ps1"`，皆 exit 0、`Status: PASS`，完整 `Snapshots` 比較完全一致，包括 TEMP／TMP 的型別、長度與雜湊。以下為實際前後相同的持久環境指紋：

| 範圍 | PATH registry type | 長度 | Ephemeral entries | PATH SHA-256 | 完整 Environment-key SHA-256 |
|---|---|---:|---:|---|---|
| HKCU／User | ExpandString | 834 | 0 | `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb` | `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a` |
| HKLM／Machine | String | 1227 | 0 | `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8` | `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82` |

## Milestone 判定

**PASS — 維護接手就緒。** 唯一交付檔為本文件；來源公開與既有正式上線狀態已核對，人工 NOT_RUN、維護風險、命令及接續待辦有來源可追溯。沒有新增功能／重新發布，也沒有待使用者決策的阻塞。下一步是依上方清單另排人工驗收 milestone，保留既有產品與共享整合界線。

## 2026-10-11 最新維護 — AUDIT-TEXT-01

**PASS（本次限定補驗範圍，人工 NOT_RUN 保留）。** [稽核紀錄](AUDIT-2026-10-11.md) 已區分外部回報、沿用結果、本輪真正 IAB 原生 Worker、唯讀來源與受控 harness：

- 英文 `甲😀\n` 精確填值／來源與輸出讀回及兩側 3 碼點／2 行／8 bytes PASS；`<b>audit-20261010</b>` 原樣保留、沒有渲染成 b 元素 PASS。
- 英文來源修改後舊結果與 copy／download disabled PASS；非空结果與三選項 true 的 Clear all 完整欄位／統計／選項／focus 重設 PASS。
- 200,000-unit 合成輸入經逐字比對後，原生 Worker 處理中實際 Cancel click PASS，原文保留、結果空白。大輸入觀察批次曾工具逾時，改精簡 DOM 確認後完成；完整原生遲到／restart 競態仍 NOT_RUN，不把既有 Node／假 Worker 當成本輪真競態。
- TASK-ENTRY 已改為依核定發布規格驗證；zh-Hant／en 及其他 metadata／主機 gate 保留。x-default 尚非本工具必要 gate，缺少它列非阻塞一致化待辦。
- 原生 clipboard／OS download、完整 Network／Storage／離線、真設備／200%／讀屏等仍 NOT_RUN。繁中 Unicode／過期按鈕的主代理補驗與未變來源測試沿用，沒有重跑當成新結果。
- [本輪證據 JSON](../../../.runs/text-workbench/audit-2026-10-11/browser-observations.json)、[原生取消](../../../.runs/text-workbench/audit-2026-10-11/native-cancel-observation.json)、[命令](../../../.runs/text-workbench/audit-2026-10-11/commands.json)。只有五個授權文件與本輪專用證據變更；沒有修改程式／測試／dist／發布副本，未 push 或部署。

PUBLIC／遠端與發布副本 HEAD 仍 `8b30f87769e5907524a41652da749890799a11d7`；功能 `6f994d40c2e28f64df3f5473e158277146b68b97`、既有 hosting `513bcb01-1f0e-45d3-b9cc-0603179997c9` 未由本輪變更。沒有新增使用者決策；下一步由主代理安排上述人工缺口，保留共享整合與憑證邊界。
