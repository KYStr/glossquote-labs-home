# 逐行文字差異比較 — 既有規格保存

Task ID: `labs-03-text-diff` · Spec ID: `spec-03-text-diff`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格

這是規格，尚未實作。

| ID | MVP 可觀察行為 |
|---|---|
| FR-01 | 兩個有明確 label 的 textarea：「原版本」、「新版本」。預設皆空，不預填範例，不自動讀剪貼簿／檔案。按「比較文字」才運算。 |
| FR-02 | 每側原始 UTF-8 最多131,072 bytes，UTF-16 length也不得超過131,072；換行正規化後最多1,000行，單行最多8,192 code units。空來源合法；任何一側超限都不算部分結果。拒絕未配對 surrogate。 |
| FR-03 | CRLF/孤立CR固定轉LF後分行；不更改其他字元。空字串是0行；非空 split("\n")，尾LF產生末尾空行，因此 "A" 和 "A\n" 不同。CRLF 與 LF 的差異本身不顯示，介面永久揭露。 |
| FR-04 | 行以完整字串精確相等判斷，包含空白與大小寫。以LCS產生 equal/delete/insert；多條最佳路徑相同長度時優先刪除原版本行，結果固定可重現。替換顯示先移除、後新增，沒有自創 replace kind。 |
| FR-05 | 結果提供每行的原行號／新行號、狀態文字與內容；空行標「空行」作輔助但不修改實際text。equal有兩側行號，delete新行號為null，insert原行號為null。顯示新增／移除／保留行數。 |
| FR-06 | 結果最多2,000 operations，每頁100筆，預設第一頁；「上一頁／下一頁」與總頁數一直可見，無隱藏截斷、無無限捲動。空結果0頁；不折疊未變更行。 |
| FR-07 | 專用worker，5秒watchdog、可取消。編輯任一輸入或按交換即取消並清舊結果；交換只互換來源，不自動重算。jobId阻止舊回覆。能力不足時停止，不走雲端。 |
| FR-08 | 成功後可下載純文字 diff-report.txt；每行前綴 equal為兩空格、delete為"- "、insert為"+ "，LF連接，無最後額外LF。這是閱讀報告，不能直接當Git patch。空操作結果不提供下載。輸出最多524,288 bytes。 |
| FR-09 | 全部清除終止worker、清來源／結果／分頁／錯誤／統計、撤銷Blob URL；焦點回原版本。資料只在記憶體，不保存歷史、URL、storage或logs。 |
| FR-10 | 全部來源文字以value/textContent展示，永不解讀HTML。鍵盤、320px、200%縮放都可完成整段工作；錯誤不含原文片段。 |

狀態 idle、dirty、running、success、empty、error。兩側都空比較為 empty；兩側同樣非空則 success並顯示「內容相同（換行統一為 LF 後）」，不是「沒有資料」。結果只保留當前一次，clear不會撤銷已存的下載檔，不宣稱安全抹除記憶體。

錯誤碼：INPUT_TOO_LARGE、LINE_LIMIT、LINE_TOO_LONG、INVALID_UNICODE、UNSUPPORTED、TIMEOUT、WORKER_FAILED、OUTPUT_TOO_LARGE。錯誤帶side:"left"|"right"|null供對應輸入，不帶原字串。

延後任何忽略大小寫／空白的比較選項、字元highlight、合併及patch功能，避免首次MVP產生不明確語義。


---

## 原文件 TECHNICAL.md

# 技術規格

這是規格，尚未實作。原生 HTML/CSS/瀏覽器ESM、Node24+ node:test，runtime零套件。

## 檔案

    package.json
    scripts/serve.mjs
    scripts/check.mjs
    scripts/build.mjs
    public/index.html
    public/styles/tokens.css
    public/styles/app.css
    public/js/app.mjs
    public/js/worker.mjs
    public/js/core/lines.mjs
    public/js/core/diff.mjs
    public/js/core/report.mjs
    public/js/core/session.mjs
    test/scaffold.test.mjs
    test/lines.test.mjs
    test/diff.test.mjs
    test/report.test.mjs
    test/session.test.mjs

package private:true/type:module。dev=node scripts/serve.mjs，test=node --test，check=node scripts/check.mjs，build=node scripts/build.mjs。serve只讀public/、loopback4173；build只把允許的靜態來源複製到dist，不包含輸入、docs或test。

## 純函式契約

    splitLines(source) -> Result<string[]>
    diffLines(leftLines,rightLines) -> Result<{
      operations:Operation[],
      counts:{equal:number,deleted:number,inserted:number}
    }>
    compareText(left,right) -> Result<DiffResult>
    pageOperations(operations,pageIndex) -> Result<Operation[]>
    makeReport(operations) -> Result<Uint8Array>
    transition(session,event) -> session
    Operation = {
      kind:"equal"|"delete"|"insert",
      oldLine:number|null,newLine:number|null,text:string
    }

成功{ok:true,value}；失敗{ok:false,error:{code,side}}。pageIndex是0-based整數，每頁100，越界回INVALID_PAGE；空operations只接受pageIndex0回[]。函式不修改傳入陣列，不把使用者文字當key加入一般物件。

splitLines先检查primitive string、raw長度、surrogate配對、raw UTF8bytes，再normalize CRLF/CR為LF。空字串回[]；非空split後驗1,000行及每行8,192單位。不得預先截斷paste、丟最後空行、trim或NFC normalize。

## 有界LCS演算法

1. n,m各<=1,000，先檢查再分配；n*m<=1,000,000。把左右所有行依序 intern 到 Map<string,integer>，比較用整數ID；Map只為本次記憶體，不記錄原文。
2. 建立Uint16Array((n+1)*(m+1))，最大2,004,002 bytes。所有格預設0。用 index(i,j)=i*(m+1)+j。
3. i從n-1降至0，j從m-1降至0：ID相等時D[i,j]=1+D[i+1,j+1]，否则max(D[i+1,j],D[i,j+1])。
4. traceback由i=j=0開始。相同→equal且i/j各+1；不同且D[i+1,j]>=D[i,j+1]→delete/i+1；否則insert/j+1。任何一邊耗盡，另一邊逐行delete或insert。行號用處理前i+1/j+1，缺邊null。
5. counts由operations算，不由DOM算。最多n+m筆。equal+delete的text序列必與leftLines相等，equal+insert必與rightLines相等；這兩項是必要回歸不變量。
6. 不產生replace operation，不猜行移動；固定tie-break是產品規則，不能為畫面好看更換。

小型窮舉測試可列舉字母表["A","B"]、長度0到4的所有陣列兩兩比對：檢查重建不變量、equal count等於獨立簡單LCS長度、operation數<=n+m。這是有意義的規則驗證，不是對實作寫快照。

## 執行與報告

worker接{type:"compare",jobId,left,right}，回{type:"result",jobId,result}。每次run先清結果、同步標busy、啟watchdog；完成/取消/error/clear都terminate並清timer。新的jobId只能遞增，input/swap/clear取消後的回覆全部忽略。UI只保留目前page的<=100列DOM，不讓2,000長行同時建立節點。

報告以operation.kind映射固定prefix，再接原text，以LF join；無metadata header、無尾端自動LF。結果是自訂可讀報告，不是unified diff。makeReport再次驗證最大524,288 bytes，使用TextEncoder；application下載型別text/plain;charset=utf-8，固定diff-report.txt。

Blob URL點擊後1秒撤銷；新下載、clear/pagehide撤銷未完成URLs。沒有剪貼簿API（使用者可自行選取文字），沒有file reader、storage、service worker、網路API。伺服器只負責靜態資源；不送工作資料。

## 參考與待驗證

2026-09-23查閱官方平台文件：[WHATWG Worker終止](https://html.spec.whatwg.org/multipage/workers.html#dom-worker-terminate)、[Encoding](https://encoding.spec.whatwg.org/)、[File API的Blob URL撤銷](https://w3c.github.io/FileAPI/#dfn-revokeObjectURL)。演算法與上限是本工具的明確設計選擇，不宣稱已達任何裝置效能。

未來須feature detection檢Worker/TextEncoder/Blob/URL.createObjectURL；缺少任一則顯示不支援，不做大型主執行緒fallback。Node只能驗纯函式，取消與DOM分頁必須實際瀏覽器驗收。


---

## 原文件 UX-SEO.md

# UX與SEO

這是規格，尚未實作。Product App；共用色彩／字型／焦點規範見 [設計系統](docs/DESIGN-SYSTEM.md)。主要視覺特徵是結果旁兩欄行號與明確差異符號，品牌保持次要。

## 線框

    GlossQuote-Labs / 逐行差異                    全部清除
    比較兩份文字的逐行差異
    換行統一為LF比較；空白與大小寫保留。
    原版本                          新版本
    [textarea                    ]  [textarea             ]
              [交換版本]             [比較文字]
    狀態 / 新增 n、移除 n、保留 n             [下載報告]
    原行 | 新行 | 狀態 | 內容
      1  |   1  | 保留 | ...
      2  |   —  | 移除 | ...
      —  |   2  | 新增 | ...
    [上一頁] 1 / N [下一頁]
    說明與FAQ

    手機
    H1與限制
    原版本 [textarea]
    新版本 [textarea]
    [交換版本] [比較文字]
    [全部清除]
    狀態 / 行數摘要
    結果的有標題局部捲動區
    [上一頁] 頁碼 [下一頁]
    [下載報告]
    FAQ

輸入桌面並列、手機堆疊；結果統一為單一逐行表，不做手機無法閱讀的左右同步捲動。表頭有scope；行號不只是顏色。保留/移除/新增各有文字及 =/−/+，顏色只輔助。空行顯示視覺標籤「空行」，報告仍輸出真正空字串。

## 狀態文案

- 初始：「貼上原版本和新版本，再比較差異。」
- running：「正在比較逐行差異…」；顯示取消，不虛構百分比。
- dirty：「文字已變更，請重新比較。」舊結果清空。
- same：「內容相同（換行統一為 LF 後）。」
- empty：「兩邊都沒有文字，請先輸入要比較的內容。」
- success：「比較完成：新增 {inserted} 行、移除 {deleted} 行、保留 {equal} 行。」
- limit：「{原版本／新版本}超過本工具上限，請縮小到128 KiB、1,000行以內，每行不超過8,192個UTF-16單位。」
- invalid：「{原版本／新版本}含不完整的Unicode字元，請重新貼上。」
- cancel：「已取消比較，兩份原文保留。」
- timeout：「比較超過時間上限，請拆成較小段落。」
- unsupported：「此瀏覽器缺少本機比較能力，無法開始。」

切頁不修改來源，也不重新運算；按鈕聚焦保留，結果上方status只宣布頁碼摘要，不朗讀每行。取消/清除後忙碌狀態解除。錯誤連結對應輸入，不能只用toast。

## 可及性

來源label可見、原生textarea編輯鍵保留、Tab可到所有控制。新增／移除色彩各以共用semantic surface及文字呈現，文字對比4.5:1、控制3:1，焦點雙層且不遮擋。觸控主要目標44px。320px與200%縮放下結果表可在具名稱的區域內橫向捲動，整頁不溢位；原文textarea與按鈕仍正常重排。尊重reduced-motion，沒有自動滾動到每個差異。

## SEO

- slug：/tools/text-diff/
- title：逐行文字差異比較｜GlossQuote-Labs
- description：在瀏覽器比較兩份文字，查看新增、移除與保留的行及行號。保留空白和大小寫差異，可下載閱讀報告，不傳送文字供遠端處理。
- H1：比較兩份文字的逐行差異
- 說明：把兩個版本放到輸入區，確認每一行的新增與移除。工具只比較，不會合併或修改原文。

FAQ：

1. 「為什麼只多一個換行也有差異？」最後的LF代表最後一個空行，會作為差異顯示。CRLF和LF會先統一，所以換行種類本身不算差異。
2. 「可以忽略空格或大小寫嗎？」目前按完整行精確比對，空格、Tab和大小寫都保留。
3. 「下載報告能套用到Git嗎？」不能。它是帶新增／移除前綴的閱讀報告，沒有patch檔的套用資訊。
4. 「可以比較很大的檔案嗎？」MVP每側上限128KiB、1,000行，每行8,192個UTF-16單位。超過時請分段處理。

用靜態HTML呈現title/description/H1/說明/FAQ。預覽noindex,nofollow；canonical/sitemap只在有真實網址與發布授權後增加。不編造搜尋量、排名、速度、使用人數或絕對隱私保證。


---

## 原文件 ACCEPTANCE.md

# 驗收案例

這是規格，尚未實作。以下預期是規格，全部仍待執行。記號E/D/I分別代表equal/delete/insert；括號為text，行號從1起。字串escape按JS解讀。

| ID／類型 | 需求 | 輸入／步驟 | 精確預期 |
|---|---|---|---|
| DF-01 自動 | FR-01,03 | left:"",right:"" | operations:[]，三種count皆0 |
| DF-02 自動 | FR-04, FR-05 | "A\nB"對"A\nB" | E("A",old1,new1),E("B",old2,new2)；equal:2,deleted:0,inserted:0 |
| DF-03 自動 | FR-04, FR-05 | ""對"A" | I("A",old:null,new1) |
| DF-04 自動 | FR-04, FR-05 | "A"對"" | D("A",old1,new:null) |
| DF-05 自動 | FR-04 | "A"對"B" | D("A"),I("B")，deleted:1,inserted:1,equal:0 |
| DF-06 自動 | FR-03 | "A\r\nB\rC"對"A\nB\nC" | 三筆equal，沒有insert/delete |
| DF-07 自動 | FR-03 | "A"對"A\n" | E("A",1,1),I("",null,2) |
| DF-08 自動 | FR-03 | ""對"\n" | I("",null,1),I("",null,2)，不是0行 |
| DF-09 自動 | FR-04 | "A\nB"對"B\nA" | D("A",1,null),E("B",2,1),I("A",null,2)，驗tie-break |
| DF-10 自動 | FR-04 | "A "對"A"；"A"對"a" | 兩組都是一delete後一insert |
| DF-11 自動 | FR-02 | 以999個LF連接1000個"A"；再用1001個"A" | 前者成功；後者LINE_LIMIT |
| DF-12 自動 | FR-02 | "A".repeat(8192)，再用8193 | 前者成功，後者LINE_TOO_LONG |
| DF-13 自動 | FR-02 | 16行各8191個"a"，LF連接，再加1個"a"至第一行；之後再加1個至第二行 | bytes分別131071、131072成功；131073為INPUT_TOO_LARGE |
| DF-14 自動 | FR-02 | left:"\uD800",right:"A" | INVALID_UNICODE，side:left |
| DF-15 自動 | FR-06 | 201筆operation，page0/1/2 | 長度100/100/1；page3回INVALID_PAGE；不漏不重複 |
| DF-16 自動 | FR-08 | E("A"),D("B"),I("C") | bytes解碼為"  A\n- B\n+ C"，無最後LF |
| DF-17 自動 | FR-04 | 枚舉["A","B"]長度0..4的陣列兩兩比較 | old/new重建與來源完全相等；equal count為LCS長度；operations<=n+m |
| DF-18 自動 | FR-07 | running job2，接job1；clear後接job2 | 不採用任一舊結果 |
| DF-19 瀏覽器 | FR-10 | 一側"<script>alert(1)</script>"另一側空 | 只顯示一筆移除文字，沒有script節點、執行或網路請求 |
| DF-20 瀏覽器 | FR-07, FR-09 | 延遲worker harness下依序run→cancel、run→swap、run→clear | 無晚到結果；swap只交換原文；clear後全部空，page重設0，焦點回原版本 |
| DF-21 瀏覽器 | FR-08, FR-09 | 下載DF-16、再clear；查Blob URL及Storage | 名diff-report.txt、內容精確、URL最終撤銷；無storage/cookie/IDB寫入 |
| DF-22 瀏覽器 | FR-07, FR-09 | 頁載完成後切離線並比較；查看Network | 工作成功、沒有工作資料網路請求 |
| DF-23 瀏覽器 | FR-07 | 禁用Worker；另令worker不回覆 | UNSUPPORTED；5秒watchdog到期TIMEOUT；不走雲端 |
| DF-24 瀏覽器 | FR-06,10 | 僅鍵盤完成輸入、交換、比較、翻頁、下載 | 焦點可見、無陷阱；每頁最多100列資料DOM且總頁數正確 |
| DF-25 瀏覽器 | FR-10 | 320px與200%縮放，加入8192字長行 | 全部控制可達，結果區局部橫捲，整頁不雙向捲動；狀態不只顏色 |

Node測試只涵蓋pure functions。手動記錄瀏覽器版本與結果，不能把來源文件視為支援證據。T00後的最終命令：npm test、npm run check、npm run build；Git環境另git diff --check；瀏覽器用npm run dev，測完停止服務。


---

## 原文件 TASKS.md

# 逐步實作

流程以 AGENTS.md 的「閱讀與執行」「交付與收斂」為準：沿用本 session 已讀文件，只補讀變動／相關段落；同一授權工作依序推進，不因任務切換重問。各任務 allowed paths、前置條件與必要驗收保持有效，缺陷回到其擁有任務修正；來源發布依適用的既有明確授權，不包含網站部署。

本文件定義任務；實際進度以 HANDOFF.md 與最新驗收紀錄為準。每次只執行第一個未完成任務，依 AGENTS.md 的 session 閱讀規則讀取所需契約與目前 HANDOFF。每任務都回寫HANDOFF.md：工作、命令結果、手動證據、剩餘問題。失敗停在原任務，不向後勾選；擴充需新任務。

所有allowed paths相對本工具根目錄。

## T00 — 骨架與演算法界線

- 前置：Node24+存在；缺少時停止，不安裝或改PATH。讀TECHNICAL來源，確認LCS與行尾定義。
- Allowed paths：package.json、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/styles/tokens.css、public/styles/app.css、public/js/app.mjs、test/scaffold.test.mjs、HANDOFF.md。
- 實作：建立private/type與四scripts；serve綁127.0.0.1:4173只提供public，拒traversal/dotfile/symlink逃逸；check語法、必需檔、外部資源/危險DOM檢查；build allowlist至dist、不帶docs/test。空頁noindex、真scaffold測試。
- 驗收：腳本建立後npm test、npm run check、npm run build；人工確認dist範圍。
- 完成：記錄準備狀態與裝置支援仍待驗證；回寫HANDOFF。

## T01 — 分行與有界LCS

- 前置：T00。
- Allowed paths：public/js/core/lines.mjs、public/js/core/diff.mjs、test/lines.test.mjs、test/diff.test.mjs、HANDOFF.md。
- 實作：輸入驗證、換行規則、Map intern、Uint16 DP、固定tie-break、operations/line numbers/counts。先寫案例再實作；加入小型窮舉不變量。
- 驗收：node --test test/lines.test.mjs test/diff.test.mjs；npm run check；DF-01到14與DF-17。
- 完成：所有精確與重建案例通過；回寫HANDOFF。

## T02 — Worker與狀態

- 前置：T01。
- Allowed paths：public/js/worker.mjs、public/js/core/session.mjs、test/session.test.mjs、HANDOFF.md。
- 實作：jobId固定協議、取消/clear/swap/修改失效、timer清理流程；pure session不持有文字。
- 驗收：node --test test/session.test.mjs；npm run check；DF-18。
- 完成：過期回覆無法進入success，真worker驗收延至下一步；回寫HANDOFF。

## T03 — 介面與100筆分頁

- 前置：T02。
- Allowed paths：public/index.html、public/styles/tokens.css、public/styles/app.css、public/js/app.mjs、public/js/core/diff.mjs、test/diff.test.mjs、HANDOFF.md。
- 實作：兩輸入、交換、比較、取消、清除、統計、語意表格、pageOperations；每頁最多100筆DOM。下載先停用。5秒watchdog與不支援狀態。
- 驗收：npm test、npm run check；npm run dev後DF-15/19/20/23/25，以及DF-24的輸入、交換、比較、翻頁部分；下載部分留T04，停止服務。
- 完成：分頁無隱藏資料且窄螢幕可操作；回寫HANDOFF。

## T04 — 可讀報告與本機資料清理

- 前置：T03。
- Allowed paths：public/js/core/report.mjs、test/report.test.mjs、public/js/app.mjs、HANDOFF.md。
- 實作：report prefix與UTF8輸出上限、固定檔名、Blob撤銷、clear/pagehide清理；標明不是patch。
- 驗收：node --test test/report.test.mjs；npm run check；npm run dev後DF-16/21/22，以及完整DF-24（含下載）。
- 完成：下載字串精確、Network/Storage與Blob生命週期有證據；回寫HANDOFF。

## T05 — 說明與SEO

- 前置：T04。
- Allowed paths：public/index.html、public/styles/app.css、HANDOFF.md。
- 實作：靜態title/description/H1、使用方法、4FAQ、上限；保留noindex，不生成公開網址檔。
- 驗收：npm run check；關JS仍讀得到說明；320px與200%縮放。
- 完成：文案與驗證能力一致；回寫HANDOFF。

## T06 — 全量驗收

- 前置：T05、T07（本次完整雙語／SEO工具鏈也納入最終驗收）。
- Allowed paths：HANDOFF.md、TASKS.md。
- 工作：npm test、npm run check、npm run build；Git環境另git diff --check；以npm run dev執行ACCEPTANCE全部瀏覽器案例，完成後停止。
- 完成：逐項證據齊全才標本機MVP完成。bug回擁有任務處理，不能在此任務越權改程式；未驗證項目清楚記錄，來源發布依 AGENTS.md 的適用既有授權；本步不授權網站部署。

## T07 — 完整雙語與可驗證發布工具鏈（2026-10-10 TASK-ENTRY 明確授權）

- 前置：T05；執行於 T06 最終驗收前。
- Allowed paths：public/**、scripts/**、test/**、docs/**（設計、驗收、release candidate 與本工具必要發布說明）、TASKS.md、HANDOFF.md、README.md、project.json、package.json、.gitignore、wrangler.jsonc；build 生成 dist/**。
- 實作：zh-Hant/en 靜態完整介面、同語首頁連結、明確 locale 模組、兩語錯誤／狀態／FAQ；preview 預設 noindex，release build 僅接受 https://diff.glossquote.com，canonical、雙向 hreflang、x-default、sitemap、robots、404、真實靜態 headers；預備免費 Cloudflare 靜態資產設定但不讀 token、不部署。
- 驗收：語系一致性／SEO、build 隔離、標頭與 MIME regression tests；真瀏覽器兩語與 privacy/resource lifecycle；最終 test/check/preview build/release build+verify；公開來源前 review allowlist。
- 完成：繁中與英文都可完整操作；候選網址清楚標未部署；自動／瀏覽器與人工 NOT_RUN 分列。

## T08 — 獨立公開來源與整合交接

- 前置：T06。
- Allowed paths：docs/RELEASE-CANDIDATE.md、HANDOFF.md、README.md、project.json；專用 `.runs/text-diff/**`、`.runs/github-publish/glossquote-labs-text-diff/**`。
- 實作：審查只含本工具的發布副本；使用既有 gh 登入狀態建立／更新 KYStr/glossquote-labs-text-diff PUBLIC 來源，保留既有歷史，不操作根 repo index/branch/commit。禁止憑證讀取與正式部署。
- 驗收：發布清單／hash、無秘密／其他工具／.runs，來源 git diff --check、remote HEAD 相等、visibility PUBLIC；環境 guard 前後不變。
- 完成：RELEASE-CANDIDATE + HANDOFF READY_FOR_INTEGRATION（或具體 BLOCKED）；來源公開與網站未上線各自記錄。

