# 成績目標試算 — 既有規格保存

Task ID: `labs-28-grade-target` · Spec ID: `spec-28-grade-target`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：成績目標試算

狀態：**規格，尚未實作。** 本文件定義 MVP，不代表已驗證需求或學校官方規則。

## 問題、使用者與假設

使用者已知部分評分結果和每項評分所占百分比，想知道尚未評分項目合計需達到多少加權平均，才能達到自訂目標。初始使用者假設為一般課程百分制的學生；需求頻率、常見課程規則及使用裝置尚未經訪談驗證。

工具只計算輸入的數學關係，不判斷輸入規則是否符合學校規定。不能假設未來每項分數相同；不能把剩餘所需加權平均誤稱為各項最低分。

## MVP 需求

### FR-01 — 空白初始狀態

- 每種語言首次載入顯示空白表單、1 列空白評分項目、無結果；不自動載入範例或計算。
- 目標與權重預設空白；成績空白明確表示「尚未評分」，不預填 0。
- 「載入範例 / Load example」是明確的次要操作。按下後才填入範例，不自動產生結果。
- 提供「清除表單 / Clear form」明確操作；有草稿、結果、pending 動作或存活下載連結時先確認，確認後回到目前語言的空白初始狀態並清除這些狀態，取消則全部保留。
- 標示分數為 0–100 百分制、權重以百分比填寫且合計必須恰為 100%。

### FR-02 — 評分項目編輯

- 支援 1–40 列；每列有唯一 ID、名稱、權重和成績。UI 產生的 ID 不含使用者資料。
- 新增列只增加空白列；移除列只移除所選列；至少保留一列。第 40 列停用新增並說明上限。
- 名稱 trim 後為 1–80 個 Unicode code point；原始名稱最多 160 個 code point。拒絕控制字元和孤立 surrogate，不作 Unicode 正規化。
- 權重必填、每列大於 0%，全部權重精確合計為 100.00%。拒絕 0% 權重。
- 成績可空白；非空成績範圍 0–100。顯示文字區分「未評分」和「0.00 分」。

### FR-03 — 精確輸入限制

- 目標、權重與非空成績是 ASCII 十進位字串，每個原始數字字串最多 32 個 UTF-16 code unit。
- 接受文法：一個以上 ASCII 數字，可選句點及 1–2 位小數，例如 70、070、70.5、070.50。允許前導零。
- 拒絕前後空白、正負號、指數、逗號、全形數字／標點、尾端句點及超過兩位小數；不自動修剪、轉換或猜測。
- 目標及成績為 0–100；權重為 0.01–100。型別、長度、格式、範圍或權重合計錯誤時不產生部分結果。
- UI 使用文字欄位和 decimal input mode；需提供文字鍵盤或「插入小數點」輔助，使沒有句點鍵的手機鍵盤仍可輸入。IME 組字期間不自動提交或連續彈錯。

### FR-04 — 計算

- 唯一核心入口為 **calculateTarget(request)**；精確 schema、錯誤順序、結果型別與算式見 [TECHNICAL.md](TECHNICAL.md)。
- 成功結果提供已取得的總成績貢獻、剩餘權重、所需剩餘加權平均、最高可能總成績和狀態碼。
- 使用 BigInt 整數單位；顯示用兩位小數不得決定達標狀態。
- 所需平均向上取至 0.01 分；不可行時回報最高可能總成績與不可行狀態，不能把 100.00 當答案。
- 剩餘所需平均是尚未評分項目依權重合併後的平均，不是每項都必須取得的分數。若已知部分已達目標且尚有未評分項目，所需平均為 0.00；不代表所有項目已完成。
- 全部評分完成時，直接以未四捨五入的精確貢獻比較目標，顯示最終達標或未達標；不除以零。

### FR-05 — 結果與表單錯誤

- 錯誤顯示欄位位置、固定錯誤代碼對應的雙語短文案與修正方式；不顯示或記錄原始使用者字串，不回傳部分結果。
- 結果區區分「已取得的總成績貢獻」與「剩餘項目需達的加權平均」。
- 已取得貢獻採 0.01 分 half-up 顯示；達標比較只採精確分子。若顯示 70.00 而精確值低於目標 70.00，仍須顯示未達標並說明比較未四捨五入值。
- 不可行結果顯示「即使剩餘全部為 100，最高可到 X.XX」，不得顯示看似可行的 100.00 所需平均。

### FR-06 — 範例

- 固定假資料：目標 70；項目 A 權重 40、成績 80；項目 B 權重 60、成績空白。按下試算後，已取得貢獻 32.00、剩餘權重 60%、所需剩餘加權平均 63.34。
- 兩語皆標示「範例 / Example」，空白分數說明為未評分。只在使用者按下範例操作後放入表單，不代表實際學校資料。

### FR-07 — 草稿及語言切換

- 輸入、結果與暫存只存在目前頁面的記憶體。沒有 cookies、URL 參數、localStorage、sessionStorage、IndexedDB、Cache、Service Worker 或伺服器儲存。
- 每次編輯、新增／移除列或載入範例都立即遞增 revision、清除結果及複製成功提示，停用複製／下載直到重新計算。
- 語言切換先以雙語說明目前表單與結果將清除；確認後導向另一語言頁並回到空白狀態，取消則保留表單。不得自動保存。
- 明確清除與語言切換是不同操作。清除按下後如有草稿、結果、異步動作或存活下載 URL 必須詢問；取消保留所有狀態，確認後清掉草稿/結果/複製提示/異步 epoch 和全部 URL，仍停留目前語言並回空白初始狀態。若已空且沒有活動 URL，清除不必詢問。
- pagehide 清除輸入、結果、異步旗標和 object URL；從 BFCache 恢復時回到空白初始狀態。

### FR-08 — 複製與報告下載

- 只有使用者明確按下操作才呼叫瀏覽器剪貼簿 API 或建立下載；不讀取剪貼簿。
- 複製目前結果摘要。Clipboard API 不可用或拒絕時顯示失敗與可選取文字摘要，不宣稱成功。Promise 的 resolve、reject、finally 都依 revision、request ID、page generation 檢查，舊操作不得更新新畫面的狀態。
- **buildReport(result, language)** 產生固定 LF、UTF-8 無 BOM、無尾端 LF 的本機純文字摘要；固定下載檔名 **glossquote-grade-target.txt**。報告不含列名稱、raw 輸入或時間戳。
- 每個 object URL 有獨立 30 秒到期時間；最多 8 個仍有效 URL。新計算不得提早回收舊 URL；達上限時停用新下載並說明需等候到期。到期、使用者確認清除和 pagehide 才清理 URL；清除取消則保留它們。

### FR-09 — 失敗關閉及瀏覽器安全

- HTML 初始輸入 fieldset 和所有工作按鈕皆 disabled；所有輸入沒有 name。最早註冊的同步 submit capture listener 回呼第一個動作必須 preventDefault，再檢查初始化狀態。
- 初始化與全部事件 listener 完成後才啟用輸入及安全操作；計算按鈕此時可用，即使欄位空白或非法也可按下取得欄位錯誤。初始化錯誤時所有工作控制維持 disabled，顯示不含 raw exception 的固定訊息。表單使用 POST 且部署 CSP 設 form-action 'none'，不得在初始化失敗時 GET 導航或送出輸入。
- 所有動態文字使用 textContent 或表單 value；不得用 innerHTML、eval、Function 或字串建構程式。
- 產品程式不呼叫 fetch、XHR、WebSocket、EventSource、beacon、worker、service worker、模型或外部資源；不寫 console、analytics 或 crash report。靜態檔初次載入仍有必要的同源 HTTP 請求。

### FR-10 — 無障礙與密集輸入

- 每欄有可見標籤、用途說明、欄位錯誤關聯與一致鍵盤順序。狀態不只靠顏色。主要及觸控操作目標至少 44×44 CSS px。
- 桌面寬視窗使用易讀評分項目表；小螢幕將每列重排成具編號與標題的區塊，保留名稱、權重、分數及移除操作，不要求整頁橫向捲動。
- 320 CSS px、200% 縮放、40 列、較長英文標籤及手機虛擬鍵盤都不可遮住焦點欄位、錯誤或主要計算按鈕。

## API 結果語義摘要

狀態碼固定為 **target_feasible**、**target_already_met**、**target_unreachable**、**complete_met**、**complete_missed**。精確欄位及錯誤物件見 [TECHNICAL.md](TECHNICAL.md)。成功結果可 JSON.stringify；不得把 BigInt 暴露到 API。

## 明確排除

多種分數尺度、等第／GPA、類別巢狀權重、最低單項分數、學校官方規則匯入、雲端帳號、多人共享、AI 解讀規定、儲存或復原草稿皆不在 MVP。

雙語文案、首頁互連、SEO 和預覽索引規則見 [UX-SEO.md](UX-SEO.md)；資料安全契約見 [docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md)。


---

## 原文件 TECHNICAL.md

# 技術規格：成績目標試算

狀態：**規格，尚未實作。** 正式產品是原生靜態瀏覽器工具；Node.js 24+ 僅作本機開發、測試及建置，不加 runtime 或 dev 外部套件。

## 技術邊界與檔案樹

- JavaScript ESM、原生 HTML/CSS/Web APIs。允許引用同源靜態 ESM 模組；不提供使用者檔案／成績資料匯入功能。
- 試算不發出應用程式網路請求。首次載入 HTML/CSS/ESM 的靜態同源請求仍存在；不宣稱完全無網路或冷啟動離線。
- 不用瀏覽器 storage、cookie、URL 表單資料、Service Worker、遠端字型、CDN、外部套件或遙測。
- 開發伺服器只能綁 127.0.0.1；預設與 M1 預覽埠都是 4208。M2 production-like 本機 HTTP model 使用 5208；它不是產品 API，頁面不可呼叫它。

~~~text
package.json
scripts/{serve.mjs,check.mjs,build.mjs}
public/{index.html,en/index.html,styles/app.css,js/app.js}
public/js/core/{calculate-target.js,build-report.js}
test/{calculate-target.test.mjs,build-report.test.mjs,static-contract.test.mjs}
~~~

M2 production-like files（production build/check/serve、wrangler 設定、headers、robots、sitemap）依 [docs/RELEASE.md](docs/RELEASE.md) 加入；M1 preview build 不得覆蓋 production output。

## Request schema

核心唯一簽名：**calculateTarget(request)**。

根物件恰有兩個 own enumerable data properties：

~~~js
{
  targetRaw: "70.00",
  rows: [
    { id: "row-1", nameRaw: "期中考", weightRaw: "40", scoreRaw: "80" },
    { id: "row-2", nameRaw: "期末考", weightRaw: "60", scoreRaw: "" }
  ]
}
~~~

每列恰有 id、nameRaw、weightRaw、scoreRaw 四個 own enumerable data properties。拒絕未知欄位。Root 與 row 是原型恰為 Object.prototype 的普通物件；rows 是原型恰為 Array.prototype 的陣列。

Schema 守衛依序檢查 Reflect.ownKeys 和 property descriptors，不先讀值：

- 根及每列拒絕 symbol、未知鍵、非 enumerable own 鍵、getter、setter、非 data descriptor。
- 陣列拒絕稀疏 hole、額外自有鍵及非預期索引；每個索引是 enumerable data property，length 除外。
- 欄位值只能在 descriptor 驗證後讀取，避免呼叫 getter。反射期間若 Proxy trap 擲錯，回傳固定 schema error。JavaScript 沒有通用可靠方法辨識所有偽裝 Proxy；核心只接受內部建立的普通資料物件，Proxy 不屬安全邊界。
- 任一錯誤立即回傳單一錯誤，不繼續計算、不回傳 partial result、不 echo raw value。不得修改 request。

## 欄位規則與驗證順序

1. 根物件 schema。
2. targetRaw 型別、原始長度、文法及範圍。
3. rows 型別及 1–40 列界線。
4. 按列順序檢查列 schema、ID 與重複、名稱、權重、成績。
5. 檢查所有權重合計精確等於 10000 basis points。
6. 所有檢查通過後才計算。

錯誤欄位路徑是固定 schema path，不含任何使用者值。根結構、未知/symbol/non-enumerable 根鍵用 request；已知 root 欄位的 descriptor 錯誤（例如 targetRaw getter）用 request.targetRaw，rows descriptor 錯誤用 request.rows。列物件結構或未知/symbol/non-enumerable 列鍵用 rows.i；已知列欄位 descriptor 錯誤用 rows.i.id、rows.i.nameRaw、rows.i.weightRaw 或 rows.i.scoreRaw。欄位值格式/範圍錯誤使用 targetRaw 或上述 rows.i 固定欄位路徑；列數、陣列鍵/hole 錯誤用 rows。重複 ID 指向第二次出現的列。錯誤形狀一律是 { ok: false, error: { code, field } }，沒有 message、raw、partial result 或額外欄位。

`calculateTarget` 的 code/field 對應固定如下：根或列物件 schema、getter、symbol、extra/non-enumerable key、稀疏/非預期陣列鍵和反射 trap 例外是 invalid_schema，field 為最小可定位 schema path；rows 非陣列或不是 1–40 列是 invalid_rows_count/rows；target 型別錯誤或文法錯誤是 invalid_target_format/targetRaw，超過 32 UTF-16 code units 是 raw_too_long/targetRaw，0–100 以外是 target_out_of_range/targetRaw；ID 型別/文法是 invalid_id/rows.i.id，重複是 duplicate_id/rows.i.id；名稱型別、空白修剪後為空、原始超過 160 code points、修剪後超過 80 code points、Cc 控制字元或孤立 surrogate 都是 invalid_name/rows.i.nameRaw；權重型別或文法錯誤是 invalid_weight_format/rows.i.weightRaw，原始超長是 raw_too_long/rows.i.weightRaw，0.01–100 之外是 weight_out_of_range/rows.i.weightRaw；scoreRaw 非字串或非空的文法錯誤是 invalid_score_format/rows.i.scoreRaw，非空原始超長是 raw_too_long/rows.i.scoreRaw，0–100 之外是 score_out_of_range/rows.i.scoreRaw；權重總和不精確等於 10000 是 weight_total_mismatch/rows。每個欄位只回傳依上述順序遇到的第一個錯誤。

ID 是 ASCII 字元 1–40 個，文法為 **[A-Za-z0-9][A-Za-z0-9_-]{0,39}**，大小寫有別且全列唯一。ID 是本機列身分，不放入報告。

名稱：nameRaw 必須是字串，原始 Unicode code point 數最多 160；先拒絕 Cc 控制字元與孤立 UTF-16 high／low surrogate，再用 ECMAScript trim() 去除兩端空白。修剪後是 1–80 code points。內部字元保留，不作 NFC/NFD 正規化。動態渲染只用 textContent/value；核心結果和報告不含名稱。

數值：

- targetRaw、weightRaw、非空 scoreRaw 都是字串，長度 1–32 UTF-16 code units。
- 文法為 **^[0-9]+(?:\.[0-9]{1,2})?$**。允許 ASCII 前導零；句點後須有 1–2 位。拒絕空白、+、-、e/E、逗號、全形數字／標點、尾端句點和三位小數。不得 trim、locale 轉換或用 Number／浮點數解析。
- 解析成整數 hundredths：整數部乘 100，小數右補零至兩位。070.5 → 7050；0.01 → 1；0 → 0。
- 目標及非空成績範圍 0–10000 hundredths；權重範圍 1–10000 hundredths。權重 hundredths 亦是 basis points；合計必須 10000。
- scoreRaw 是空字串才代表未評分，不等於「0」。權重不可空白。

## 精確演算法

以下變數都用 BigInt；BigInt 不離開核心：

~~~text
targetHundredths = parseDecimal(targetRaw)
weightBp[i]      = parseDecimal(weightRaw[i])
scoreHundredths  = parseDecimal(scoreRaw[i]) for evaluated rows
remainingBp      = sum(weightBp[i] for scoreRaw[i] === "")
earnedNumerator  = sum(weightBp[i] * scoreHundredths[i] for evaluated rows)
targetNumerator  = targetHundredths * 10000
maximumNumerator = earnedNumerator + remainingBp * 10000
~~~

權重是 100 分制中的百分比。已取得的精確總成績貢獻為 earnedNumerator / 1000000。未評分項目所需平均：

~~~text
gap = max(0, targetNumerator - earnedNumerator)
requiredHundredths = ceil(gap / remainingBp) when remainingBp > 0
~~~

ceil 用整數式 (gap + remainingBp - 1) / remainingBp。若 gap > remainingBp * 10000，即使剩餘項目全為 100 也不可達標，狀態 target_unreachable，requiredAverageHundredths 為 null。若剛好相等則可行，需求是 100.00。

狀態分支：

1. remainingBp 為 0：精確比較 earnedNumerator >= targetNumerator，回傳 complete_met 或 complete_missed；不做除法。
2. 尚有空白項目且 earnedNumerator >= targetNumerator：target_already_met，所需平均 0。
3. 剩餘最高分仍不足目標：target_unreachable。
4. 其他情況：target_feasible，需求向上取至 0.01 分。

已評分權重即使分數為 0 仍算已評分；只有空字串列計入 remainingBp。

### 顯示規則

- 達標判斷只比較整數 numerator，永不比較已四捨五入的顯示值。
- earnedDisplay、maximumPossibleDisplay 以非負數 half-up 至 0.01：floor((numerator + 5000) / 10000) hundredths，再格式化為固定兩位小數。
- 所需平均向上取至 0.01；用整數 hundredths 格式化為兩位小數。
- 輸出用 ASCII 數字和句點，不依 locale 改寫。成功結果所有精確整數量用十進位字串。

## API 輸出

成功結果固定為 JSON 可序列化形狀：

~~~js
{
  ok: true,
  result: {
    schemaVersion: 1,
    status: "target_feasible",
    targetHundredths: "7000",
    earnedNumerator: "32000000",
    earnedDisplay: "32.00",
    remainingWeightBp: "6000",
    requiredAverageHundredths: "6334",
    maximumPossibleNumerator: "92000000",
    maximumPossibleDisplay: "92.00"
  }
}
~~~

整數 exact units 是十進位字串；requiredAverageHundredths 在不可達或全部評分完成時為 null。分母固定 1000000。結果不含 raw、列名稱或 BigInt。

失敗結果固定為 { ok: false, error: { code, field } }。calculateTarget code 僅限上表列出的集合。field 是固定欄位名稱或含列索引的欄位路徑，不放輸入值。沒有其他文字或 partial data。

JSON.stringify(validResult) 必須成功；parse 後仍保有字串欄位、狀態與數值。驗證 request 未被修改。

## 報告函式

**buildReport(result, language)** 接受恰為 zh-Hant 或 en，及以下精確 result schema，回傳固定 shape：

~~~js
{ ok: true, text: "...", filename: "glossquote-grade-target.txt", mimeType: "text/plain;charset=utf-8" }
{ ok: false, error: { code: "invalid_language" | "invalid_result", field: "language" | "result" } }
~~~

拒絕未知語言、未知／缺少 result 欄位、symbol、非 enumerable 欄位、getter/setter、非資料描述子及非普通物件；不得在檢查前呼叫 getter。result 僅含 schemaVersion、status、targetHundredths、earnedNumerator、earnedDisplay、remainingWeightBp、requiredAverageHundredths、maximumPossibleNumerator、maximumPossibleDisplay 九個自有 enumerable data properties；target/earned/remaining/required/maximum exact units 是 canonical ASCII 非負整數字串，僅 requiredAverageHundredths 在完成或不可達狀態為 null；schemaVersion 必須是數字 1。狀態只可為 target_feasible、target_already_met、target_unreachable、complete_met、complete_missed。

每個整數字串須不多於 9 個 ASCII 數字、不含前導零（零只能是字串 "0"），並落於其單位範圍：targetHundredths 0–10000、earnedNumerator 0–100000000、remainingWeightBp 0–10000、requiredAverageHundredths 0–10000、maximumPossibleNumerator 0–100000000。兩個 Display 必須精確符合核心 half-up 顯示公式。maximumPossibleNumerator 必須等於 earnedNumerator + remainingWeightBp × 10000。status 與 requiredAverageHundredths 必須符合精確分支：remaining 為 0 時 maximum=earned、required=null、狀態由 earnedNumerator 與 targetHundredths×10000 決定；remaining 大於 0 且 earned 已達目標時為 target_already_met 且 required 為 "0"；maximum 小於目標時為 target_unreachable 且 required 為 null；其餘為 target_feasible 且 required 等於 ceil((targetNumerator-earnedNumerator)/remainingWeightBp)。不一致時回傳 invalid_result/result。這些有界 schema 和派生一致性檢查使輸出不接收任何自由文字，也不依任意外部物件大小配置記憶體。

成功 text 上限為 1024 UTF-16 code units，只能含固定模板與合法的 ASCII 數字；不得含 CR、BOM 或最終 LF。filename、mimeType 必須固定如上。輸出成功、錯誤和 text 都可 JSON 序列化。不得把 BigInt、名稱、輸入 raw、時間戳或機器資訊放入報告。完整兩語範例和行格式見 [ACCEPTANCE.md](ACCEPTANCE.md)；狀態行字串固定為：

| 狀態 | zh-Hant 固定狀態行 | en 固定狀態行 |
|---|---|---|
| target_feasible | 狀態：仍可達成 | Status: Target is reachable |
| target_already_met | 狀態：已達成目標；仍有項目尚未評分 | Status: Target already met; some components are still ungraded |
| target_unreachable | 狀態：目標無法達到 | Status: Target is not reachable |
| complete_met | 狀態：全部項目已評分，已達成目標 | Status: All components are graded; target met |
| complete_missed | 狀態：全部項目已評分，未達成目標 | Status: All components are graded; target not met |

剩餘平均行在 target_unreachable 時固定替換成「剩餘項目需達的加權平均：目標無法達到」與「Weighted average needed across remaining components: Target is not reachable」，並保留「最高可能總成績：{maximumPossibleDisplay} / 100」／「Maximum possible final grade: {maximumPossibleDisplay} / 100」行；其餘有剩餘項目狀態使用已驗證的 two-decimal required average。remaining 為 0 時移除剩餘平均行、顯示剩餘權重 0.00%，並加入「全部項目已評分；最終總成績：{earnedDisplay} / 100」／「All components are graded; final grade: {earnedDisplay} / 100」行。target_already_met 仍需顯示剩餘平均 0.00，不可誤示全部完成。所有狀態均保留報告範例中的固定空白/0 分提醒、加權平均非個別最低分說明和非官方規則聲明；每種狀態的中英完整快照是 M1 gate，案例見 [ACCEPTANCE.md](ACCEPTANCE.md)。

- 固定檔名 glossquote-grade-target.txt。
- 行分隔符一律 LF；不含 BOM，檔尾沒有 LF。用 TextEncoder 編成 UTF-8，再建立 text/plain;charset=utf-8 Blob。
- 內容只列目標、已取得的總成績貢獻、剩餘權重、所需剩餘加權平均／最高可能總成績、狀態和非官方規則說明。不含名稱、raw、時間戳或機器資訊。
- 兩語標題和說明不同；數字固定兩位 ASCII 小數。

## UI 狀態、競態與清理

至少有 initializing、ready/blank、invalid、calculated、copy-pending、copy-failed、download-capacity-reached、initialization-failed 狀態。

- HTML 載入時輸入 fieldset 與所有工作按鈕都 disabled，所有輸入沒有 name。最早註冊的 form submit capture listener 必須在其同步回呼第一個動作呼叫 event.preventDefault()，再檢查 ready；其餘事件 listener 也必須全部註冊完畢才允許解除 disabled。
- 初始化成功且全部事件 listener 掛妥後才啟用 fieldset 和工作按鈕，包括試算按鈕；即使表單空白或非法也可提交並取得欄位錯誤。初始化失敗時所有工作控制保持 disabled 並顯示固定雙語錯誤。表單 method 為 POST，伺服器 CSP 設 form-action 'none'，不得造成 GET 或帶資料的導覽。
- 每次欄位編輯、新增／刪除、載入範例、確認語言切換或 pagehide，revision／page generation 遞增並清除結果、報告、舊錯誤摘要及複製／下載按鈕。
- 明確「清除表單 / Clear form」遇非空草稿、結果、異步作業或有效 object URL 時先確認。取消完整保留當前草稿、結果、提示與 URL；確認則加代數、清草稿/結果/錯誤/異步狀態、revoke 所有存活 URL 並回本語言空白初始狀態。內容已空且無活動結果/URL 時清除是無副作用的空白重設，不需確認。
- Clipboard Promise 的 resolve、reject、finally 同時比對 revision、request ID、page generation；舊操作不得重寫新狀態。已交給瀏覽器的 OS clipboard write 未必可取消；不得聲稱取消成功，只忽略舊 UI 回報。
- 每個 URL.createObjectURL 各有自己的 30 秒 deadline/timer。最多保留 8 個未到期 URL；普通欄位編輯和重新計算不提早撤銷已建立 URL。第 9 次建立回報容量已滿，不提早 revoke 舊 URL。各自到期、確認清除及 pagehide 才清理。
- pagehide 清草稿、結果、異步狀態和 URL。pageshow.persisted 為 true 從 BFCache 恢復時清回空白並提高 generation，防止凍結頁面的 Promise 回報到目前 UI。
- 無外部呼叫可取消。數學計算是有界同步工作，最多 40 列。

## 隱私、安全與 UI 實作約束

- 所有輸入是不可信文字。只用 textContent/value；禁止 innerHTML、eval、Function、外部 script、資料匯入、log 原始值或錯誤回報服務。
- Schema guard 不依賴 UI 已驗證；錯誤回傳固定代碼和欄位位置。
- 不把輸入放入 form name、URL、history state、報告、console、storage 或網路 payload。複製及下載只由當下明確手勢觸發。
- CSP、headers、本機／正式環境差異與完整 Network/Storage 驗收依 [docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md) 及 [docs/RELEASE.md](docs/RELEASE.md)。

## 官方參考

- [Node.js v24 Test Runner](https://nodejs.org/download/release/v24.15.0/docs/api/test.html)：離線測試基線。
- [MDN Clipboard.writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) 與 [Clipboard API security considerations](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API#security_considerations)：安全情境、Promise、使用者互動和拒絕情形。
- [MDN URL.revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static) 與 [Using object URLs](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications)：object URL 明確回收。
- [MDN pageshow event](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event)：BFCache 恢復狀態檢查。

## 技術非目標

不允許引入 React、建置 bundler、雲端 API、儲存層、資料匯入、瀏覽器 polyfill、數學套件或未審核外部參考。M1 使用手寫 ESM、Node built-ins 與假資料。


---

## 原文件 UX-SEO.md

# 使用者介面與 SEO 規格：成績目標試算

狀態：**規格，尚未實作。** Surface mode：Product App。頁面服務「已有部分成績，想知道剩下項目需達多少加權平均」，以表單和可核對結果為主，不做通用 SaaS hero。

## 使用者流程與資訊順序

1. 輸入 0–100 目標分數。
2. 為每項輸入名稱及百分比權重；已評分者填 0–100 分，尚未評分者留白。持續顯示權重合計及格式規則。
3. 按「試算 / Calculate」。無效欄位顯示可修復錯誤，不產生部分結果。
4. 結果先顯示「已取得的總成績貢獻」，再顯示「剩餘項目需達的加權平均」或「即使剩餘全為 100 的最高可能總成績」。
5. 可複製目前結果或下載報告；任何表單變更都立即清除結果。範例需明確按下才載入。

不得只用「你還需要 X 分」作主標，避免將總成績貢獻與剩餘平均混淆。清楚說明結果取決於輸入，且不是校規或每一項最低分。

## 版面草圖

### 桌面主要工作區

~~~text
┌──────────────────────────────────────────────────────────────────┐
│ Gloss Tools / 成績目標試算        語言切換   返回繁中首頁          │
├──────────────────────────────────────────────────────────────────┤
│ 成績目標試算                                                     │
│ 用已知權重和成績，估算尚未評分項目合計需達到的加權平均。         │
│ 非官方校規計算；本頁不保存輸入。                                 │
│ 目標分數 [        ] / 100       權重合計 [ 0.00 / 100.00% ]       │
│ 評分項目表                                                       │
│ 名稱                  權重 (%)          成績 (%)       操作       │
│ [______________]      [______]          [______]       移除       │
│                  未評分請留白；填 0 表示已評分且得 0 分。         │
│ [+ 新增項目] [載入範例] [清除表單]                [試算]           │
│ 結果                                                             │
│ 已取得的總成績貢獻：32.00 / 100                                  │
│ 剩餘項目需達的加權平均：63.34 / 100                              │
│ 這是剩餘項目依權重合併後的平均，不是每一項都需達 63.34。         │
│ [複製結果] [下載報告]                                             │
└──────────────────────────────────────────────────────────────────┘
~~~

### 手機（320 CSS px 起）

~~~text
┌──────────────────────────┐
│ 成績目標試算   語言       │
│ 返回繁中首頁              │
│ 已有部分成績，試算剩餘... │
│ 目標分數                  │
│ [____________] / 100      │
│ 權重合計 0.00 / 100.00%   │
│ 評分項目 1                │
│ 名稱 [____________]       │
│ 權重 (%) [____________]   │
│ 成績 (%) [____________]   │
│ 未評分留白；0 是已得零分。│
│ [+ 新增] [移除此項目]     │
│ [載入範例] [清除表單]       │
│ [試算]                    │
│ 結果 / 欄位錯誤           │
│ [複製] [下載報告]         │
└──────────────────────────┘
~~~

手機不保留四欄橫向表格。各列標題和欄位標籤始終可見；新增／移除、格式說明和結果皆可用鍵盤與讀屏操作。40 列使用一般頁面縱向捲動，不做整頁橫向捲動。

## 控制項及狀態

- Header 只放工具名稱、繁中／English 切換和當前語言首頁連結；不放 slogan、會員入口或多餘導覽。
- 目標與各列欄位用 type=text、可見標籤及 inputmode=decimal。小數規則在欄位旁顯示；提供「插入小數點 / Insert decimal point」按鈕，以文字插入並保留游標位置。逗號不自動轉句點。
- 成績欄說明固定表示：空白是尚未評分；0 是已評分且得 0 分。IME composition 中不即時報錯；按計算後驗證。
- 權重合計以不中斷輸入的狀態訊息顯示，初始 0.00 / 100.00%。只有恰為 100.00 且其他欄位有效才能成功計算；使用者仍可在欄位空白或不合法時按試算，以取得欄位錯誤。
- 初始輸入 fieldset 和所有工作按鈕均 disabled；全部事件 listener 掛妥且初始化成功後才啟用輸入及安全操作，試算按鈕此時可用並在按下時驗證。初始化失敗時所有工作控制維持 disabled。成功、不可達、先已達標、完成達標及完成未達標都以文字和圖示／語意色呈現。
- 範例只更新表單不自動試算；中英文均清楚標註假資料。
- 任何數字、名稱或列編輯都清除舊結果及複製成功提示。重新計算才重新啟用複製／下載。
- 「清除表單 / Clear form」有資料、結果、pending 動作或有效下載連結時先要求確認；取消時表單/結果/提示/連結維持不變，確認時清除全部並回到目前語言空白表單。內容已空時可直接回到空白狀態。
- 複製拒絕時提供可選取文字結果。下載最多 8 個各自 30 秒有效連結；容量滿時不撤銷已有連結。
- 語言切換先開確認對話框，說明確認會清除目前全部項目與結果。取消保留語言和輸入；確認後導向另一固定同源語言 URL，顯示空白表單。
- 初始化失敗時按鈕維持 disabled，使用固定短文案，不顯示原始錯誤或表單內容。

## 雙語 SEO 與可見文案

### 繁體中文

- Title：**成績目標試算｜Gloss Tools by GlossQuote**
- Description：**輸入已評分項目、百分比權重與目標，試算尚未評分項目合計需達到的加權平均。成績規則以學校官方說明為準。**
- H1：**成績目標試算**
- 說明：**已拿到部分成績，想知道剩下的項目平均至少要多少？輸入各項權重與已評分成績，查看已取得的總成績貢獻，以及剩餘項目所需的加權平均。**
- 提示：**權重必須合計為 100%。成績空白代表尚未評分；輸入 0 代表已評分且得 0 分。此工具只按你輸入的資料試算，不代表學校官方算分規則。**
- 主要操作：**試算**
- 次要操作：**新增項目**、**載入範例**、**清除表單**、**複製結果**、**下載報告**
- 未評分：**尚未評分（留白）**
- 已知貢獻：**已取得的總成績貢獻**
- 需要分數：**剩餘項目需達的加權平均**
- 不可行：**目標目前無法達到**；**即使所有剩餘項目都是 100，最高總成績也只有 {value}。**
- 精度註記：**目標比較使用未四捨五入的精確值；畫面上的已取得貢獻四捨五入至小數兩位。**
- 剩餘平均註記：**這是剩餘項目依權重合併後所需的平均，不表示每一項都要達到這個分數。**
- 語言切換確認：**切換語言會清除目前表單和結果。要繼續嗎？** 按鈕：**清除並切換**、**留在此頁**
- 清除確認：**清除會移除目前表單、結果和下載連結。要清除嗎？** 按鈕：**清除表單**、**取消**
- 資料說明：**輸入只在目前頁面處理；本版不保存。第一次載入仍需下載網站檔案。**

### English

- Title: **Grade Target Calculator | Gloss Tools by GlossQuote**
- Description: **Enter graded components, percentage weights and a target to estimate the weighted average needed across ungraded components. Check your school's official grading rules.**
- H1: **Grade Target Calculator**
- Intro: **Already have some grades? Enter each component's weight and any score you have. See your earned contribution to the final grade and the weighted average needed across the remaining components.**
- Notice: **Weights must total exactly 100%. Leave a score blank if it is not graded yet; enter 0 for a graded score of zero. This calculator follows your inputs and may not match your school's official grading rules.**
- Primary action: **Calculate**
- Secondary actions: **Add component**, **Load example**, **Clear form**, **Copy result**, **Download report**
- Ungraded: **Not graded (leave blank)**
- Earned contribution: **Earned contribution to final grade**
- Required score: **Weighted average needed across remaining components**
- Unreachable: **This target is not currently reachable**; **Even with 100 on every remaining component, the maximum final grade is {value}.**
- Precision note: **Target status uses the exact, unrounded value. The earned contribution shown here is rounded to two decimal places.**
- Remaining-average note: **This is the weighted average across all ungraded components, not a minimum score for each component.**
- Language confirmation: **Changing language clears the current form and result. Continue?** Buttons: **Clear and switch**, **Stay here**
- Clear confirmation: **Clearing removes the current form, result and download links. Clear them now?** Buttons: **Clear form**, **Cancel**
- Data note: **Your inputs are processed in this page and are not saved. The first page load still downloads the website files.**

### 雙語範例數值

Target / 目標 70.00；Component A / 項目 A：weight 40.00、graded score 80.00；Component B / 項目 B：weight 60.00、score blank / 留白（未評分）。按下 Calculate / 試算後，earned contribution / 已取得貢獻為 32.00，remaining weight / 剩餘權重為 60.00%，required weighted average / 所需剩餘加權平均向上取至 63.34。

## FAQ（頁面和 JSON-LD 必須一致）

以下問答需在兩語可見 FAQ 出現。JSON-LD 只能從可見內容產生，不可增加聲稱。

### 繁體中文

1. **剩下的項目平均要多少才會達到目標？** 工具先算已評分項目的加權貢獻，再用尚未評分的權重求出所需加權平均，向上取至 0.01 分。只適用於你輸入的分數與權重。
2. **成績空白和輸入 0 有什麼不同？** 空白表示尚未評分，不會當成 0 分；輸入 0 表示已評分且得 0 分。
3. **所需平均是否代表每個剩餘項目都必須達到這個分數？** 不是。這是依剩餘權重合併後的平均，不代表個別項目的最低分；實際結果仍取決於權重與分數。
4. **如果工具說目標不可達，代表什麼？** 即使所有空白項目都得到 100，依目前權重和已知分數算出的最高總成績仍低於目標。請核對輸入與學校官方規則。
5. **工具會替我套用學校的計分規則嗎？** 不會。工具不連接校務系統，也不知道曲線、類別權重、補考或其他校規；請以學校公布的規則為準。

### English

1. **What average do I need on the remaining components?** The calculator totals the weighted contribution from graded components, then calculates the weighted average needed across the ungraded weights. It rounds that required average up to 0.01. The result only reflects your inputs.
2. **Is a blank score the same as zero?** No. A blank score means the component has not been graded. Enter 0 when it has been graded and the score is zero.
3. **Does the required average mean every remaining component must reach that score?** No. It is the weighted average across all remaining components, not a minimum for each one. Actual results still depend on component weights and scores.
4. **What does an unreachable target mean?** Even if every ungraded component receives 100, the maximum final grade calculated from your current weights and scores is below the target. Check your inputs and your school's official rules.
5. **Does this calculator know my school's grading rules?** No. It does not connect to school systems or know about curves, category weights, retakes or other rules. Check the rules published by your school.

## SEO 與正式網址規則

- 正式候選 origin：[https://grades.glossquote.com](https://grades.glossquote.com)；只有 M2/M3 domain、HTTP 和實際內容確認後才能稱為正式網址。文件不代表 DNS、發布或 Cloudflare 部署已驗證。
- 預覽為 http://127.0.0.1:4208/；預覽及 M1 build 必須有 noindex,nofollow，不輸出正式 canonical 或 sitemap。
- 正式繁中頁為 [https://grades.glossquote.com/index.html](https://grades.glossquote.com/index.html)，英文頁為 [https://grades.glossquote.com/en/index.html](https://grades.glossquote.com/en/index.html)。依 [docs/RELEASE.md](docs/RELEASE.md) 發布後才輸出 self-canonical、雙向 hreflang zh-Hant／en 及指向繁中 canonical 的 x-default。Sitemap 只列兩個 canonical；404 不顯示試算成功頁。
- 返回雙語首頁依 [docs/BRAND.md](docs/BRAND.md)：繁中 [https://glossquote.com/index.html](https://glossquote.com/index.html)，英文 [https://glossquote.com/en/index.html](https://glossquote.com/en/index.html)。正式驗收確認路徑和頁面語言相符。
- M2 可加入 WebApplication 及符合可見問答的 FAQPage JSON-LD；不加 rating、review、未驗證價格、瀏覽器支援或搜尋排名。preview noindex，正式 canonical 僅在確認後出現。
- robots.txt 不能封鎖必要 CSS/JS；檢查 sitemap URL 的實際索引 headers/meta，包含繼承的 X-Robots-Tag。這是 release gate，不以搜尋排名或流量作成功指標。

## 品牌與無障礙

使用 [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) 的 family tokens 與 Product App 行為。以標籤、細分隔線和文字提示呈現權重與成績關係；評分表是主要工作畫布。不要將每列做成巢狀卡片，不放假圖表或預填成績。

驗收目標為 WCAG 2.2 AA：完整鍵盤流程、焦點不被 sticky 元件遮住、欄位錯誤關聯、一般文字對比至少 4.5:1、觸控目標約 44×44 px、狀態不只靠顏色、200% 縮放、320 CSS px 重排、虛擬鍵盤安全區、prefers-reduced-motion。版面容納比繁中長至少 40% 的英文標籤。

## 明確不宣稱

不宣稱採用特定學校規則、適用所有科目、保證取得目標、100% 安全、永久免費、永遠離線、支援所有瀏覽器、搜尋排名、流量或使用者數。


---

## 原文件 ACCEPTANCE.md

# 驗收案例：成績目標試算

狀態：規格案例，尚未執行。每項預期值都是獨立手算的固定 oracle；不可由被測函式產生 expected。M0 只建立文件，不代表任何案例已通過。主要規則見 [PRODUCT.md](PRODUCT.md)、[TECHNICAL.md](TECHNICAL.md)、[UX-SEO.md](UX-SEO.md)；工程和證據命令見 [docs/ENGINEERING.md](docs/ENGINEERING.md)，安全限制見 [docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md)。

## 核心固定案例

除另有說明，每個列按出現順序使用 id r1、r2…、nameRaw「項目 1」…；target、weight、score 欄皆為原始字串。空白成績以 scoreRaw 為空字串表示。成功預期須比對 status、exact unit 字串、顯示字串、requiredAverageHundredths（不適用時為 null）；錯誤預期須比對固定 code/field 且確認沒有 result 或 raw echo。

| ID | 精確輸入 | 預期 |
|---|---|---|
| C01 | target 70；40/80、60/空白 | target_feasible；earnedNumerator=32000000、earnedDisplay=32.00、remainingWeightBp=6000、requiredAverageHundredths=6334、maximumPossibleNumerator=92000000、maximumPossibleDisplay=92.00。 |
| C02 | target 60；50/80、50/0 | complete_missed；earnedNumerator=40000000、earnedDisplay=40.00、remainingWeightBp=0、requiredAverageHundredths=null。0 是已評分，不是空白。 |
| C03 | target 30；40/100、60/空白 | target_already_met；earnedDisplay=40.00、requiredAverageHundredths=0、remainingWeightBp=6000；剩餘列仍未評分，不能報成全部完成。 |
| C04 | target 60；90/50、10/空白 | target_unreachable；maximumPossibleNumerator=55000000、maximumPossibleDisplay=55.00、requiredAverageHundredths=null。不可輸出 100.00 當所需平均。 |
| C05 | target 70；20/空白、80/空白 | target_feasible；earnedDisplay=0.00、remainingWeightBp=10000、requiredAverageHundredths=7000、maximumPossibleDisplay=100.00。 |
| C06 | target 70；50/60、50/80 | complete_met；earnedNumerator=70000000、earnedDisplay=70.00、remainingWeightBp=0、requiredAverageHundredths=null。 |
| C07 | target 70；50/69.99、50/70 | complete_missed；earnedNumerator=69995000、earnedDisplay=70.00、targetNumerator=70000000。未四捨五入值低於目標，狀態不得以顯示值比較。 |
| C08 | target 100；0.01/100、99.99/空白 | target_feasible；remainingWeightBp=9999、requiredAverageHundredths=10000、maximumPossibleDisplay=100.00。驗證最小正權重和恰好可達邊界。 |
| C09 | target 50.01；99.99/50、0.01/空白 | target_unreachable；maximumPossibleNumerator=50005000、maximumPossibleDisplay=50.01、requiredAverageHundredths=null。最高值顯示與目標同為 50.01，仍因精確最高值 50.005 低於 50.01 而不可達。 |
| C10 | target 60；30/50、70/空白 | target_feasible；earnedDisplay=15.00、requiredAverageHundredths=6429（64.29，向上取至百分之一）、maximumPossibleDisplay=85.00。 |
| C11 | target 70.50；40/80.0、60/空白 | target_feasible；earnedDisplay=32.00、requiredAverageHundredths=6417（64.17）；target 解析為 7050 hundredths。 |
| C12 | target 070.5；040.00/080.0、060/空白 | 與 C11 同一數值結果：targetHundredths=7050、requiredAverageHundredths=6417；證明接受 ASCII 前導零及 1 位小數，不以 Number／locale 解析。 |
| C13 | target 70；40/80、59.99/空白 | weight_total_mismatch，field=rows；不得回傳計算結果。 |
| C14 | target 70.123；100/空白 | invalid_target_format，field=targetRaw。 |
| C15 | target 7e1；100/空白 | invalid_target_format，field=targetRaw。 |
| C16 | target「 70」；100/空白 | invalid_target_format，field=targetRaw；不可 trim 數字欄。 |
| C17 | target「７０」；100/空白 | invalid_target_format，field=targetRaw；全形字元拒絕。 |
| C18 | target 70；0/空白、100/空白 | weight_out_of_range，field=rows.0.weightRaw；0 權重不能以合計正確而通過。 |
| C19 | target 70；40/80、60/「0」 | 與 C01 結構不同：remainingWeightBp=0，第二列是已評分 0；確定 0 不納入剩餘權重。 |
| C20 | target 70；100/空白，但 root 多一個 own 欄位 debug | invalid_schema，field=request；沒有 partial result，也不 echo debug 值。 |
| C21 | root targetRaw 為 enumerable getter、rows 為一般陣列；getter 內計數 | invalid_schema，field=request.targetRaw；getter 呼叫次數必須是 0。 |
| C22 | rows 是長度 1、索引 0 為 hole 的陣列 | invalid_schema，field=rows；不得把 hole 當未評分列。 |
| C23 | 根物件或列含 symbol own key，或非 enumerable 多餘 key | invalid_schema；符號和非 enumerable 欄位不可忽略。 |
| C24 | 兩列皆使用 id r1，其他欄合法且權重合計 100 | duplicate_id，field=rows.1.id；第一個問題即固定錯誤，不計算。 |
| C25 | target 是 33 個 ASCII 零字元；其餘合法 | raw_too_long，field=targetRaw；原始字串長度上限 32。 |
| C25a | targetRaw 是 31 個 ASCII 零字元後接 1，總長 32；單列 weight 100、score 空白 | 有效；targetHundredths=100、remainingWeightBp=10000、requiredAverageHundredths=100。這是合法字串長度的上界案例，不與前導零一般解析案例 C12 混用。 |
| C26 | 名稱為 81 個 ASCII x；其餘合法 | invalid_name，field=rows.0.nameRaw。 |
| C27 | 名稱 trim 後全為空格；其餘合法 | invalid_name，field=rows.0.nameRaw。 |
| C28 | 41 列，每列結構合法 | invalid_rows_count，field=rows；不進入逐列計算。 |
| C29 | scoreRaw 為 100.001 | invalid_score_format，field=rows.0.scoreRaw。 |
| C30 | scoreRaw 為 100.01 | score_out_of_range，field=rows.0.scoreRaw。 |
| C31 | 單列 weightRaw 為 100000000000000000000000000000000（33 字元） | raw_too_long，field=rows.0.weightRaw；不先轉數值或截斷。 |
| C32 | buildReport 取 C01 成功 result 與 zh-Hant，再與 en 各呼叫一次 | 兩次均為固定 filename、MIME；文字完全符合下方範例、兩語標題不同，UTF-8 無 BOM、只有 LF、無尾端 LF，且不含「項目 1」、raw 名稱或時間戳；連續呼叫同輸入完全相同。 |
| C33 | buildReport 的 language 為 fr | 固定 error code=invalid_language、field=language；不得把未知語言拼入輸出。 |
| C34 | 對 calculateTarget 成功結果 JSON.stringify 後 parse；比較輸入前後 | JSON 序列化成功；exact unit 欄位仍是十進位字串，不存在 BigInt；request 深層值未改變。 |

### 固定報告全文

本案例輸入為 C01。報告狀態碼為 target_feasible；正文使用以下固定順序、固定標籤及行數。預留欄位僅插入已驗證的 ASCII 兩位小數或固定狀態文案；不插入列名稱或原始輸入。下列每行之間是一個 LF，最後一行之後沒有 LF。

繁體中文全文：

    成績目標試算
    目標：70.00 / 100
    已取得的總成績貢獻：32.00 / 100
    剩餘權重：60.00%
    剩餘項目需達的加權平均：63.34 / 100
    狀態：仍可達成
    空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。
    所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。
    本工具依你的輸入試算，不代表學校官方計分規則。

English full text:

    Grade Target Calculator
    Target: 70.00 / 100
    Earned contribution to final grade: 32.00 / 100
    Remaining weight: 60.00%
    Weighted average needed across remaining components: 63.34 / 100
    Status: Target is reachable
    A blank score means not graded; 0 means graded with a score of zero.
    This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.
    This calculator follows your inputs and does not represent your school's official grading rules.

下列四組完整輸出為另外四個狀態的快照；每行之間一個 LF，檔案末端無 LF。輸出使用 [TECHNICAL.md](TECHNICAL.md) 的固定檔名、MIME 和模板，不含列名稱。

### C35 — target_already_met

輸入：target 30；40/100、60/空白。

繁中：

    成績目標試算
    目標：30.00 / 100
    已取得的總成績貢獻：40.00 / 100
    剩餘權重：60.00%
    剩餘項目需達的加權平均：0.00 / 100
    狀態：已達成目標；仍有項目尚未評分
    空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。
    所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。
    本工具依你的輸入試算，不代表學校官方計分規則。

English:

    Grade Target Calculator
    Target: 30.00 / 100
    Earned contribution to final grade: 40.00 / 100
    Remaining weight: 60.00%
    Weighted average needed across remaining components: 0.00 / 100
    Status: Target already met; some components are still ungraded
    A blank score means not graded; 0 means graded with a score of zero.
    This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.
    This calculator follows your inputs and does not represent your school's official grading rules.

### C36 — target_unreachable

輸入：target 60；90/50、10/空白。

繁中：

    成績目標試算
    目標：60.00 / 100
    已取得的總成績貢獻：45.00 / 100
    剩餘權重：10.00%
    最高可能總成績：55.00 / 100
    剩餘項目需達的加權平均：目標無法達到
    狀態：目標無法達到
    空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。
    所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。
    本工具依你的輸入試算，不代表學校官方計分規則。

English:

    Grade Target Calculator
    Target: 60.00 / 100
    Earned contribution to final grade: 45.00 / 100
    Remaining weight: 10.00%
    Maximum possible final grade: 55.00 / 100
    Weighted average needed across remaining components: Target is not reachable
    Status: Target is not reachable
    A blank score means not graded; 0 means graded with a score of zero.
    This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.
    This calculator follows your inputs and does not represent your school's official grading rules.

### C37 — complete_met

輸入：target 70；50/60、50/80。

繁中：

    成績目標試算
    目標：70.00 / 100
    已取得的總成績貢獻：70.00 / 100
    剩餘權重：0.00%
    全部項目已評分；最終總成績：70.00 / 100
    狀態：全部項目已評分，已達成目標
    空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。
    所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。
    本工具依你的輸入試算，不代表學校官方計分規則。

English:

    Grade Target Calculator
    Target: 70.00 / 100
    Earned contribution to final grade: 70.00 / 100
    Remaining weight: 0.00%
    All components are graded; final grade: 70.00 / 100
    Status: All components are graded; target met
    A blank score means not graded; 0 means graded with a score of zero.
    This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.
    This calculator follows your inputs and does not represent your school's official grading rules.

### C38 — complete_missed

輸入：target 60；50/80、50/0。

繁中：

    成績目標試算
    目標：60.00 / 100
    已取得的總成績貢獻：40.00 / 100
    剩餘權重：0.00%
    全部項目已評分；最終總成績：40.00 / 100
    狀態：全部項目已評分，未達成目標
    空白成績代表尚未評分；輸入 0 代表已評分且得 0 分。
    所需值是剩餘項目依權重合併後的平均，不是每項最低分，也不保證取得目標。
    本工具依你的輸入試算，不代表學校官方計分規則。

English:

    Grade Target Calculator
    Target: 60.00 / 100
    Earned contribution to final grade: 40.00 / 100
    Remaining weight: 0.00%
    All components are graded; final grade: 40.00 / 100
    Status: All components are graded; target not met
    A blank score means not graded; 0 means graded with a score of zero.
    This is the weighted average across ungraded components, not a minimum for each one, and it does not guarantee the target.
    This calculator follows your inputs and does not represent your school's official grading rules.

## 瀏覽器與使用環境案例

在 M1 loopback 預覽 127.0.0.1:4208 逐語言執行；至少在一般桌面瀏覽器與自動化瀏覽器可用環境完成雙語主要路徑。實際手機、原生鍵盤、完整 Network/Storage、Clipboard 權限等若無能力必須分開標 NOT_RUN，不能用 mock 冒充已驗。詳見 [docs/ENGINEERING.md](docs/ENGINEERING.md)、[docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md)。

| ID | 可重現操作 | 預期 |
|---|---|---|
| B01 | 新工作階段打開繁中首頁，尚未載入範例 | 表單空白、一列、無結果；整個輸入 fieldset 與所有工作按鈕初始 disabled，且所有 input 均無 name；初始化和所有事件掛妥後才解除 disabled。 |
| B02 | 初始化完成後直接按主要操作 | 顯示可修復的必填錯誤；頁面不導覽、不發 GET；不顯示 partial result。 |
| B03 | 明確按「載入範例」，再按「試算」 | 範例只填表、不自動計算；計算後為 earned 32.00、剩餘權重 60.00%、所需平均 63.34。 |
| B04 | target=70；row1 weight=40, score=80；row2 weight=60, score 先留白再輸入 0 | 留白版本 remaining=60.00%；輸入 0 後結果立即清除，重新計算變成全部已評分且 final=32.00，顯示零分與未達標。 |
| B05 | 成功計算後只改目標、名稱、權重、分數任一欄 | 同一事件循環內清除結果、錯誤摘要、複製成功狀態，並停用複製／下載，直至再計算。 |
| B06 | 成功計算後新增一列，再移除該列 | 每次操作立即使舊結果失效；不可還原先前結果或報告。最後一列不能移除；新增第 40 列後新增操作 disabled。 |
| B07 | target=70；兩列 score 留白；weight 依序輸入 40、59.99 後試算 | 定位 rows 權重合計錯誤，無結果；修正第二列至 60.00 並再試算成功。 |
| B08 | 手動輸入負號、逗號、全形句點、三位小數；再以 IME 組字輸入 | 不轉換或猜測格式；組字期間不連續報錯，完成後由試算驗證並以固定錯誤定位。 |
| B09 | 以可取消測試對話框開啟語言切換後取消 | 仍在原語言，輸入、結果及 URL 集合不變。 |
| B10 | 以可確認測試對話框確認語言切換 | 切到對應固定同源頁；表單、結果、複製／下載提示、pending async 狀態及所有已建 URL 清空；新頁呈現空白初始態。 |
| B11 | 在繁中及英文各執行一次 C01 完整主流程 | 標籤、錯誤、結果和報告語言一致；返回首頁連結分別是共用契約指定的繁中／英文 URL；無內容仍停留另一語言。 |
| B12 | 模擬較慢 clipboard Promise；計算後點複製，Promise pending 時編輯後重算，再 resolve 舊 Promise | 舊 Promise 不顯示成功、錯誤或覆寫新結果；不可宣稱已撤銷 OS clipboard 寫入。 |
| B13 | 對可用瀏覽器在 fake timers 建立 8 個下載 URL，再嘗試第 9 個 | 前 8 個各有自己的 30 秒 deadline；第 9 個回報容量已滿；重新計算不撤銷其中任何一個；各自到期只 revoke 自己。 |
| B14 | 有兩個未到期下載 URL 時觸發明確清除 | 清除確認後兩 URL 均撤銷；取消時表單和 URL 均保持原狀。 |
| B15 | 以初始化失敗 fixture 載入頁面，測試 harness 呼叫 form.requestSubmit() | submit 第一動作同步 preventDefault；fieldset/所有按鈕保持 disabled；不 GET、不出現 query string，且不把 raw exception 顯示給使用者。 |
| B16 | 成功計算並下載繁中、英文報告；逐位元檢查 | 固定檔名 glossquote-grade-target.txt；MIME text/plain;charset=utf-8；符合 C32，下載動作只在明確手勢後建立。 |
| B17 | 在 320 CSS px viewport、40 列和 200% 縮放檢查鍵盤操作 | 不出現整頁水平捲動；焦點、每列欄位標籤、錯誤、主要操作可見可達；長英文標籤不互相覆蓋。 |
| B18 | 在可用的觸控/虛擬鍵盤環境聚焦 weight 與 score 欄 | decimal input mode 可操作；若鍵盤不提供句點，可用可見插入句點控制；不把逗號轉成句點；焦點欄不被鍵盤/安全區遮住。真機能力不足時記 NOT_RUN。 |
| B19 | 在無網路時先載入完成，再輸入 C01 試算 | 已載入頁面可在本機記憶體同步計算；新載入/冷啟動離線不承諾成功，產品不得宣稱永遠離線。 |
| B20 | 從完成頁觸發 pagehide；另以 BFCache persisted pageshow 還原 | pagehide 清空資料、結果、clipboard epoch、全部 object URL；persisted 恢復重新成為空白頁並增加 page generation。 |
| B21 | 在可觀測瀏覽器 DevTools 檢查成功計算前後 Network/Storage | 除靜態同源載入外無應用請求；無 storage/cookie/cache/service worker/URL 資料。完整 Network/Storage 未實際取得時記 NOT_RUN。 |
| B22 | 本機 HTTP 預覽查看 robots/meta與兩語頁面來源 | M1 無正式 canonical、sitemap或索引 schema；兩頁 noindex,nofollow；不得依預覽推斷正式 SEO 或索引狀態。 |

## M1 強制 gate 與不可冒稱項目

- 核心表 C01–C31、schema hostile cases、固定報告快照及 JSON/不突變要求全部由離線測試執行；成功率以實際命令和 exit code 記錄。獨立對照組另依主代理準備的 250 組資料驗證，不以文件手算代替該 gate。
- 繁中與英文的空白初始態、主要流程、編輯失效、零與空白、錯誤修正、切換取消/確認、報告文字和回首頁必須實際走通，缺任一語言不得通過 M1。
- 320 CSS px/鍵盤可由自動化環境實測；真機鍵盤、OS clipboard、browser downloads 的原生生命週期及完整 Network/Storage 依當時能力記為 PASS 或 NOT_RUN。mock 可驗競態，不可冒充原生 API 實測。
- M1 preview 只限 loopback 4208，build noindex/nofollow，沒有 production canonical；5208 是之後的本機 production-like HTTP model，不是網路試算端點。M2/M3 的任何發布、部署、真實網域均未在本文件執行。


---

## 原文件 TASKS.md

# 里程碑任務：成績目標試算

狀態：M0 六份規格已完成，待主代理審查；沒有實作、測試、公開來源或部署。本表定義後續 gate，不表示已執行。一次只推進一個 milestone；保留每個 gate 的實際命令、exit code、必要證據與 NOT_RUN 原因。任務契約見 [AGENTS.md](AGENTS.md)、[TASK-ENTRY.md](TASK-ENTRY.md)，工程命令見 [docs/ENGINEERING.md](docs/ENGINEERING.md)，發布順序見 [docs/RELEASE.md](docs/RELEASE.md) 與 [docs/GIT-PUBLICATION-SAFETY.md](docs/GIT-PUBLICATION-SAFETY.md)。

## M0 — 自包含規格

- [x] 定義問題、假設、非目標、產品介面與雙語 SEO。
- [x] 定義精確 schema、BigInt 整數算式、錯誤契約、報告契約、安全與生命週期。
- [x] 列出可重現的固定核心及瀏覽器 oracle、M1–M3 gate。
- [ ] 主代理審查六份產品規格並明確放行原功能對話。
- [ ] 原功能對話建立前，將這六份文件與既存共用文件按完整順序作為唯一規格；requested model 為 gpt-6.1-sol/max，不能自述代替 backend identity 證據。

M0 允許路徑僅限 README.md、PRODUCT.md、TECHNICAL.md、UX-SEO.md、ACCEPTANCE.md、TASKS.md。不得在 M0 建立產品程式、跑產品測試、開功能 chat、發布、部署或改共用檔。完成主審前，各項狀態保持未放行。

## M1 — 完整本機產品

M1 預覽為 127.0.0.1:4208，限本機、noindex/nofollow。Node.js 24+、ESM、built-ins；不安裝套件、不讀帳戶設定、不作產品網路或 storage。實作和測試只能在原功能對話進行，依任務範圍回報給主代理。

### T00 — 開始前防護與規格基線

- 重新確認主代理 M1 放行、無同路徑衝突，讀完本工具六規格與既存 docs。
- 記錄允許的程式/測試檔、工具版本、環境 guard 前後值和唯一 task evidence 目錄；遵循 [docs/ENGINEERING.md](docs/ENGINEERING.md) 的只讀環境守衛。此工具不呼叫 dotnet。
- 未完成前不安裝、執行建置或測試，也不啟動/結束既存服務。

### T01 — 精確核心與 hostile schema

- 實作 calculateTarget(request) 和純本機測試，依 [TECHNICAL.md](TECHNICAL.md) 的驗證順序、固定 error.field、BigInt 單位和狀態語義。
- 將 ACCEPTANCE C01–C31 與 C25a 轉成獨立手寫 expected；包含 getter 不執行、symbol、non-enumerable、extra key、hole、長度/格式/範圍/重複 ID、未突變和無 partial result。
- 使用主代理提供的 250 組獨立對照資料；固定 oracle 不從被測實作衍生。遇到差異先停止判定規格/核心，不用調整 oracle 使其通過。
- Gate：核心測試通過；精確邊界 C07/C09 均不得用 display 比較；JSON 結果序列化成功且無 BigInt/raw echo。

### T02 — 雙語空白 UI 與主要流程

- 建立繁中 /index.html 與英文 /en/index.html、原生響應式 UI、欄位錯誤和結果摘要。先遵守 UX-SEO 的操作及固定雙語字串。
- 初始 fieldset 及所有工作按鈕 disabled、所有 input 無 name；最先註冊的同步 submit capture listener 的第一個動作是 preventDefault。只有初始化和所有事件 listener 完整接妥後才 enable；失敗維持 disabled。
- 實測兩語空白初始態、C01 主流程、0 與空白、錯誤修正、已先達標、不可行和全部完成狀態。範例須明按且不得自動試算。
- Gate：B01–B08、B11、B15；繁中或英文主要路徑未通過即停止 M1。

### T03 — 清除、語言、報告和暫存競態

- 加入明確的清除/重設動作、語言切換確認、copy/download；按 PRODUCT、TECHNICAL 和 UX-SEO 的 lifecycle 約束。
- 清除取消需完整保留；確認清除回空白初始狀態並 revoke 全部存活 object URLs。普通欄位編輯及重新計算不能提早 revoke 已建立 URL；每個 URL 的到期時間彼此獨立，確認清除或 pagehide 才全數清除。
- 依 C32–C38 與 B09–B16 實測五種狀態的固定報告中英文全文、失敗 shape、async epoch、容量上限、下載檔名、UTF-8/LF/BOM/最後一行和頁面生命週期。
- Gate：所有語言和狀態的報告快照一致；mock 僅用於競態邏輯，原生權限狀態如未驗實際行為需記 NOT_RUN。

### T04 — 隱私、安全及靜態預覽模型

- 按 docs/PRIVACY-SECURITY.md、docs/ENGINEERING.md 和 docs/RELEASE.md 實作 CSP/安全 headers、MIME、method/path handling、404、不使用 storage 或隱藏 request；保持 preview noindex/nofollow。
- 檢查根頁/英頁、空白、固定錯誤和含惡意標點的使用者資料都不會出現在 URL、console、日誌、網路 payload 或靜態產物內。只使用假資料。
- Gate：離線 check/build 完整通過；靜態掃描、HTTP 模型與瀏覽器觀察逐項記錄。未得到完整 Network/Storage 可觀測能力時如實標 NOT_RUN。

### T05 — 無障礙、長表單和低資源裝置

- 測 320 CSS px、200% 縮放、鍵盤全流程、40 列長表單、長英文標籤、錯誤關聯、觸控目標、IME composition、ASCII 句點輸入輔助及虛擬鍵盤安全區。
- 以 40 列有界同步 BigInt 運算，不加 worker/套件，不把手持鍵盤缺少句點誤轉成逗號。低階裝置操作成本用冷啟動/試算量測記錄；不可無證據宣稱所有裝置效能良好。
- Gate：B17–B19；無法使用真機/原生鍵盤就記 NOT_RUN 和實際限制，不用 mock 冒充。

### T06 — M1 整合候選與主代理驗收

- 執行並保存最後版本的 node --version、npm test、npm run check、npm run build；預覽使用 npm run dev -- --port 4208，僅綁 127.0.0.1。依 [docs/ENGINEERING.md](docs/ENGINEERING.md) 產生固定 allowlist/manifest 和 task evidence。
- 跑 C01–C38、C25a、B01–B22 及 250 組獨立對照；先手動瀏覽兩語。清點 NOT_RUN、test mocks、真實 browser 觀測和 exit code，不能把規格案例當通過證據。
- 只在最終程式候選穩定後各跑必要 gate 一次；若修程式，只重跑受影響 gate。完成後更新本工具 HANDOFF.md、START-HERE.md、project.json、TASK-ENTRY.md、docs/RELEASE-CANDIDATE.md 的狀態和驗證記錄。這些允許狀態更新不得改變 gate 或降低條件；dist 可依 build 生成。
- M1 放行條件：所有必要 core/browser gates pass、兩語主流程 pass、無安全/隱私/精度錯誤、差異已解決；原生或真機未驗項逐項標 NOT_RUN。交主代理獨立驗收並等候明確放行。
- M1 不包含 public source、正式網域、Cloudflare、homepage catalog 或部署。主代理未放行時不得開始 M2。

## M2 — 主代理放行後的 production 工具鏈與來源發佈

- 啟動條件：主代理明確書面放行 M1，M1 候選和證據固定；仍在原功能對話，不另開 chat。
- 建立 production build/check/preview 流程、正式 canonical/alternate SEO、安全 headers、robots/sitemap、404 和本機 production-like HTTP model 127.0.0.1:5208，遵循 [docs/RELEASE.md](docs/RELEASE.md)。提供並實際執行 npm run release:check；一般 check/build/release:check 離線。
- M2 的生成目錄限定 dist-production/；production build/check 不得改寫 preview public/ 或 dist/。production/static manifests 和 SEO hash/header 核驗需能重現。
- 發布 public source 前讀 docs/GIT-PUBLICATION-SAFETY.md，在隔離 reviewed publishing copy 只含此工具的來源，執行規定的 Git settings guard capture/verify，證據放根 .runs 唯一任務目錄。remote 為 KYStr/glossquote-labs-grade-target；不得讀取/輸出憑證，不得改 global/system Git、gh auth 或 persistent environment。若已授權的現存 CLI 認證不能發布，停下來報告。
- Gate：release:check、test/check/build/production check、HTTP routes/headers/SEO/404、乾淨副本重驗、repo public visibility、remote commit、git archive ZIP 根目錄與每檔 hash 相符皆有證據；主代理獨立放行。只公開來源不等於 live site。
- M2 允許的狀態記錄同 M1；可建立 production 專用程式設定和 dist-production，但不把 M2 產物寫回 preview public。不得呼叫 Cloudflare，不讀部署 token。

## M3 — 主代理正式部署和首頁整合

- 僅主代理在 M2 獨立放行後執行。依已授權的免費 Cloudflare 發布流程部署至 grades.glossquote.com，驗實際兩語 HTTP body、headers、SEO、404 和核心操作。
- 只有 live tool release 驗證通過才由主代理把兩語首頁 catalog draft 轉 published；重建、驗證及公開首頁來源，再部署首頁並核驗兩語入口和 matching-language 回鏈。此 milestone 的產品 chat 不改其他共用首頁檔案。
- Gate：live release、source commit、homepage source、catalog status、兩語首頁、必要 NOT_RUN 和實際 hosting 狀態全部記入 HANDOFF；若缺權限/credential/服務就記阻塞並停下，不改 token scope、不付費、不部署至別處。
- 交付狀態為 awaiting external review。外部回饋回原功能對話修正；主代理重驗/重發後仍需使用者或其審查者確認才可完成該版本。

## 狀態記錄欄位

每個 milestone 記錄：狀態（未開始／進行中／pass／blocked）、固定候選識別、允許修改路徑、實際命令及 exit code、手動與自動證據、250 組對照結果、NOT_RUN 與原因、主代理放行、來源/hosting 分開狀態。不得以聊天陳述、mock、靜態掃描或規格算例代替實際驗收。原功能實作狀態記錄到 HANDOFF 和 docs/RELEASE-CANDIDATE.md；本規格本身不預填 pass。

