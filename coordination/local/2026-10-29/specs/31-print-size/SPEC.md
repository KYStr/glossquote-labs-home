# 圖片列印尺寸試算 — 既有規格保存

Task ID: `labs-31-print-size` · Spec ID: `spec-31-print-size`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：圖片列印尺寸試算

狀態：**M0 規格，尚未實作。** 本文件定義 MVP 邊界，不代表需求、列印結果或品質已驗證。

## 問題、使用者與假設

使用者已知一張圖片的像素寬高，想知道指定列印寬度對應的等比例高度、有效 PPI，以及這個像素尺寸是否達到自己設定的 PPI 目標。常見用途假設是先估尺寸再決定是否使用該圖片；使用頻率與 300 PPI 預設是否合適都待驗證。

工具只依使用者輸入做整數精確試算。PPI 是圖片像素除以英吋尺寸的數學密度；它不是印表機 DPI，也不代表最終視覺品質。300 是可調整的預設參考值，不適用於所有印刷方式、觀看距離、紙材或用途。

## MVP 需求

### FR-01 — 空白初始狀態

- 每種語言首次載入時，像素寬、像素高與列印寬度為空白；目標 PPI 預填字串 300，明確標示可修改。
- 不自動載入範例或計算。MVP 不提供載入範例按鈕；文件中的案例只是驗收資料。
- 初始化成功後，按「試算 / Calculate」可立即驗證空白欄位並取得可修復錯誤。
- 「清除 / Clear」將像素寬高及列印寬度清空、目標 PPI 重設為 300，並清除結果。只有目前值偏離初始狀態或已有結果時才先確認；取消時完整保留。像素寬、高、列印寬都空白、目標 raw 值仍是字串 300 且無結果時是空白初始狀態，不是待清除工作。

### FR-02 — 輸入欄位

- 圖片像素寬、高各是 ASCII 整數，允許前導零；數值範圍 1–100000。輸入框原始字串最多 6 個 ASCII 字元。
- 列印寬度以毫米輸入，允許最多兩位小數，範圍 0.01–10000.00 mm。允許前導零；原始字串最多 8 個 ASCII 字元。必須輸入整數部分，例如 0.5；不接受 .5。
- 目標 PPI 是可修改的 ASCII 整數，預設 300，範圍 1–2400；原始字串最多 4 個 ASCII 字元，允許前導零。
- 四欄均以字串送入核心，不將空值改成 0。拒絕空白、正負號、指數、逗號、全形數字或標點；不 trim、不轉換 locale、不猜測輸入。
- 以上長度、格式、範圍和驗證順序以 [TECHNICAL.md](TECHNICAL.md) 為準。

### FR-03 — 等比例尺寸與 PPI 試算

- 唯一純函式入口為 **calculatePrintSize(request)**。核心使用 BigInt 整數與有理數；不使用浮點數、Date、locale 或隱式日期／數值 parser。
- 輸入的列印寬度固定；高度依像素寬高比例推算。沒有手動高度、裁切、拉伸或長寬比切換。
- 有效 PPI 依輸入像素寬和列印寬度精確計算。因保持比例，橫直方向使用同一有效密度。
- 目標判定使用未四捨五入的精確有效 PPI。heightMm 和 effectivePpi 僅供閱讀，使用正數 half-up 顯示兩位小數；不得以顯示值判定達標。
- requiredPixelWidth 和 requiredPixelHeight 分別是指定物理尺寸達到所選目標 PPI 的最小整數像素需求，以精確 ceil 計算。輸出永遠是試算，不會改動使用者圖片。
- 達標文字只表示「達到你設定的 PPI 目標」，不等於保證清晰或適合印刷；未達標也不等於不可用。

### FR-04 — 結果與錯誤

- 成功時顯示原像素寬高、指定列印寬度、等比例高度、目標 PPI、有效 PPI、所需最少像素寬高，以及是否達標。
- 即使 effectivePpi 顯示四捨五入後和 targetPpi 相同，仍須按 exact 值判斷。畫面加註「顯示值四捨五入；達標判斷使用精確值」。
- 任一欄位無效時只顯示第一個固定欄位錯誤，不產生部分結果、不回顯其他原始欄位、不在錯誤中嵌入輸入文字。
- 使用者修改任一欄位時，於同一事件循環增加 revision 並清除舊結果與成功／達標提示，直到再次試算；不可讓舊結果留在畫面上。
- 精確 result 和 error schema、穩定代碼及欄位位置見 [TECHNICAL.md](TECHNICAL.md)。

### FR-05 — 暫存、語言和清除

- 輸入和結果只留在目前頁面記憶體；不保存、不放入 URL、history state、表單 name、cookie、storage、cache、console、報告或網路 payload。
- 語言頁面互相獨立。切換語言前，若任一輸入值偏離初始值或已有結果，明確說明會清除並要求確認；取消不改變目前頁面，確認後導向另一固定同源語言頁，呈現空白欄位和預設 PPI 300。若像素寬、高、列印寬皆空白、目標 raw 值仍為 300 且無結果，直接切換，不顯示確認框。
- 清除和語言切換均不保留草稿。離開頁面或 BFCache 恢復不得復原舊輸入或結果。
- MVP 不呼叫 Clipboard API，不建立 object URL，沒有下載容量或 30 秒計時器；不提供 buildReport，也不提供複製／文字報告。

### FR-06 — 失敗關閉與隱私

- HTML 初始輸入 fieldset 和所有工作按鈕均 disabled，所有 input 沒有 name。最先註冊的同步 submit capture listener 之回呼，第一個動作是 preventDefault；確認初始化就緒前保持停用。
- 所有事件 listener 掛妥並完成初始化後才啟用欄位和操作。初始化失敗維持 disabled，顯示固定訊息，不顯示原始 exception。
- 表單不發送輸入。核心同步計算只在當前頁面執行；無圖片檔案欄位、fetch、XHR、WebSocket、EventSource、worker、analytics、storage、Service Worker、遠端字型或第三方套件。
- 動態文字只用 textContent 或表單 value；不得使用 innerHTML、eval、Function、動態程式碼或錯誤回報服務。
- 網站初次載入仍會請求同源靜態 HTML/CSS/ESM；不得宣稱無網路、永久離線或冷啟動離線可用。

### FR-07 — 可及性和低資源裝置

- 每欄有可見標籤、格式說明、欄位錯誤關聯和一致鍵盤順序。狀態同時使用文字和圖示／語意色，不只靠顏色。
- 輸入用 type=text；pixelWidthRaw、pixelHeightRaw、targetPpiRaw 使用 inputmode=numeric；widthMmRaw 使用 inputmode=decimal。格式不依賴瀏覽器 number parser。
- 手機若虛擬小數鍵盤不提供 ASCII 句點，可由緊鄰欄位的「插入小數點 / Insert decimal point」輔助插入句點並保留游標位置；逗號仍是無效輸入，不自動改寫。
- 320 CSS px、200% 縮放、長英文標籤、長結果數字與虛擬鍵盤情境中，欄位、錯誤、主要操作和焦點均可到達。結果數字可換行或在局部標示的輸出區捲動，不造成整頁水平捲動。

## API 結果語義摘要

成功回傳 versioned、JSON 可序列化的結果；高度與有效 PPI 是固定兩位 ASCII 小數字串，pixel dimensions 與 target 是有界整數，達標狀態是布林值。BigInt 不離開純函式；錯誤只包含穩定 code 和固定 field。MVP 不定義報告函式或報告輸出。

## 明確排除

照片上傳與調整、影像放大、印表機或紙材建議、顏色／銳利化評估、列印預覽、印刷品質認證、英吋輸入、任意高寬雙向試算、多圖處理、報告下載、剪貼簿、帳號、雲端和資料保存均不在 MVP。

使用者介面文案、雙語 FAQ 與 SEO 見 [UX-SEO.md](UX-SEO.md)；技術安全以主代理在 M1 前補齊的本工具 docs/PRIVACY-SECURITY.md 為準。


---

## 原文件 TECHNICAL.md

# 技術規格：圖片列印尺寸試算

狀態：**M0 規格，尚未實作。** 正式產品是原生靜態瀏覽器工具。Node.js 24+ 僅供本機 ESM、built-ins、離線測試與建置；不加 runtime 或 dev 外部套件。

## 技術邊界與檔案樹

- 瀏覽器核心為同步純 JavaScript 函式。沒有伺服器試算 API、圖片檔、canvas、worker、依賴或隱藏網路請求。
- 靜態載入 HTML/CSS/ESM 是首次載入所需網路；載入完成後試算只用頁面記憶體。沒有 URL 輸入、Storage、cookie、cache、Service Worker 或 telemetry。
- M1 預覽只綁 127.0.0.1，port 4211。M2 production-like HTTP model 候選 5211，只服務靜態產物並驗證路由／標頭，不提供試算端點。
- 目標產品 origin 候選為 https://printsize.glossquote.com；網域可用性、DNS、正式部署尚未確認。正式候選路徑為 /index.html 和 /en/index.html。

建議 M1 檔案樹：

~~~text
package.json
scripts/{serve.mjs,check.mjs,build.mjs}
public/{index.html,en/index.html,styles/app.css,js/app.js}
public/js/core/{print-size.js}
test/{print-size.test.mjs,static-contract.test.mjs,browser-checklist.md}
~~~

M2 的 production builder/checker/model、Wrangler 設定、headers、robots、sitemap 和 404 由原功能對話依主代理 release contract 加入。M1 preview build 不得覆寫或讀取使用者輸入。

## Pure API request schema

唯一計算函式為 calculatePrintSize(request)。request 必須是 prototype 恰為 Object.prototype 的普通物件，恰有以下四個 own enumerable data properties：

~~~js
{
  pixelWidthRaw: "3000",
  pixelHeightRaw: "2000",
  widthMmRaw: "254",
  targetPpiRaw: "300"
}
~~~

四個值都必須是原始字串。UI 的目標 PPI 預填字串 "300"，但 API 欄位必填；API 不會為缺欄位補預設值。

Schema 守衛依序檢查根物件種類、Reflect.ownKeys 和 property descriptors，再讀取已驗證的 descriptor.value：

- 拒絕 array、null、非普通原型、未知／缺少自有鍵、symbol、自有非 enumerable 鍵、getter、setter 和非 data descriptor。
- 不呼叫 getter；根 schema 錯誤不讀未知欄位值。Proxy trap 若在反射時擲錯，以固定 invalid schema 回覆；JavaScript 沒有通用可靠方法預先識別所有 Proxy，因此 Proxy 不屬安全邊界。
- request 不可被修改。驗證、解析或計算錯誤不得產生 partial result、raw echo 或任意錯誤文字。

## 欄位文法、界限與驗證順序

驗證順序固定為：根 schema；pixelWidthRaw；pixelHeightRaw；widthMmRaw；targetPpiRaw。每欄依序檢查字串型別、raw 長度、ASCII 文法、數值範圍；只回第一個錯誤。

| 欄位 | raw 長度上限 | ASCII 文法 | 數值範圍 | 解析 |
|---|---:|---|---|---|
| pixelWidthRaw | 6 字元 | ^[0-9]{1,6}$ | 整數 1–100000 | BigInt 整數像素 |
| pixelHeightRaw | 6 字元 | ^[0-9]{1,6}$ | 整數 1–100000 | BigInt 整數像素 |
| widthMmRaw | 8 字元 | ^[0-9]{1,5}(?:\.[0-9]{1,2})?$ | 0.01–10000.00 mm | 整數 hundredths mm |
| targetPpiRaw | 4 字元 | ^[0-9]{1,4}$ | 整數 1–2400 | BigInt 整數 PPI |

所有文法接受 ASCII 前導零；寬度必須有整數部分，故 .5 無效而 0.5 有效。拒絕空字串、空白、正負號、指數 e/E、逗號、全形字元、Unicode 數字、尾端句點和超過兩位小數。不得 trim、NFKC、locale 轉換或以 Number 解析。字串超過長度上限先回 raw_too_long，即使其內容同時有格式問題。

widthMmRaw 解析為整數 hundredths U：整數部分乘 100，小數部分右補零至兩位。例如 254 → 25400、0.5 → 50、0001.25 → 125。像素值及 PPI 先用 BigInt 解析，再套數值範圍。外部呼叫以 number 代替 raw string 時回 invalid_format。

## 精確演算法與顯示

所有中間運算使用正 BigInt。令 W=像素寬、H=像素高、U=毫米寬度的 hundredths、T=目標 PPI。1 英吋恰為 25.4 mm，因此每一 mm hundredth 對應 2540 個 PPI 分母單位：

~~~text
exactHeightMm numerator   = U * H
exactHeightMm denominator = 100 * W

exactEffectivePpi numerator   = W * 2540
exactEffectivePpi denominator = U

requiredPixelWidth  = ceilDiv(U * T, 2540)
requiredPixelHeight = ceilDiv(U * H * T, 2540 * W)

meetsTarget = (W * 2540 >= T * U)
~~~

ceilDiv(n,d) 對正整數為 (n + d - 1) / d。達標判定直接比較 exact cross-products，不比較顯示字串、浮點值或已取整的所需像素。

顯示用 half-up 只處理正值。roundHalfUp(n,d) = floor((2*n+d)/(2*d))。

- widthMm 輸出格式為 U/100 的固定兩位 ASCII 小數，不四捨五入。
- heightMm 的 hundredths 為 roundHalfUp(U*H, W)，再格式化為兩位小數。
- effectivePpi 的 hundredths 為 roundHalfUp(W*254000, U)，再格式化為兩位小數。
- 若 exact PPI 為 299.999…、畫面顯示 300.00、目標為 300，meetsTarget 仍為 false。結果旁固定說明判斷使用未四捨五入值。
- 所有顯示使用 ASCII 數字和句點；不依瀏覽器 locale 插入千位符、逗號小數或科學記號。

所有精確除數都大於零。輸入有界；最大 requiredPixelHeight 小於 95,000,000,000，低於 Number.MAX_SAFE_INTEGER。輸出 pixel 數值轉成 Number 前仍須驗證安全整數；其餘計算與格式化留在 BigInt。heightMm/effectivePpi 以字串輸出，避免大值和四捨五入受 binary floating point 影響。

## API 輸出 shape

成功回覆只含以下 exact shape，欄位順序固定，且 JSON.stringify 必須成功：

~~~js
{
  ok: true,
  result: {
    schemaVersion: 1,
    pixelWidth: 3000,
    pixelHeight: 2000,
    widthMm: "254.00",
    heightMm: "169.33",
    targetPpi: 300,
    effectivePpi: "300.00",
    requiredPixelWidth: 3000,
    requiredPixelHeight: 2000,
    meetsTarget: true
  }
}
~~~

結果只含經驗證的尺寸與計算欄位；不含 raw input、檔名、圖片內容、時間戳或機器資訊。heightMm 和 effectivePpi 是固定兩位小數字串。所有其他數值為已證明安全的整數 Number；不得把 BigInt 暴露到 JSON。

失敗 shape 固定為：

~~~js
{ ok: false, error: { code: "invalid_format", field: "pixelWidthRaw" } }
~~~

只有五個穩定 code：invalid_request、invalid_schema、raw_too_long、invalid_format、out_of_range。field 固定為 request、pixelWidthRaw、pixelHeightRaw、widthMmRaw、targetPpiRaw 之一，不含使用者輸入。根不是普通物件時為 invalid_request/request；根鍵或描述子違規為 invalid_schema/request 或可定位的已知欄位；各數字欄依上表規則回欄位錯誤。

MVP 不提供 buildReport、copy、download 或其他文字輸出 API。使用者只讀取頁面結果；這項範圍決定使 Clipboard Promise epoch 與 object URL 生命週期不適用。

## UI revision、初始化與頁面生命週期

- HTML 初始所有 input 所在 fieldset 與工作按鈕均 disabled，input 無 name。最早掛載的同步 submit capture listener 回呼第一步同步 preventDefault，再檢查 ready 狀態。listener、DOM 節點和錯誤區均完成初始化後才啟用。
- JavaScript 缺失或初始化失敗時維持 disabled 並顯示固定雙語說明；不得 GET 導覽、送出欄位或顯示 raw exception。API 不以 UI 驗證作為安全邊界。
- 每次輸入事件遞增 revision，清除舊成功結果與狀態。按下計算時使用該 revision 的當前字串；成功同步回覆只在 revision 未變時渲染。
- 試算同步且有固定輸入界限，不使用 Promise、Worker、網路或外部工作。沒有 copy/download 狀態、clipboard epoch 或 object URL。
- pagehide 清除目前頁面記憶體的輸入和結果；若 BFCache 以 pageshow.persisted 還原，回到空白初始態並把 targetPpiRaw 重設為 300。
- 表單不得把使用者資料放進 URL、history、input name、DOM HTML、console、Storage、Cookie 或請求內容。動態文字使用 textContent/value。

## 隱私、安全與本機驗收限制

- 僅同源靜態 HTML、CSS 和 ESM；無外部圖片、字型、圖示庫、套件、分析或 crash reporter。
- M1 使用 Node.js 24+ ESM 和 built-ins；不得讀取憑證或帳戶設定，不變更 persistent environment，不連線試算。
- 真正圖片列印品質無法由四個數字驗證；規格、單元測試和螢幕結果都不能代替實際輸出品質測試。
- CSP、M1 noindex、正式 canonical、404、robots、headers 和 production model 依主代理補齊的 docs/PRIVACY-SECURITY.md 與 docs/RELEASE.md 執行。


---

## 原文件 UX-SEO.md

# 使用者介面與 SEO 規格：圖片列印尺寸試算

狀態：**M0 規格，尚未實作。** Surface mode：Product App。主畫面是像素資料和可核對的列印尺寸結果，不使用通用 SaaS hero 或假圖片。

## 使用者流程與資訊順序

1. 輸入圖片像素寬和高。
2. 輸入想要的實際列印寬度（mm）。高度自動依比例推算並標示為估算。
3. 保留可編輯的目標 PPI，預設 300；欄旁明確說明這只是使用者的比較門檻。
4. 按「試算 / Calculate」。無效欄位顯示可修正錯誤，不顯示部分結果。
5. 先顯示等比例列印尺寸，再顯示有效 PPI、設定目標和精確達標狀態，最後顯示達到該目標所需的最少像素寬高。
6. 任一輸入改變時立即清除舊結果。MVP 只在頁面顯示，不複製、不下載、不保存。

不得以「300 PPI 即為高品質」或「未達標就不能列印」作主標。PPI 數字不代表印表機 DPI、色彩、紙材、觀看距離或最終視覺品質。

## 版面草圖

### 桌面主要工作區

~~~text
+-------------------------------------------------------------------+
| Gloss Tools / 圖片列印尺寸試算            English   繁中首頁       |
+-------------------------------------------------------------------+
| 圖片列印尺寸試算                                                  |
| 輸入像素尺寸和列印寬度，估算等比例高度與有效 PPI。                |
| PPI 是尺寸試算指標，不是列印品質保證。                            |
|                                                                   |
| 圖片像素尺寸    寬 [________] px    高 [________] px              |
| 列印寬度        [________] mm       目標 PPI [300____]             |
|                                  可調整；不代表通用品質門檻        |
|                                                                   |
| [試算]  [清除]                                                    |
|                                                                   |
| 結果                                                              |
| 列印尺寸（依比例） 254.00 × 169.33 mm                             |
| 有效 PPI 300.00      達到你設定的 300 PPI 目標                    |
| 此判定使用未四捨五入值。所需像素：3000 × 2000 px                 |
| PPI 不保證實際印刷品質；結果不評估印表機、紙材或觀看距離。        |
+-------------------------------------------------------------------+
~~~

### 手機（320 CSS px 起）

~~~text
+-----------------------------+
| 圖片列印尺寸試算   English  |
| 繁中首頁                    |
| 輸入像素尺寸和列印寬度。    |
| PPI 不保證印刷品質。        |
|                             |
| 圖片像素寬                  |
| [________________] px       |
| 圖片像素高                  |
| [________________] px       |
| 列印寬度                    |
| [________________] mm       |
| [插入小數點]                |
| 目標 PPI（可修改）          |
| [300_____________]          |
| 300 是可調整的參考值。      |
| [試算]                      |
| [清除]                      |
|                             |
| 結果或欄位錯誤              |
| 254.00 × 169.33 mm          |
| 有效 PPI：300.00            |
| 達到所選目標：300 PPI       |
| 所需像素：3000 × 2000       |
+-----------------------------+
~~~

手機只用單欄重排，不保留多欄橫向表格。必要時長數字在結果區內換行；頁面本身不做水平捲動。桌面輸入和結果保持在同一主工作畫布，不設長期側欄或巢狀卡片。

## 控制項、狀態與鍵盤

- Header 只含工具名稱、繁中／English 切換和當前語言首頁連結。
- 四個輸入欄皆為 type=text 和可見標籤；pixel 寬高與目標 PPI 使用 inputmode=numeric，毫米寬度用 inputmode=decimal。maxlength 分別為 6、6、8、4；核心仍重做驗證。
- 欄位旁固定顯示格式例子和範圍。手機鍵盤若沒有句點，寬度欄旁提供至少 44 CSS px 的 Insert decimal point 按鈕，將 ASCII 句點插入游標處並保留選取狀態。逗號不自動轉換。
- 初始所有工作控制 disabled；全部事件 listener 掛妥且初始化成功後才啟用輸入及安全操作。無 JavaScript或初始化失敗時以 noscript／固定錯誤文字說明無法試算，維持 disabled。
- Calculate 在就緒後可對空欄位觸發驗證。錯誤摘要指出欄位與固定修正方向，第一個錯誤欄位可聚焦；不得移除焦點可見性。
- 成功結果用文字與語意狀態圖示同時說明是否達到使用者設定的目標。結果旁提示 PPI 顯示值四捨五入、達標比較使用精確值。
- 輸入任一欄位會即時清除結果與舊狀態。清除時回到空白像素／寬度欄和預設 PPI 300；只有值偏離初始狀態或已有結果時才先確認，取消完整保留。若三個資料欄空白、目標 raw 值仍是字串 300、無結果，直接重設而不提示。
- 語言切換到對應固定同源頁。只有值偏離初始狀態或已有結果時才確認會清除；取消保留目前狀態。三個資料欄空白、目標 raw 值仍是字串 300、無結果時直接切換。不得把輸入放入查詢字串。
- 沒有範例自動載入。MVP 沒有複製、報告、下載或任何外部分享操作。

## 雙語 SEO 與可見文案

### 繁體中文

- Title：**圖片列印尺寸試算｜Gloss Tools by GlossQuote**
- Description：**輸入圖片像素尺寸與列印寬度，估算等比例高度、有效 PPI，並比較你設定的目標。**
- H1：**圖片列印尺寸試算**
- 說明：**已知圖片像素寬高嗎？輸入想要的列印寬度，查看等比例高度、有效 PPI，以及是否達到你設定的目標。**
- PPI 提示：**目標 PPI 可自行調整；預設 300 只是起始參考，不是通用列印品質標準。**
- 精度提示：**PPI 顯示至小數點後兩位；是否達標使用未四捨五入的精確值。**
- 限制提示：**本工具不讀取或修改圖片，也不評估印表機、紙材、色彩、觀看距離或最終印刷品質。**
- 主要操作：**試算**
- 次要操作：**清除**
- 像素寬：**圖片像素寬**
- 像素高：**圖片像素高**
- 物理寬：**列印寬度（毫米）**
- PPI 欄位：**目標 PPI**
- 結果標籤：**依比例推算的列印尺寸**、**有效 PPI**、**達到所選 PPI 目標**、**未達所選 PPI 目標**、**達到目標所需的最少像素尺寸**
- 數據說明：**輸入只在目前頁面計算，不會保存或上傳。首次載入仍需下載網站檔案。**
- 插入句點輔助：**插入小數點**
- 語言切換確認（僅有工作時）：**切換語言會清除目前輸入和結果。要繼續嗎？** 按鈕：**清除並切換**、**留在此頁**
- 清除確認（僅有工作時）：**清除會移除目前輸入和結果。要清除嗎？** 按鈕：**清除**、**取消**
- 初始化失敗：**頁面尚未準備好，輸入欄位保持停用。重新載入後再試。**

### English

- Title: **Image Print Size Calculator | Gloss Tools by GlossQuote**
- Description: **Enter image pixel dimensions and print width to estimate proportional height and effective PPI against your chosen target.**
- H1: **Image Print Size Calculator**
- Intro: **Know the image's pixel dimensions? Enter a print width to estimate its proportional height, effective PPI and whether it meets your chosen target.**
- PPI note: **You can change the target PPI. The default of 300 is a starting reference, not a universal print-quality standard.**
- Precision note: **PPI is displayed to two decimal places; target status uses the exact, unrounded value.**
- Limit note: **This calculator does not read or modify the image or assess the printer, paper, color, viewing distance or final print quality.**
- Primary action: **Calculate**
- Secondary action: **Clear**
- Pixel width: **Image pixel width**
- Pixel height: **Image pixel height**
- Physical width: **Print width (mm)**
- PPI field: **Target PPI**
- Result labels: **Proportional print size**, **Effective PPI**, **Meets your selected PPI target**, **Below your selected PPI target**, **Minimum pixel dimensions for this target**
- Data note: **Inputs are calculated in this page and are not saved or uploaded. The first page load still downloads the website files.**
- Decimal helper: **Insert decimal point**
- Language confirmation (only when work exists): **Changing language clears the current inputs and result. Continue?** Buttons: **Clear and switch**, **Stay here**
- Clear confirmation (only when work exists): **Clearing removes the current inputs and result. Clear them now?** Buttons: **Clear**, **Cancel**
- Initialization failure: **This page is not ready yet, so inputs remain disabled. Reload and try again.**

### 固定範例

圖片 3000 × 2000 px、列印寬度 254 mm、目標 300 PPI：列印高度 169.33 mm、有效 PPI 300.00、所需像素 3000 × 2000，達到使用者所選門檻。若展示此案例，必須標示為範例且由使用者明確按下才填入；MVP 不提供範例按鈕。

## FAQ（頁面和 JSON-LD 必須一致）

正式頁面至少顯示以下四題。M2 若加入 FAQPage JSON-LD，只能由相同可見問答產生，不得額外聲稱。

### 繁體中文

1. **有效 PPI 是什麼？** 它是圖片像素數除以指定列印尺寸換算出的每英吋像素數。這是圖片密度估算，不是印表機 DPI，也不保證實際視覺品質。
2. **列印高度怎麼算？** 工具依輸入像素寬高保持原比例，用你指定的列印寬度推算高度；不裁切也不拉伸圖片。
3. **300 PPI 一定適合我的印刷嗎？** 不一定。300 是可修改的預設參考值；印刷方式、紙材、觀看距離和用途都會影響選擇，請依你的工作流程設定目標。
4. **工具會上傳或修改圖片嗎？** 不會。這個版本只在目前頁面計算你輸入的像素尺寸、列印寬度和目標 PPI，不讀取圖片檔，也不保存輸入。

### English

1. **What is effective PPI?** It is the image's pixel count divided by the specified print size in inches. It estimates image pixel density; it is not printer DPI and does not guarantee visual quality.
2. **How is print height calculated?** The calculator keeps the input pixel aspect ratio and derives the height from your requested print width. It does not crop or stretch the image.
3. **Is 300 PPI right for every print?** No. It is an editable starting reference. Print method, paper, viewing distance and intended use all affect the target you may choose.
4. **Does the calculator upload or modify my image?** No. This version calculates only the pixel dimensions, print width and target PPI you enter in the current page. It does not read an image file or save your inputs.

## SEO 與正式網址規則

- 候選 origin：https://printsize.glossquote.com。此為候選網址，不代表 DNS、可用性、來源公開或 Cloudflare 部署已確認；M2/M3 由主代理確認後才可稱正式網址。
- M1 預覽只限 http://127.0.0.1:4211/，HTML meta robots 為 noindex,nofollow；不輸出本工具正式 canonical、alternate metadata、sitemap 或索引 schema，並保留既有正式同語首頁連結。
- M2/M3 正式候選繁中頁為 https://printsize.glossquote.com/index.html，英文頁為 https://printsize.glossquote.com/en/index.html。正式輸出 self-canonical、雙向 hreflang zh-Hant/en 和指向繁中頁的 x-default；sitemap 只列這兩頁。404 是明確錯誤頁，不顯示計算成功結果。
- 返回共用首頁使用相同語言固定 URL：繁中 https://glossquote.com/index.html，英文 https://glossquote.com/en/index.html。上線驗收確認連結的 URL 和頁面語言相符。
- M2 可加入 WebApplication 和可見 FAQ 對應的 FAQPage JSON-LD。無 rating、review、未驗證價格、印刷品質、瀏覽器支援率或搜尋排名宣稱。
- robots.txt 不封鎖頁面所需 CSS/JS；M2/M3 驗證兩個 canonical、sitemap、404 的 meta 與繼承 X-Robots-Tag。搜尋排名或流量不是 gate。

## 品牌與無障礙

遵守主代理提供的 docs/DESIGN-SYSTEM.md、Product App 模式和 family tokens。輸入與結果是工作畫布；用明確標籤、精準單位和細分隔線表達資料關係。不放假圖、照片、巢狀卡片或大幅行銷 hero。

目標 WCAG 2.2 AA：完整鍵盤流程、焦點清楚且不被虛擬鍵盤遮擋、欄位錯誤關聯、一般文字對比至少 4.5:1、必要控制邊界至少 3:1、主要觸控目標至少 44×44 CSS px、狀態不只靠顏色、200% 縮放、320 CSS px 重排、prefers-reduced-motion。容納比繁中長至少 40% 的英文標籤和最大輸出數字。

## 明確不宣稱

不宣稱通用最佳 PPI、列印清晰保證、printer DPI 推算、圖片品質評分、適用所有紙材／印表機、永久免費、永遠離線、所有瀏覽器支援、搜尋排名或使用者數。


---

## 原文件 ACCEPTANCE.md

# 驗收案例：圖片列印尺寸試算

狀態：規格 oracle，尚未執行。表格預期值均為獨立手算，不能由被測函式產生 expected。M0 只交付規格，不表示任何案例已通過。規則見 [PRODUCT.md](PRODUCT.md)、[TECHNICAL.md](TECHNICAL.md) 和 [UX-SEO.md](UX-SEO.md)；M1 命令、隱私和發布證據由主代理補齊的 docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md 和 docs/RELEASE.md 說明。

## 核心固定案例

除另有說明，request 恰含四個字串欄位 pixelWidthRaw、pixelHeightRaw、widthMmRaw、targetPpiRaw。成功預期比對全部結果欄位；錯誤預期比對固定 code/field，並確認沒有 result、raw echo 或 request mutation。heightMm/effectivePpi 固定兩位小數。requiredPixelWidth × requiredPixelHeight 是最小整數需求。

| ID | 精確輸入：像素寬×高；寬度 mm；目標 PPI | 預期 |
|---|---|---|
| C01 | 3000×2000；254；300 | heightMm=169.33；effectivePpi=300.00；required=3000×2000；meetsTarget=true。 |
| C02 | 3000×2000；300；300 | heightMm=200.00；effectivePpi=254.00；required=3544×2363；meetsTarget=false。 |
| C03 | 3000×2000；152.4；300 | heightMm=101.60；effectivePpi=500.00；required=1800×1200；meetsTarget=true。 |
| C04 | 3000×2000；100；300 | heightMm=66.67；effectivePpi=762.00；required=1182×788；meetsTarget=true。 |
| C05 | 3000×2000；500；300 | heightMm=333.33；effectivePpi=152.40；required=5906×3938；meetsTarget=false。 |
| C06 | 800×600；50.8；300 | heightMm=38.10；effectivePpi=400.00；required=600×450；meetsTarget=true。 |
| C07 | 1×1；0.01；1 | heightMm=0.01；effectivePpi=2540.00；required=1×1；meetsTarget=true。驗證最小合法列印寬度和 ceil 不回傳 0。 |
| C08 | 2×1；100.01；1 | exact height=50.005 mm，half-up 顯示 50.01；effectivePpi=0.51；required=4×2；meetsTarget=false。驗證半值向上及比例高度。 |
| C09 | 100000×100000；8466.67；300 | heightMm=8466.67；effectivePpi=300.00；required=100001×100001；meetsTarget=false。精確 PPI 略低於 300，顯示仍為 300.00。 |
| C10 | 100000×100000；8466.66；300 | heightMm=8466.66；effectivePpi=300.00；required=100000×100000；meetsTarget=true。精確 PPI 略高於 300；與 C09 同顯示值但判定相反。 |
| C11 | 3000×2000；254；600 | heightMm=169.33；effectivePpi=300.00；required=6000×4000；meetsTarget=false。目標欄可調整且不改變物理尺寸。 |
| C12 | 1600×1200；203.2；200 | heightMm=152.40；effectivePpi=200.00；required=1600×1200；meetsTarget=true。 |
| C13 | 1×100000；0.01；2400 | heightMm=1000.00；effectivePpi=2540.00；required=1×94489；meetsTarget=true。長寬比極端但仍在輸入範圍。 |
| C14 | 100000×1；10000；1 | heightMm=0.10；effectivePpi=254.00；required=394×1；meetsTarget=true。最大寬度和最小目標邊界。 |
| C15 | 1×100000；10000；2400 | heightMm=1000000000.00；effectivePpi=0.00；required=944882×94488188977；meetsTarget=false。精確 PPI 為正但低於 0.005，顯示 0.00 不得被解讀為達標。 |
| C16 | pixelWidthRaw="1e3"；其他值合法 | invalid_format，field=pixelWidthRaw。拒絕指數。 |
| C17 | pixelHeightRaw="100001"；其他值合法 | out_of_range，field=pixelHeightRaw。 |
| C18 | widthMmRaw="0.001"；其他值合法 | invalid_format，field=widthMmRaw。拒絕三位小數。 |
| C19 | widthMmRaw="10000.01"；其他值合法 | out_of_range，field=widthMmRaw。 |
| C20 | targetPpiRaw="2401"；其他值合法 | out_of_range，field=targetPpiRaw。 |
| C21 | widthMmRaw=" 254" 或 "254,0" | invalid_format，field=widthMmRaw；不 trim 或轉逗號。 |
| C22 | targetPpiRaw="３００" | invalid_format，field=targetPpiRaw。三字元長度未超限，錯誤明確來自拒絕全形數字。 |
| C23 | widthMmRaw="0" | out_of_range，field=widthMmRaw；最小值是 0.01 mm。 |
| C24 | widthMmRaw="123456789" | raw_too_long，field=widthMmRaw；先檢查長度。 |
| C25 | 所有欄合法，request 多 own key debug | invalid_schema，field=request；不得讀取或回顯未知值。 |
| C26 | pixelWidthRaw 是 getter；getter 增加計數 | invalid_schema，field=pixelWidthRaw；getter 次數為 0。 |
| C27 | pixelWidthRaw="x"，pixelHeightRaw="0"，其餘合法 | invalid_format，field=pixelWidthRaw；驗證順序固定。 |
| C28 | pixelWidthRaw 傳入數字 3000 而非字串 | invalid_format，field=pixelWidthRaw。 |
| C29 | 根物件含未知 key、symbol key、non-enumerable extra key 或缺少欄位；另測已知 targetPpiRaw 為 getter/non-enumerable descriptor | 根 extra/symbol/missing schema 錯誤為 invalid_schema，field=request；已知欄位 descriptor 錯誤為 invalid_schema，field=targetPpiRaw；沒有 partial result。 |
| C30 | request 為 null、陣列、Date instance、自訂 prototype 或 Object.create(null) | invalid_request，field=request。只有 Object.prototype 普通物件可作根 request。 |
| C31 | 任一欄位改動後深層比較 request 前後 | request 未被修改；成功結果可 JSON stringify/parse，內部沒有 BigInt。 |

C09 和 C10 是主要精度 oracle：兩者顯示 PPI 都是 300.00，只有精確值可以分辨未達標與已達標。C15 驗證顯示 0.00 不會讓有效正值被浮點或顯示比較誤判。C08 驗證高度顯示採 half-up；所需像素採 ceil。

## 瀏覽器與使用環境案例

在 M1 loopback 預覽 127.0.0.1:4211 逐語言執行。一般桌面和自動化可用瀏覽器需實際操作兩語主要流程。真機小數鍵盤和實際印出品質若無能力驗證，分項記 NOT_RUN，不以 mock 代替。完整安全規則見主代理提供的本工具 docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md。

| ID | 可重現操作 | 預期 |
|---|---|---|
| B01 | 初次打開繁中頁，未輸入任何值 | 像素寬高、列印寬度空白，目標 PPI 為 300，無結果；輸入 fieldset 和所有工作按鈕先 disabled，所有 input 無 name；初始化及所有 listener 完成後才啟用。 |
| B02 | JavaScript 關閉或初始化失敗 | 顯示固定說明；控制維持 disabled；沒有 GET 導覽、表單提交或 raw exception。 |
| B03 | 就緒後直接按試算 | 定位第一個空白欄位；不顯示部分結果、不導覽、不把輸入放進 URL。 |
| B04 | 輸入 3000×2000、254 mm、300 PPI，按試算 | 顯示 254.00×169.33 mm、有效 PPI 300.00、所需 3000×2000 px，狀態為達到所選目標。 |
| B05 | 先算出結果，再只改任一個欄位 | 同一事件循環中清除舊結果和達標提示；再次計算前不呈現舊值。 |
| B06 | 輸入 100000×100000、8466.67 mm、300 | 顯示 PPI 300.00，但狀態未達標且所需 100001×100001；狀態依精確值而非顯示值。 |
| B07 | 輸入 100000×100000、8466.66 mm、300 | 顯示 PPI 300.00，狀態達標且所需 100000×100000。與 B06 顯示相同但 exact 狀態不同。 |
| B08 | 寬度依序輸入 0.001、10000.01、逗號小數及前後空白 | 分別定位精度格式、範圍或格式錯誤；不轉換、不修剪、不產生結果。 |
| B09 | 成功試算後按清除並取消確認 | 四欄、結果與狀態都保持原樣。 |
| B10 | 有輸入或結果時確認清除 | 像素及寬度欄清空、target PPI 重設 300、結果清空。 |
| B11 | 兩語各自執行 B04 主流程；從有輸入頁切語言並取消，再確認 | 文案語言一致；取消保留狀態，確認清空並抵達固定另一語言路徑；不把數值帶進 URL。 |
| B12 | 在 320 CSS px、200% 縮放和長英文標籤下，以鍵盤走完整流程 | 不出現整頁水平捲動；每個欄位標籤、錯誤、焦點和試算按鈕可見可達；長結果在局部換行。 |
| B13 | 手機虛擬小數鍵盤不提供句點時輸入 254.5 | 可用可見輔助插入 ASCII 句點並保留游標；逗號不轉換。若沒有真機則記 NOT_RUN。 |
| B14 | 頁面載入後切到離線，輸入並試算；另冷啟動離線 | 已載入頁面可本機同步試算；不承諾冷啟動離線。不把離線結果冒充網站完全無網路。 |
| B15 | 檢查輸入和成功結果前後的 Network/Storage | 除同源靜態載入外無應用請求；無 cookie、storage、cache、URL 參數、console 或上傳。能力不足時記 NOT_RUN。 |
| B16 | 打開 M1 預覽原始碼、robots 與 response | 兩個頁面 noindex,nofollow，沒有正式 canonical、sitemap 或正式索引 JSON-LD；不得由 M1 推斷 M2 SEO。 |
| B17 | 從已試算頁離開，再用 BFCache 返回 | 畫面恢復為欄位空白、目標 300、無結果；不復活舊 revision。 |
| B18 | 用讀屏與鍵盤修正欄位錯誤並重算 | label、錯誤關聯與狀態讀取順序合理；錯誤包含固定修正方向且不只靠顏色。 |
| B19 | 重新載入或清除後檢查表單、URL 和頁面來源 | 無持久草稿、輸入 name、query string 或隱藏提交欄位；清除不保留數值。 |
| B20 | 使用最大合法輸入 1×100000、10000 mm、2400 PPI | 輸出巨大高度和 required pixels 使用一般十進位字串，無 Infinity、NaN、指數、卡住或整頁溢位；顯示 0.00 PPI 時仍標未達標。 |
| B21 | 嘗試以計算結果判斷實際相片／紙材列印品質 | UI 明確說明無法判斷；實際紙張列印與品質評估固定標記 NOT_RUN / 不在 MVP 範圍，不以公式聲稱通過。 |
| B22 | 新頁初始三個資料欄空白、目標仍為 300、無結果；按清除或切換語言 | 沒有待保留工作；不顯示確認框，直接重設或切頁。目標預設值本身不觸發提示。 |

## M1 強制 gate 與不可冒稱項目

- 將 C01–C31 轉為離線 Node 測試，expected 為獨立手算常數，不由 calculatePrintSize 產生。測試 hostile schema、getter 不執行、JSON round-trip、request 不突變及精確 half-up/ceil 門檻。
- 依原功能對話與主代理的正式任務清單，執行 Node.js 24+ 的 node --test、node scripts/check.mjs、node scripts/build.mjs；記錄實際版本、完整命令、exit code 和證據。M0 不執行這些命令。
- 在 127.0.0.1:4211 實際走完兩語空白態、B04、錯誤修正、結果失效、清除與語言切換。任一語言主流程未通過不得宣稱 M1 完成。
- 320 CSS px、200% 縮放及鍵盤路徑由可用瀏覽器實測。手機原生小數鍵盤、完整 Network/Storage、實際印出品質依能力分項記 PASS 或 NOT_RUN；mock 不能冒充原生環境。
- M1 build 必須 noindex,nofollow，沒有正式 canonical 或 production sitemap。M2/M3 的網路、GitHub、真網域和部署不屬 M1 證據。


---

## 原文件 TASKS.md

# 里程碑任務：圖片列印尺寸試算

狀態：M0 規格待主代理審查。沒有產品實作、測試、公開來源或部署。每次只推進一個 milestone；記錄真實命令、exit code、固定候選和 NOT_RUN，不把本規格的手算案例當測試結果。

任務入口和共通邊界見主代理提供的本工具 AGENTS.md、START-HERE.md、TASK-ENTRY.md、HANDOFF.md；工程、隱私、品牌和發布見本工具 docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/BRAND.md、docs/DESIGN-SYSTEM.md、docs/RELEASE.md、docs/RELEASE-CANDIDATE.md、docs/GIT-PUBLICATION-SAFETY.md。

## M0 — 自包含產品規格

- [x] 定義像素尺寸、固定列印寬度、可調目標 PPI、精確算法、輸出和非目標。
- [x] 定義固定純函式 API、錯誤 shape、schema 驗證順序和 31 組手算 oracle。
- [x] 定義雙語 UI、desktop/mobile ASCII wireframe、SEO/FAQ、初始化及使用環境案例。
- [ ] 主代理審查這六份產品規格並明確放行 M1。
- [ ] 放行前不得實作產品、跑產品測試、開原功能 chat、發布或部署。

本 M0 可修改路徑僅為 README.md、PRODUCT.md、TECHNICAL.md、UX-SEO.md、ACCEPTANCE.md、TASKS.md。主代理維護共用檔案及交接狀態。

## M1 — 完整本機產品

開始條件：主代理明確放行 M0，原功能對話只收到這六份固定產品規格和主代理準備的共用契約；requested model 依根 AGENTS.md 為 gpt-6.1-sol/max，不能宣稱已驗證 runtime identity。

### T00 — 開始前安全與凍結規格

- 由原功能對話讀完六份規格及主代理補好的共用檔案，記錄允許路徑、Node 24+ 版本、唯一 evidence 目錄及持久環境 guard 前後狀態。
- M1 只在本機；預覽預設 port 4211，只綁 127.0.0.1。5211 是 M2 本機 production-like model 候選，不是網路服務或試算 API。
- 不安裝外部套件，不讀憑證／帳戶環境，不改 persistent PATH、registry 或 system settings。

### T01 — 純函式和精確 oracle

- 實作 calculatePrintSize(request)，逐項符合 TECHNICAL.md 的 exact schema、錯誤順序和 BigInt 分數。
- 將 C01–C31 轉成獨立 expected；覆蓋 2540 換算、half-up、ceil、顯示跨過目標門檻、範圍極值、raw 長度、格式、schema hostile cases。
- 失敗只回 code/field，無 raw echo、partial result 或突變。成功 JSON.stringify 不含 BigInt，required dimensions 是安全整數。
- 發現公式／案例差異時先回報並停止調整 oracle；不能改變輸入上下限或精確規則以消除差異。

### T02 — 雙語空白 UI 和主要任務

- 建立繁中 /index.html、英文 /en/index.html、原生響應式 UI、可見標籤、錯誤摘要和結果摘要；依 UX-SEO 文案，不上傳圖片。
- 像素欄位與寬度初始空白，目標 PPI 預設可編輯 300；不自動填範例或試算。符合無 JavaScript與初始化失敗時的停用狀態及 noscript 說明。
- 所有 listener 完成後才 enable；最早的 submit capture listener 第一個動作同步 preventDefault。計算按鈕就緒後可送出空白表單以驗證欄位。
- 兩語各實際完成 C01 對應主要流程，包含輸入、試算、結果閱讀及固定語言回首頁；錯誤或初始化失敗不得導覽或送出輸入。
- Gate：B01–B04、B11、B18。

### T03 — 編輯失效與資料生命週期

- 每次輸入遞增 revision 並同步清除舊結果。只有像素寬／高／列印寬非空、目標 raw 值不同於初始字串 300，或結果存在時才算有工作並要求清除／切語言確認；全空白、預設 300、無結果時直接重設或切頁。取消保留所有值與狀態。
- 語言切換確認後導向固定同源另一語言頁並清除全部值。pagehide 和 BFCache 恢復不復活舊資料。
- 本 MVP 不設 Clipboard、copy Promise、report 或 object URL；不得加入下載、分享或複製流程來擴大範圍。
- Gate：B05、B09–B10、B17、B19、B22。

### T04 — 隱私、安全、靜態預覽

- 依共用隱私與 release contract 實作檢查、build、loopback server、noindex/nofollow、headers、404 和安全資產政策；不加依賴、第三方資源或試算 endpoint。
- 動態文字用 textContent/value；表單不含 name，不輸入 URL/history/Storage，不輸出 console，不發應用網路請求。
- Gate：C25–C31、B02、B15–B16；保存靜態掃描和瀏覽器證據。

### T05 — 可及性、手機和極端值

- 在 320 CSS px、200% zoom、鍵盤和較長英文下實測；檢查錯誤聚焦、觸控目標、對比、reduced motion、結果大數字換行。
- 手機 decimal keyboard 缺少句點時檢查輔助按鈕和游標保留。真機無法使用則按環境能力標 NOT_RUN，不用模擬器冒充真機。
- Gate：B06–B08、B12–B14、B20–B21。實際紙張列印品質永久不屬此數學 MVP 的產品通過條件。

### T06 — M1 候選與主代理驗收

- 執行最後版本的 node --version、node --test、node scripts/check.mjs、node scripts/build.mjs；核對 M1 build 不含正式 canonical/sitemap，並在 loopback 4211 預覽兩語。
- C01–C31、B01–B22 全部逐項記錄 pass/fail/NOT_RUN、命令、exit code、真實環境和原因；規格案例不能代替瀏覽器實測。
- 程式只由原功能對話建立和修正；主代理獨立驗收並明確放行後才能 M2。不要因為單元測試通過就忽略雙語 UI 或隱私檢查。

## M2 — 主代理 GO 後由原對話完成 production 與公開來源

- 啟動條件：M1 候選和證據固定，主代理書面 GO。原功能對話按主代理指示完成 production builder/check/model 和正式 SEO/security 資產；M1 public 預覽檔和 dist 不可被 production builder 覆寫。
- 在主代理 reviewed publishing copy 只含此工具來源；遵循根 AGENTS.md、docs/GIT-PUBLICATION-SAFETY.md 及 Git settings guard，來源 repo 候選為 KYStr/glossquote-labs-print-size。公開 source 的 commit／visibility 和 live hosting 狀態分開記錄。
- 僅在全部 release check、乾淨副本重驗及 source artifact hash 核對通過後發布；若授權的既有 CLI capability 不可用，停止回報，不讀憑證、不改 git/gh 全域設定。
- M2 不執行 Cloudflare 部署、不更新首頁 catalog、不把 M1 preview 設為正式索引。

## M3 — 主代理正式部署與首頁整合

- 僅主代理在 M2 source/release gates 全部放行後執行。正式候選為 printsize.glossquote.com；由主代理確認候選網域和 free Cloudflare 設定，再執行已授權的發布流程。
- 主代理驗證兩語實際 HTTP body/headers、canonical/hreflang/robots/sitemap、CSP hash、404、核心計算與無上傳行為；外部真機及印刷品質若無能力驗證，逐項標 NOT_RUN。
- 只有 live tool release 通過後才更新 bilingual homepage catalog 為 published，重建及驗證首頁、發布首頁來源、部署並驗證兩語入口和對應語言回鏈。
- HANDOFF 分別記錄 public repo URL/commit、實際 hosting/domain、homepage 狀態和 NOT_RUN。工具交付為 awaiting external review；外部意見返回原功能對話修正，直到使用者或其 reviewer 確認後才可標該版本完成。

## 狀態記錄欄位

各 milestone 記錄狀態、固定候選、允許修改路徑、實際命令及 exit code、測試／瀏覽器證據、NOT_RUN 和原因、主代理放行、source publication 和 live hosting 分開狀態。任何公開或 live 結果均不得從規格或本機模型推斷。

