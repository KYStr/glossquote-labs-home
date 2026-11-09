# U04-LITERAL-FIND-20261013

2026-10-13主代理核定需求。使用者已授權本批改善；須收到本任務實際開工訊息才實作，不自行開下一階段。原owner 01a12398-e884-7991-b28c-12a3d5b26f42，明確請求gpt-6.1-sol/max，禁止再委派。表面為Product App，沿既有tokens與版型。

主代理已核對text清理順序、CSV session頁碼/匯出行為、decision整數公式。下方草案中的產品預設與案例在本任務採用為要求；函數或metadata命名可等價調整並在交接說明，不能省略結果與失效規則。所有案例是預期，不是已執行測試。

## 04 CSV：跨頁字面定位

### 交付與非目標

使用者已預覽較長的 CSV，要在指定欄找到需核對的資料，直接到該格所在頁面。完成條件：單欄查找涵蓋完整已解析資料的所有頁，準確显示符合格數與來源位置，上／下一個結果能跳到正確頁與格；查找前後 selected records、所選欄、風險、已準備輸出与確認狀態不變。

本輪不加入全欄同時搜索、regex、大小寫切換、模糊比對、資料排序／編輯／刪除、查找後僅匯出匹配列、查找表頭、格式猜測或新的 CSV 方言。原来的逐頁預覽、選欄與公式保護仍在原位置。查找不是篩選。

### 現況：已讀實際程式

| 檔案／函式 | 實際行為與接點 |
|---|---|
| `public/js/core/input.mjs` `LIMITS/validateSource/decodeUtf8` | source ≤1,048,576 bytes／UTF-16 units、最多 5,000 records／50 欄／100,000 cells／每格 16,384 units；fatal UTF-8，parser 只移除一個開頭 BOM。 |
| `public/js/core/csv.mjs:3` `parseCsv` | 輸出 `string[][]`；表頭也在 records。quoted field 內的逗號、引號與 CR/LF 解析成完整字串；格值不 trim／轉型／正規化。 |
| `public/js/core/selection.mjs:35` `makeLabels` | 欄位以原來源 index 識別；空／重複表頭的視覺名稱加原欄位位置，records 本身不改。 |
| 同檔 `:45` `pageRows` | `hasHeader ? 1 : 0` 起算，每頁 100 筆資料；頁碼 0-based；header-only page 0 為空。 |
| `public/js/core/session.mjs:1` `initialSession` | 保留完整 parsed records、sourceKind、rawSource、indices、hasHeader、pageIndex、format、ack、output、outputJobId；預設全欄、header true、protected。 |
| 同檔 `:6` `transition`／`:21` `case 'page'` | page 事件只改 pageIndex；select/header/format/edit 等會使 jobId／output／ack 失效。新查找不可誤走 select 或 invalidated。 |
| `public/js/app.mjs:10` `mount`／`:27` `selectedRecords` | render 依 session.indices 顯示／匯出；rows 只從 pageRows 切目前頁。現有 table 沒有查找或每列來源座標。 |
| `public/js/core/risk.mjs` `analyzeRisk/hasFormulaRisk` | 全部所選 records（包括表頭）計風險，並非只看目前頁；original 風險不可繞過。 |
| `public/js/worker.mjs` `processMessage`、`public/js/worker-source.mjs` | parse/export 在有界 classic Worker；後者由 `scripts/worker-bundle.mjs` 的固定 module 清單生成，check 會驗兩份一致。不要手改生成字串。 |
| `public/js/app.mjs` file/input handlers | 未編輯 file 的 rawSource 是權威來源，textarea 是會正規化换行的顯示副本；首次 input 才切成 text/rawSource=null。查找只讀 records，不能把 DOM 字串寫回 rawSource。 |

### 固定查找語義與有界資料契約

1. 新欄位選單只列目前已保留、表格可見的來源欄（`session.indices`），value 為 source index，不用欄名當 key。預設選第一個目前保留欄。這避免定位隱藏欄時偷偷改匯出欄位。
2. query 為有效 UTF-16 primitive string，最多 256 個 UTF-16 units，單行（CR／LF 不允許）；不 trim、NFC/NFKC、大小寫折疊、數字轉型、escape 還原或 regex。可搜原值中的空格、句點、方括號、公式字樣和 HTML 字樣。過長／無效 query 顯示就地固定錯誤，保留输入而非 maxlength 截短；不清 CSV 或原有 output。
3. 空 query 是未查找狀態，不调用 `includes('')` 使所有格匹配；欄位無資料／全未選不查找，顯示可採取的下一步。空格 query 是有效 literal，不當成空 query。
4. 對既有合法 `records` 中指定 source index，以 `cell.includes(query)` 的字面子字串語義逐 record 查找。`hasHeader=true` 排除 index 0；false 則 index 0 也為資料。多次出现 query 的同一格只計一筆符合，按原 record 次序列出。
5. 建議 `public/js/core/search.mjs` 提供可離線測的 `findCells(records,hasHeader,sourceIndex,query)`，成功回固定数字位置列表；不回格值副本或新的 projected records。從已解析有界資料一次掃一欄：最多 5,000 格、總 source 上限 1 MiB；不在每個 input event 全表掃描。顯式按「查找」或 query 内 Enter 才計算。helper 自身守 Boolean／index／query／records 上限，非法參數 fail closed，沿现有 `{ok:false,error:{code,...numeric coordinates}}` 格式。
6. 建議新增固定 query 錯誤碼 `SEARCH_TOO_LONG`、`INVALID_SEARCH_QUERY`，映射只說明限制，不回顯 query；不把查找無符合當 CSV parsing error。source index 非法沿 `INVALID_SELECTION`。空 query 成功回 `[]` 且 UI idle。
7. 符合座標至少含 `recordIndex`（0-based 原 records）、`sourceColumnIndex`（0-based）；其衍生值固定：`recordNumber=recordIndex+1`、`fieldNumber=sourceColumnIndex+1`、`dataRowNumber=recordIndex-(hasHeader?1:0)+1`、`pageIndex=floor((dataRowNumber-1)/100)`。頁內序號為 `(dataRowNumber-1)%100`。這是邏輯 CSV record，不能用 quoted field 的物理換行數代替。
8. 查找狀態由 app 另持 `query/searchColumn/matches/currentMatch/status`，不污染 file rawSource 或交換／匯出 schema，不借用 parse/export jobId。query／欄位變更清 matching 清單与高亮，但保留當前 CSV 頁碼／output／ack；按查找後 currentMatch=0 並跳第一個符合頁。總列表最多 5,000 筆 metadata，DOM 仍只顯示目前頁 ≤100 資料列。

此預設為固定大小、一次单欄的同步純函式，不新增 worker 協議、第三方搜索库或生成 classic bundle。它不宣稱手機性能已量測。若真瀏覽器边界案例显示明顯阻塞，应由 owner 在原授權範圍提出有界 chunk／Worker 修正給主代理核定，同時補 generation／取消測試，不能悄悄變成無界輸入或全表 live 搜索。

### UI、導航與狀態

- 在表格标题旁／正上方增加固定可見的「在欄位中查找」列：欄位下拉、query 可見 label、`查找`／`Find`；結果旁是 `上一個`／`Previous match`、`下一個`／`Next match` 与清除查找。欄位 dropdown 顯示來源欄位置與既有 makeLabels 標籤（重名時仍清楚可分辨）。查找保持 secondary，不跟「準備匯出」搶主要完成動作。
- 固定說明：「區分大小寫、按字面查找所有資料頁；只定位，不篩選或改變匯出。」／`Case-sensitive literal search across all data pages. Locating a match does not filter rows or change the export.`
- 有符合：`找到 4 格；目前第 3／4 格。資料第 101 筆，來源第 2 欄（CSV 第 102 筆）。` 数字由 metadata 衍生；頁碼 label 與 table 實際內容必须同步。match 計格，頁碼計 100 筆資料，不把 4 次字面出現誤叫 4 筆資料。
- 查找後自动跳第一个符合頁；上／下一個按 stored matches 移動到相邻一格并同步 pageIndex。第一個時 previous disabled、最後一個時 next disabled，不循环；只有一格時兩端皆停用。
- 目前符合格加文字／可讀的 `目前查找結果` 标記与輪廓，完整格值仍以 `pre/textContent` 呈現，不把 user query 拼成 markup。可用固定數字 data 属性辨識格，不用 raw query／表頭組 CSS selector。
- 表格可加一個僅 UI 的 row-header 座標欄（資料第 n 筆／CSV 第 m 筆），不可把它加入 records/indices/risk/export。畫面必須能辨識匹配的來源位置，不只改背景色。
- 查找／next／previous 后滚动表格局部捲動區讓 current 格可見，尊重 reduced-motion；焦點保留原查找／导航控制以便連續按下一個，polite 宣告數量與座標。鍵盤可進入標明的表格區，格值与座標能讀取；不能只做視覺 highlight。
- 手動 data page 换页不篩選或重算符合列表；current cursor 保留。若该格不在現頁，高亮不在其他格重用，狀態補「目前符合在第 n 頁」，下一個仍按匹配次序導航。对照匯出修改格的 comparePage 與查找互不混用。
- query empty／清除查找：清 query、matches、cursor、高亮，保留当前表頁、选择与匯出。no-match：显示「沒有符合的格值。請檢查欄位、大小寫或字面內容。」、兩端 disabled，不改变页码。query 非法為本地 invalid 状態，不改全局 CSV status/error。
- CSV edit/read/parse/clear 或採用新來源：清 query、matches、cursor、search column；invalid parse 不顯示舊匹配。選欄／header：維持現有重設／匯出失效行为，再清匹配并重設預設 search column 为新 indices 的首筆（query 可保留，提示需再查找）；表頭切換绝不可沿用旧 dataRow/page mapping。
- 有合法 records 且非 reading/parsing/preparingExport 时可查找（包括只因匯出失敗而仍有合法 records 的状态）；busy 时禁用查找与导航，不调用 jobs.dispose。准备匯出／格式变更只因其自身既有契约影响 output，查找 query 与已有 matches 可保留；不能为查找取消正在执行的 Worker。
- header-only／empty／無所選欄，分别说明「沒有資料列可查找」／「先預覽 CSV」／「先保留至少一欄」，不說資料消失。320px 控制換行、表格只在有名称区局部捲動、200%zoom 可用。

```text
桌面：欄位保留勾選 → 所選欄位原值
      在欄位中查找 [來源第2欄 ▼] [字面內容] [查找]
      4 格／目前3  [上一個] [下一個] [清除查找]
      原值表（目前格有位置文字） → 資料上一／下一頁
      匯出所選欄位／保護確認／下載
手機：查找欄位 → query／查找 → 結果與導航 → 局部表格 → 原資料分頁／匯出
```

### 可重現 fixture 與精確驗收

F201 可在測試內生成，不讀使用者檔案：

```js
const records = [['id', 'note', 'note']];
for (let i = 1; i <= 201; i += 1) {
  records.push([
    String(i).padStart(3, '0'),
    [1, 100, 101, 201].includes(i) ? `needle-${i}` : `plain-${i}`,
    i === 150 ? 'needle-hidden' : 'other'
  ]);
}
```

瀏覽器可用这些假值生成合法逗號 CSV 后貼上預覽；没有 quoted 特殊字元的 F201 可逐 row join comma、再 join LF。以下 source index 为 0-based；UI 欄位置为 index+1。

| ID | 輸入／操作 | 精確預期 |
|---|---|---|
| U04-01 | F201、header true、全選、sourceIndex=1、query=`needle` | 四格：recordIndex `[1,100,101,201]`；dataRow `[1,100,101,201]`；recordNumber `[2,101,102,202]`；pageIndex `[0,0,1,2]`。初次定位 data row1，第1/3頁；兩次 next → data row101、第2/3頁，再 next →201、第3/3頁。各頁資料 DOM 100/100/1。 |
| U04-02 | 同 F201、sourceIndex=2、query=`needle` | 只一格：recordIndex=150、dataRow=150、recordNumber=151、pageIndex=1、來源第3欄。两個 note dropdown 不混淆；第2欄四格不可算進這個结果。 |
| U04-03 | records `[['id','note'],['001','foo.foo'],['002','foo'],['003','[x]'],['004','.*']]`，搜第2欄 | query `.` 符合 rows 1 與4（dataRow 1/4），不是所有字串；query `[x]` 只 dataRow3；query `foo` 符合 dataRow1/2，共2格，`foo.foo` 不算2格。 |
| U04-04 | `[['x'],['Apple'],['apple'],[' apple '],['é'],['e\u0301']]`，header true | query `Apple` 只 dataRow1；`apple` dataRow2/3；` apple ` 只 dataRow3；`é` 只 dataRow4，不正規化匹配 e+combining。query ` ` 只 dataRow3；空 query 无列表，不全表匹配。 |
| U04-05 | `[['needle'],['plain']]`，header true 后 false | true：query needle 无符合，不查 header。false：recordIndex0 为 dataRow1/page0 的符合；切換後既有 selection/header 的 output 失效规则照常，重新查找才用新座標。 |
| U04-06 | file rawSource=`'id,note\r\n001,"a\r\nb"\r\n002,z'`，選檔后未編輯，查第2欄 `b` | records 格值仍 `a\r\nb`；match recordIndex1/dataRow1/recordNumber2/page0。sourceKind/rawSource不變，不從 textarea LF 副本回寫。首次真的 input 后才依既有 FR03 改 LF並清 match。 |
| U04-07 | F201 先準備無風險 original，保存 output bytes/ack/outputJobId，再查找、next、query改／清除 | bytes byte-for-byte 相同、outputJobId 与 jobId 不因搜索改變、ack 相同、indices/records深等同、format 相同；输出仍含 header + 全部201筆，沒有只剩4筆。只 pageIndex 和独立 search state 改變；不 dispose download URL。 |
| U04-08 | `[['id','note'],['001','=1+1'],['002','plain']]`，protected 准备后 ack=false，查 `=1+1` | 定位第1筆、第2欄，riskCount仍1，download仍disabled；original仍disabled，查询不視為確認。ack=true后查下一個／改 query 不撤回或冒充 ack；source/indices/header/format 改变仍依旧清 ack。 |
| U04-09 | F201 搜第2欄後取消勾選第2欄，或者編輯／重新預覽新來源 | 選欄：原 output按既有規則失效；match清、search column以剩餘首欄為預設，沒有偷偷把第2欄加回。新來源：query與舊cursor清，遲到parse/read回覆不得復活舊match。 |
| U04-10 | 同一查找已到最后、first、无符合；手動切到不含 current 的頁 | 最后next disabled、first previous disabled；無符合兩端disabled且原頁保留。手動換頁不把目前高亮貼到同一頁内序號的其他格，顯示目前結果所在頁；next仍按既定匹配序。 |
| U04-11 | query 256個a／257個a／孤立surrogate／CR或LF；非法 index與hasHeader | 256合法（有無匹配按值）；257为SEARCH_TOO_LONG、不截短；无效Unicode或多行为INVALID_SEARCH_QUERY；非法參數拒絕，沒有 partial search。CSV与既有export仍保留。 |
| U04-12 | 格含 `<img src=x onerror=alert(1)>`，query `<img`；另空来源／header-only／indices=[] | 格与query均纯文字，不产生img／alert／URL。前三種無可查範圍显示对应下一步，不显示上一份匹配。 |
| U04-13 | 合法5,000 records／100,000 cells／1MiB 边界，選一欄查短字面 query | 完整涵蓋所有data records不截前100筆／前頁；列表上限守5,000，DOM每頁≤100。實際瀏覽器沒有明顯長時間阻塞；query 不触发网络／storage。性能此報告未量測。 |
| U04-14 | 兩語，以鍵盤選查找欄、輸入Enter、next、手動data分頁與匯出 | 同樣座標與符合數；焦點保留查找／导航控件、可讀status，不攔截textarea换行或全页Ctrl+F；320px／200%zoom／长欄名仍可操作。 |

### 原功能對話允許改檔建議與 acceptance

產品範圍僅 `tool-projects/04-csv-workbench/` 下的新增 `public/js/core/search.mjs`，既有 `public/js/app.mjs`、`public/index.html`、`public/en/index.html`、`public/styles/app.css`、`public/js/locales/zh-Hant.mjs`、`public/js/locales/en.mjs`；新增 `test/search.test.mjs`、`test/search-controller.test.mjs`，及為回歸確有需要的 `test/session.test.mjs`、`test/selection.test.mjs`、`test/export.test.mjs`、`test/seo.test.mjs`；`PRODUCT.md`、`TECHNICAL.md`、`ACCEPTANCE.md`、`UX-SEO.md`、`HANDOFF.md`、現有本地验收紀錄與本任務紀錄。`dist/` 僅既有 build生成。現有 parser、risk、serializer、worker/bundle、source encoding、安全標頭、tokens與共享首頁沒有本預設功能的修改需要。

在本工具目录：`npm.cmd test`（實際 script=`node --test test/*.test.mjs`）、`npm.cmd run check`、`npm.cmd run build`；正式候選使用現有 `npm.cmd run build -- --release`（不同於01與08，勿套用同一參數）。增量可先 `node --test test/search.test.mjs test/search-controller.test.mjs test/session.test.mjs test/selection.test.mjs test/export.test.mjs`；最終settled版本全gate一次與完整source/diff審查。`npm.cmd run dev` 真瀏覽器驗查詢／焦點／格位置与離線；Git環境另 `git diff --check`。

風險／停止條件：最容易錯在表頭 off-by-one、把 source index 换成 projected index、DOM重绘失焦、query誤當regex，以及调用 invalidation使 output/ack消失。任一 fixture 座標／page错、无法读完整格值、只搜当前頁、风险因搜索改变、导出变成匹配列、rawSource被DOM副本改寫、性能明显阻塞、额外request/storage，均阻止candidate发布。保留可重現例并回原owner修正；不能通过放宽CSV profile、绕过formula保护或隐藏查找错误结案。

## 正式派工與交付契約

先讀根與本工具AGENTS、當前HANDOFF及實際code/修改；遵守本批OUTCOME-BATCH-2026-10-13.md。只改本工具列明public/test/spec/docs與本任務紀錄；新增模組若既有check需要更新精確allowlist，允許必要scripts/check的最小變更及回歸，不能降低安全gate。可以維護本工具既有reviewed發布副本與專用.runs/04-csv-workbench-outcome-2026-10-13/。08 helper可放core/comparison.mjs或core/scoring.mjs，保留單一公式。不得改其他工具、共享status、首頁、持久Windows環境或讀憑證/部署。

必要自動化前後執行使用者check-persistent-environment.ps1，完整Environment fingerprint不得變動；假資料、無runtime依賴、原限制/取消/隱私/精度/安全/雙語SEO門檻保留。原owner需完成focused與package必要test/check/preview/release gates、同步current文件並保留舊驗收歷史；PUBLIC更新既有KYStr獨立repo，核對遠端commit及visibility，提供固定source ZIP與manifest，不含node_modules/憑證。

完成回覆此原對話：任務ID、實際改檔與行為、執行命令/exit/結果、未驗項/風險、PUBLIC固定commit、ZIP/manifest/本機URL、是否釋放產品寫入權。主代理會實際收取並讀diff與獨立驗證，之後才正式發布和交外驗。新版不得沿用舊版外部通過；新權限/依賴/成本/範圍衝突或兩輪同因無進展時保存證據並具體停止回報，不無限重試、不自行改模型。
