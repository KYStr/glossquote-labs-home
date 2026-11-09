# 補貨數量試算驗收規格

狀態：M0 驗收計畫，尚未執行。所有案例是實作後的獨立 oracle，不能把規格案例、測試數或 Node 通過率描述成產品驗收率。

## 執行分層

| 層級 | 能證明什麼 | 狀態/邊界 |
|---|---|---|
| Core | 純函式 schema、BigInt 算式、錯誤優先、報告文字和輸入不變 | M1 由 `node:test` 離線跑；M0 尚無實作，未跑。 |
| Build/check | 語法、危險 DOM/API 掃描、無 inline CSS/JS/遠端資產、輸出 allowlist、M1 `dist/` bytes | M1 建置後跑；不是 UI 或資料不外傳的證明。 |
| Loopback HTTP | 本機兩頁、精確 MIME、GET/HEAD、405、404、Host 421、安全標頭、只提供 `dist/` | M1 用隔離 Node harness；不開瀏覽器。 |
| Browser UI | 真實欄位互動、焦點、頁面生命週期、渲染、IME、響應式 | 所有本機互動 browser/native/CUA 暫停；`NOT_RUN_USER_FOCUS_INCIDENT`，須 primary 先證明真隔離並明確放行。 |
| 真機/輔助科技 | 手機、低階裝置、螢幕閱讀器、鍵盤/縮放的實際體驗 | 不以 Node、DOM harness 或 HTTP 代替；未有真實設備證據即 `NOT_RUN`。 |
| Production/live | 公開檔、SEO/headers、部署、首頁連結與外部使用 | M2 主代理 GO 後建立 candidate；M3 主代理執行。M0 尚未建立或部署，不能標 live pass。 |

Core 測試使用內建 `node:test`、手寫 expected 和 fake input，不讀網路、帳戶、憑證或真實庫存。至少檢查純函式不變輸入、deep equality、JSON.stringify 成功、輸出無 BigInt，以及公式對每個 item 同時成立：`needN=max(0,targetN-stockN)`、`packs×D×P >= needN`、若 packs>0 則 `(packs−1)×D×P < needN`、短缺是 `ceil(shortageN/D)`、runway 是 `floor(SD/U)` 或 null。

下表的成功向量欄位依序為：`targetNumeratorUnitDays / stockNumeratorUnitDays / needNumeratorUnitDays / packDenominatorUnitDays / packsToOrder / orderUnits / shortageNumeratorUnitDays / shortageBeforeArrivalUnits / runwayWholeDays / averageDailyUse.roundedTo3`。向量內數值是精確 JSON 數字，日均欄位是有三位小數的字串。除明列外，輸入都以 `BASE` 為底並只改指定欄位。

```text
BASE = {
  observationDaysRaw: "30", leadDaysRaw: "7", coverageDaysRaw: "30",
  items: [{ id: "item-1", nameRaw: "藍色塗料", unitRaw: "ml",
    usedRaw: "30", stockRaw: "10", reserveRaw: "3", packSizeRaw: "12" }]
}
```

## Core 可重現案例

| ID | 輸入/步驟 | 精確預期 |
|---|---|---|
| C01 | `BASE` | `{ok:true,result:{schemaVersion:1,assumptions:{observationDays:30,leadDays:7,coverageDays:30,arrivalTiming:"end-of-lead-period",usageModel:"fixed-average"},items:[{id:"item-1",name:"藍色塗料",unit:"ml",observedUseUnits:30,currentStockUnits:10,safetyReserveUnits:3,packSizeUnits:12,averageDailyUse:{numeratorUnits:30,denominatorDays:30,roundedTo3:"1.000"},targetNumeratorUnitDays:1200,stockNumeratorUnitDays:300,needNumeratorUnitDays:900,packDenominatorUnitDays:360,packsToOrder:3,orderUnits:36,shortageNumeratorUnitDays:0,shortageBeforeArrivalUnits:0,runwayWholeDays:10}]}}`。 |
| C02 | `BASE`，`stockRaw="2"`（缺貨範例） | `[1200,60,1140,360,4,48,150,5,2,"1.000"]` |
| C03 | `stockRaw="40"`，目標恰好滿足 | `[1200,1200,0,360,0,0,0,0,40,"1.000"]` |
| C04 | `stockRaw="39"`，低於目標 1 單位 | `[1200,1170,30,360,1,12,0,0,39,"1.000"]` |
| C05 | `stockRaw="7"`，到貨前需求剛好等於現貨 | `[1200,210,990,360,3,36,0,0,7,"1.000"]` |
| C06 | `stockRaw="6"`，到貨前差 1 單位 | `[1200,180,1020,360,3,36,30,1,6,"1.000"]` |
| C07 | `stockRaw="0"` | `[1200,0,1200,360,4,48,210,7,0,"1.000"]` |
| C08 | `leadDaysRaw="0"` | `[990,300,690,360,2,24,0,0,10,"1.000"]` |
| C09 | `coverageDaysRaw="1"` | `[330,300,30,360,1,12,0,0,10,"1.000"]` |
| C10 | `coverageDaysRaw="365"` | `[11250,300,10950,360,31,372,0,0,10,"1.000"]` |
| C11 | `reserveRaw="0"` | `[1110,300,810,360,3,36,0,0,10,"1.000"]` |
| C12 | `packSizeRaw="10"` | `[1200,300,900,300,3,30,0,0,10,"1.000"]` |
| C13 | `packSizeRaw="1"` | `[1200,300,900,30,30,30,0,0,10,"1.000"]` |
| C14 | `usedRaw="0"`,`stockRaw="0"`,`reserveRaw="3"` | `[90,0,90,360,1,12,0,0,null,"0.000"]`；安全備量仍會使訂單為 1 包，runway 為 null。 |
| C15 | `usedRaw="0"`,`stockRaw="0"`,`reserveRaw="0"` | `[0,0,0,360,0,0,0,0,null,"0.000"]` |
| C16 | `usedRaw="0"`,`stockRaw="3"`,`reserveRaw="3"` | `[90,90,0,360,0,0,0,0,null,"0.000"]` |
| C17 | `usedRaw="0"`,`stockRaw="2"`,`reserveRaw="10"`,`packSizeRaw="4"` | `[300,60,240,120,2,8,0,0,null,"0.000"]` |
| C18 | 共用 `D=2,L=1,C=1`；列 `U=1,S=0,R=0,P=1` | `[2,0,2,2,1,1,1,1,0,"0.500"]` |
| C19 | 共用 `D=80,L=0,C=1`；列 `U=1,S=0,R=0,P=1`，half-up 正好落在 0.0125 | `[1,0,1,80,1,1,0,0,0,"0.013"]` |
| C20 | 共用 `D=365,L=0,C=1`；列 `U=1,S=0,R=0,P=1` | `[1,0,1,365,1,1,0,0,0,"0.003"]` |
| C21 | `leadDaysRaw="365"`,`stockRaw="0"` | `[11940,0,11940,360,34,408,10950,365,0,"1.000"]` |
| C22 | 共用 `D=365,L=0,C=1`；列 `U=1,S=0,R=0,P=10000` | `[1,0,1,3650000,1,10000,0,0,0,"0.003"]` |
| C23 | 共用 `D=365,L=365,C=365`；列 `U=1000000,S=0,R=1000000,P=1` | `[1095000000,0,1095000000,365,3000000,3000000,365000000,1000000,0,"2739.726"]` |
| C24 | 共用 `D=1,L=365,C=365`；列 `U=1000000,S=0,R=1000000,P=1`，最大 packs 邊界 | `[731000000,0,731000000,1,731000000,731000000,365000000,365000000,0,"1000000.000"]` |
| C25 | 30 列、ID `item-1..item-30`、唯一名稱，所有數值採 BASE row | `ok:true`；剛好 30 個結果，依順序各自向量為 `[1200,300,900,360,3,36,0,0,10,"1.000"]`，沒有截斷或合併。 |
| C26 | common 欄位合法；`items` 長度 31，index 0 定義會增加計數的 getter | `{ok:false,error:{code:"ITEM_LIMIT",field:"items"}}` 且 getter 呼叫數為 0；長度上限先於陣列枚舉。 |
| C27 | common 欄位合法；`items=[]` | `{ok:false,error:{code:"ITEM_COUNT",field:"items"}}` |
| C28 | common 欄位合法；`items.length=1` 但 index 0 是洞 | `{ok:false,error:{code:"ITEM_HOLE",field:"items[0]"}}` |
| C29 | BASE root 的 `observationDaysRaw` 改為計數器 getter | `{ok:false,error:{code:"INPUT_PROPERTY",field:"observationDaysRaw"}}` 且 getter 呼叫數為 0。 |
| C30 | BASE row 的 `usedRaw` 改為計數器 getter | `{ok:false,error:{code:"ROW_PROPERTY",field:"items[0].usedRaw"}}` 且 getter 呼叫數為 0。 |
| C31 | BASE root 再加未知 symbol own key | `{ok:false,error:{code:"INPUT_UNKNOWN_FIELD",field:"input"}}`。 |
| C32 | 兩列皆合法但第 2 列 `id` 與第 1 列相同 | `{ok:false,error:{code:"ROW_ID_DUPLICATE",field:"items[1].id"}}`，不回第一列部分結果。 |
| C33 | BASE 的 `usedRaw="1e2"` | `{ok:false,error:{code:"QUANTITY_FORMAT",field:"items[0].usedRaw"}}`。 |
| C34 | BASE 的 `usedRaw="+1"` | `{ok:false,error:{code:"QUANTITY_FORMAT",field:"items[0].usedRaw"}}`。 |
| C35 | BASE 的 `usedRaw="1000001"` | `{ok:false,error:{code:"QUANTITY_RANGE",field:"items[0].usedRaw"}}`。 |
| C36 | BASE 的 `observationDaysRaw=" 30"` | `{ok:false,error:{code:"DAY_FORMAT",field:"observationDaysRaw"}}`；不 trim 數值字串。 |
| C37 | `nameRaw` 為 81 個 emoji 碼點（162 code units） | `{ok:false,error:{code:"NAME_CODEPOINT_LIMIT",field:"items[0].nameRaw"}}`。 |
| C38 | BASE 的 `unitRaw` 含 `U+2028` | `{ok:false,error:{code:"UNIT_LINE_SEPARATOR",field:"items[0].unitRaw"}}`；一般 emoji/Unicode 仍保留。 |
| C39 | BASE 的 `nameRaw` 含單獨 high surrogate | `{ok:false,error:{code:"NAME_SURROGATE",field:"items[0].nameRaw"}}`。 |
| C40 | BASE row 加未知 own string 欄位 `extra` | `{ok:false,error:{code:"ROW_UNKNOWN_FIELD",field:"items[0]"}}`。 |
| C41 | BASE row 移除 `stockRaw` | `{ok:false,error:{code:"ROW_MISSING_FIELD",field:"items[0].stockRaw"}}`。 |
| C42a | 用 BASE 呼叫 `formatRestockReport(result,"zh-Hant")` | 回 `{ok:true,text:...}`，全文精確為下方「報告 oracle 繁中」。 |
| C42b | 另以英文 row fixture `nameRaw="Blue paint"` 計算，再呼叫 `formatRestockReport(result,"en")` | 回 `{ok:true,text:...}`，全文精確為下方「報告 oracle English」。使用者名稱不自動翻譯。 |
| C43 | 複製 C01 結果，只把 `items[0].packsToOrder=1`，保留 `orderUnits=36` 後格式化 | `{ok:false,error:{code:"REPORT_INPUT",field:"result"}}`；formatter 重新驗算，拒絕自相矛盾採購文字。 |
| C44a | formatter 的 `result.items` 為 31 列且 index 0 getter 計數 | `{ok:false,error:{code:"REPORT_INPUT",field:"result"}}` 且 getter 呼叫數為 0；長度 gate 先於枚舉。 |
| C44b | formatter 的 `result.items` 長度 1 但 index 0 是洞 | `{ok:false,error:{code:"REPORT_INPUT",field:"result"}}`；不格式化部分結果。 |
| C44c | formatter 的一列 `packsToOrder` 為 accessor 計數 getter | `{ok:false,error:{code:"REPORT_INPUT",field:"result"}}` 且 getter 呼叫數為 0。 |
| C44d | formatter 的一列增加未知 own key `extra` | `{ok:false,error:{code:"REPORT_INPUT",field:"result"}}`。 |

### 報告 oracle 繁中

以下是 C42a 的完整字串；最後一行後沒有 LF：

```text
補貨數量試算
估算假設：以觀測期間平均用量固定計算；訂單在到貨天數結束時可用。
觀測期間：30 天；到貨天數：7 天；到貨後目標涵蓋：30 天。

1. 藍色塗料
單位：ml；觀測用量：30 ml；現貨：10 ml；安全備量：3 ml；每包含：12 ml
平均每日用量：1.000 ml/日；現貨可用：10 整天
到貨前估計短缺：0 ml
建議補貨：3 包（共 36 ml）
```

### 報告 oracle English

以下是 C42b 的完整字串；最後一行後沒有 LF：

```text
Restock quantity plan
Estimate: usage stays at the observed average; the order is available at the end of the lead period.
Observation: 30 days; lead time: 7 days; desired coverage after arrival: 30 days.

1. Blue paint
Unit: ml; observed use: 30 ml; current stock: 10 ml; safety reserve: 3 ml; units per pack: 12 ml
Average daily use: 1.000 ml/day; current stock runway: 10 whole days
Estimated shortage before arrival: 0 ml
Order: 3 packs (36 ml)
```

## Browser UI 驗收步驟（待執行）

以下每項目前均為 `NOT_RUN_USER_FOCUS_INCIDENT`；M0 尚未實作，且在主代理證實隔離環境並明確放行前不可操作本機 UI。步驟中的錯誤碼只用於純核心對照；UI 不要求顯示代碼，只需有等義兩語提示、拒絕或失效行為。

| ID | 步驟 | 預期 | 目前狀態 |
|---|---|---|---|
| B01 | 開繁中 `/index.html` 和英文 `/en/index.html` | 預設天數 30/7/30、一列空白，結果區空、試算未發生；`lang` 和所有標籤語言正確。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B02 | 不填品項按試算 | 將第一個缺欄貼近欄位提示；不出部分結果或報告，不顯示內部錯誤碼。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B03 | 分別選「一般補貨」和「到貨前短缺」兩個固定範例，各自測試確認取消、確認載入及手動按試算 | 取消時原草稿/結果不變；確認載入只改草稿，需再按試算；兩例結果分別為 3 包/36 單位/短缺 0/10 天，及 4 包/48 單位/短缺 5/2 天。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B04 | 先成功試算，再改任一 shared day/item 欄 | 輸入改變當下清空舊結果/報告/成功狀態；無舊結果可再被選取；需重算。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B05 | 清除已填草稿並在確認面板選取消，再重新開啟選確認 | 取消保留所有原欄位與結果；確認後恢復預設天數、一個空列、空結果。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B06 | 初始狀態按切換語言；再填草稿後按切換，先取消再確認 | 初始狀態可直接導航；非初始時取消留在本頁且原稿/結果不變，確認才到固定另一語言頁；新頁是空白初始狀態，返回 BFCache 後也不還原舊草稿。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B07 | 填 30 列，再嘗試新增第 31 列 | 30 列合法可完成；第 31 次新增不可生效且按鈕 disabled/明示上限，無截斷。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B08 | 以合法測值把用量設 0、現貨 0、安全備量 3、包裝 12，完成試算 | 估算補 1 包/12 單位；日均 0.000；現貨可用日數顯示無法估算，不拒絕整列。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B09 | 將名稱填成 `<img src=x onerror=alert(1)>`，其他數字合法並試算 | 名稱/報告逐字顯示，不建立 img、不執行腳本、不新增網路請求；頁面只把輸入當文字。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B10 | 完全不用滑鼠，以 Tab/Shift+Tab、Enter/Space 完成新增、刪除、試算、確認、取消、報告選取 | 順序符合閱讀與視覺；focus 可見不遮蔽；沒有鍵盤陷阱；確認取消回到啟動控制。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B11 | 320 CSS px viewport 逐欄填寫並檢結果，另以 200% zoom 檢視 | 無整頁水平捲動或遮住焦點的 sticky 區；欄位、錯誤、按鈕、結果、報告仍可讀與操作。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B12 | 在名稱欄輸入法組字時改變內容 | `compositionstart`/組字 input 時舊結果已失效；工具不重寫輸入、不搶焦點或提交；組字結束後可手動重新試算。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B13 | 使用螢幕閱讀器檢查初始、錯誤、成功及 30 列 | label/help/error 關聯正確；狀態不靠顏色；live region 不朗讀整份 30 列報告。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B14 | 成功試算後導航離開，若瀏覽器保留 BFCache，再返回 | `pagehide` 清空欄位/JS draft/result/report；`pageshow.persisted` 重新顯示初始空白狀態。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B15 | 觀察初次載入、試算、編輯、隱藏頁面與 `pagehide` 的完整 Network/Storage | 不得有含輸入的 URL、fetch/XHR、telemetry/beacon、cdn-cgi/rum、第三方連線或 storage/cookie/IndexedDB/service-worker 寫入；同源靜態資產可依頁面載入。此項需要真瀏覽器工具，純 Node/grep 不算。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B16 | 以 DevTools 離線模式測已載入頁並重新載入 | 可記錄設備實際行為，但不得把結果描述成永久離線保證；初始載入需要取得靜態檔案，產品沒有 service worker。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B17 | 在低階手機/裝置以 30 列完成試算、編輯和結果閱讀 | 不因窄螢幕或一般長清單失去功能；記錄設備/瀏覽器，未在真實低階裝置測試前保持 NOT_RUN。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B18 | 關閉 JavaScript 後載入頁面並按 Enter | 編輯欄與試算按鈕保持 disabled；沒有未阻止的表單 GET、query-string 或外送請求；有 noscript 說明。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B19 | 成功後聚焦 readonly 報告並用鍵盤選取全文 | 全部列都可選，不截斷；不存在複製按鈕、Clipboard API 或下載動作。此步不操作 OS clipboard。 | `NOT_RUN_USER_FOCUS_INCIDENT` |

## Build、HTTP、隱私與 production 交接

M1 必跑離線命令由 TASKS.md 定序：`npm test`、`npm run check`、`npm run build`、`npm run check:http`。server 只能 loopback，遇 port 衝突回報，不得終止未知程序。這些命令不會解鎖 Browser UI gate。

M1 核對 `GET`/`HEAD`、其他 method 405 且 `Allow: GET, HEAD`、hostname 大小寫正規化後僅允許 `127.0.0.1:4217`/`localhost:4217`、缺少或未知 Host 為 421；`/index.html` 和 `/en/index.html` 回 200、`/` 和其他未知 path 回 404。核對 exact MIME（HTML/CSS/ESM）、`HEAD` 無 body 且 headers 等同 GET、`noindex,nofollow`、`Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`，無 inline CSS/JS/遠端資產，且只提供 `dist/`。確認 preview build 不含 docs/tests/evidence。對無資料儲存、完整 Network、BFCache、手機與 AT 的聲明必須有適合層級的證據；不可用 source grep、check、Node DOM 假環境或 HTTP 冒稱真瀏覽器證明。

M1 檔案明確 noindex；M2 需要 primary GO，重新建 `dist-production/` 並實際核對雙語 canonical/hreflang/x-default、FAQ/JSON-LD/CSP hash、robots 長前綴 allowlist、兩頁 sitemap、404 noindex、安全標頭、closed static 資產範圍和正式 HTTP 回應。M2 GitHub source 與 M3 Cloudflare/首頁是不同證據；M0 不存在任一結果。
