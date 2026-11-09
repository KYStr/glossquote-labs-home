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
