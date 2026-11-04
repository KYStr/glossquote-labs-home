# 日期差與加減天數：維護接手狀態

## 最新 AUDIT-DATE-01（2026-10-11）

**限定維護 milestone PASS；完整 MVP／隱私 P1 未結案。** 英文正式頁已在本對話自己的 IAB 分頁精確填入並讀回 2024-02-28／2024-03-01，結果 2／3；樣式正常、fieldset 啟用、fallback 隱藏，無需 reload。既有 3 個 Node 測試 PASS，證明 1900／2000／2100 規則與 9999 上限，與真 UI 證據分開。繁中閏年、swap 與 0001 下限沿用主代理紀錄。

本輪匿名 HTTP 兩語 HTML 與已審查 dist 相同且無 Insights；自己的英文 live DOM 卻有 beacon script。21 份 public/scripts/dist 標記排查為零、25 份 M11 實作 SHA256 相同，不能據此推定 live 無注入。script 存在與零分析承諾不一致；執行、CSP、rum、payload、完整 Network/Storage 仍 NOT_RUN。跨站主機 P1 留原主對話，未讀憑證、未修改主機／CSP或部署。

TASK-ENTRY 已依核定發布契約移除通用「x-default 必須」要求；本工具只要求 zh-Hant/en，x-default 為非阻塞一致化待辦。只更新本工具 5 份文件與專用證據，產品未變；公開 HEAD 仍 `e0119622d5f534d2e28a085716239040ab786a9d`，無本輪 commit／push／hosting 部署。全部新增結果與證據見 [AUDIT-2026-10-11](AUDIT-2026-10-11.md)。下方保留 2026-10-10 接手歷史，不用舊 HTTP 條件代替當日瀏覽器觀察。

日期：2026-10-10（Asia/Taipei）。任務：`THREAD-06-date-calculator`。

本 milestone 只建立維護接手紀錄：核對實際檔案、最新交接與驗收證據，記錄來源、正式網址、人工保留項及可接續待辦。唯一寫入檔案為本文件；未修改產品、建置、部署、公開來源或其他工具。

## 接手判定與模型配置

**維護接手就緒；本次文件 milestone PASS。** 已有產品與正式站，沒有新功能任務。正式站兩語 HTML 發現新的外部 beacon script，已留具體證據，交由原主對話審查；本次不將線上產物一致性標為 PASS。

建立任務的交接訊息記載 `create_thread` 已傳入並接受 `model=gpt-6.1-sol`、`thinking=max`。本對話未更改配置、未建立子代理或新對話、未傳訊其他任務。可用工具未提供本輪後端實際模型／推理路由的可驗證資訊，因此**後端路由未確認**；不以模型自述或專案預設代替證據。

## 來源、本機與上線分開記錄

| 面向 | 接手時的實際狀態 |
|---|---|
| 本機實作 | 繁中／英文原生 HTML、CSS、ESM 已存在；`package.json` 為 private / module、Node >=24、無套件依賴。兩語共用日期核心。 |
| 本機驗收 | 最新 M11 歷史證據為 52/52 離線測試、source check 23、preview build 8、Cloudflare production build/check 12 與 dry-run PASS。本次核對 25 份實作檔案均與 M11 reviewed-files 及乾淨發布副本相同，沿用結果，未重跑全測。 |
| 完整 MVP | 人工項未全部完成；`project.json.implementationStatus` 實際仍為 `in-progress`。必要本機／發布驗收通過不代表完整跨平台 MVP 已結案。 |
| 公開來源 | [KYStr/glossquote-labs-date-calculator](https://github.com/KYStr/glossquote-labs-date-calculator)，PUBLIC / private=false；預設分支 `codex/initial-publication`，GitHub Pages=false。 |
| 最新來源 commit | [`e0119622d5f534d2e28a085716239040ab786a9d`](https://github.com/KYStr/glossquote-labs-date-calculator/commit/e0119622d5f534d2e28a085716239040ab786a9d)。2026-10-10 10:18:39 +08:00，以無認證 GitHub API 確認預設分支 HEAD 與發布副本 HEAD 相同，副本無未提交變更。27 個公開檔，其中 25 份實作檔與工具來源相同；最後提交只更新上線 README。 |
| 正式繁中 | [https://date.glossquote.com/index.html](https://date.glossquote.com/index.html) |
| 正式英文 | [https://date.glossquote.com/en/index.html](https://date.glossquote.com/en/index.html) |
| 已完成發布 | 首次上線 2026-10-06；最新家族導覽 M11 發布 2026-10-07，記錄版本 `d1fd7aac-2e3d-4216-b9f9-18f069c7719b`。歷史主代理 30 項日期站 HTTPS 案例、10 份產物位元組、雙語真瀏覽器計算／同語首頁導覽 PASS。 |
| 現行讀取檢查 | 2026-10-10 10:19:31 +08:00，10 份公開資產 HTTPS GET 均 200，MIME 正確。8 份與 M11 位元組相同，兩語 HTML 不同，詳見下節。本次未操作瀏覽器或驗證所有 HTTP 案例。 |
| 託管設定 | M11 曾核對 Cloudflare Free、純 Static Assets、0 bindings、workers.dev/previews/logs/traces disabled、DNSSEC Active。本次沒有登入主機後台或重新查詢這些設定／版本；不能把歷史設定證據當成當日重新驗證。Git push 不會自動部署正式站。 |

發布副本：`C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs/.runs/github-publish/glossquote-labs-date-calculator`。本次只唯讀檢查，沒有 commit、push、切分支或 index 修改。

## 本次發現：正式 HTML 多出外部 beacon

範圍：日期站 `/index.html` 與 `/en/index.html`，不涉及核心演算法變更。兩次唯讀 GET 得到相同雜湊。既有本機 `dist` 兩語 HTML 的 SHA256 仍等於 10 月 7 日 M11 記錄；現行 HTML 末端新增 `type="module"` 的 script，來源為：

```text
https://static.cloudflareinsights.com/beacon.min.js/v4bc70e2c01a94c73b74392e4234840661791215815920
```

該節點帶有 `data-cf-beacon`；本文件不複製其識別值。以 `Compare-Object` 比對本機正式 HTML 與當日 HTTP HTML，各語差異只有新增這個 script 及 `</body>` 縮排改變。本機 `public`、發布副本與 M11 已審查來源相同；沒有此額外 script。**推論**：差異符合託管端 HTML 注入特徵，實際是哪項設定或何時加入尚未確認，不能據此判定新增部署或歸因給某個對話。

| 頁面 | M11 紀錄／現存 dist SHA256 | 當日正式 HTML SHA256 |
|---|---|---|
| 繁中 | `52883bceed1695bec1cece66282a93a680f5a17b2418633c7afdda22d4f56627` | `1ca5f7ca5ec70cd450ac07c0abf59dfab8c5a6bf22cb8f6669aabfd3b051f89f` |
| 英文 | `a17e4acb419a1f7f485e7350fad001a032ca0ec3650c8e8934d74f1c1df3266a` | `be069f768f3e57026ebdb4ff0dc5df1dcbc94dbe89b269940c98912d6b69dd55` |

其餘 8 份相同：`robots.txt`、`sitemap.xml`、兩份 CSS、app、i18n、calculator 與 dates 模組。两語仍有正確 `lang`、自指 canonical、`index, follow` 與同語言首頁連結。現行 HTTP CSP 包含 `script-src 'self'`、`connect-src 'none'`，並有 `nosniff`、`no-referrer`。這個 CSP 預期會阻止外部 script，但本次未觀察真瀏覽器 Network，**是否載入／送出 beacon 為 NOT_RUN**，不得宣稱已追蹤或已證明無網路外送。

本項判定：**HTML 與既有正式產物一致性 FAIL；是否實際遙測未驗證。** 新增外部 script 與根契約及 [PRIVACY-SECURITY](PRIVACY-SECURITY.md) 的無追蹤／無外部執行資產要求衝突。未發現日期核心來源改動；本次未重驗計算 UI，不把這項差異推論為計算失效。

需要原主對話整合：核對日期 hostname 的 Web Analytics／HTML 注入設定及現行 CSP 行為，依既定無遙測契約處理後，重新比對兩語正式 HTML 並觀察 Network。修復、主機設定、首頁／其他站審查不在本次寫入範圍，尚未執行；本對話不讀憑證或改正式主機。

## 沿用的人工待驗

下列均保留 **NOT_RUN**，使用者已允許保留；不以核心測試、程式審查、強制文字 fixture 或模組失敗替代真人／真平台驗證。

| 範圍 | 已有證據 | 尚待執行 |
|---|---|---|
| D20 隱私 | source 審查、重新整理回空表、URL／console 部分檢查 | 清空完整 DevTools Network 後操作兩模式／交換／清除；以合成標記核對 Local/Session Storage、IndexedDB、Cache、URL／console；同時觀察新增 beacon。 |
| D22 鍵盤／輔助工具 | IAB 方向鍵、Tab、Enter、焦點與欄位流程 PASS；T08 兩語 Enter 確認更新 PASS | 真螢幕閱讀器朗讀、真手機觸控與正負號鍵盤。 |
| D23 重排 | 兩語 320px、44px 控制及完整英文 ISO 結果 PASS | 真 200% 瀏覽器縮放、額外 40% 長標籤。 |
| D24 降級 | 強制文字欄位與模組載入失敗 PASS | 真不支援 date 的瀏覽器、真正關閉 JavaScript 的 noscript 畫面。 |
| 跨平台／生命週期 | 現有 IAB 紀錄，未提供引擎版本 | Firefox／Safari、實體手機、首次離線、真 BFCache。不得宣稱可離線重開的 App。 |
| 搜尋 | 已有正式 metadata、robots、sitemap 證據 | 搜尋引擎／Search Console 收錄未驗證；本 milestone 不擴大成 SEO 營運工作。 |

## 可接續事項與邊界

1. **優先交接上列外部 beacon 差異給原主對話審查。** 無須新功能設計；本次只留下證據與建議核對範圍，不自行修正式站或放寬 CSP。
2. 可另安排人工保留項，依 [ACCEPTANCE](../ACCEPTANCE.md) 的 D20／D22／D23／D24 執行，記錄真實瀏覽器／裝置／版本、合成輸入與結果。全部必要人工 gate 通過前，保留 `in-progress`。
3. **預覽埠尚有文件／程式落差。** 本次 TASK-ENTRY 分配 `127.0.0.1:4186`、fixture `127.0.0.1:5186`；實際 `scripts/serve.mjs:9` 固定 `PORT = 4174`，且未看到 PORT 設定讀取。因此不能聲稱直接 `npm.cmd run dev` 會使用 4186。本次未啟動任何服務。下一個需要預覽的任務，先取得相關腳本／測試 allowed paths，再一致處理埠與證據；不殺既有占用者。
4. **較舊狀態只作歷史。** `TASKS.md`、README、VERIFICATION、GITHUB-PUBLICATION、CLOUDFLARE-DEPLOYMENT 的摘要仍停在 T09；PRODUCT／ACCEPTANCE 開頭仍寫「尚未實作」。現況以 HANDOFF 最上方 M11 與本文件的當日核對為準。可在後續文件任務統一索引，這次不改上述文件。

日期核心固定契約：日期差為 B−A，含起訖為 abs(差)+1；日期 0001-01-01..9999-12-31、純整數公曆 ordinal；天數整數 −3652058..3652058，拒絕越界與未知欄位。保留雙語、同語首頁連結、模式／語言／清除／pagehide 清工作資料及 T08 Enter 通知行為。不加入工作日、假日、時區、月份／年份加減、儲存、帳號、API 或依賴。

新程式變更須另依 TASKS 定義 allowed paths 與必要 gate；相關測試/check/build 只在輸入改動或失敗時重跑。正式部署、DNS、首頁與跨站整合由原主對話負責；本次没有缺少使用者輸入而阻塞接手的事項，亦不要求重複授權。

## 本次命令與結果

命令工作目錄為 `C:/Users/<LOCAL_USER>/Documents/Codex/GlossQuote-Labs`；網路讀取只使用公開日期網址與無認證 GitHub API，未讀任何憑證。

| 已執行命令／操作 | 退出碼與結果 |
|---|---|
| `Get-Content -LiteralPath ... -Raw`；相關段落用 `rg -n` | 0。已讀 TASK-ENTRY、根／工具 AGENTS、SECURITY-BASELINE、START-HERE、TASKS、HANDOFF、PRIVACY-SECURITY、PRODUCT、TECHNICAL、ACCEPTANCE、ENGINEERING、README、VERIFICATION、GITHUB-PUBLICATION、CLOUDFLARE-DEPLOYMENT；定點讀 core、app／serve／兩語 HTML 與 M11 整合紀錄。 |
| `rg --files`（工具與專用證據，排除 npm-cache 等工具暫存）；`git status --short --untracked-files=normal` | 0。工具原有 47 檔基線；根 AGENTS／GlossGate 既有修改及未追蹤目錄保留。 |
| 發布副本 `git -C <副本> rev-parse HEAD`、`status --short`、`ls-tree -r --name-only HEAD`；`Get-FileHash -Algorithm SHA256` | 0／PASS。HEAD 為 e011962…，副本乾淨，25 份實作檔與本工具一致。M11 reviewed-files 中同 25 檔亦完全相同。 |
| `Invoke-RestMethod` GET `https://api.github.com/repos/KYStr/glossquote-labs-date-calculator` 及預設分支 commits API | 0／PASS。PUBLIC、private=false、預設分支／遠端 HEAD／Pages 狀態如上表，沒有發送 Authorization。 |
| `web.run open` 兩語正式 URL 與 GitHub URL | 無程序退出碼。日期 URL 在此工具不可存取；GitHub 回傳較舊快取，未採其舊 README 為當日現況。正式檢查改用下列直接 HTTPS GET。 |
| PowerShell `.NET HttpClient` GET M11 records 中 10 個公開 200 路徑，計算 SHA256 | 程序 0；HTTP／MIME 10/10 PASS，位元組 8/10 PASS、2/10 FAIL。沒有把程序退出 0 當一致性 PASS。當日雜湊及新 script 證據見上節。 |
| 再 GET 兩語 HTML；`Get-FileHash` 現存 dist；`Compare-Object` 分行差異 | 0。兩次 live 雜湊相同；dist 仍與 M11 相同，定位到新增 beacon script／body 縮排。未重新 build 或覆寫 dist。 |
| `& "$env:USERPROFILE\.codex\check-persistent-environment.ps1"`（前後） | 0／PASS，完整 Snapshots 相同，見下列指紋。沒有安裝工具或修改持久環境。 |
| 文件寫入與完成範圍檢查（`rg --files`／`Get-FileHash`；PowerShell 連結、空白與換行檢查） | 0／PASS。只新增本 `docs/THREAD-STATUS.md`，既有 47 檔 SHA256 全部未變，無刪檔；6 個 Markdown 本地連結存在，無尾端空白且檔案以換行結束。末次環境 guard 亦退出 0、完整 Snapshots 與起始相同。 |
| `npm.cmd test`、`npm.cmd run check`、`npm.cmd run build`、Wrangler、真瀏覽器全回歸 | **NOT_RUN（本次）**。文件維護沒有程式變更，沿用可追溯的未變輸入證據；未重新部署或執行昂貴全測。人工項仍 NOT_RUN。 |

本次持久環境前後指紋（全部一致；TEMP/TMP 型別、長度、雜湊亦一致，保留既有重複 PATH 項）：

| Scope | PATH 型別／長度／ephemeral 數 | PATH SHA256 | Environment-key SHA256 |
|---|---|---|---|
| HKCU | ExpandString / 834 / 0 | `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb` | `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a` |
| HKLM | String / 1227 / 0 | `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8` | `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82` |

## 證據入口

- [TASK-ENTRY](../TASK-ENTRY.md)：本次文件唯一寫入範圍、配置、4186／5186 與發布邊界。
- [HANDOFF](../HANDOFF.md)：最上方 2026-10-07「最終 M11」優先於下方 T09／待部署歷史。
- [VERIFICATION](VERIFICATION.md)：D01–D24 狀態、IAB／oracle／fallback 證據與完整人工保留項。
- [家族發布整合紀錄](../../DEPLOYMENT-MILESTONE.md)：M11 正式版本、日期站 30 HTTP／10 檔與公開 commit。
- `../../../.runs/site-launch/date-live-verification.json`：2026-10-07T09:39:10.308Z，LIVE、30 個 records、10 份公開產物及雜湊。
- `../../../.runs/site-launch/live-browser-verification.json`：兩語真站閏年 2／3 及首頁導覽；不替代當日 beacon Network 驗證。
- `../../../.runs/site-launch/github-verification.json`、`reviewed-files.json`：PUBLIC／遠端 commit／27 blobs 與 25 份日期實作 SHA256。
- `../../../.runs/date-calculator/t09/`：較早 T09 的正式／本機驗收，均保留，未覆寫。

本次新發現、HTTP 雜湊與命令結果直接保存在本文件；沒有新增或覆寫 `.runs` 產物，也沒有新 RELEASE-CANDIDATE（本次沒有待發布程式）。
