# 密碼強度檢查 / Password Strength Checker

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-password-strength-checker-20261121` · 2026-11-21 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者在註冊新帳號或更換舊密碼前，想知道手上這組密碼到底有多難猜——不是一句沒有根據的「很強」，而是可重算的熵位元、強度等級、預估破解時間，以及下一句該怎麼改。

- 桌面。桌面在密碼欄貼上現有密碼，按下評估，看到熵、等級、兩種攻擊情境的破解時間與逐項扣分，再按建議改一版重測。
- 行動。手機在更換密碼的當下快速檢查一組候選密碼，不離開本機頁面。

使用情境為設計假設。密碼只保留在目前頁面記憶體，離頁即丟棄；本工具不產生密碼、不查詢任何外部資料庫、不儲存任何內容。

## scope

單一密碼輸入、釘版的自訂加權評分模型（字元池熵減模式扣分）、固定 16 條常見密碼表與 40 詞字典表、雙語靜態頁、報告下載。非目標為產生密碼或密碼片語、洩漏／外洩資料庫查詢（需要網路且會送出雜湊）、密碼儲存、管理員／保險庫功能、自動填入、特定網站的密碼政策範本、百分比式「安全分數」、以及任何保證（保證密碼不會被破解）。

評分模型出處說明。本工具**沒有實作 zxcvbn**：zxcvbn（Dropbox 開源）以模式分段估算猜測次數，其完整分段邏輯未在此重現。本工具只沿用 zxcvbn 公開的兩種攻擊速率假設（線上未限流 10 次／秒、離線快雜湊 10¹⁰ 次／秒，見 implementation），其餘評分規則皆為本文自訂並釘版的加權規則，權重見 inputsOutputs。強度等級門檻（28 / 36 / 60 / 80 bits）與 `docs/specs/password-generator/` 的檢查模式共用同一組門檻，但該工具的扣分表與本工具不同，兩者結果不必一致。

已與本 checkout 內 `docs/specs/` 的既有規格比對，最相近者的實質差異如下。

- password-generator：以**產生**密碼為主（CSPRNG、字元集開關、片語模式），檢查只是附屬模式，且其檢查模型使用 7,776 詞內建詞表與另一套扣分表。此處只做檢查、不產生任何密碼、不用 CSPRNG、不用 7,776 詞表，扣分表與建議碼皆由本文獨立釘版。 [docs/specs/password-generator/SPEC.md](../password-generator/SPEC.md)
- cipher-lab：對使用者提供的文字做古典密碼的確定性轉換（教學用），不評估任何密碼的強度，也不處理猜測難度。 [docs/specs/cipher-lab/SPEC.md](../cipher-lab/SPEC.md)
- jwt-decoder：解碼已持有的 token 並標示簽章未驗證，不評估密碼、不產生熵。 [docs/specs/jwt-decoder/SPEC.md](../jwt-decoder/SPEC.md)

判定規則由本文定義，無線上資料或外部服務依賴。常見密碼表與字典表為本文凍結的靜態資料（見 inputsOutputs），不隨外部榜單更新而變動。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「密碼 / Password」（`type="password"`，`autocomplete="off"`，拼寫檢查關閉），附「顯示／隱藏 / Show / Hide」切換。
- 「評估強度 / Check strength」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 的 `troubador-strong` 案例（`Tr0ub4dor&3`，合成範例密碼），明示範例並等待手動執行。「清除 / Clear」清空密碼欄與結果。
- 結果先摘要再列細節：最終熵（bits）、強度等級（雙語標籤＋色條，顏色不作唯一區分）、兩種攻擊情境的預估破解時間、逐項扣分表（扣分碼、雙語說明、扣 bits）、改進建議清單。成功才顯示「下載報告 / Download report」。文字可手動選取；**結果區絕不引述密碼本身或其任何子字串**（扣分說明只寫特徵，例如「包含字典單字」，不寫出是哪個單字）。
- 頁面固定顯示免責說明（雙語，見 tests 節）：強度數字是模型估算，不是保證；密碼絕不離開本頁。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。空結果有說明。若含待修列，以文字及符號提示。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"password":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤；狀態播報只說等級與熵（例如「強，72.1 bits」），絕不朗讀密碼。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。明示檔案欄才處理原始 bytes。長度以 Unicode code points 計（JS：`[...password].length`）。

- 唯一欄位 `password`：字串，0–128 code points。空字串為 EMPTY；超過 128 為 INPUT_LIMIT；含孤立代理字元（lone surrogate）為 UNICODE。無其他文法限制：任何可輸入的字元皆可評估（含空白與非 ASCII）。
- 預設 `password` 為 `""`（空）。

先容量、再 surrogate、再該欄文法。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、超列 ROW_LIMIT、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 來源列／操作序號或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依上列順序驗證 `password`。raw 超限 INPUT_LIMIT、孤立代理 UNICODE、空字串 EMPTY，field 皆為 `password`，row 皆為 null。
2. 字元類別（以 code point 判定，順序固定為 lowercase、uppercase、digits、symbols、other）：
   - lowercase：`a`–`z`，池 26；uppercase：`A`–`Z`，池 26；digits：`0`–`9`，池 10；symbols：32 個 ASCII 標點 `!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~`，池 32；other：不屬於前四類的任何字元（含空白與全部非 ASCII），池 32。
   - `pool` 為出現類別的池大小之和（例如四類全有為 94；僅小寫＋other 為 58）。`passwordLength` 為 code points 數。
3. 基礎熵 `baseEntropyBits = passwordLength × log2(pool)`，以雙精度浮點 `log2` 計算後，**半進位（round half away from zero）至 1 位小數**，此後全程使用該 1 位小數值。`pool` 為 0 只在空密碼發生，而空密碼已在步驟 1 拒絕，故此處 pool ≥ 10。
4. 扣分（每項至多觸發一次，DICTIONARY_WORD 除外；扣分先逐項列出，再加總；加總後**上限 40 bits**）：
   - `COMMON_PASSWORD` −30：密碼整體（以 `toLowerCase()` 比較）等於下表 16 條之一。來源：NordPass「Top 200 most common passwords」2024 年版全球個人榜（https://nordpass.com/most-common-passwords-list/ ，與 NordStellar 共同編製）；本表只收錄經該榜公開報導可核對的名次，凍結如下，不隨榜單更新：`123456`、`123456789`、`12345678`、`password`、`qwerty123`、`qwerty1`、`111111`、`12345`、`secret`、`123123`、`qwerty`、`abc123`、`dragon`、`monkey`、`123123123`、`qwertyuiop`。
   - `DICTIONARY_WORD` −12／每個不同單字，至多計 2 個（−24）：密碼小寫化後包含下表 40 詞任一者作為子字串（長度 ≥4 者皆符合；不做 leet 還原，`P@ssw0rd` 不視為含有 `password`）。計入順序依下表順序，先出現的兩個。凍結詞表（本工具自訂，非外部語料庫）：`password`、`admin`、`welcome`、`monkey`、`dragon`、`football`、`sunshine`、`master`、`shadow`、`superman`、`qwerty`、`letmein`、`trustno1`、`iloveyou`、`princess`、`summer`、`winter`、`hello`、`secret`、`freedom`、`cheese`、`cookie`、`banana`、`tiger`、`soccer`、`baseball`、`charlie`、`jordan`、`michael`、`correct`、`horse`、`battery`、`staple`、`autumn`、`spring`、`pepper`、`orange`、`apple`、`hockey`、`whatever`。
   - `REPEAT_RUN` −8：存在 ≥3 個相同 code point 連續出現。
   - `SEQUENCE` −8：存在長度 ≥4 的連續遞增或遞減序列，且全為數字或全為字母（比較前先小寫化；例如 `abcd`、`1234`、`4321`）。
   - `KEYBOARD_WALK` −8：存在長度 ≥4 的子字串，出現在 QWERTY 橫列或其反向之一。橫列凍結為：`1234567890`、`qwertyuiop`、`asdfghjkl`、`zxcvbnm`（比較前先小寫化；`1234` 同時符合 SEQUENCE 與 KEYBOARD_WALK，兩項皆扣）。
   - `YEAR` −6：存在 4 位數字子字串，數值在 1900–2099 之間。
   - `REPEATED_PATTERN` −10：密碼恰為某較短子字串（長度 ≥2）重複 ≥2 次的完整串連（例如 `Aa1!Aa1!Aa1!`）。
   - `SHORT_LENGTH` −10：`passwordLength < 8`。
   - `SINGLE_CLASS` −8：只出現一個字元類別。
   - 扣分列出順序固定為上列順序。`totalPenaltyBits = min(40, 各項之和)`。
5. `finalEntropyBits = max(0, baseEntropyBits − totalPenaltyBits)`（已為 1 位小數）。強度等級（門檻與 password-generator 檢查模式共用）：`<28` very weak／非常弱；`28–35.9` weak／弱；`36–59.9` fair／普通；`60–79.9` strong／強；`≥80` very strong／非常強。
6. 預估破解時間。猜測次數 `guesses = 2^finalEntropyBits`（平均情況取一半的說法不採用；本工具以全部猜測次數計，見 implementation 註記）。兩種情境速率沿用 zxcvbn 公開的攻擊模型（Dropbox zxcvbn `time_estimates`）：線上未限流 10 次／秒（`crackTimeOnline`）、離線快雜湊 10¹⁰ 次／秒（`crackTimeOffline`）。秒數 `= guesses / rate`，再按以下規則格式化為雙語字串（數值一律半進位至 1 位小數後再選單位；單位選取以未捨入秒數為準；1 年 = 31,557,600 秒，即 365.25 天）：
   - 秒數 < 1：`<1 秒` / `<1 second`；
   - < 60 秒：`X.X 秒` / `X.X seconds`；
   - < 3,600 秒：`X.X 分鐘` / `X.X minutes`；
   - < 86,400 秒：`X.X 小時` / `X.X hours`；
   - < 31,557,600 秒：`X.X 天` / `X.X days`；
   - 其餘：`X.X 年` / `X.X years`（不加千分位分隔符，不縮寫為萬／百萬）。
7. 改進建議。依觸發條件產生建議碼，順序固定：`S_COMMON`（COMMON_PASSWORD）→ `S_DICT`（DICTIONARY_WORD）→ `S_REPEAT`（REPEAT_RUN 或 REPEATED_PATTERN）→ `S_SEQ`（SEQUENCE 或 KEYBOARD_WALK）→ `S_YEAR`（YEAR）→ `S_LENGTH`（`passwordLength < 12`）→ `S_CLASSES`（類別數 < 3）。無任何建議時為空陣列 `[]`，畫面顯示固定文案「沒有需要改進的地方 / No improvements needed」。建議碼對應文案（雙語，逐字固定）：
   - `S_COMMON`：避免使用常見密碼 / Avoid common passwords
   - `S_DICT`：避免使用字典單字 / Avoid dictionary words
   - `S_REPEAT`：避免重複字元或重複片段 / Avoid repeated characters or repeated segments
   - `S_SEQ`：避免連續字母、數字或鍵盤序列 / Avoid sequential letters, digits, or keyboard runs
   - `S_YEAR`：避免使用年份 / Avoid using a year
   - `S_LENGTH`：使用至少 12 個字元 / Use at least 12 characters
   - `S_CLASSES`：混合大小寫字母、數字與符號 / Mix upper- and lowercase letters, digits, and symbols
8. 結果物件（鍵名固定，順序不拘於機器比較；fixture 採此順序）：`{passwordLength, classes, pool, baseEntropyBits, penalties:[{code, bits}], totalPenaltyBits, finalEntropyBits, band, crackTimeOnline:{zh,en}, crackTimeOffline:{zh,en}, suggestions}`。其中 `classes` 依步驟 2 的固定順序列出出現的類別；`band` 為英文鍵（`very weak`／`weak`／`fair`／`strong`／`very strong`）；`penalties` 不含任何密碼子字串（不寫出比對到的字典單字）。

固定下載 `password-strength-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。**報告只含 result 本身，絕不含密碼或其子字串。**報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。機器值不隨 locale 改。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/password-strength-checker/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。不能取消的 File.arrayBuffer 晚到也丟棄。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 密碼處理（本工具的核心承諾）：密碼欄為 `type="password"`，`autocomplete="off"`，拼寫檢查關閉；密碼只存在於頁面記憶體與 Worker 訊息中，不寫入任何 storage，不出現在 URL、title、console、日誌或執行證據；結果區與報告絕不引述密碼或其子字串；**不提供複製密碼按鈕**（使用者本來就持有該密碼，複製只會讓密碼多留一份在剪貼簿）；清除／重設／離頁即丟棄。顯示／隱藏切換只改欄位遮罩，不另存明文。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

註記：破解時間以全部猜測次數 `2^finalEntropyBits` 計，未取一半平均值；取一半只會讓所有時間數字恰好減半（在對數尺度上差不到 1 bit 的顯示差異），本文選擇較保守的全部次數，並在此明示，builder 不得自行改為一半。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「評估強度」，畫面和完整報告符合核心 fixtures，使用者取得對應產物；扣分逐項、等級、兩種破解時間、建議皆與 fixture 一致。 |
| boundaries | 合法端點、剛好越界、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log；密碼不出現在 URL、title、console、報告或執行證據中。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose；密碼無複製路徑、無持久化。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；免責說明常駐可見。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion；狀態播報不朗讀密碼。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。14 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `troubador-strong` | 四類字元、無扣分：強 |
| `common-password` | 常見密碼＋字典詞＋單一字元類，扣分觸頂 |
| `common-numeric` | 常見純數字＋序列＋鍵盤行＋過短，扣分觸頂 |
| `passphrase-dictionary` | 長密碼片語：字典詞扣分仍非常強 |
| `leet-lookalike` | 形似常見密碼但無 leet 還原：不扣分，普通 |
| `random-12` | 12 字元隨機四類：強，無建議 |
| `random-16` | 16 字元隨機四類：非常強，無建議 |
| `common-keyboard` | 常見密碼＋字典詞＋鍵盤行：非常弱 |
| `repeated-pattern` | 重複片段扣分：強 |
| `dictionary-year` | 字典詞＋年份扣分：普通 |
| `sequence-weak` | 序列＋鍵盤行雙重扣分：非常弱 |
| `non-ascii` | 非 ASCII 計入 other 類＋年份扣分：非常強 |
| `empty-password` | 空密碼為 EMPTY 錯誤 |
| `too-long-password` | 129 碼超過上限為 INPUT_LIMIT 錯誤 |
| `state-dirty-error` | 先產出真結果，再改為空密碼，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限（128 碼）、剛好超限（129 碼）、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證長度 8／12 邊界、等級門檻 28／36／60／80 的上下 0.1 bits、扣分上限 40 的觸頂與未觸頂、字典詞至多計 2 個、`1234` 同時觸發 SEQUENCE 與 KEYBOARD_WALK。所有已接受的結果皆不含密碼或其子字串。

候選 gate（均 NOT_RUN）

- 於 `tools/password-strength-checker/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案；**不得在測試或證據擷取中使用任何真人的真實密碼**。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「密碼強度檢查」，title「密碼強度檢查｜Gloss Tools」，description「輸入密碼，立即看到熵、強度等級、預估破解時間與改進建議；密碼絕不離開本頁、不儲存。」。英文 lang=en，H1 “Password Strength Checker”，title “Password Strength Checker | Gloss Tools”，description “Check a password's entropy, strength band, estimated crack time, and concrete improvements — computed locally, never sent or stored.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- 免責說明（雙語，固定文案，兩頁皆常駐顯示）：「強度數字是模型估算，不是保證；再強的密碼也可能因外洩、釣魚或重複使用而失效。密碼絕不離開本頁、不儲存。」 / “Strength figures are model estimates, not a guarantee — even a strong password can fail through leaks, phishing, or reuse. Your password never leaves this page and is never stored.”
- FAQ。這個等級是保證嗎？不是保證，是依本文公開模型的估算。 / Is this band a guarantee? No — it is an estimate under this page's published model.
- FAQ。我的密碼會被傳送或儲存嗎？不會。全部計算都在你的瀏覽器本機完成，不傳送、不儲存、不寫入網址或紀錄。 / Is my password sent or stored? No. All computation runs locally in your browser; nothing is sent, stored, or written to the URL or logs.
- FAQ。為什麼 `P@ssw0rd!` 只有「普通」？本工具不做 leet 還原（`@` 不視為 `a`），該密碼 9 碼、四類字元，基礎熵 59.0 bits，落在 36–59.9 的「普通」區間。 / Why is `P@ssw0rd!` only “fair”? This tool does no leet substitution (`@` is not read as `a`); at 9 characters across four classes its base entropy is 59.0 bits, inside the 36–59.9 “fair” band.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://password-strength-checker.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/password-strength-checker/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
