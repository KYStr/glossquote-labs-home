# U01-REMOVAL-REVIEW-20261013

## 同批既定 SEO 要求校正

主代理已核對現行 scripts/release.mjs 的 links 只有 canonical/zh-Hant/en；不是本批退化。依 CONTINUOUS-DELIVERY-GOAL.md 的共通規格，本次一併補齊正式兩語唯一 `hreflang="x-default"`，都指向 `https://text.glossquote.com/index.html`。預覽仍 noindex，不洩漏正式 origin。允許最小修改 scripts/release.mjs、必要對應 check/release tests 及 UX-SEO，測試實際兩模式產物；不得放寬 CSP。正式命令的 site-url 必須帶尾斜線 `https://text.glossquote.com/`。

2026-10-13主代理核定需求。使用者已授權本批改善；須收到本任務實際開工訊息才實作，不自行開下一階段。原owner 01a12398-fbcf-7a41-9283-5a2a80a9ddef，明確請求gpt-6.1-sol/max，禁止再委派。表面為Product App，沿既有tokens與版型。

主代理已核對text清理順序、CSV session頁碼/匯出行為、decision整數公式。下方草案中的產品預設與案例在本任務採用為要求；函數或metadata命名可等價調整並在交接說明，不能省略結果與失效規則。所有案例是預期，不是已執行測試。

## 01 文字整理：來源與移除明細

### 交付與非目標

使用者整理名單後，要核對哪幾行被移除、為什麼移除，以及重複內容首次保留在哪一行。完成條件：同一成功結果旁能展開完整移除清單；清单的來源行位置、原因與保留位置能與原文逐筆對照；原文、既有整理結果與下載 bytes 維持現有語義。

本輪不加入排序、大小寫或模糊去重、NFC/NFKC、檔案／URL 讀取、批次、原文改寫、摘要下載、逐行復原或新的清理選項。結果 textarea 不改成另一種編輯器。

### 現況：已讀實際程式

| 檔案／函式（行號以本次讀取版本為準） | 實際行為與接點 |
|---|---|
| `public/js/core/text.mjs:51` `validateText` | 原文最多 200,000 UTF-16 units、262,144 UTF-8 bytes；拒絕孤立 surrogate。 |
| 同檔 `:69` `normalizeNewlines`、`:74` `measureText` | CRLF／孤立 CR → LF；空字串 0 行，非空 split 段數包含尾空行；碼點與 bytes 明確計算。 |
| 同檔 `:86` `cleanText` | `trimAscii → dropEmpty → deduplicate`；trim 只 U+0020/U+0009；空行只 `length === 0`；Set 精確 UTF-16 字串去重、保留首筆順序。目前只回 `{text,before,after}`，沒有來源 mapping。 |
| `public/js/worker.mjs` `handleWorkerMessage` | exact request `{type,jobId,text,options}`，固定 `result` envelope；捕捉失敗為固定碼。 |
| `public/js/app.mjs:30` `inspectReply` | 成功 value 目前 exact keys 為 `text/before/after`，驗證輸出 LF、Unicode、bytes 與兩側 metrics；直接加欄位會被當成 `WORKER_FAILED`，必須同步擴展並驗新 schema。 |
| 同檔 `:47` `mountWorkbench`、`:117` `clearOutput` | 輸入或選項變更先 invalidate job、terminate、清結果／下載 URL；5 秒 watchdog；成功／empty 才可複製，空字串不可下載。 |
| `public/js/core/session.mjs` `transition` | reducer 僅含 jobId/status/errorCode，資料不放 session；stale reply 不採用。 |
| `public/js/core/export.mjs` `encodeOutput` | UTF-8 無 BOM、LF，僅輸出 cleaned text，不附摘要。 |
| `public/index.html`、`public/js/i18n.mjs` | 來源 `#source-text`、結果 `#output-text`、三選項與 before/after metrics 已存在；同 JS 支援繁中／英文。 |

### 資料契約與算法

1. 先完成現有原文、options、Unicode、units／bytes 驗證；request options 仍 exact 三個 Boolean。超限與錯誤不回部分摘要。
2. `lfText === ''` 的來源行集合為 `[]`；其他來源以 `lfText.split('\n')` 建立。來源行號固定 1-based，指本次 LF 正規化後的來源段落，CRLF 視為一個換行；不是視覺自動折行或 UTF-16 offset。
3. 每個來源行帶原始序號先做現有 ASCII trim。若 `dropEmpty` 且 trim 後長度 0，記 `empty` 並移除，之後不再以 duplicate 原因記一次。未勾 trim 的空格／Tab 行仍不是空行。
4. 對未被 empty 移除的行，以處理後的精確字串做去重。Map 保存該字串首次保留的來源行號。後續相同字串記 `duplicate` 與 `keptFirstSourceLine`；首次本身保留。空字串在 dropEmpty 關閉時也可成為首次保留值。
5. 其餘保留行按既有順序 join LF。現有 `before/after` 的定義與 `text` 完全不改。
6. 建議成功 value exact keys 擴為 `{text,before,after,provenance}`。`provenance` exact keys 為下列五個數字陣列；不用每個來源行建立含原文的物件：

```text
keptSourceLines: number[]
emptyRemovedSourceLines: number[]
duplicateRemovedSourceLines: number[]
duplicateFirstSourceLines: number[]
trimmedSourceLines: number[]
```

`duplicateRemovedSourceLines[i]` 的首次保留來源為 `duplicateFirstSourceLines[i]`。前三份來源列表分別嚴格遞增、不重複、互斥，合起來剛好涵蓋 1..來源行數；兩份 duplicate 陣列等長。首次保留必須小於對應被移除行，且存在 kept 列表。trimmed 列表嚴格遞增、域內，表示原行與 ASCII trim 後字串不同，可包含後來被移除的行。

來源上限意味最多 200,001 個來源段落，任何 metadata 陣列不得超此數量；數字必須 safe integer，非法型別／own accessor／未知欄位／域外／錯誤對應均拒絕。對應選項關閉時，empty／duplicate兩列表／trimmed列表必須為空；`inspectReply` 以本次捕獲的 options 同步驗證新 metadata 的 exact shape、長度、範圍、分割與對應，原文／結果 metrics 檢查不可刪除。把 metadata 命名或改成同樣有界的等價緊湊格式是原 owner 的實作選擇，必須在 TECHNICAL 與測試固定。

UI 以當前同 jobId 的來源 textarea／正規化來源字串按行位置取原行內容；不把它寫到 reducer、worker error 或日志。摘要頁只合併目前所需的數字位置，避免一次產生 200,001 個 DOM 行。這些工作 metadata 不是持久 audit receipts。

### UI、狀態與文案

- 來源與唯讀結果仍是主要工作區。在結果統計／結果動作附近增加一行 `移除 4 行：空行 2、重複行 2。2 行有首尾空格或 Tab 變動。`，英文對等為 `Removed 4 lines: 2 empty and 2 duplicates. ASCII edge spaces or tabs changed on 2 lines.` 實際數量由 provenance 計，不以 before.lines − after.lines 推算。
- 有移除時顯示一層原生 `details`，summary 為「查看移除明細（4 行）」／`Review removed lines (4)`；預設收合。沒有移除時顯示「沒有移除任何行」，不留下空明細或舊筆數。
- 明細每筆有來源第 n 行、原行完整純文字、單一原因；duplicate 再寫「重複；保留來源第 m 行」／`Duplicate; first occurrence kept at source line m`。若 trim 影響比對，在該筆補「依移除首尾空格／Tab 後的內容比對」。不把原行悄悄替換成 trim 後內容。
- 空行内容用「空行（0 字元）」的補充標記與空的原值區分；空格／Tab 行以保持空白的 `pre` 呈現，可補「只含空白」文字，但原值不插入可見替代字元。長行全文可在局部區域捲動，不以省略號冒充完整內容。
- 清單依來源行号遞增、每頁最多 100 筆，有上一頁／下一頁／第 x/y 頁；不循環。分頁／展開只改顯示，不重做整理，不變更複製／下載內容。
- `idle/dirty/running/error/cancelled/unsupported` 沒有可用摘要；只有當前 success/empty 才顯示。start、輸入／選項變更、cancel、clear、timeout、Worker 失敗、pagehide 與 destroy 共用清除摘要與頁碼。每次新成功結果頁碼歸 0、明細收合；copy／download 的動作提示不使摘要失效。
- 空結果仍可能有已保留空段落；補充「保留的空行可能仍形成空結果，結果行數按輸出字串計算」避免顯示矛盾。維持空結果可複製、不能下載的現有規則。
- 原生 details 可由鍵盤操作；表／列表有標題，來源位置與原因不只靠顏色。完成僅 polite 宣告摘要一次，分頁不朗讀整份原文。320px、200% 頁面 zoom、長英文與 reduced-motion 均保留操作。

```text
桌面：原文 [textarea]       結果 [readonly textarea]
      三項清理與整理        metrics／複製／下載
                           移除總數与原因數
                           ▸ 查看移除明細（n 行）
                             來源行 | 原行 | 原因 | 保留首次
                             上一頁  x/y  下一頁
手機：原文 → 選項／整理 → 結果／動作 → 摘要／可展開逐筆明細
```

### 精確驗收案例

以下字串使用 JS escape 表達 CR/LF/Tab，不是字面反斜線。陣列皆來源 1-based；`D/F` 分別代表 duplicate removed／first kept。

| ID | 输入／操作 | 精確預期 |
|---|---|---|
| U01-01 | `"  A \r\nA\r\n\r\n B\t\r\nB\r\n"`，三項 true | text=`"A\nB"`；before `{codePoints:14,lines:6,utf8Bytes:14}`，after `{codePoints:3,lines:2,utf8Bytes:3}`；kept `[1,4]`、empty `[3,6]`、D `[2,5]`、F `[1,4]`、trimmed `[1,4]`。明細順序 2 duplicate→1、3 empty、5 duplicate→4、6 empty；共移除 4 行。 |
| U01-02 | `" A \nA\n \t\n\nB\nB\n"`，trim/dedup true，dropEmpty false | text=`"A\n\nB"`；kept `[1,3,5]`、empty `[]`、D `[2,4,6,7]`、F `[1,3,5,3]`、trimmed `[1,3]`。来源第 3 行 trim 後為空仍是首次保留；第 4／7 行因 duplicate 移除。 |
| U01-03 | `"\n"`，只 deduplicate true | before.lines=2、after.lines=0、text=`""`；kept `[1]`、D `[2]`、F `[1]`、empty `[]`、trimmed `[]`。移除數為 1，不是 2；empty 狀態仍可查摘要，複製可用、下載停用。 |
| U01-04 | `" \t"`，trim true，其餘 false | text=`""`；kept `[1]`、移除兩列表均空、trimmed `[1]`。顯示 0 行被移除、1 行首尾變動，不把 trim 假稱整行刪除。 |
| U01-05 | `"A\r\nA\r"`，只 deduplicate true | 正規化來源 3 行，text=`"A\n"`；kept `[1,3]`、D `[2]`、F `[1]`。孤立 CR 與 CRLF 的來源位置均按 LF 段落算。 |
| U01-06 | `"é\ne\u0301\né\n a\na\n\u3000a\u3000"`，trim/dedup true | text=`"é\ne\u0301\na\n\u3000a\u3000"`；kept `[1,2,4,6]`、D `[3,5]`、F `[1,4]`、trimmed `[4]`。無 NFC、全形空白與大小寫擴大處理。 |
| U01-07 | `""`，任意合法 options；另 `"A\nA"` 三項 false | 空來源：所有列表空、before/after 全零。三項 false：text=`"A\nA"`，kept `[1,2]`、無移除、無 trim 變動。 |
| U01-08 | `"\n".repeat(200000)`，三項 true | 純函式仍成功；來源 200,001 段落，empty `[1..200001]`、其他列表空；text empty。明細总 2,001 頁，末頁 1 筆，每頁 DOM ≤100；真瀏覽器大資料不凍結，超時按現有 TIMEOUT，不能放寬 5 秒。此最大案例本報告未執行。 |
| U01-09 | 成功後變更任一選項；running 時 clear／cancel；注入舊 jobId 回覆 | 摘要立即清空、結果與 copy/download 失效；clear 後原文空、三項 false、焦點回原文；過期回覆不復活任何列表／計數。 |
| U01-10 | 注入 provenance 域外來源、首次不在 kept、未知鍵、列表重疊／漏行或 accessor | 固定 WORKER_FAILED、沒有結果或摘要，不執行 getter，不回 raw payload。合格的原 text/before/after 不能讓不合格 provenance 通過。 |
| U01-11 | 原行為 `<img src=x onerror=alert(1)>`，重复两次 | 明細與結果均純文字、无 img／dialog／request。複製只帶整理 text，下载 `cleaned-text.txt` bytes 等於新增功能前的 encodeOutput(text)，沒有來源位置或理由。 |
| U01-12 | 明細展開、換頁、複製；再新成功结果 | 展開／換頁不發 Worker、不改 text；新成功結果归第一页、收合。繁中與英文有同样數量、座標、原因与保留位置；键盘、320px、200%zoom 合格。 |

### 原功能對話允許改檔建議與 acceptance

產品範圍僅 `tool-projects/01-text-workbench/` 下的：`public/js/core/text.mjs`、`public/js/worker.mjs`、`public/js/app.mjs`、`public/js/i18n.mjs`、`public/index.html`、`public/en/index.html`、`public/styles/app.css`；測試 `test/text.test.mjs`、`test/session.test.mjs`、`test/i18n.test.mjs` 及新增 `test/provenance.test.mjs`；對應 `PRODUCT.md`、`TECHNICAL.md`、`ACCEPTANCE.md`、`UX-SEO.md`、`HANDOFF.md`、`docs/VERIFICATION.md`、本任務紀錄。`dist/` 只由既有 build 產生。session／export／tokens／發布腳本無本功能修改需要，若新增事實顯示需要再由主代理限定擴展。

既有 package scripts：Node ≥24、原生 ESM、零依賴。在上述工具目錄執行 `npm.cmd test`、`npm.cmd run check`、`npm.cmd run build`；production candidate 使用已存在的 `npm.cmd run build -- --production --cloudflare --site-url https://text.glossquote.com/`。增量功能可先用 `node --test test/text.test.mjs test/session.test.mjs test/provenance.test.mjs`，最後 settled 版本全 gate 一次；Git 環境執行 `git diff --check` 並人工檢視完整來源，untracked 不能由空 diff 當作已審查。真瀏覽器沿現有 `npm.cmd run dev`、loopback-only，只關閉這次自行啟動的 preview。

風險／停止條件：最大「很多短行」會增加 Worker structured-clone 與 metadata 驗證負載；用緊湊數字列表與每頁 100 DOM 控制，但本次未量測。若大案例出現長時間主執行緒停頓、反覆逾時、來源 mapping 與輸出不符、未知 schema 被接受、原文被覆寫、摘要殘留、輸出 bytes 改變或新增網路／持久化，該 candidate 不進發布；保留最小重現，由原 owner 在此範圍修正。不能用截斷摘要、降低測試、增加原文上限／watchdog 或改雲端讓 gate 看似通過。

## 正式派工與交付契約

先讀根與本工具AGENTS、當前HANDOFF及實際code/修改；遵守本批OUTCOME-BATCH-2026-10-13.md。只改本工具列明public/test/spec/docs與本任務紀錄；新增模組若既有check需要更新精確allowlist，允許必要scripts/check的最小變更及回歸，不能降低安全gate。可以維護本工具既有reviewed發布副本與專用.runs/01-text-workbench-outcome-2026-10-13/。08 helper可放core/comparison.mjs或core/scoring.mjs，保留單一公式。不得改其他工具、共享status、首頁、持久Windows環境或讀憑證/部署。

必要自動化前後執行使用者check-persistent-environment.ps1，完整Environment fingerprint不得變動；假資料、無runtime依賴、原限制/取消/隱私/精度/安全/雙語SEO門檻保留。原owner需完成focused與package必要test/check/preview/release gates、同步current文件並保留舊驗收歷史；PUBLIC更新既有KYStr獨立repo，核對遠端commit及visibility，提供固定source ZIP與manifest，不含node_modules/憑證。

完成回覆此原對話：任務ID、實際改檔與行為、執行命令/exit/結果、未驗項/風險、PUBLIC固定commit、ZIP/manifest/本機URL、是否釋放產品寫入權。主代理會實際收取並讀diff與獨立驗證，之後才正式發布和交外驗。新版不得沿用舊版外部通過；新權限/依賴/成本/範圍衝突或兩輪同因無進展時保存證據並具體停止回報，不無限重試、不自行改模型。

## 2026-10-13 原 owner 交付紀錄

任務 `U01-REMOVAL-REVIEW-20261013`：實作／必要自動 gate／PUBLIC source／精確 ZIP PASS，**產品寫入權已釋放**。原始規格中的最大案例「本報告未執行／本次未量測」是派工前狀態，已由本輪原生 Worker U01-08 最大 200,001 段落、2,001 頁（末頁一筆）PASS 取代；不是將必測項列為人工豁免。focused 52/52、full 76/76、check、preview 10 檔、production build／exact check 14 檔均 exit 0。真實／受控證據和 NOT_RUN、工具失敗／更正詳本工具 `HANDOFF.md` 最新 U01 entry 與 `docs/VERIFICATION.md`。

PUBLIC repo https://github.com/KYStr/glossquote-labs-text-workbench；遠端／local fixed commit `85aa3926627c3b11c649fffbcc26168b65b8b859`。`.runs/01-text-workbench-outcome-2026-10-13/source-85aa3926627c3b11c649fffbcc26168b65b8b859.zip` 與外置 `source-manifest.json` 的 35 個檔案逐一匹配 Git blob／CRC／SHA-256。原生預覽驗證 URL `http://127.0.0.1:4181/index.html`、`/en/index.html`，task-owned 預覽已停止；完整 persistent Environment 前後快照相同。

新版仍待主代理獨立驗收、正式 hosting／首頁整合與外部 review；本輪未部署、未讀憑證、未改共用檔或其他工具，不把 source-only 當 live。原生強制競態、200% 真實 zoom、長行 320 確認以及既有人工能力未驗项保留 NOT_RUN；未見未解產品阻塞。

主驗後文件數字更正：原始 native download bytes 本就為 28，owner 把摘要寫成 27；已限定更正 `docs/VERIFICATION.md`／HANDOFF。最新 PUBLIC docs-only commit `c391041ea7dd72d50fa9b1296ff0e5675b7d0964`，功能仍 85aa392；最新 `source-c391041ea7dd72d50fa9b1296ff0e5675b7d0964.zip`／`source-manifest-c391041ea7dd72d50fa9b1296ff0e5675b7d0964.json` 的 35 Git blobs 核對 PASS。舊證據保留、不重跑相同產品 gate；更正收斂後產品寫入權已釋放，詳 HANDOFF 最新 entry。
