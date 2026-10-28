# 鋪材用量試算 — 既有規格保存

Task ID: `labs-35-tile-estimator` · Spec ID: `spec-35-tile-estimator`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：鋪材用量試算

狀態：M0 規格，尚未實作。文件中的預期行為是後續實作與審查依據，不是測試通過證據。

## 工作定義

使用者先量出多個要鋪的矩形地面或牆面，再列出不鋪的矩形面積，選擇相同尺寸的磁磚或板材、每箱片數與備料比例。工具只以總面積推估片數及箱數；不根據位置或形狀排版，也不保證能拼花、少切或避免破損。

需求頻率尚未驗證。工具不得被描述為官方算量規則、施工建議或採購保證。

## 固定輸入與初始狀態

初始頁面建立一列空白鋪設區，沒有扣除區；磁磚長寬欄空白；每箱片數為 10；備料比例為 10.0%。提交仍允許執行完整驗證，空白必填欄位要收到逐欄錯誤。任何範例或預設不會自動產生結果。

鋪設區陣列必須有 1–20 列；扣除區陣列可有 0–20 列。每列有唯一 ASCII ID、可選名稱與長寬。名稱去除首尾 ECMAScript 空白後最多 40 個 Unicode 碼點；核心成功結果保留名稱為空字串，畫面與報告再依語言及列序號顯示「區域 n」或「Area n」，不把 fallback 當作使用者名稱。拒絕 Cc 控制字元及孤立 surrogate。名稱原始字串上限為 256 UTF-16 code units，避免無界輸入；這不是名稱顯示長度。

每個長寬是嚴格 ASCII 十進位字串，公尺欄範圍為大於 0 至 1000 m、最多 3 位小數，換算為整數 mm。扣除區只依面積相減，沒有幾何定位；使用者需自行避免重疊及超出鋪設總面積。淨面積必須大於零。

單片長寬是公分欄，範圍大於 0 至 1000 cm、最多 1 位小數，換算為整數 mm。每箱片數是 1–1000 的 ASCII 整數，預設 10。備料百分比為 0–50%、最多 1 位小數，預設 10.0%；必須標為可自行調整的估算假設，不得寫成建議比例。

## 功能需求

### FR-01 使用範圍與說明

畫面、結果及報告都須說明此工具是面積估算，適用於相同尺寸的磁磚或板材，不做排版或定位，不保證拼花、切割最少或實際施工可用；不提供施工、結構、價格、稅或安裝費建議。備料百分比是使用者假設，不是通用建議。

### FR-02 矩形輸入

使用者可新增或移除鋪設區與扣除區，依原輸入順序計算。鋪設區保持至少一列、至多 20 列；扣除區可空白、至多 20 列。每列包含唯一 ID、選填名稱、長度與寬度。名稱空白時使用列序號名稱，不把名稱當計算依據。所有新增、移除與編輯都立即清除舊結果。

### FR-03 數字格式與上限

數字外側只可忽略 ASCII 空白 U+0009–U+000D 與 U+0020；中間空白不合法。保留使用者正在輸入的草稿，不在輸入時刪字、補零、改逗號或把格式轉成另一種語法。輸入值上限 32 UTF-16 code units，含外側空白。只允許 ASCII 數字及 ASCII 小數點；不得含正負號、指數、千分位、全形符號、Infinity、NaN 或空白小數。允許前導零，例如 0001.25；至少一位整數數字；若有小數點，後面必須有 1 至欄位上限位數。超過小數位數與語法錯誤要有不同穩定錯誤碼。

### FR-04 面積與扣除

每個鋪設矩形面積 = 長 mm × 寬 mm；鋪設總面積為各列相加。每個扣除矩形面積同樣計算，扣除總面積為各列相加。淨面積 = 鋪設總面積 − 扣除總面積。扣除總面積大於或等於鋪設總面積時拒絕整案，不輸出部分結果。

### FR-05 用量公式

令 A 為淨面積 mm²，T 為單片面積 mm²，r 為備料百分比的十分之一百分點整數值。例如 10.0% 的 r 是 100。片數、箱數均使用整數向上取整：

- 基本片數 = ceil(A / T)
- 含備料片數 = ceil(A × (1000 + r) / (1000 × T))
- 箱數 = ceil(含備料片數 / 每箱片數)
- 整箱購買片數 = 箱數 × 每箱片數
- 整箱餘片 = 整箱購買片數 − 含備料片數
- 整箱購買面積 = 整箱購買片數 × T

不得先將面積顯示值四捨五入再計算。所有輸入與派生量以 BigInt 整數保存；顯示只用於閱讀，不能控制片數或箱數。

### FR-06 結果

成功結果須列出每一鋪設區與扣除區的名稱、尺寸、面積，以及鋪設總面積、扣除總面積、淨面積、單片尺寸與面積、基本片數、含備料片數、備料百分比、每箱片數、箱數、整箱購買片數、整箱餘片、整箱購買面積。面積顯示為 m² 並四捨五入至小數第 2 位、正值採 half-up；計算仍使用完整 mm²。因很小面積可能顯示 0.00 m²，結果和報告要同時提供精確 mm² 數值，並說明顯示精度。

### FR-07 錯誤與完整性

無效 request、未知欄位、缺欄、錯誤型別、accessor、symbol、非列舉屬性、陣列空洞、重複 ID、過量列或非法數字都回傳固定錯誤碼與固定欄位路徑；不得回傳原始輸入、例外文字或未知 key。任一錯誤都不產生部分結果。純函式不得改寫輸入。

### FR-08 頁面結果與唯讀報告

使用者明確按「試算 / Calculate estimate」才取得結果。報告由該次成功結果快照生成，固定中英文字序與 LF 換行；報告是頁內唯讀文字，可由使用者自行選取。MVP 不呼叫 clipboard、下載、Blob、檔案或分享 API。任一來源欄位、列數、列順序、語言或假設被更改，立刻移除舊結果與報告，要求重新試算。

### FR-09 清除與語言切換

清除會在頁內顯示確認；取消保留原草稿與結果，確認則回到初始狀態。語言切換若有任何與初始狀態不同的輸入草稿，先顯示同類確認；取消留在原頁，確認才到另一語言的獨立頁面，且不攜帶資料。初始狀態的清除按鈕禁用；任何編輯、增刪列或設定改動都算有工作。

### FR-10 資料生命週期

只在目前頁面記憶體中處理資料；不得寫 localStorage、sessionStorage、IndexedDB、URL、cookie、檔案、遙測或網路。pagehide 清除記憶體狀態與報告，BFCache 返回時重新呈現初始空白狀態。僅已載入頁面可離線運作，不保證離線重新載入。

### FR-11 雙語與環境

繁體中文及英文提供同等主要功能、公式、錯誤、確認、報告與限制說明。手機長表單採單欄逐列編輯；不得要求使用者在寬表格內水平捲動才能找到欄位。低階裝置只執行最多 40 個矩形的有界同步 BigInt 運算，不顯示虛假的進度或等待動畫。無 JavaScript 時顯示工具不可用說明，不能回退為把資料送到伺服器。

## 非目標

MVP 不排版磁磚，不處理牆角、門窗位置、方向、拼花、切割件、破損率、耗材或施工公差；不估價、稅、安裝費；不支持多種材質或多尺寸混算；不匯入、上傳、保存、同步或共享資料；不操作剪貼簿或檔案；不對實際採購或施工結果作保證。


---

## 原文件 TECHNICAL.md

# 技術契約：tile-estimator

狀態：M0 規格，尚未實作。程式碼名稱採英文；不需要 runtime 套件、瀏覽器擴充、外部字型、CDN、伺服器 API 或儲存層。

## 執行邊界與檔案配置

正式產品是靜態瀏覽器工具。開發與測試使用 Node.js 24+、ES modules、Node built-ins 及 node:test。開發伺服器只綁定 127.0.0.1:4215，僅提供 public/；production model 使用埠 5215。兩者是本工作候選，不代表已有伺服器或正式部署。

預期專案樹：

~~~text
package.json
public/
  index.html
  en/
    index.html
  styles/
    app.css
  js/
    app.mjs
    render.mjs
    core/
      tile-estimator.mjs
      report.mjs
scripts/
  serve.mjs
  check.mjs
  build.mjs
test/
  tile-estimator.test.mjs
  report.test.mjs
dist/                  # 僅由 build 產生
~~~

兩個 HTML 是獨立語言入口；CSS、應用程式與純核心模組可共用。所有資源必須同源本機；不得載入遠端字型、script、stylesheet、圖片、API、analytics 或其他工具。無 JavaScript 時顯示明確不可用說明，表單不得把值送到伺服器。

## 純核心 API

calculateTileEstimate(request) 同步接收以下精確 schema。頂層欄位全部必填，僅 row.nameRaw 可省略；不接受 alias。

~~~json
{
  "installAreas": [
    {
      "id": "area-1",
      "nameRaw": "",
      "lengthMetersRaw": "3",
      "widthMetersRaw": "4"
    }
  ],
  "deductionAreas": [],
  "tileLengthCmRaw": "60",
  "tileWidthCmRaw": "60",
  "boxPiecesRaw": "4",
  "reservePercentRaw": "10"
}
~~~

鋪設與扣除列皆接受形狀為 {id, nameRaw?, lengthMetersRaw, widthMetersRaw} 的普通資料物件。ID 必須符合 ASCII [A-Za-z0-9_-]{1,40}，並在兩個陣列合併後全域唯一。物件只能有列出的自有可列舉資料欄位；拒絕未知 key、symbol、非列舉屬性、accessor、額外陣列屬性、空洞與錯誤 prototype。檢查 property descriptors，不讀取 getter。未知 key 不納入錯誤路徑或錯誤訊息。純函式不得改寫輸入；不保證 Proxy trap 沒有副作用，API 呼叫端應傳入一般 JSON-like 值。

### 數字解析

所有 raw 數字欄位都必須是字串，原始 JS 字串長度最多 32 UTF-16 code units，包含外側空白。先只去除兩端 ASCII 空白 U+0009–U+000D 及 U+0020；內部空白不去除。接受語法為一個以上 ASCII 數字，可選 ASCII 小數點及 1 至欄位允許的位數；允許前導零，例如 0001.25。拒絕空字串、只有小數點、尾隨小數點、正負號、指數、千分位、全形數字／句點、NaN、Infinity、NBSP 及任何其他非 ASCII 數字字元。輸入中不做格式化或改寫。

- lengthMetersRaw 與 widthMetersRaw：0 < 值 <= 1000 m，最多 3 位小數。
- tileLengthCmRaw 與 tileWidthCmRaw：0 < 值 <= 1000 cm，最多 1 位小數。
- reservePercentRaw：0 <= 值 <= 50%，最多 1 位小數。
- boxPiecesRaw：ASCII 整數語法，1–1000；不接受小數點。

大於欄位精度、格式錯誤、超過長度及超出範圍需有不同穩定錯誤碼。外側允許的 ASCII 空白在解析時忽略；其餘空白均拒絕。範圍比較不得使用 Number 浮點數。

名稱 nameRaw 可省略，或為最多 256 UTF-16 code units 的字串。拒絕孤立 surrogate 與 Unicode Cc 控制字元；有效代理對以單一碼點計數。去除 ECMAScript trim 空白後，最多 40 個碼點；空名稱在核心結果保留為空字串，不依賴語系。UI 與報告依陣列位置及語言生成「區域 n」或「Area n」；只有用來顯示的 fallback 不寫回核心結果。將名稱插入畫面時只用 textContent；報告以單行 JSON 字串跳脫顯示，避免換行與分隔符混淆。

### 單位與精確整數運算

不得經過二進位浮點數。以十進位字串切出整數與小數部分，轉成 BigInt：

- 公尺欄最多三位小數：mm = 整數部分 × 1000 + 小數部分右補零到三位。
- 公分欄最多一位小數：mm = 整數部分 × 10 + 小數部分右補零到一位。
- 百分比最多一位小數：reserveTenths 是百分比數字右補零到一位後的整數；例如 10、10.0 都是 100，50 是 500。

每列面積等於 lengthMm × widthMm。令 installTotalMm2 為鋪設面積總和，deductionTotalMm2 為扣除面積總和；淨面積 A = installTotalMm2 − deductionTotalMm2，必須大於零。單片面積 T = tileLengthMm × tileWidthMm。

所有除法均為非負 BigInt 整數向上取整：ceilDiv(n,d) = (n + d − 1) / d，且 d > 0。

~~~text
basePieces = ceilDiv(A, T)
piecesWithReserve = ceilDiv(A * (1000 + reserveTenths), 1000 * T)
boxes = ceilDiv(piecesWithReserve, boxPieces)
purchasedPieces = boxes * boxPieces
extraAfterReserve = purchasedPieces - piecesWithReserve
purchasedAreaMm2 = purchasedPieces * T
~~~

A 的最大值為 20 × 1000 m × 1000 m = 20,000,000,000,000 mm²。T 最小為 1 mm²，最大為 100,000,000 mm²；備料因子最大為 1.5。piece count 上限為 30,000,000,000,000；每箱最多 1000 片，購買片數最多 30,000,000,000,999。所有數值運算用 BigInt；結果將整數序列化為 canonical 十進位字串，以保持 JSON 可序列化且不洩露 raw BigInt。

面積顯示以 mm² 做正值 half-up 到 0.01 m²：因 0.01 m² = 10,000 mm²，顯示百份之一 m² 整數為 (areaMm2 + 5,000) / 10,000，再補成固定兩位小數。面積為零時顯示 0.00。任何比較、除法向上取整與狀態決定都不讀取顯示值。結果與報告並列精確 mm²，並提醒小面積的兩位小數顯示可能為 0.00 m²。

## 成功與錯誤回應

calculateTileEstimate 成功只回傳以下封閉結構：

~~~json
{
  "ok": true,
  "result": {
    "schemaVersion": 1,
    "installAreas": [
      {
        "name": "",
        "lengthMm": "3000",
        "widthMm": "4000",
        "areaMm2": "12000000",
        "areaM2Display": "12.00"
      }
    ],
    "deductionAreas": [],
    "tile": {
      "lengthMm": "600",
      "widthMm": "600",
      "areaMm2": "360000",
      "areaM2Display": "0.36"
    },
    "reservePercentTenths": "100",
    "boxPieces": "4",
    "totals": {
      "installAreaMm2": "12000000",
      "installAreaM2Display": "12.00",
      "deductionAreaMm2": "0",
      "deductionAreaM2Display": "0.00",
      "netAreaMm2": "12000000",
      "netAreaM2Display": "12.00",
      "basePieces": "34",
      "piecesWithReserve": "37",
      "boxes": "10",
      "purchasedPieces": "40",
      "extraAfterReserve": "3",
      "purchasedAreaMm2": "14400000",
      "purchasedAreaM2Display": "14.40"
    }
  }
}
~~~

欄位與順序固定；每列輸出採原陣列順序，輸出不帶 raw 字串、ID 或原始錯誤內容。每一面積數字和件數都是 canonical 十進位字串；schemaVersion 是數字 1。result 只能含 schemaVersion、installAreas、deductionAreas、tile、reservePercentTenths、boxPieces、totals；列、tile 與 totals 欄位依上述範例封閉。

錯誤只回傳 {ok:false,error:{code,field}}，不得附上 partial result、輸入值、key 名稱、HTML 或例外訊息。固定 code 與 field：

| 情況 | code | field |
|---|---|---|
| request 型別、prototype、未知頂層欄位、symbol 或 descriptor 錯誤 | invalid_request | request |
| 陣列型別、空洞或額外陣列屬性 | invalid_rows | installAreas 或 deductionAreas |
| row 欄位未知、symbol、descriptor 或 row prototype 錯誤 | invalid_row | installAreas.i 或 deductionAreas.i |
| 缺少任何已知必填欄，或已知非陣列欄位型別錯 | invalid_type | 固定已知欄位路徑 |
| 鋪設列數超限或為零 | row_count | installAreas |
| 扣除列數超限 | row_count | deductionAreas |
| ID 格式錯誤或重複 | invalid_id / duplicate_id | 該列 .id |
| nameRaw 型別錯誤 | invalid_type | 該列 .nameRaw |
| 名稱長度或 raw 名稱超過 256 code units | invalid_name | 該列 .nameRaw |
| 名稱含 Cc 控制字元或孤立 surrogate | invalid_unicode | 該列 .nameRaw |
| raw 長度超限 | input_too_long | 該 numeric 欄位 |
| 數字語法錯誤／精度超限／範圍錯誤 | invalid_number / precision_exceeded / out_of_range | 該 numeric 欄位 |
| 扣除總面積 >= 鋪設總面積 | non_positive_net_area | deductionAreas |
| buildReport 收到不合法或派生欄位不一致的結果 | invalid_result | result |
| buildReport 的語言不支援 | unsupported_language | language |
| 防禦性報告字元上限被觸發 | report_too_large | result |

驗證順序固定：先驗 request 物件型別、prototype、descriptor、symbol 及頂層未知欄位，再檢查已知頂層欄位缺漏，缺欄回 invalid_type / request.已知欄位；接著驗陣列型別、密度與額外屬性，再驗列數；依鋪設列、扣除列順序先驗 row prototype、未知欄、symbol 與 descriptor，任何此類 row 結構錯誤回 invalid_row / row path；結構合法後才驗 row 必填欄與型別，缺漏或型別錯回 invalid_type / 固定欄位路徑；對每列依序驗 ID 格式、與先前列的唯一性、名稱、長度、寬度。再接著驗單片長寬、每箱片數與備料百分比；最後加總並檢查淨面積，再產生成果。第一次錯誤即返回。

對未知 top-level key 回報 field=request；對未知 row key 回報 field=installAreas.i 或 deductionAreas.i，不拼接、不回顯攻擊者提供的 key。row 缺 id 或尺寸欄回 invalid_type / installAreas.i.id、installAreas.i.lengthMetersRaw 等固定路徑；row 結構錯優先於欄位缺漏或型別錯。已知 request 缺欄只指向固定欄位路徑，例如 request.tileLengthCmRaw。錯誤碼與路徑不受語言影響；UI 再將它們映射為兩語固定文案。所有錯誤都不 echo raw 值。

主代理 M1 資源界線補充（2026-10-19）：request 檢查後，依 installAreas、deductionAreas 順序，先確認陣列 type/prototype，再以 own length descriptor 做 <=20 上限檢查；超限立即回 row_count／該陣列名稱，優先於該陣列及後續陣列的 symbol、extra、洞、index descriptor 或 row 錯誤，不先取得全陣列 descriptors、keys、元素或副本。上限內仍使用原完整結構、數量下限與逐列驗證。buildReport 對 result 的兩個陣列也先做 type/prototype 與 length <=20 預檢再列舉/複製，超限直接 invalid_result/result。這只界定陣列元素工作量，不聲稱任意巨大未知 own-key 物件或 Proxy 的操作為常數時間。

## 報告契約

buildReport(result, language) 只接受成功的 result snapshot 及 language 為 zh-Hant 或 en，回傳 {ok:true,text} 或 {ok:false,error:{code,field}}。結果必須符合封閉 schema、固定範圍與 canonical 字串規則；name 必須是空字串或不超過 40 個碼點的已 trim 名稱，且不得有 Cc 控制字元或孤立 surrogate。每列面積、顯示面積、總和、淨面積、片數、備料、箱數、整箱多出片數與整箱購買面積都要從長寬與假設重算並逐欄比對。未知 key、getter、symbol、非列舉屬性、空洞、錯型別或不一致派生欄位都回 invalid_result / result，不回顯 key。language 錯誤回 unsupported_language / language。合法 result 的最大輸出必須小於 32,768 code units，因此 report_too_large 是防禦分支，合法 schema 不應觸發。

報告固定列序、語言文案與欄位格式；buildReport 回傳 Unicode JavaScript string，使用 LF 換行、不加尾端 LF。這不是 byte stream，不執行 UTF-8 編碼或 BOM 寫入；MVP 不寫檔。空名稱依語言與所在陣列的一起始序號先轉為「區域 n」或「Area n」，再以 JSON 字串跳脫顯示；原 result.name 仍保留空字串。將 U+2028 與 U+2029 明確輸出為可見的反斜線跳脫，確保每列名稱維持單行。合法 schema 的最大報告必須小於 32,768 UTF-16 code units；大於此防禦上限回 report_too_large / result。先驗 schema 的上限與派生一致性，不能用一個不可能的「合法超大輸出」案例冒充測試通過。

繁中成功報告固定範例（只有一筆鋪設區，無扣除區）：

~~~text
鋪材用量試算（磁磚／板材面積估算，非施工建議）
鋪設區域：
- "區域 1"｜3.000 m × 4.000 m｜12.00 m²（精確 12000000 mm²）
扣除區域：無
鋪設總面積：12.00 m²（精確 12000000 mm²）
扣除總面積：0.00 m²（精確 0 mm²）
淨面積：12.00 m²（精確 12000000 mm²）
鋪材尺寸：60.0 cm × 60.0 cm｜單片 0.36 m²（精確 360000 mm²）
備料假設：10.0%（可自行調整，非通用建議）
基本估算：34 片
含備料估算：37 片
每箱片數：4
整箱數：10 箱（購買 40 片）
整箱餘片：3 片
整箱購買面積：14.40 m²（精確 14400000 mm²）
面積只依矩形面積加總；不排版、不估切割，亦不保證拼花或實際施工結果。
面積顯示至小數第 2 位；片數與箱數依精確 mm² 計算。
~~~

English report for the same fixture:

~~~text
Tile and Panel Usage Estimate (area estimate, not installation advice)
Installed areas:
- "Area 1" | 3.000 m × 4.000 m | 12.00 m² (exact 12000000 mm²)
Deducted areas: none
Installed area total: 12.00 m² (exact 12000000 mm²)
Deducted area total: 0.00 m² (exact 0 mm²)
Net area: 12.00 m² (exact 12000000 mm²)
Material size: 60.0 cm × 60.0 cm | one piece 0.36 m² (exact 360000 mm²)
Reserve assumption: 10.0% (editable; not a universal recommendation)
Base estimate: 34 tiles
Estimate with reserve: 37 tiles
Pieces per box: 4
Boxes: 10 (40 tiles purchased)
Extra pieces after reserve: 3
Area purchased in full boxes: 14.40 m² (exact 14400000 mm²)
Area is summed by rectangle only; no layout or cutting plan is provided, and results do not guarantee a pattern or installation outcome.
Areas are displayed to two decimals; piece and box counts use exact mm².
~~~

成功輸出文字固定，除使用者名稱依 JSON 字串跳脫代入外，不加入日期、語系環境、隨機值或動態提示。報告只是 textarea 唯讀內容；不可新增複製或下載按鈕。

## 頁面狀態、生命週期與安全

- 初始：預設一筆空鋪設區、零扣除區、鋪材尺寸空白、每箱 10、備料 10.0%；沒有結果。
- 輸入／錯誤：所有錯誤與欄位關聯；提交依固定順序驗證 request，第一次錯誤聚焦對應欄位。輸入、增刪列或改假設會同步清掉舊結果與唯讀報告。切換語言先確認；取消保留頁面與結果，確認後才清除並導航。
- 試算：計算同步完成；最多 40 筆資料，不需網路或等待動畫。試算按鈕在初始化完成後可用，以便空白或錯誤表單能顯示錯誤。
- 清除：初始狀態時禁用。任何欄位、列或設定曾離開初始狀態即視為有工作；清除先頁內確認。取消保留現狀；確認清空錯誤與結果、重建預設一列、回到初始數值。
- 語言切換：有工作時先用頁內確認；取消不改頁，確認導航到另一個靜態語言頁且不傳輸任何表單資料。沒有工作則直接切換。
- 離頁：pagehide 清除記憶體 state、DOM 派生結果及報告。若 pageshow 的 persisted 為 true，回到初始空白 state；禁止讀取瀏覽器儲存還原表單。
- 初始化：所有 fieldset 和工作按鈕在 HTML 中先 disabled，輸入沒有 name；JS 最先同步綁上 submit handler，第一個動作是 preventDefault，再完成其他事件註冊，最後才啟用。初始化任一步失敗，保持 disabled，不得 GET／POST 提交使用者值。無需 async、clipboard 或 URL 生命週期；取消競態 N/A。
- 所有輸入只進純函式；以 textContent 呈現使用者名稱；禁止 innerHTML、eval、遠端載入與任意 HTML 注入。

離線只涵蓋已載入頁面。沒有 service worker、快取策略或離線重載承諾。HTTP 靜態資源檢查只驗路徑和 header，不得冒充瀏覽器交互或本機 UI 驗收。


---

## 原文件 UX-SEO.md

# 介面與 SEO：tile-estimator

狀態：M0 規格，尚未實作。介面模式是 Product App；重點是可逐列檢查的量測工作表，不是行銷首頁或通用儀表板。

## 使用者與訊息順序

使用者帶著量測結果來估算相同尺寸磁磚或板材的片數與箱數。主畫面先說明模型，再讓他逐列輸入鋪設區與扣除區，最後輸入單片尺寸與包裝假設並明確試算。結果放在輸入旁或其下方，保留每筆矩形與總和，讓使用者核對後再手動選取報告。

每個主要區塊附近都要提醒：面積估算不是排版、施工建議或採購保證；備料比例由使用者調整，不是通用建議。顯示數字須清楚區分基本片數、含備料估算片數、整箱購買片數及因整箱而多出的片數。

## 桌面線框

~~~text
┌──────────────────────────────────────────────────────────┐
│ Gloss Tools   鋪材用量試算                  English       │
├──────────────────────────────────────────────────────────┤
│ 鋪材用量試算                                              │
│ 磁磚／板材面積估算片數與整箱數，不是排版或施工建議。      │
│                                                          │
│ 鋪設區域  1–20                                            │
│ 名稱（選填）       長度（m）        寬度（m）             │
│ 區域 1             [           ]    [           ]         │
│                    [移除此區域]                           │
│ [+ 新增鋪設區]                                             │
│                                                          │
│ 扣除區域  0–20                                            │
│ 不鋪設的矩形面積；只相減面積，請自行避免重疊。            │
│ [+ 新增扣除區]                                             │
│                                                          │
│ 單片尺寸                                                │
│ 長度（cm） [       ]   寬度（cm） [       ]               │
│ 每箱片數 [10]       備料假設（%） [10.0]                  │
│ 10.0% 是可調假設，不是通用建議。                           │
│                                                          │
│                          [試算用量]                        │
│                                                          │
│ 結果（試算後才出現）                                       │
│ 鋪設總面積 / 扣除總面積 / 淨面積                          │
│ 基本片數 / 含備料估算 / 箱數 / 整箱餘片                    │
│ 唯讀報告                                                    │
│                                                          │
│ [清除]（有工作時先確認）   模型與限制（說明）               │
└──────────────────────────────────────────────────────────┘
~~~

## 手機 320 CSS px 線框

~~~text
┌───────────────────────┐
│ 鋪材用量試算   English │
├───────────────────────┤
│ 磁磚／板材面積估算。   │
│ 不是排版或施工建議。   │
│                       │
│ 鋪設區域 1 / 20        │
│ 名稱（選填）           │
│ [_______________]     │
│ 長度（m）              │
│ [_______________]     │
│ 寬度（m）              │
│ [_______________]     │
│ [移除此區域]           │
│ [+ 新增鋪設區]         │
│                       │
│ 扣除區域               │
│ [新增扣除區]           │
│                       │
│ 單片長度（cm）         │
│ [_______________]     │
│ 單片寬度（cm）         │
│ [_______________]     │
│ 每箱片數               │
│ [_______________]     │
│ 備料假設（%）          │
│ [_______________]     │
│                       │
│ [試算用量]             │
│                       │
│ 試算結果               │
│ 淨面積、片數、箱數…    │
│ 唯讀報告               │
└───────────────────────┘
~~~

手機把長度、寬度與名稱標籤放在各輸入上方，不縮小成不可讀的多欄表格。每列可在小螢幕完整檢視；頁面不需橫向捲動。計算操作在最後一組必填欄位附近，長表單可用瀏覽器一般捲動；不把主要按鈕固定在虛擬鍵盤後方。

## 控制、狀態與錯誤

- 每個輸入有常駐可見標籤與單位，placeholder 不代替標籤。數字欄使用文字輸入與 inputmode=decimal，避免瀏覽器以地區設定替換句點；保留草稿，不自動格式化。單片欄位使用「鋪材長度」及「鋪材寬度」，說明適用相同尺寸磁磚或板材。
- 中文名稱可使用 IME 輸入；組字期間不驗證、不改寫、不搶焦點。數字只接受 ASCII 語法，IME 若提交全形數字或全形句點，保留草稿並在試算時說明格式不支援，不代為轉換。
- 提示明列允許 ASCII 數字、句點、位數與範圍。手機鍵盤若輸出逗號，告知使用者以句點輸入；不得偷偷把逗號轉成小數點。
- 新增列後焦點移到新列第一欄。移除列後焦點移到下一列或上一列的移除按鈕；最末唯一鋪設列不能移除。新增按鈕達 20 列時禁用。
- 試算後修改任一輸入或列順序，結果即刻消失；狀態文字提示重新試算。無效輸入不保留先前成功結果。
- 初次提交依固定驗證順序顯示第一個錯誤、關聯錯誤欄位並聚焦該欄；修正後再次試算可收到下一個錯誤。錯誤使用文字，不只用顏色或圖示，不顯示原始例外或原值。
- 清除只有在表單離開初始狀態時可用。頁內確認文案列明「會清除所有區域、尺寸、假設與結果」。取消保留；確認回到一列空白鋪設區、鋪材尺寸空白、每箱 10、備料 10.0%、零扣除區。
- 有工作時切換語言同樣先確認，取消保留目前頁面與結果；確認後才清除並切換至另一個獨立語言頁。初始狀態切換語言不需確認。
- 報告是頁內唯讀多行文字，固定格式，使用者可用一般鍵盤選取。沒有複製、下載或檔案按鈕；不宣稱已複製。
- 結果及報告在面積數字旁同時說明精確 mm²；m² 以正值 half-up 顯示兩位小數。片數與箱數依精確值計算。極小面積可能顯示 0.00 m²，必須有可見的精度說明。
- 初始 fieldset 和工作按鈕 disabled；事件註冊完成後才啟用。若 JavaScript 初始化失敗，頁面提供不傳送輸入的不可用說明。

頁面清除確認使用頁內 accessible dialog：標題、效果說明、取消與確認兩個有文字的按鈕；初次開啟把焦點放在取消，Escape 等同取消，結束後將焦點還原到觸發按鈕。不得呼叫 OS 原生對話框。

## 視覺與可及性要求

- 使用家庭 semantic tokens、平面工作表、清晰分隔線；工具工作表是主要視覺，不堆疊卡片或行銷大字。
- 主要文字 15–17 px，輔助字至少 12 px。常用控制與觸控目標至少 44 × 44 CSS px；可辨識的控制邊界至少 3:1，普通文字至少 4.5:1。
- 所有功能支援鍵盤；順序為語言／說明、鋪設列、扣除列、單片與假設、試算、結果與清除。焦點有可見且不被遮住的雙層框線。
- 320 CSS px 與 200% 文字縮放不遺失欄位、錯誤、結果或操作；不得讓頁面出現雙向捲動。至少容忍 40% 較長翻譯文案。
- 動態錯誤與試算狀態使用合適的 aria-live/status 語意；同一次變更不重複打斷螢幕閱讀器。每個錯誤都用 aria-describedby 與欄位連結。
- 偏好減少動態效果時不做非必要動畫。驗收 UI 目前受焦點事故限制，規格和預期仍須保留，不能把尚未操作標為通過。

## 雙語 SEO 與固定文案

繁體中文頁面為預設根頁，HTML lang 固定為 zh-Hant；英文頁面在 /en/，HTML lang 固定為 en。候選正式網域為 https://tiles.glossquote.com；目前不得聲稱已持有或已發布。

### 繁體中文

- title：鋪材用量試算：估算磁磚／板材片數與整箱數｜Gloss Tools
- description：依矩形鋪設面積、扣除面積、相同尺寸磁磚或板材與可調備料假設，估算片數及整箱數。只做面積試算，不提供排版或施工建議。
- H1：鋪材用量試算
- 首屏說明：輸入矩形鋪設區與扣除區，估算相同尺寸磁磚或板材的片數及整箱數。備料比例是可調假設，不是通用建議。
- primary action：試算用量
- result heading：估算結果
- 空狀態：填入鋪設面積與單片尺寸後試算。
- preview robots：noindex,nofollow

### English

- title: Tile and Panel Usage Estimator: Estimate Pieces and Boxes | Gloss Tools
- description: Estimate same-size tile or panel and full-box counts from rectangular installed and deducted areas, dimensions, and an editable reserve assumption. Area estimate only; no layout or installation advice.
- H1: Tile and Panel Usage Estimator
- Intro: Enter rectangular areas to estimate same-size tile or panel and full-box counts. The reserve percentage is an editable assumption, not a universal recommendation.
- primary action: Calculate estimate
- result heading: Estimate
- empty state: Add an installed area and tile dimensions, then calculate.
- preview robots: noindex,nofollow

正式頁的預定 canonical 為繁中根路徑 https://tiles.glossquote.com/，英文 https://tiles.glossquote.com/en/；兩頁互列 hreflang zh-Hant、en 與 x-default 根路徑。只有主代理確認域名、M2 放行並核實部署後才生成正式 metadata。預覽一律 noindex,nofollow，不放 production canonical。不要以測試網域或 localhost 宣稱已索引。

不加虛構流量、排名、客戶數、節省金額、認證或相容性宣稱。不需要 FAQ schema；若未來加入結構化資料，只能逐字對應頁面實際可見 FAQ。

## FAQ（須在頁面上可見）

### 繁體中文

1. **這會算出精確採購數量嗎？** 不會。它只依總面積估算；沒有排版、切割或施工損耗模型，不能保證實際數量。
2. **預設 10% 備料是建議嗎？** 不是。它只是可編輯的初始假設，請按自己的情況決定；工具不提供通用比例。
3. **扣除區要標出位置嗎？** 不用，但工具只把扣除矩形的面積相加後相減，不判斷它們是否重疊或是否落在鋪設區內；請自行避免重複扣除。
4. **離線能用嗎？** 已載入頁面可繼續試算；離線重新載入沒有保證，因為工具沒有離線快取功能。

### English

1. **Does this give an exact purchase quantity?** No. It estimates from total area and does not model layout, cuts, or installation loss, so it cannot guarantee the amount you need.
2. **Is the default 10% reserve a recommendation?** No. It is an editable starting assumption, not a universal recommendation.
3. **Do deducted areas need positions?** No. The tool subtracts their summed areas and does not detect overlap or check whether they lie inside an installed area. Avoid subtracting the same space twice.
4. **Can I use it offline?** A page that is already loaded can calculate. Offline reload is not guaranteed because the tool does not provide offline caching.


---

## 原文件 ACCEPTANCE.md

# 驗收案例：tile-estimator

狀態：M0 規格案例，尚未執行。任何成功預期都不是產品測試通過證據。M1 使用 Node.js 24+、離線假資料與本機純 CLI 檢查；不讀個人資料或連外。

## 固定 fixture

主代理 M1 追加資源回歸（2026-10-19）：C33 分別用 length=21 與最大合法 array length 的 ordinary sparse array 置換 installAreas／deductionAreas，index 0 放 getter spy，預期 row_count/對應陣列且 getter=0；不等待 O(length) 迴圈。C34 在有效 result 中作相同兩種陣列替換，buildReport 兩語均 invalid_result/result 且 getter=0。C35 原有20+20合法矩形及最大名稱報告仍完整成功，最後一列 getter/未知欄/schema錯誤仍須拒絕。超限預檢順序遵守 TECHNICAL 新補充，其他上限內原 C01–C32 規則不變。

除案例另有覆寫外，R0 為以下完整 request：

~~~json
{
  "installAreas": [
    {
      "id": "area-1",
      "nameRaw": "",
      "lengthMetersRaw": "3",
      "widthMetersRaw": "4"
    }
  ],
  "deductionAreas": [],
  "tileLengthCmRaw": "60",
  "tileWidthCmRaw": "60",
  "boxPiecesRaw": "4",
  "reservePercentRaw": "10"
}
~~~

成功案例的精確輸出依 TECHNICAL.md 的封閉 result schema。面積欄以 mm² 字串驗算；m² 顯示只是正值 half-up 到兩位小數。以下「含備料」均是面積估算片數，不是每片最低分數或可施工保證。

## 純函式驗收

| ID | 對應 | 輸入與操作 | 精確預期 |
|---|---|---|---|
| C01 | FR-04–06 | R0 | install=12,000,000 mm²，deduction=0，net=12,000,000；tile=360,000；base=34；含備料=37；boxes=10；purchase=40；extra=3；purchasedArea=14,400,000 mm²。顯示總面積 12.00 m²，片面積 0.36 m²，購買面積 14.40 m²。 |
| C02 | FR-04–06 | R0 加扣除列 {id:"ded-1",nameRaw:"浴室",lengthMetersRaw:"1",widthMetersRaw:"2"} | deduction=2,000,000；net=10,000,000；base=28；含備料=31；boxes=8；purchase=32；extra=1；purchasedArea=11,520,000 mm²（11.52 m²）。 |
| C03 | FR-05–06 | R0，reservePercentRaw="0" | base=34；含備料=34；boxes=9；purchase=36；extra=2；purchasedArea=12,960,000 mm²。 |
| C04 | FR-05 | install 0.6m×0.6m；tile 60cm×60cm；reserve=0；box=3 | A=T=360,000 mm²；base=1；含備料=1；boxes=1；purchase=3；extra=2；purchasedArea=1,080,000 mm²。 |
| C05 | FR-05–06 | install 0.001m×1.001m；tile 0.1cm×100cm；reserve=0；box=1 | A=1,001 mm²，T=1,000 mm²；兩者顯示皆可能是 0.00 m²；base=2、含備料=2、boxes=2、purchase=2。不得用顯示值比較或算片數。 |
| C06 | FR-05 | install/tile 都是 0.6m×0.6m；reserve=10.1；box=2 | reserveTenths="101"；base=1；含備料=2；boxes=1；purchase=2；extra=0。 |
| C07 | FR-03–05 | install 0.001m×0.001m；tile 0.1cm×0.1cm；reserve=0；box=1 | 兩個面積都是 1 mm²；base=1；含備料=1；boxes=1；purchase=1。證明最小正輸入仍使用精確整數。 |
| C08 | FR-03, FR-05 | install 1000m×1000m；tile 1000cm×1000cm；reserve=0；box=1000 | A=1,000,000,000,000 mm²；T=100,000,000 mm²；base=10,000；含備料=10,000；boxes=10；purchase=10,000；extra=0。 |
| C09 | FR-03, FR-05 | 與 C08 相同，reserve=50 | reserveTenths="500"；含備料=15,000；boxes=15；purchase=15,000；extra=0；purchasedArea=1,500,000,000,000 mm²。 |
| C10 | FR-02, FR-04–05 | 鋪設列依序 3m×4m、1m×2m；無扣除；tile 60cm×60cm；reserve=0；box=4 | install/net=14,000,000 mm²；base=39；含備料=39；boxes=10；purchase=40；extra=1。列順序與兩列面積保持一致。 |
| C11 | FR-02, FR-04–05 | R0 加兩列扣除，各 1m×2m、不同 id；reserve=0 | install=12,000,000；deduction=4,000,000；net=8,000,000 mm²；base=23；含備料=23；boxes=6；purchase=24；extra=1；purchasedArea=8,640,000 mm²。 |
| C12 | FR-02, FR-04–05 | 用固定生成式建 20 筆 1m×1m 鋪設列及 20 筆 0.5m×0.5m 扣除列；id 分別為 area-01…area-20、ded-01…ded-20；tile=100cm×100cm，reserve=0，box=10 | install=20,000,000；deduction=5,000,000；net=15,000,000 mm²；base=15；含備料=15；boxes=2；purchase=20；extra=5。不得丟失或重排 40 列。 |
| C13 | FR-02 | installAreas=[]，其餘用 R0 | {ok:false,error:{code:"row_count",field:"installAreas"}}；沒有 partial result。 |
| C14 | FR-02 | 21 筆完整且 id 不重複的 1m×1m 鋪設列 | row_count / installAreas；不做部分加總。 |
| C15 | FR-02 | 21 筆完整且 id 不重複的 0.5m×0.5m 扣除列 | row_count / deductionAreas；不做部分加總。 |
| C16 | FR-04 | R0 加一筆 3m×4m 扣除區 | non_positive_net_area / deductionAreas；相等也拒絕。 |
| C17 | FR-04 | R0 加一筆 4m×4m 扣除區 | non_positive_net_area / deductionAreas；扣除超過鋪設總和時拒絕。 |
| C18 | FR-02, FR-07 | R0 的扣除列 id 也設為 area-1 | duplicate_id / deductionAreas.0.id；ID 在兩陣列之間也必須唯一。 |
| C19 | FR-02 | R0 的 nameRaw="   "；另測 nameRaw 為 "é".repeat(40) | 第一例核心結果 name=""，繁中 UI/report 依位置顯示「區域 1」、英文顯示「Area 1」；第二例核心名稱成功且恰為 40 個碼點。 |
| C20 | FR-02, FR-07 | R0 的 nameRaw="é".repeat(41)、含 U+000A、或 String.fromCharCode(0xD800) | 分別為 invalid_name / installAreas.0.nameRaw，invalid_unicode / installAreas.0.nameRaw，invalid_unicode / installAreas.0.nameRaw；不得改寫名稱。 |
| C21 | FR-03 | lengthMetersRaw=" \t1.25 "；再逐一輸入 "-1", "+1", "1e3", "1,000", "１", "Infinity", "1 0", ".5", "1." | 外側 ASCII 空白的 1.25 合法且換成 1250mm；其餘每例 invalid_number / installAreas.0.lengthMetersRaw；不得轉成 0、1 或其他數字。 |
| C22 | FR-03 | lengthMetersRaw="1.234"；再測 "1.2345"；tileLengthCmRaw="60.1"；再測 "60.12" | 前兩個公尺值分別接受與 precision_exceeded；兩個公分值分別接受與 precision_exceeded。 |
| C23 | FR-03 | lengthMetersRaw="0"、"1000"、"1000.001"；tileWidthCmRaw="1000"、"1000.1"；reservePercentRaw="0"、"50"、"50.1" | 0 長度 out_of_range；1000m 接受；1000.001m out_of_range；1000cm 接受；1000.1cm out_of_range；0% 與 50% 接受；50.1% out_of_range。 |
| C24 | FR-03 | boxPiecesRaw="1"、"1000"、"0"、"1001"、"1.0" | 1、1000 接受；0、1001 out_of_range；1.0 invalid_number。 |
| C25 | FR-03 | 長度欄 31 個 "0" 後接 "1"（共 32 code units）；再測 32 個 "0" 後接 "1"（共 33） | 32 字元值合法且等於 1；33 字元回 input_too_long。ASCII 外側空白可被忽略但仍計入 32 上限；內部空白拒絕。 |
| C26 | FR-07 | R0 加任意超長 unknown key，例如 "token_dump_user_secret_" + "x".repeat(1000)；另把未知欄設為會遞增計數器的 getter | unknown top-level 回 invalid_request / request；getter 呼叫次數為 0；錯誤序列化結果不包含 key、secret 或 raw 值。 |
| C27 | FR-07 | 分別傳 installAreas[0] 的 unknown key/accessor、缺少 lengthMetersRaw、頂層 symbol/非列舉欄、installAreas 空洞或額外屬性 | row unknown/accessor -> invalid_row / installAreas.0；缺欄 -> invalid_type / installAreas.0.lengthMetersRaw；root symbol/non-enumerable -> invalid_request / request；array hole/extra property -> invalid_rows / installAreas。row 結構錯優先於欄位缺漏。getter 為 0 次，錯誤不含攻擊者 key。 |
| C28 | FR-07 | 將 R0 物件、陣列與列凍結；前後 JSON.stringify 相同 | 成功結果同 C01；輸入深層值、屬性描述與陣列順序不變。 |
| C29 | FR-07, FR-08 | nameRaw="<img src=x onerror=alert(1)>"，其他用 R0 | 核心保留一般文字值；report 以 JSON 字串方式輸出。頁面預期只顯示文字，不生成 img、事件或 script。核心可自動驗文字；DOM 結果屬 UI NOT_RUN_USER_FOCUS_INCIDENT。 |
| C30 | FR-06, FR-08 | 對 C01 成功結果分別 buildReport(result,"zh-Hant") 與 buildReport(result,"en")；另改 result.totals.basePieces="35" | 兩語報告逐字符合 TECHNICAL.md 的固定範例、僅 LF、沒有尾端 LF；輸出為 Unicode JS string，非 byte stream；派生值不一致回 invalid_result / result，沒有文字結果。 |
| C31 | FR-07–08 | 在成功 result 加敏感 unknown key；或以 getter 替換 totals；或稀疏 installAreas；或改 display / exact totals 不一致 | 全部 invalid_result / result；getter 不執行，unknown key 不回顯。合法最大 row/name 長度組合生成的報告須小於 32,768 code units。不得聲稱一個受 schema 上限拒絕的 tampered 結果是合法超大報告測試。 |
| C32 | FR-08–10 | UI 完成 C01 後改長度、改備料、新增／移除列或切換語言 | 每項操作同步移除舊結果與報告；結果區告知需重新試算。此為頁面操作，狀態 NOT_RUN_USER_FOCUS_INCIDENT。 |

## 瀏覽器預期與目前狀態

以下是未來頁面驗收要求，不可由 node:test、DOM mock、靜態掃描或 HTTP request 冒充。依目前焦點事故限制，沒有可操作的隔離 UI 時一律記錄 NOT_RUN_USER_FOCUS_INCIDENT，不得使用本機瀏覽器、隱藏分頁、native app、OS 滑鼠鍵盤、剪貼簿或對話框來補測。

| ID | 對應 | 可重現步驟 | 預期 | 本規格撰寫時 |
|---|---|---|---|---|
| U01 | FR-02, FR-07 | 以鍵盤 Tab 至試算，空白表單提交 | 第一個缺少的鋪設長度欄有可見文字錯誤、aria-describedby 關聯與焦點；不出結果 | NOT_RUN_USER_FOCUS_INCIDENT |
| U02 | FR-08 | 以 R0 試算成功，改任一欄一字 | 舊數字與報告立即清空，不短暫顯示舊結果 | NOT_RUN_USER_FOCUS_INCIDENT |
| U03 | FR-09 | 改輸入後清除，選取消再選確認 | 取消保留草稿；確認回初始一列、磁磚空白、每箱10、備料10.0%、無結果 | NOT_RUN_USER_FOCUS_INCIDENT |
| U04 | FR-09 | 完成 C01 後切換語言，先取消再確認 | 取消留原頁且保留 C01 結果；確認後至另一靜態語言頁，表單、錯誤與結果不在網址或新頁 | NOT_RUN_USER_FOCUS_INCIDENT |
| U05 | FR-02, FR-11 | 在 320 CSS px viewport 輸入 20 列 | 每列標籤、欄位、移除／新增及試算操作可到達；頁面無水平雙向捲動 | NOT_RUN_USER_FOCUS_INCIDENT |
| U06 | FR-11 | 200% 文字縮放並用鍵盤完成 R0 | 欄位、錯誤、主要動作與結果均可讀及使用；焦點不被遮住 | NOT_RUN_USER_FOCUS_INCIDENT |
| U07 | FR-10 | 已載入頁面後離線，不重新載入，計算 R0；檢查瀏覽器網路記錄 | 已載入資源可在記憶體計算；互動無外網／遙測請求。離線重載不作承諾 | NOT_RUN_USER_FOCUS_INCIDENT |
| U08 | FR-10 | pagehide / BFCache 返回 | 回頁不恢復區域、尺寸、假設、錯誤或報告；顯示初始空白狀態 | NOT_RUN_USER_FOCUS_INCIDENT |
| U09 | FR-03, FR-11 | 名稱欄以中文 IME 組字；數字欄以 IME 輸入全形數字或句點 | 組字期間草稿不改寫、不搶焦點；全形數值在試算時被拒絕並保留原字串，提示 ASCII 語法 | NOT_RUN_USER_FOCUS_INCIDENT |

## 本規格未驗

本文件沒有執行產品、node:test、check、build、瀏覽器、網路、SEO crawler、真機或部署測試。上述純函式與頁面案例都待 M1 implementation 與適用隔離方式完成後驗證；NOT_RUN 不得改標 PASS。正式列印、採購實務與真實施工可行性不在本產品範圍。


---

## 原文件 TASKS.md

# 任務與里程碑：tile-estimator

狀態：M0 規格，尚未實作。以下是後續原功能對話可執行的工作順序，不表示任何任務已開始或完成。一次只推進一個工作項；失敗或未驗證時不得勾選後續項。

## 固定工作界線

- 專案：tile-estimator；候選預覽 127.0.0.1:4215，production model 5215；候選正式網域 tiles.glossquote.com；候選公開 repository KYStr/glossquote-labs-tile-estimator。
- 範圍限此工具。Node.js 24+、ES modules、原生 HTML/CSS/瀏覽器 ESM 與 Node built-ins；runtime dependencies 為零。測試只用離線假資料。
- 資料只在記憶體，不使用儲存、URL 中的輸入、遙測、上傳或外部 API。不得加入 clipboard、download、file picker 或外部字型。
- 使用者仍在操作此電腦。所有本機 browser/CUA/native UI 操作，包括隱藏分頁、導航、截圖、OS 滑鼠鍵盤、剪貼簿與原生對話框都禁止。不得新裝替代工具或用 CLI 冒稱 UI 驗收通過。頁面交互必須標記 NOT_RUN_USER_FOCUS_INCIDENT，直到主代理確認真實隔離方案並授權相應驗收。
- 不修改共用首頁、其他工具、Windows 環境、全域 Git 設定或憑證。M2 source publication 須由原功能 chat 依主代理 GO 與共用發布保護流程辦理；本地 M1 不等於公開或部署。

## T00 — 建立可離線工作的專案骨架

前置：M0 規格完成並由主代理開派。

允許路徑：本專案的 package.json、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/en/index.html、public/styles/app.css。不得在本步實作計算核心。

步驟：建立 private ESM package，engines 指定 Node >=24，runtime dependencies 留空；提供 npm test、npm run check、npm run build、npm run dev。dev server 只綁 127.0.0.1:4215 並只提供 public/。build 只將審核過的 public/ 複製到本專案 dist/。兩個語言入口有初始 disabled 狀態、無 JavaScript 說明及基本相同範圍文案。

驗收：node --version 確認主版本 24；npm run check、npm run build 成功，且 package manifest 沒有 runtime dependency。T00 不執行尚未建立測試檔的 npm test；測試命令從 T01 起使用。

完成條件：腳本是真正檢查與建置，不得以永遠成功的 stub 通過。回寫主代理管理的 HANDOFF 記錄為 scaffold-only；不可標成有功能。

## T01 — 精確純函式與報告 schema

前置：T00 通過。

允許路徑：public/js/core/tile-estimator.mjs、public/js/core/report.mjs、test/tile-estimator.test.mjs、test/report.test.mjs。

步驟：依 TECHNICAL.md 實作封閉 request/result/error schema、descriptor 安全檢查、strict ASCII 數字解析、BigInt 單位轉換、淨面積與整箱公式、half-up 顯示、雙語固定報告驗證。對 ACCEPTANCE.md C01–C31 中純函式案例建立 node:test；所有錯誤無 partial result、無輸入回顯。

驗收：node --test；至少覆蓋最小／最大尺寸、reserve=0/50、20+20 列、扣除相等與超過、前導零與 32 字元邊界、精度／語法錯誤、getter 不執行、unknown key 不回顯、凍結輸入不變、報告派生值重算。所有測試離線、只用假資料。

完成條件：公式和 fixture 逐欄吻合；不得以浮點運算決策、局部成功結果或鬆散 schema 換取測試通過。回寫純函式與測試範圍。

## T02 — 雙語工作表與可見狀態

前置：T01 通過。

允許路徑：public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、public/js/render.mjs。只可增加本任務必要的本專案 test/ 測試，不得修改共用文件。

步驟：建立桌面及手機工作表；新增／移除矩形；提供相同尺寸磁磚／板材、每箱片數與備料欄；以明確按鈕試算；顯示完整面積、片數、箱數與精確 mm²。錯誤使用固定雙語文案與欄位關聯；使用者文字只當文字；輸入事件即刻清除舊結果。數字欄不自動改寫草稿。

驗收：node --test、npm run check。可由靜態與單元檢查驗證語系檔、selector 與 state reducer；不以此宣稱 browser PASS。U01、U02、U05、U06 仍標 NOT_RUN_USER_FOCUS_INCIDENT。

完成條件：主要操作雙語一致；最大 40 區域仍能用單欄逐列編輯；無外部資源、hidden network、dangerous DOM injection。回寫 UI 交互實作與尚未驗收項。

## T03 — 清除、語言切換、離頁與唯讀報告生命週期

前置：T02 通過。

允許路徑：public/js/app.mjs、public/js/render.mjs、public/index.html、public/en/index.html、public/styles/app.css、public/js/core/report.mjs、test/*.test.mjs。

步驟：加入頁內確認；取消保留目前草稿和結果，確認清除回初始設定；語言切換只有確認後才導航且不攜帶內容。report 只顯示唯讀文字；不得新增複製／匯出。pagehide 清理 state 和報告，BFCache 返回建立初始狀態。所有交互同步，無 async 取消競態。

驗收：node --test、npm run check。測試報告 schema、LF 換行與 Unicode 字串規則、未知欄位和不一致 derived 欄位拒絕，以及確認狀態邏輯。實際頁面確認、焦點與 BFCache 項仍是 NOT_RUN_USER_FOCUS_INCIDENT。

完成條件：修改、清除、確認取消、確認接受、語言切換及離頁均不能展示過期結果；不得呼叫 Storage、URL、clipboard、Blob、file、network API。回寫生命週期範圍與未測項。

## T04 — SEO、無外部資源與靜態建置檢查

前置：T02、T03 通過。

允許路徑：public/index.html、public/en/index.html、public/styles/app.css、public/js/**、scripts/check.mjs、test/*.test.mjs。禁止修改工具外的首頁或共用發布文件。

步驟：依 UX-SEO.md 落實雙語 title、description、H1、FAQ、語言切換與 preview noindex；在 check 中檢查必要靜態標記、同源資源與禁止項。production canonical/hreflang/x-default 只有主代理確認候選網址及 M2 授權後才在 production 產物生成；preview 繼續 noindex。不得在規格階段添加虛構 FAQ schema 或索引宣稱。

驗收：npm run check、node --test、npm run build。可用靜態檢查驗證 source 與 dist/ 標記，不代表已上搜尋引擎或完成 SEO 爬蟲驗收。

完成條件：雙語文案彼此完整且不含流量、採購保證、施工建議等未證明宣稱；沒有外部 font/CDN/API。回寫 SEO 與建置檢查結果。

## T05 — 本機 CLI 候選交接（M1 範圍）

前置：T00–T04 全部成功；若工作樹檔案有變更，對受影響的既有 gate 重跑。

允許路徑：本專案 scripts/**、test/**、public/**、dist/** 與主代理管理的 HANDOFF 證據欄位。不得公開 GitHub、部署或操作瀏覽器。

驗收命令：node --version；node --test；npm run check；npm run build；再用純 CLI 驗證 build 輸出只含允許靜態檔、雙語檔案存在、preview noindex、沒有遠端資源引用。不能把 HTTP 靜態回應、DOM mock 或字串掃描稱為真實 UI 驗收。

完成條件：建立可交主代理審查的本機 candidate；逐項記錄命令與輸出來源。核心與建置可標明已執行的 CLI 結果；瀏覽器／真機交互固定為 NOT_RUN_USER_FOCUS_INCIDENT。除非主代理後續確認隔離 UI gate，M1 不得標成完整 UI PASS。回寫候選版本、source 狀態、已驗與 NOT_RUN 清單；不宣稱已發布或已部署。

## 後續閘門（由主代理持有）

- M2：只有主代理 GO 後，原功能 chat 才可進行 production toolchain 與公開 GitHub source repository；分別驗證 source commit、公開可見性及 production 產物。此階段不部署。缺少憑證能力時停止，不改系統 Git 設定。
- M3：Cloudflare 部署、domain/live 驗證及首頁 bilingual catalog 加入、建置與部署全部由主代理負責；只有 live tool 與首頁兩語驗證完成才可改公開狀態。
- 外部真機、瀏覽器隔離、實際施工／採購結果等未驗項要保留 NOT_RUN 或其明確限制；M1/M2/M3 不互相替代。

