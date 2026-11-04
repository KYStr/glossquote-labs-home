> **2026-10-13 U04-LITERAL-FIND-20261013：AWAITING_PRIMARY / EXTERNAL_REVIEW_PENDING。** 新版已PUBLIC來源公開，尚未由此owner部署或取得新版外驗通過。以下2026-10-11 live狀態與更早整合紀錄只屬歷史。

本轮固定source：[fbd488d0622d81e175e1d367801e2959232af22e](https://github.com/KYStr/glossquote-labs-csv-workbench/commit/fbd488d0622d81e175e1d367801e2959232af22e)，PUBLIC／main／remote一致。新增保留欄的所有資料頁case-sensitive字面定位；查找不篩選或改原匯出，所有風險／ack／CRLF／Worker及既有上限保留。

本機Node24.14.0：focused29/29、final61/61，npm.cmd test／check／build／build -- --release均exit0；preview19／release20檔。真正兩語UI與native downloads已核對F201、重名/source index、Unicode/query界線、CRLF／風險確認、1MiB/5000records/100000cells及320px。真zoom／AT／physical／Firefox／完整NetworkStorage／下游NOT_RUN見[驗收](VALIDATION.md)。環境before/after完全一致。

49個Git blob sourceZIP與SHA256 manifest：[ZIP](../../../.runs/04-csv-workbench-outcome-2026-10-13/csv-workbench-fbd488d0622d81e175e1d367801e2959232af22e.source.zip)、[manifest](../../../.runs/04-csv-workbench-outcome-2026-10-13/csv-workbench-fbd488d0622d81e175e1d367801e2959232af22e.manifest.json)；兩者與Git原始bytes逐檔驗證。[HANDOFF](../HANDOFF.md)有完整實改路徑／hash／命令／gap／scope proof。

預覽保留127.0.0.1:4184的繁中index.html與en/index.html；產品與發布copy寫入權已釋放。主代理從固定commit親讀diff與獨立驗收，再做免費Cloudflare／兩語首頁與外部審查；本owner未操作上述shared部署、未讀credential、未發訊或再委派。

# CSV 檢視與欄位整理 — 整合候選

日期：2026-10-10（Asia/Taipei）。任務：THREAD-04-csv-workbench。判定：**READY_FOR_INTEGRATION**。必要本機 gate 已完成；下列人工 NOT_RUN 依使用者明確允許保留。這不是已完成的 live release。

模型配置：建立工具接受 `model=gpt-6.1-sol`／`thinking=max`。後端模型路由無可驗證證據，標記未確認；未自行更換模型、建立子代理／新對話或傳訊其他任務。

## 已實作

- 原生 HTML/CSS/ESM、Node 24+、零依賴；繁中與英文完整 UI、動態狀態、錯誤、教學與六 FAQ。
- 1MiB fatal UTF-8／BOM／Unicode gate、嚴格四狀態 CSV parser、全部精確上限、來源index選欄、100筆資料分頁。
- 含表頭的保守公式predicate；CSV原值風險即拒、CSV保護副本逐格對照／ack、固定schema原值JSON。三種格式／檔名／bytes契約不變。
- 原生FileReader可abort；記憶體Blob Worker可terminate／5秒watchdog／jobId；file rawSource與textarea顯示副本分離，首次input改LF；來源／設定更動撤銷輸出與確認，clear/pagehide釋放資料及URL。
- 預覽noindex；顯式release build準備canonical／雙向hreflang／x-default／sitemap／robots／真404／CSP、nosniff與MIME設定。

## 來源公開

| 欄位 | 已驗證結果 |
| --- | --- |
| Repository | https://github.com/KYStr/glossquote-labs-csv-workbench |
| Visibility | PUBLIC（gh repo view 已驗證） |
| Branch | main |
| Local／remote HEAD | `6b3d2edef4e4056b867d9cf7105b36843359a7c5`（git ls-remote相同） |
| Reviewed manifest | 44來源／說明檔＋publication-manifest.json，共45tracked files |
| Manifest SHA256 | `e4bbb1397eac50be6fa43709b4a84e4030c38f9e2df1ff2a997be8b6da5c405b` |
| Working tree | 獨立發布副本乾淨；staged diff --check與最後diff --check通過 |

發布副本：`.runs/github-publish/glossquote-labs-csv-workbench`。只在此副本init／add／commit／push；根repo無分支／commit／index寫入。明確排除其他工具、dist、.runs、憑證、內部TASK-ENTRY／TASKS／AGENTS／HANDOFF及此整合候選文件。没有取得或列印token；使用既有KYStr gh登入，Git身份為公開noreply別名，hooks與簽章只在這份發布命令隔離。

## 本機證據

[完整驗收](VALIDATION.md)、[設計說明](DESIGN-BRIEF.md)、[HANDOFF](../HANDOFF.md)。原始證據位於 `.runs/csv-workbench/20261010-implementation`，只追加此工具資料。

| Gate | 真結果 |
| --- | --- |
| npm.cmd test | exit 0，42/42 PASS，0 skipped |
| npm.cmd run check | exit 0 |
| npm.cmd run build | exit 0，18個noindex預覽檔 |
| npm.cmd run build -- --release | exit 0，19個候選檔，目前dist即此模式 |
| verify-artifacts.mjs | exit 0，真dist SEO／範圍；loopback53757真404、HTML／CSS／ESM MIME／安全headers |
| Browser | Chrome154，Windows NT10.0.26200.0；browser-final.txt的8組PASS |
| Responsive | 兩語320 CSS px（client305含scrollbar差）、50欄長值／201data及修改格均100/100/1；無page橫向溢出；200%字體32px仍無外層溢出 |
| No-JS | sandbox實際禁script，靜態方法／限制／6FAQ與noscript可讀 |
| Processing host offline | 4184停止後已載入頁仍native parse／準備JSON274bytes，clear空；無console error |
| Persistent environment | before、after-local、各發布階段before/after、after-all全PASS；PATH hash/type/length/0 ephemeral及完整Environment-key fingerprint均一致 |

4184／5184預覽及驗收服務已停止；沒有終止其他伺服器。Git根repo原有其他修改未操作。

## 人工 NOT_RUN／限制

- 真正200%browser page zoom：工具呼叫未改變寬度，沒有冒充PASS；有已量測的320px及200%字體大小結果。
- OS檔案選擇器全鍵盤、實際下載落盤／儲存對話框、screen reader、Firefox、真手機／觸控、下游試算表。
- 正式主機HTTPS／response headers／DNS、live SEO與兩語homepage catalogue尚未執行。
- Blob下載anchor、固定檔名／MIME、一秒URL撤銷已驗證；harness攔截anchor，不宣稱實際落盤。
- 保護副本改字串且不保證所有試算表安全；負數亦列風險。貼上／編輯採LF，未編輯檔案才保留原格內CRLF。原值不承諾byte-for-byte。

沒有待使用者重授權事項。剩餘hosting／首頁是原主對話整合界線，不是需要此對話讀取憑證或自行部署的授權。

## 主對話整合資料

- Source slug：`csv-workbench`；候選中文 `https://csv.glossquote.com/index.html`，英文 `https://csv.glossquote.com/en/index.html`。
- 名稱：繁中「CSV 檢視與欄位整理」、英文「CSV viewer and column export」；類別「資料 / Data」。
- 短文：中文「在裝置上預覽 UTF-8 CSV、選取欄位，檢查公式風險並匯出副本。」；英文「Preview UTF-8 CSV locally, select columns, review formula risks and export a copy.」
- 靜態產物：此工具的 `dist/`，`npm.cmd run build -- --release` 重建；`public/`維持noindex。無runtime server／帳號／資料庫／模型資產。
- 同語言首頁link已存在。**此對話未改00-home**；主對話先獨立審查、按既有免費Cloudflare授權部署並核實兩語／headers／MIME／404，再更新catalog至published、重建／發布首頁來源並驗證兩語live首頁。
- Hosting status：**NOT_DEPLOYED_BY_THIS_TASK / integration pending**。未讀部署token、未改DNS、未操作Cloudflare帳戶或正式Worker、未改040141.xyz或GlossGate。


<a id="release-20261011"></a>

## 2026-10-11 正式發布更新

- 狀態：**PUBLIC_SOURCE_VERIFIED / LIVE_HTTP_VERIFIED / PASS_SCOPED_BROWSER**。下列證據取自已保存的主代理發布紀錄；本次文件更新未重跑 Git、部署、HTTP 或瀏覽器測試。家族首頁整合結果由主對話發布報告另行記錄。
- 正式網址：[繁體中文](https://csv.glossquote.com/index.html)、[English](https://csv.glossquote.com/en/index.html)。
- 公開來源：[KYStr/glossquote-labs-csv-workbench](https://github.com/KYStr/glossquote-labs-csv-workbench)，**PUBLIC**；verified source commit／remote HEAD 均為 [8bb5dae0660057f8b803d4e4410a8dbc8c9014f3](https://github.com/KYStr/glossquote-labs-csv-workbench/commit/8bb5dae0660057f8b803d4e4410a8dbc8c9014f3)（2026-10-11T06:19:22.528Z）；[來源發布 JSON](../../../.runs/release-2026-10-11/csv-source-publication.json)。
- Cloudflare：正式 host csv.glossquote.com，部署 exit code **0**；version **ebd109aa-323b-483e-acfc-9ee3e6468d2e**（2026-10-11T06:19:30.8218279Z）；[部署 JSON](../../../.runs/release-2026-10-11/csv-deployment.json)。
- HTTP：**PASS_HTTP**（2026-10-11T06:20:34.828Z）。18 個發布資產的 GET／HEAD 均為 200，GET 精確位元組／SHA256 與發布 dist 對應；HTTPS、CSP/MIME、canonical/alternates、robots/sitemap 檢查通過。兩個不存在路徑為真 404；兩語 browser User-Agent 頁面均為 200 且 SHA256 對應。共 40 筆 HTTP 紀錄；[正式 HTTP JSON](../../../.runs/release-2026-10-11/csv-live.json)。
- 瀏覽器：**PASS_SCOPED_BROWSER**（2026-10-11T06:25:37.793Z）。英文保留字串 001，=1+1 觸發公式風險、原值 CSV 停用，保護副本要求確認；繁中含逗號的 A,B 保留為同一格。主代理保存兩個原生下載 selected-protected.csv 與 selected-original.json 的落盤路徑。 [本輪瀏覽器 JSON](../../../.runs/release-2026-10-11/csv-browser.json)。
- 剩餘人工 **NOT_RUN**：下游試算表、完整 Network/Storage、跨裝置矩陣；原有真正 browser page zoom 200%、OS 檔案選擇器／儲存對話框全鍵盤、screen reader、Firefox、實體手機／觸控例外仍保留。本輪兩個原生檔案落盤已補足該範圍的舊下載 NOT_RUN。 本輪 scoped browser 與靜態 HTTP 驗收不構成完整封包／Storage 稽核。
- 原有本機 MVP gate、產品限制與歷史命令結果維持上方歷史紀錄；本輪新證據取代其舊正式 hosting／live HTTP 待驗狀態，沒有把人工未跑項目改標 PASS。所有時間為 UTC。
