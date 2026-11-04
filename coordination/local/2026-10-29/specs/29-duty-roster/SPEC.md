# 輪值排班表 — 既有規格保存

Task ID: `labs-29-duty-roster` · Spec ID: `spec-29-duty-roster`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：輪值排班表

> 這是規格文件；產品尚未實作，以下需求仍待 M1 驗證。

## 產品邊界

目標使用者是班級、社團與家庭中的名單管理者。每個指定輪值日安排一位成員。使用者可選有限的起訖日期、輪值星期、成員順序及各成員可輪值星期。結果包含每一個輪值日；沒有候選人的日期必須保留為未排。

本工具不提供勞務法規判斷、多班或多種班次，不評估公平或工作量，也不提供隨機抽籤、最佳化或跨日期補位。依星期輪替只是可預期的序列規則，不能代表工作量公平。

## 功能需求

### FR-01 語言、頁面和工作狀態

- 繁體中文頁面位於 /index.html，英文頁面位於 /en/index.html。兩者具有完整等價的欄位、錯誤、結果、報告、FAQ 和鍵盤操作。
- 語言切換會離開目前頁面並清除尚未保存的草稿；切換控制旁明文告知。頁面不承諾自動保存。
- 首次載入狀態：開始與結束日期空白；輪值星期預設週一至週五；名單有一位空白姓名成員且預設週一至週日皆可輪值；沒有結果。
- 載入範例是明確按鈕。它填入 2026-10-19 至 2026-10-23、週一至週五輪值、A 可於週一/三/五、B 可於週二/四；範例值標示為示例。若已有輸入，先告知範例會取代目前輸入並提供取消。
- 所有輸入在同一頁記憶體內處理。每次頁面載入都從上述初始狀態開始。

### FR-02 僅按使用者選定的輪值日排程

- 使用者明確輸入開始與結束日期，兩端都包含在檢查範圍內。
- 根 weekdays 是 ISO 星期編號：1=週一、2=週二、3=週三、4=週四、5=週五、6=週六、7=週日。根陣列必須非空且不重複。
- 根 weekdays 中的每個星期都是輪值日。範圍內其他日期不輸出、不隱式補入。若該有限範圍沒有任何所選輪值日，整體輸入失敗並回報 NO_DUTY_DATES；不可顯示「成功，已排 0 天」。

### FR-03 成員與識別

- 成員數量為 1 至 30 位。每筆資料精確包含 id、nameRaw、weekdays 三欄。
- id 是唯一、區分大小寫的 ASCII 識別碼，長度 1 至 40 字元，字元僅限 A-Z、a-z、0-9、底線與連字號。介面自行產生如 person-1 的識別碼；重排時保留識別碼，刪除後可重用目前名單中未使用的 person-1 至 person-30。姓名不得作為 key。
- 姓名去除首尾空白後必須有 1 至 80 個 Unicode code point；同名允許。原始姓名最多 512 個 UTF-16 code unit。姓名中的 C0/C1 控制字及孤立 UTF-16 surrogate 一律拒絕；有效 surrogate pair 是一個 code point。錯誤不得回顯原始文字。
- 不做 Unicode 正規化；只以 JavaScript trim 的首尾空白語義去除前後空白；內部空白原樣保留。
- 個人 weekdays 是 ISO 星期編號的子集，允許空陣列。空陣列表示該成員任何星期都不可輪值，介面必須明顯提示，不可將空陣列誤解為「全週可用」。
- 結果畫面和報告以當次名單的 1 起算序號區分成員，例如「成員 1：Kai」。即使姓名不同也顯示序號；同名不得只用相同姓名顯示。機器 id 只在核心結果中保留，不在一般 UI、報告或網址中呈現。

### FR-04 日期、日期上限和精確驗證

- 日期只接受精確 YYYY-MM-DD 字串，不 trim。有效日期範圍為 Gregorian 1900-01-01 至 2099-12-31。
- 結束日不得早於開始日；含首尾日的整體跨度最多 366 日。367 日必須拒絕。
- 只處理 Gregorian 日期，不接受時間、時區或本地化日期。閏年採 Gregorian 規則。計算不受 DST、系統時區或瀏覽器日期解析器影響。
- 日期格式錯誤、月/日不存在、超出年份範圍、日期逆序和跨度超限各有固定錯誤碼；精確驗證順序見 TECHNICAL.md。

### FR-05 固定輪替規則

- 起始游標永遠是目前名單第一位。
- 逐一按日期先後處理範圍內的輪值日。當天從目前游標位置往後循環掃描名單，選第一位當日 weekday 可輪值的人。
- 選中後，游標移到該人之後一位；即使跳過了不可用成員也如此。若整圈無人可用，該日標示未排且游標保持原位。
- 重排名單會改變序列；在任何輸入編輯後舊結果立即清除，使用者必須重新按「產生輪值表」。不得暗中補入非輪值日期或覆蓋無候選日期。

### FR-06 完整結果與部分結果

- 成功計算的 days 按日期遞增，包含範圍內全部輪值日。每行精確包括 date、weekday、personNumber、personId、personName。未排行的 personNumber、personId、personName 必須全為 null。
- counts 按當時計算的名單順序包含每一位成員，欄位為 personNumber、personId、personName、count；即使 count 為 0 也列出。
- 結果另含 assignedCount、unassignedCount、totalDays。totalDays 等於 days.length；assignedCount + unassignedCount 等於 totalDays；counts 中 count 總和等於 assignedCount。
- 有輪值日期但全部無候選人仍是有效的部分結果：逐日列出所有未排日期，顯示「部分排定／未排 N 天」，不可使用代表完成的成功標籤或隱藏未排日期。
- UI 結果列以 personNumber 區分姓名，counts 也使用同一序號；機器 id 不顯示。

### FR-07 結果文字、剪貼簿和下載

- buildReport(result, lang) 接受成功結果及 zh-TW 或 en，產生固定名稱 glossquote-duty-roster.txt 的純文字報告。內容使用 LF，無 UTF-8 BOM，末尾無 LF；回傳 MIME 為 text/plain;charset=utf-8。
- 報告按日期列出每個輪值日和每位成員的序號/姓名/次數。未排的每一個日期都有獨立明確的「未排」或「Unassigned」列。不得只寫總數而漏掉日期。
- 複製和下載只有使用者明確操作才執行；不讀取原有剪貼簿內容。拒絕或不支援時保留畫面結果，顯示可手動選取報告文字的替代方式，不謊稱成功。
- 下載另於剪貼簿作業管理。最多同時保留 8 個未清理 Object URL，各 URL 建立 30 秒後回收。第 9 個要求必須明確受阻並提示稍後重試。清除或 pagehide 會清除計時器並立即 revoke 尚存 URL。
- 清除或 pagehide 不會刪除瀏覽器已完成或已接收的下載檔案。不可聲稱可撤回已交給瀏覽器/作業系統的檔案。

### FR-08 編輯失效與生命週期

- 日期、根 weekday、姓名、個人 weekday、新增、刪除、上移或下移任何一項變動，立即淘汰結果、報告預覽與複製/下載操作，並同步提高 revision。顯示「輸入已變更，請重新產生輪值表」。
- 清除按鈕先開啟可取消的確認對話框。取消保留輸入、結果和狀態；確認後回到 FR-01 初始狀態，增加 revision/page generation 並回收任務資源。
- pagehide 必須清除輸入、結果、暫存、未完成作業 epoch、計時器及 Object URL。若 BFCache 恢復頁面，pageshow 必須呈現初始狀態，不恢復草稿。
- 非同步剪貼簿成功、拒絕與 finally 都必須核對 revision、request ID、page generation 及 copy epoch。編輯後才完成的舊 promise 不得顯示複製成功。非同步呼叫一經交給瀏覽器可能無法取消；此時只能抑制過期 UI 回報。

### FR-09 安全與資料生命週期

- 輸入只用 value/textContent 等文字介面呈現；不得以 innerHTML、eval、Function 或 HTML 注入姓名。
- 不寫 localStorage、sessionStorage、IndexedDB、Cache、Cookie、Service Worker 或含資料的 URL；不向 console、遙測或網路輸出輸入/結果。
- 不含外部字型、CDN、圖示服務、外部 API、分析或隱藏網路。初次取得網站靜態檔案是必要載入，不能宣稱「完全無網路」。
- 原始輸入與錯誤值不輸出到日誌；錯誤只回傳固定 code 和 path。

### FR-10 使用環境與名單操作

- 名單支援新增到最多 30 位、刪除、上移和下移；序號隨當前可見順序而定。排序改變立即清結果並要求重新計算。
- 每位成員的星期選擇可局部展開；收合時仍顯示可用日摘要。每列提供「全選」及「全清」快捷操作。行為可用鍵盤完成。
- 320 CSS px 寬度下，頁面本身不得水平捲動；密集結果表可在自己的具名區域內捲動。長姓名換行，不能切斷必要資訊。
- 主要操作、狀態、欄位錯誤、空名單、部分結果和動態更新都須有可理解的文字與鍵盤/輔助科技狀態。

## 錯誤輸出契約摘要

每次計算只回傳第一個錯誤，形式為 { ok: false, error: { code, path } }。不回傳原始值或例外訊息。驗證順序和完整固定碼見 TECHNICAL.md。使用者需可見並可恢復；不因錯誤保留舊結果。

## 未來範圍

本 MVP 不包含週期模板、假日、臨時不可用日、多班、群組協作、雲端、同步、日曆格式、CSV/ICS、通知、薪酬/法規規則或公平最佳化。每項未來功能需另行明確授權與規格。

## 固定契約

實作前並行遵守[功能對話契約](AGENTS.md)、[工程契約](docs/ENGINEERING.md)、[隱私與安全](docs/PRIVACY-SECURITY.md)及[設計系統](docs/DESIGN-SYSTEM.md)。


---

## 原文件 TECHNICAL.md

# 技術契約：輪值排班表

> 這是規格文件；尚未有程式碼或產品測試結果。

## 執行環境與依賴

- 產品為原生 HTML、CSS、瀏覽器 ESM 靜態頁面。Node.js 24+ 只供開發、測試、檢查、建置與本機伺服器。不得新增 runtime、dev 或 test 外部套件。
- ESM 使用明確副檔名與相對路徑。正式頁面不執行 Node，不呼叫模型、API、外部網址或其他工具。
- 本機預覽綁定 127.0.0.1:4209，只服務 public/。port 衝突時保留既有程序並回報，不按程序名稱或連接埠終止其他工作。
- M2 的 127.0.0.1:5209 是獨立本機 HTTP production 候選模型，用於模擬 Cloudflare 回應/標頭以測候選產物；它不是 AI 模型、正式站或產品 API，產品頁不得向它送資料。M1 不啟動該模型。詳細 gate 見 docs/RELEASE.md。
- 初次載入需 GET 自己的靜態 HTML/CSS/ESM 檔案；產品操作後不應產生 fetch/XHR/WebSocket/beacon 等請求。

## 預定檔案樹

    package.json
    .gitignore
    public/
      index.html
      en/index.html
      styles/app.css
      js/app.js
      js/core/roster.js
      js/core/report.js
    scripts/
      serve.mjs
      check.mjs
      build.mjs
      model.mjs                 # 僅 M2 本機候選模型
      build-production.mjs      # 僅 M2；另產生 dist-production/
      check-production.mjs      # 僅 M2
      preview-production.mjs    # 僅 M2；本機 HTTP 候選
    test/
      roster.test.mjs
      report.test.mjs
      ui-state.test.mjs
      security-contract.test.mjs
      browser-checklist.md
    dist/                       # M1 本機 preview build；不發布
    dist-production/            # M2 production candidate；不覆蓋 dist/

正式兩語路徑為 /index.html 及 /en/index.html。M1 的 preview build 須 noindex,nofollow；M2 production build 才加入正式 canonical/hreflang/索引資訊，細節以 docs/RELEASE.md 為準。

M1 package.json 契約：type=module、private=true；npm run dev 執行 node scripts/serve.mjs；npm test 執行 node --test；npm run check 執行 node scripts/check.mjs；npm run build 執行 node scripts/build.mjs。M2 才新增 build:production、check:production、preview:production。check/build 全離線，只處理固定 allowlist，拒絕未知檔案、連結/重解析路徑與 stale output；不讀帳戶、兄弟專案或憑證。

## calculateRoster(request) 精確契約

### 輸入物件

根物件只允許自有 key startRaw、endRaw、weekdays、people；每筆 person 只允許自有 key id、nameRaw、weekdays。Key 集合大小寫精確、順序不具語義。根/列物件是一般 Object.prototype plain object。每個必要 key 必須是 enumerable data property；以 descriptors 讀取，禁止呼叫 getter。拒絕未知、symbol、非列舉自有欄位及 accessor 欄位。

所有陣列都必須是一般 Array.prototype 陣列、dense、無孔洞、索引為自有 enumerable data property，且沒有額外 string/symbol/custom own property。索引逐一檢查，不可用會跳過 hole 的迭代語法來默認接受稀疏陣列。反射檢查發生例外時 fail closed。程式不得修改 request。

精確型別及界限：

- startRaw、endRaw 是不超過 10 個 UTF-16 code unit 的字串；格式必須精確符合四位數年、兩位月、兩位日的 YYYY-MM-DD。空白不 trim。
- weekdays 是長度 1..7 的唯一 ISO 星期整數陣列，每值 1..7。
- people 是長度 1..30 的陣列。
- id 是符合 ^[A-Za-z0-9_-]{1,40}$ 的 ASCII 字串，大小寫敏感且整份名單唯一。
- nameRaw 是最多 512 UTF-16 code unit 的字串；先拒絕 U+0000..U+001F/U+007F..U+009F 控制字與孤立 surrogate，再 trim，trim 後 1..80 Unicode code point。有效 surrogate pair 計一個；不做 NFC/NFKC 正規化。
- 每位 person.weekdays 是長度 0..7 的唯一 ISO 星期整數 dense array。空陣列表示永遠不可輪值。

### 固定錯誤與優先順序

錯誤為第一個錯誤且形狀精確是 { ok: false, error: { code, path } }；path 使用 JSON Pointer 形式，不包含值。順序如下，同一陣列由 index 小到大檢查：

1. 根物件形狀/type/key/descriptor：REQUEST_SCHEMA，path /。
2. startRaw：非字串、過長或格式不符 START_DATE_FORMAT，path /startRaw；格式正確但非 Gregorian 有效日 START_DATE_INVALID，path /startRaw；有效日但年份不在 1900..2099 START_DATE_RANGE，path /startRaw。
3. endRaw 套用 END_DATE_FORMAT、END_DATE_INVALID、END_DATE_RANGE，path /endRaw。
4. end 早於 start：DATE_ORDER，path /endRaw；含端點跨度大於 366 日：DATE_SPAN_LIMIT，path /endRaw。
5. 根 weekdays 非合格普通 dense 陣列：WEEKDAYS_SCHEMA，path /weekdays；空陣列 WEEKDAYS_EMPTY，path /weekdays；值非 1..7 整數 WEEKDAY_INVALID，path /weekdays/i；重複 WEEKDAY_DUPLICATE，path /weekdays/i。
6. people 非合格普通 dense 陣列 PEOPLE_SCHEMA，path /people；筆數不是 1..30 PEOPLE_COUNT，path /people。
7. 每列依序檢查：普通物件/精確 keys/descriptor 不合格 PERSON_SCHEMA，path /people/i；id 格式錯 PERSON_ID_INVALID，path /people/i/id；id 重複 PERSON_ID_DUPLICATE，同一 path；nameRaw 型別錯 PERSON_NAME_TYPE，同一列的 nameRaw；超 512 code unit PERSON_NAME_RAW_LIMIT；控制字 PERSON_NAME_CONTROL；孤立 surrogate PERSON_NAME_SURROGATE；trim 後空白 PERSON_NAME_EMPTY；超 80 code point PERSON_NAME_TOO_LONG；person.weekdays 陣列形狀錯 PERSON_WEEKDAYS_SCHEMA，path /people/i/weekdays；值錯 PERSON_WEEKDAY_INVALID、重複 PERSON_WEEKDAY_DUPLICATE，path 尾端加 /j。
8. 完成以上驗證後，若範圍內沒有任一根 weekday：NO_DUTY_DATES，path /weekdays。

這個順序是產品 API；不得因顯示需求變更碼名、path 或優先序。不可回傳原始姓名、日期、例外訊息。

### 日期序數與 weekday

自行按 Gregorian 年/月/日解析。先檢查 year >= 1、月份天數與 Gregorian 閏年：能被 4 整除，但整百年需能被 400 整除。再套用本工具 1900..2099 範圍。不得用 Date.parse、new Date(string) 或本地時區日期算術。

可用零起算 Gregorian ordinal：daysBeforeYear = 365*(year-1) + floor((year-1)/4) - floor((year-1)/100) + floor((year-1)/400)，再加該年此前月份天數與 day-1。0001-01-01 是 ISO 星期一，因此 weekday = ordinal modulo 7 + 1。把 ordinal 反向轉 YYYY-MM-DD 時使用同一套 Gregorian 閏年/月份表。所有值遠小於 Number.MAX_SAFE_INTEGER。日期加一只增加整數 ordinal，不依 DST。

### 固定演算法

1. 驗證完整輸入，trim 名稱存為 personName。保留 people 輸入次序，建立 weekday membership set，不把姓名或顯示序號作為機器 key。
2. 轉換開始/結束為整數 ordinal，按天遞增；只輸出根 weekdays 包含的日期。若輸出集合為空，回 NO_DUTY_DATES。
3. cursor=0，counts 初始化為每位 person 0。
4. 對每個輪值日期，依序檢查 people[(cursor+offset) mod n]，offset 為 0..n-1。選第一個含當日 ISO weekday 的人；personNumber=被選 index+1，personId 是原 id，personName 是 trim 後姓名；count 加一；cursor=(被選 index+1) mod n。
5. 一圈皆無候選時輸出一筆 personNumber/personId/personName 全 null 的日期，unassignedCount 加一且 cursor 不動。
6. 最後輸出單一完整結果，不回傳部分失敗狀態；一旦輸入失敗，不建立任何部分 days/counts。

對 2026-10-19 週一至 2026-10-23 週五、根 weekdays 1..5：A 可 1/3/5、B 可 2/4 時，順序為 A、B、A、B、A，counts=3/2。兩人每天可用時亦為 A、B、A、B、A。A 僅週一可用、B 僅週二可用時，結果為 A、B、未排、未排、未排；游標選 B 後回到 0，無候選日不移動游標。

## 結果與報告 schema

成功 calculateRoster 回傳下列唯一 shape；key 次序固定，陣列次序有語義：

    {
      ok: true,
      days: [{ date, weekday, personNumber, personId, personName }],
      counts: [{ personNumber, personId, personName, count }],
      assignedCount,
      unassignedCount,
      totalDays
    }

days 按日期遞增。assigned row 的 personNumber 為當時計算名單 1..n、personId 為內部 id、personName 為 trim 姓名；unassigned row 的三值全 null。counts 每人一筆，依輸入人員順序，number=1..n、count 為非負整數。四個總數需滿足 PRODUCT.md 的不變式。UI/報告只用 personNumber，不顯示 personId。

buildReport(result, lang) 先驗證 lang 只能為 zh-TW/en，否則 {ok:false,error:{code:REPORT_LANGUAGE,path:/lang}}；再檢查 result 精確 data schema、dense arrays、欄位型別、統計一致性和 personNumber 一致，否則 REPORT_SCHEMA，path 為第一個出錯位置。成功回傳 {ok:true, filename:glossquote-duty-roster.txt, mimeType:text/plain;charset=utf-8, text}。

報告驗證有界：days長度1..366、counts長度1..30；根/列均為精確普通data object，拒絕accessor/symbol/非列舉欄位與不合格陣列。日期有效且嚴格遞增，weekday須與日期一致；counts序號從1連續、ID唯一、姓名符合已trim的姓名規則，count為0..366整數。每個已排日的人員序號/ID/姓名必須恰好對應counts同一列，未排日三欄全null，實際日數/人員計數與各總數精確相同。對照只驗結果內部一致性，不聲稱能從結果還原未包含的原始可用日。REPORT_SCHEMA的path依根shape → days shape/count → counts shape/count → counts逐列 → days逐列 → totals順序，固定字段順序依上述成功shape；不回顯值。

報告格式為固定標題、輪值日數/已排/未排摘要、空白行、日期/星期/輪值人員欄頭、每個日期一行、空白行、成員統計標題和按名單序號列出的各成員計數。每個未排日期明列「未排」/「Unassigned」。欄位用單一 TAB 分隔；姓名已拒絕控制字，因此不能插入報表行或欄。使用 LF，沒有 BOM、沒有末尾 LF。剪貼簿和 Blob 都使用同一 text 字串；下載檔名固定，不嵌入使用者資料。

英文星期固定Mon/Tue/Wed/Thu/Fri/Sat/Sun，繁中固定週一至週日；英文統計標題Member totals，第一行兩語均為GlossQuote Duty Roster，第二行繁中「輪值排班表」、英文「Duty roster」。ACCEPTANCE C28/C29為完整報告的固定順序，需手寫完整雙語expected字串。

## UI 狀態與非同步競態

- HTML 輸入、提交、清除和成員按鈕在 app module 綁好同步事件處理前全部 disabled，初始沒有 input name。若 JS 未能啟用，頁面顯示可理解的不可用說明，不能假裝能排程。
- 表單 submit listener 第一個操作必須 event.preventDefault()，接著同步複製表單 snapshot、驗證、呼叫 calculateRoster。表單無 action，沒有含資料的 GET/POST。
- 每個成功計算取得遞增 request ID，並保存當時的 revision；所有編輯同步 revision++、result=null，並使報告/操作無效。結果渲染只採用仍匹配目前 revision 的成功回傳。
- 清除對話框取消不改 state。確認清除時增加 revision、copy epoch、page generation，丟棄 draft/result，清理計時器並 revoke 全部未清 Object URL。
- pagehide 同樣失效所有 epoch、清除 draft/result/暫存/計時器/Object URL。pageshow 若 persisted=true，重設到初始空白表單，不恢復舊 page state。不得把測試派送 pagehide 事件宣稱為真 BFCache 測試。
- 複製從目前結果產生 report text，使用者手勢內呼叫 navigator.clipboard.writeText。管理唯一 copyPromise 與 copy epoch；結果 resolve/reject/finally 都須核對 epoch、revision、request ID、page generation 和目前結果。copy Promise 無法保證取消，因此只允許目前 token 更新成功/失敗狀態。拒絕時保持報告文字可選取，不讀 clipboard。
- 下載不等待、不共用 copyPromise。每個由使用者按下的下載建立獨立 Blob/Object URL/timeout；同時 active URL 上限 8，30,000ms 後 revoke；clear/pagehide 會清除 timeout 並立即 revoke。第 9 個拒絕建立。已交給瀏覽器的下載是否完成由瀏覽器管理，UI 不宣稱撤回。

## 建議 DOM 與顯示邊界

用一個語言路由、一份 app module、可讀的語言字典與一份 styles。所有使用者文字用 value/textContent 顯示。日期文字欄位不可使用原生 type=date；使用 type=text、inputmode=numeric、YYYY-MM-DD 說明和欄位錯誤，驗證仍由 calculateRoster 決定。日期表是語義 HTML table，放在具名且可鍵盤聚焦的局部捲動 region。普通頁面不得水平捲動；長姓名允許折行。

普通表單順序：日期、輪值星期、成員名單、產生輪值表。成員 row 控制新增、刪除、上移、下移、姓名、星期摘要/局部展開、全選/全清。結果包含一眼可見的已排/未排摘要、完整日期表、每人次數和可展開的報告預覽。錯誤不留下舊結果。

## 官方技術參考

- [Node.js v24 ESM](https://nodejs.org/download/release/latest-v24.x/docs/api/esm.html) 與 [Node.js v24 test runner](https://nodejs.org/download/release/latest-v24.x/docs/api/test.html)。
- [WHATWG HTML forms](https://html.spec.whatwg.org/multipage/forms.html)、[form control infrastructure](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html) 和 [document lifecycle](https://html.spec.whatwg.org/multipage/document-lifecycle.html)。
- [W3C Async Clipboard API](https://www.w3.org/TR/clipboard-apis/)；此為持續更新的規範草案，M1 實作前再核對支援狀態。不得假定所有瀏覽器皆提供寫入權限。
- [W3C File API: Blob URLs](https://www.w3.org/TR/FileAPI/)。

## 固定本機契約

遵守[工程契約](docs/ENGINEERING.md)、[隱私與安全](docs/PRIVACY-SECURITY.md)、[發布契約](docs/RELEASE.md)與[功能對話契約](AGENTS.md)。本文件中的 API 資訊是規格依據，不是已實作或驗證的產品行為。


---

## 原文件 UX-SEO.md

# 介面與 SEO：輪值排班表

> 這是介面規格，尚未實作或完成視覺/瀏覽器驗收。

## 工作與介面模式

- 使用者：管理一份班級、社團或家庭成員名單的人。
- 情境：在手機或桌面瀏覽器為明確的有限日期範圍排一次每日輪值。
- 主要工作：輸入日期、勾選輪值星期和成員可用星期，產生可檢查的輪值表。
- 成功狀態：所有輪值日依序顯示已排人員或清楚的未排標記；結果不得暗示工作量公平。
- 頻率：尚未驗證；假設偶爾建立有限期間輪值表。
- 主要物件：日期遞增的輪值結果。
- 模式：Product App。結果和名單是工作畫布；不放行銷 hero、AI chat 或裝飾型 dashboard。

## 排版與功能層級

- 一直可見：產品名稱、語言切換、日期範圍、週一至週日輪值星期、名單/序號、產生按鈕、結果狀態，以及未排摘要。
- 就近操作：每列姓名、可用星期摘要、局部展開、全選/全清、刪除和上/下移。
- 漸進揭露：每人最多七個可用星期 checkbox、說明 FAQ、完整純文字報告預覽。
- 首要動作是「產生輪值表」/“Generate roster”。輸入變更立即移除舊結果，並在畫布原位置說明需重新計算。
- 清除按鈕開確認對話框；取消保留頁面，確認清除後回到空白初始狀態。載入範例會先說明並確認會取代目前輸入。
- 語言切換會離開當前頁且清空未保存輸入，控制旁必須先說明。
- 回首頁連到 zh-Hant 的 https://glossquote.com/index.html 或英文 https://glossquote.com/en/index.html。

## 桌面與手機線框

桌面（≥ 1200 CSS px）：

    ┌────────────── 輪值排班表 / 語言 / 回首頁 ───────────────┐
    │ 日期範圍：開始 [YYYY-MM-DD]  結束 [YYYY-MM-DD]          │
    │ 輪值日： [一][二][三][四][五][六][日]                  │
    │ 成員 1 [姓名] 可輪值摘要 [展開] [上移][下移][刪除]     │
    │ 成員 2 [姓名] 可輪值摘要 [展開] [上移][下移][刪除]     │
    │ [新增成員] [載入範例]              [產生輪值表]        │
    │ 部分排定：未排 N 天 / 或全部已排                         │
    │ 統計與日期表（表格只在自己的區域內捲動）               │
    │ 報告預覽、複製報告、下載報告                            │
    └─────────────────────────────────────────────────────────┘

手機（320–599 CSS px）：

    ┌──────── 輪值排班表 / 語言 ────────┐
    │ 開始日期 [YYYY-MM-DD]             │
    │ 結束日期 [YYYY-MM-DD]             │
    │ 輪值日（可換行的七個 checkbox）   │
    │ 成員 1 姓名                       │
    │ 可輪值：週一、週三、週五 [展開]   │
    │ [全選] [全清] [上移] [下移] [刪除]│
    │ [新增成員] [載入範例]             │
    │ [產生輪值表]                      │
    │ 未排 N 天 / 結果統計              │
    │ 日期表（此具名區域可局部捲動）    │
    │ [複製報告] [下載報告]             │
    └───────────────────────────────────┘

實際 CSS 使用 docs/DESIGN-SYSTEM.md 的共用語義 token 和 48rem/75rem 斷點；以名單與結果控制密度，不照抄通用三欄 shell。結果表可在自己的標籤區域內雙向捲動，周圍說明/按鈕保持可見；姓名欄可折行，表格容器不能把整頁撐出水平捲軸。

## 中英文介面狀態文案

| 狀態 | 繁體中文 | English |
|---|---|---|
| 初始 | 選擇日期範圍後，依成員順序安排輪值日。資料只保留在此頁面。 | Choose a date range to rotate duty days through your member list. Data stays in this page. |
| 日期格式說明 | 日期格式：YYYY-MM-DD。起訖日都包含在範圍內。 | Date format: YYYY-MM-DD. Both start and end dates are included. |
| 空結果 | 尚未產生輪值表。輸入日期與成員後，選擇「產生輪值表」。 | No roster yet. Enter dates and members, then choose “Generate roster.” |
| 處理 | 正在計算輪值日… | Calculating duty days… |
| 全部已排 | 已排完 N 個輪值日。此結果只依名單順序與可用星期計算。 | All N duty days are assigned. This result follows member order and weekday availability. |
| 部分排定 | 部分排定：有 N 個輪值日無可用成員。請檢查下方每個「未排」日期。 | Partially assigned: N duty days have no available member. Review every “Unassigned” date below. |
| 無人可輪值 | 這些輪值日都沒有可用成員。每個日期仍列為未排；請編輯可用星期後重新計算。 | No member is available on these duty days. Every date remains unassigned; edit weekday availability and generate the roster again. |
| 日期錯誤 | 日期須是有效的 YYYY-MM-DD，且年份為 1900 至 2099。 | Enter a valid YYYY-MM-DD date between 1900 and 2099. |
| 沒有輪值日 | 此日期範圍內沒有符合所選輪值星期的日期。請調整日期或輪值星期。 | No selected duty weekday falls in this date range. Adjust the dates or selected weekdays. |
| 成員全不可用 | 此人目前沒有任何可輪值日。 | This member is currently unavailable on every weekday. |
| 輸入已編輯 | 輸入已變更，請重新產生輪值表。 | Inputs changed. Generate the roster again. |
| 清除確認 | 清除所有輸入和結果？此頁不會保留副本。取消會保留目前內容。 | Clear all inputs and results? This page keeps no saved copy. Cancel to keep the current content. |
| 複製成功 | 報告已複製。 | Report copied. |
| 複製失敗 | 無法使用剪貼簿。輪值表仍在頁面；請選取下方報告文字，或下載檔案。 | Clipboard access failed. Your roster is still on the page; select the report text below or download it. |
| 下載上限 | 下載請求較多，請稍候再試。 | Several downloads are already starting. Wait briefly and try again. |
| 資料說明 | 首次載入需要取得網站檔案；此版本不保存排班資料。 | The site files must load once; this version does not save roster data. |
| 不支援 | 此瀏覽器無法完成這項操作。結果仍留在頁面，可手動選取報告文字。 | This browser cannot complete this action. The result remains on the page and the report text can be selected manually. |

所有錯誤以欄位標籤、固定錯誤說明和欄位關聯呈現；不顯示原始姓名、ID、例外訊息或含使用者資料的網址。狀態以文字/圖示/色彩共同表達，不能只靠顏色。

## 搜尋文案

以下是預定正式頁面的繁中與英文文案；未部署時不得把候選文字說成現行網站內容。

繁體中文：

- Title：輪值排班表｜依成員順序安排每日輪值 | GlossQuote
- Description：為班級、社團與家庭建立簡單輪值表。設定日期、輪值星期與成員可輪值日，逐日列出已排與未排；不提供多班最佳化或法規判斷。
- H1：按成員順序排好輪值日
- 說明：選擇日期範圍與每週輪值日，按目前名單順序輪流安排。若當天沒有人可輪值，結果會保留該日期並明列未排。

English:

- Title: Duty Roster | Rotate Daily Duties by Member Order | GlossQuote
- Description: Make a simple duty roster for a class, club, or household. Set dates, duty weekdays, and member availability to list assigned and unassigned days. No shift optimization or labor-law decisions.
- H1: Rotate duty days through your member list
- Description: Choose a date range and duty weekdays. Members take turns in their current list order. Dates with no available member stay visible as unassigned.

正式 URL 依 docs/RELEASE.md 固定為 https://rota.glossquote.com/index.html 和 https://rota.glossquote.com/en/index.html。各正式頁 self-canonical；雙向 hreflang zh-Hant/en，x-default 指向中文 /index.html。M1 本機 preview 與 M2 candidate preview 必須 noindex,nofollow、不輸出 sitemap；不要把本機 origin 設為正式 canonical。M2 sitemap 僅含上述兩個 canonical。預覽狀態須實際驗證，不能只在來源碼搜尋 noindex。

正式文案不得宣稱法規合規、公平最優、零風險、資料會永久保存/永久免費或支援所有瀏覽器。FAQ 是實用解釋，不是虛構口碑、使用者數或搜尋排名。

## FAQ 完整文案

### 繁體中文

**輪值人員是怎麼選出來的？** 從目前名單第一位開始，按日期順序逐日輪流；當天會循環尋找第一位可在該星期輪值的人。選中後從下一位繼續。若一整圈都不可用，該日期保留為未排，輪替位置不前進。

**某位成員的可輪值星期留空代表什麼？** 留空代表該成員任何星期都不可輪值。介面會持續顯示這個狀態；你可以勾選可輪值的星期後重新產生。

**這份結果會讓工作量公平嗎？** 不會。工具依名單順序和星期可用性排出單人輪值，不計算歷史工作量、時數、假日或其他公平條件，也不能代替排班法規判斷。

**排班資料會保存或同步嗎？** 不會。輸入和結果只在目前頁面記憶體中；重新載入、清除、切換語言或離開頁面後不會恢復。你可自行選擇複製或下載報告。

### English

**How are members selected?** Starting at the first member in the current list, the tool processes duty dates in order and scans forward for the first person available on that weekday. After an assignment it continues after that member. If nobody is available, the date stays unassigned and the rotation position does not move.

**What does an empty availability selection mean?** That member is unavailable on every weekday. The page keeps this state visible; select available weekdays and generate the roster again.

**Does this make the workload fair?** No. The tool rotates by list order and weekday availability. It does not optimize workload, hours, holidays, or other fairness conditions, and it does not make labor-law decisions.

**Are rosters saved or synced?** No. Inputs and results stay in the current page's memory. They do not return after reload, clearing, switching language, or leaving the page. You may explicitly copy or download a report.

## 可及性與響應式驗收目標

- 全流程可用鍵盤；順序符合頁面閱讀順序；每個可互動控件有明顯且不被遮住的雙層 focus。
- 正文 15–17px、補充文字至少 12px。文字對比至少 4.5:1；控制邊界/非文字狀態至少 3:1；目標觸控區 44×44 CSS px。
- 320 CSS px 無頁面水平捲動；結果表格只在具名、可聚焦的 region 內捲動。200% 縮放仍可輸入、重排、計算、讀表及使用報告操作。
- 每位成員可用日的展開/收合、全選/全清、姓名欄、序號、刪除、上/下移可由鍵盤到達且標籤可理解。名單到 30 位時不需要同時顯示 210 個 checkbox。
- 動態結果使用適當 status/live semantics，不每行重複打斷讀屏。未排狀態由文字表達；表格標頭、caption、欄位關聯及水平/垂直閱讀順序清楚。
- 尊重 prefers-reduced-motion；focus、錯誤或結果更新不可只靠動畫、顏色或 toast 表達。
- 繁中/英文較長約 40% 時仍無裁切、按鈕重疊或被 sticky UI 遮住。

## 固定參考

介面遵守[品牌文案](docs/BRAND.md)、[設計系統](docs/DESIGN-SYSTEM.md)、[隱私與安全](docs/PRIVACY-SECURITY.md)及[發布契約](docs/RELEASE.md)。目前 wireframe 與文案是設計輸入，不代表已完成畫面檢查。


---

## 原文件 ACCEPTANCE.md

# 驗收契約：輪值排班表

> 所有案例都是未執行的驗收規格。以下 sample 與手算結果不是產品測試通過證據。

## 自動化純函式案例

M1 使用 Node 24 的 node:test 與 fake data，至少維護以下案例。預期值需在測試中手寫，不得由 calculateRoster 或被測輔助函式產生。錯誤物件需精確比對 code/path。每個資料陣列、日期列、成員統計與報告字串都要檢查；不可只核對成功 boolean。

| ID | 輸入/操作 | 精確預期 |
|---|---|---|
| C01 | 2026-10-19..2026-10-23，根 weekdays [1,2,3,4,5]；#1 A 可 [1,3,5]、#2 B 可 [2,4] | 五列依序 #1 A、#2 B、#1 A、#2 B、#1 A；weekday [1,2,3,4,5]；counts [(1,A,3),(2,B,2)]；assigned=5, unassigned=0, total=5。 |
| C02 | 同日期與根 weekdays；A、B 都可 [1,2,3,4,5,6,7] | 指派 #1,#2,#1,#2,#1；counts 3/2。 |
| C03 | 同日期；#1 A 僅可 [1]、#2 B 僅可 [2] | 結果 #1 A、#2 B、未排、未排、未排；最後三列的 number/id/name 全 null；counts 1/1；assigned=2, unassigned=3,total=5；未排日游標保持在 index 0。 |
| C04 | 2026-10-19..2026-10-23；根 weekdays 輸入順序 [5,1]，一位全週可用 | 輸出仍按日期排序為 10-19 weekday 1、10-23 weekday 5；兩端都包含。 |
| C05 | 單日 2024-02-29、根 weekdays [4]、一位全週可用 | 成功 1 日，date=2024-02-29、weekday=4、member number=1。 |
| C06 | 2024-02-28..2024-03-01、根 weekdays [3,4,5]、一位全週可用 | 3 個輪值日依序 02-28 weekday 3、02-29 weekday 4、03-01 weekday 5。 |
| C07 | startRaw=2023-02-29 | {ok:false,error:{code:START_DATE_INVALID,path:/startRaw}}。 |
| C08 | 2024-01-01..2024-12-31，根 weekdays [1,2,3,4,5,6,7]，一位全週可用 | 成功，366 列；第一日 weekday 1、末日 2024-12-31 weekday 2；assigned=366、count=366。 |
| C09 | 2024-01-01..2025-01-01 | {ok:false,error:{code:DATE_SPAN_LIMIT,path:/endRaw}}，不得建立結果。 |
| C10 | 2026-10-19 單日，根 weekdays [2] | {ok:false,error:{code:NO_DUTY_DATES,path:/weekdays}}；不可產生 0 天成功結果。 |
| C11 | root weekdays=[] | {ok:false,error:{code:WEEKDAYS_EMPTY,path:/weekdays}}。 |
| C12 | root weekdays=[1,1] | {ok:false,error:{code:WEEKDAY_DUPLICATE,path:/weekdays/1}}。 |
| C13 | 一位成員 weekdays=[]，日期範圍有五個所選輪值日 | 成功的部分結果：5 日全未排，該成員 count=0，assigned=0、unassigned=5、total=5；不得把空陣列當全週可用或整體 schema error。 |
| C14 | 兩位 id 不同、姓名都為 Kai，2026-10-19..20、兩人皆可全週、根 weekdays=[1,2] | 兩日分別為 personNumber 1 和 2，兩筆 counts 都是 1；buildReport 在每筆結果和統計都出現 Member/成員序號，不可只列兩個 Kai。 |
| C15 | request 加上未知自有欄 extra | {ok:false,error:{code:REQUEST_SCHEMA,path:/}}。 |
| C16 | startRaw 使用 getter 並在 getter 設置 counter | 回 REQUEST_SCHEMA；getter 呼叫 counter 保持 0。 |
| C17 | request 有 symbol own key 或未知 non-enumerable key | REQUEST_SCHEMA，path /。 |
| C18 | root weekdays 是稀疏陣列、帶自訂 own property 或 symbol | WEEKDAYS_SCHEMA，path /weekdays；不得跳過 hole。 |
| C19 | people 非 array、稀疏或帶自訂欄位 | PEOPLE_SCHEMA，path /people。 |
| C20 | person id 含空白/非 ASCII/超 40 字元 | PERSON_ID_INVALID，path /people/0/id。 |
| C21 | 兩人 id 相同、姓名不同 | PERSON_ID_DUPLICATE，path /people/1/id。 |
| C22 | nameRaw 含 LF 或 NUL | PERSON_NAME_CONTROL，path /people/0/nameRaw；錯誤內容不得包含輸入。 |
| C23 | nameRaw 含單獨 high 或 low surrogate | PERSON_NAME_SURROGATE，path /people/0/nameRaw。 |
| C24 | nameRaw 是 80 個有效 emoji surrogate pair，外加首尾空白 | trim 後接受且 code point 長度為 80；報告姓名不含首尾空白。 |
| C25 | nameRaw 是 81 個有效 emoji code point | PERSON_NAME_TOO_LONG，path /people/0/nameRaw。 |
| C26 | 輸入 0 位或 31 位 people | PEOPLE_COUNT，path /people；1 位及 30 位邊界另需成功測試。 |
| C27 | 同時有 start 日期錯誤與 root weekday 錯誤 | 依固定順序回傳 START_DATE_FORMAT 或 START_DATE_INVALID 的 startRaw 錯誤；不得先回 weekday。未知 root key 優先回 REQUEST_SCHEMA。 |
| C28 | zh-TW 對 C03 結果呼叫 buildReport | filename 固定 glossquote-duty-roster.txt；MIME 固定 text/plain;charset=utf-8；text 僅用 LF、無 BOM/末尾 LF；含 10-21/22/23 各自一行「未排」和 #1/#2 成員統計。 |
| C29 | en 對同一結果呼叫 buildReport | 同一固定 filename/MIME/換行限制；含三個獨立 “Unassigned” 日期列及 “Member 1: A”/“Member 2: B” 統計。 |
| C30 | buildReport language 不在 zh-TW/en | {ok:false,error:{code:REPORT_LANGUAGE,path:/lang}}。 |
| C31 | buildReport 收到未知 key/accessor/不一致 totals 的 result | REPORT_SCHEMA；不執行 getter、不輸出部分報告。 |
| C32 | calculateRoster 收到可凍結的普通輸入 | 輸入及其陣列/列完全未突變；輸出具 deterministic insertion/value order。 |

C28 的繁中報告文字精確骨架（下列 [TAB] 各代表單一 U+0009，不是輸出字面字串；行尾不含 LF）：

    GlossQuote Duty Roster
    輪值排班表
    輪值日數：5
    已排：2
    未排：3

    日期[TAB]星期[TAB]輪值人員
    2026-10-19[TAB]週一[TAB]成員 1：A
    2026-10-20[TAB]週二[TAB]成員 2：B
    2026-10-21[TAB]週三[TAB]未排
    2026-10-22[TAB]週四[TAB]未排
    2026-10-23[TAB]週五[TAB]未排

    成員統計
    成員 1：A[TAB]1
    成員 2：B[TAB]1

C29 英文對應文案為 Duty roster / Duty days: 5 / Assigned: 2 / Unassigned: 3；欄名 Date / Weekday / Member；每個缺口為 Unassigned；統計為 Member 1: A / Member 2: B。測試須比對實際 TAB 與 LF code point，不接受上列排版空格代替 TAB。

## 瀏覽器人工案例

以下須在實際瀏覽器分別打開本機 127.0.0.1:4209 的繁中與英文頁面，使用上方假資料；禁止使用真實家庭、學生或客戶資料。每案記錄瀏覽器/版本、OS、視窗尺寸、步驟與實際結果。原生 clipboard/download、真機和真 BFCache 不可用 mock 或 DOM dispatch 冒充。完整 Network/Storage 沒有實際觀測工具時記 NOT_RUN。

| ID | 操作 | 通過條件 |
|---|---|---|
| B01 | 首次打開頁面、JS 啟動前後檢查表單 | HTML 初始 controls disabled、沒有輸入 name 欄位；JS 綁定事件後才啟用。JS 不可用時明示無法使用。表單沒有資料 action，Enter 不造成資料導覽/送出；submit listener 第一個操作 preventDefault。 |
| B02 | 日期欄用鍵盤輸入合法/非法格式 | 控件為 text + numeric input mode，提示 YYYY-MM-DD；不出現依賴瀏覽器格式的原生 date picker。空白、短年或無效日關聯到精確欄位錯誤。 |
| B03 | 初始畫面按「載入範例」 | 顯示取代輸入提示；確認後載入 A/B 週一至週五示例，結果仍須按下主按鈕才產生。 |
| B04 | 繁中端到端：填日期、調整可用日、產生 | 五日期按 C01，序號與統計正確；結果在主工作畫布，未排/完整標籤正確。 |
| B05 | 英文端到端：建立一個部分結果 | 英文摘要、每個 Unassigned 日期、序號和統計齊全；不得留下混合繁中訊息。 |
| B06 | 產生後改日期、姓名、weekday、增刪或重排任一項 | 每次同步清除舊表和複製/下載狀態，標示需重新計算；重算後序號依新名單順序重新編號。 |
| B07 | 展開/收合成員可用日並全選/全清 | 收合摘要正確；全清明確表示該人全週不可用；所有操作可由鍵盤完成並有可見 focus。 |
| B08 | 操作 30 位成員、逐列上移/下移和刪除 | 不需一次展開 210 個 checkbox；操作仍有明確標籤，無跳錯列；第 31 位不可新增。 |
| B09 | 在 320 CSS px 使用 30 人名單及長姓名結果 | 頁面自身無水平捲動；只在具名結果表 region 內捲動；姓名折行；周圍說明、統計和按鈕可到達。 |
| B10 | 在桌面與 200% zoom 操作全流程 | 不裁切錯誤或欄位，序號/表頭可讀，primary action、下載與焦點不被遮住；繁中/英文較長 40% 仍可使用。 |
| B11 | 開清除對話框，先取消再確認 | 取消完整保留當前輸入/結果；確認回初始狀態並失效 pending copy；對話框關閉時焦點回原觸發按鈕。 |
| B12 | 允許 clipboard write 後明確按複製，貼到純文字編輯器 | 只有使用者手勢寫入本工具報告；沒有先讀取原 clipboard；貼上文字與 buildReport 完全一致。 |
| B13 | 用拒絕 clipboard 權限的瀏覽器重試 | 顯示複製失敗和手動選取/下載替代；原結果保留且不能出現「已複製」。 |
| B14 | 在測試 harness 延遲 writeText promise，操作期間改任一輸入後再 resolve/reject | 僅屬競態單元測試；舊 epoch/revision/request/page generation 不得更新成功/失敗 UI；不以 mock 代表原生 clipboard 通過。 |
| B15 | 明確下載中英報告各一次 | 使用者下載的檔名精確 glossquote-duty-roster.txt；實際位元 UTF-8、無 BOM、LF、無尾端 LF，報告包含全部未排日及成員序號；不含機器 id。 |
| B16 | 單元/注入測試建立八個未清 Object URL，再嘗試第九個；等待 30 秒和按 clear | 第九個被阻止；30 秒 timeout 與 clear 都清除 timeout 並 revoke URL。瀏覽器實際下載是否完成另以 B15 驗，不假稱 revoke 刪除已存檔案。 |
| B17 | 實際導覽離開頁面再返回，若瀏覽器採用 BFCache 記錄 persisted 狀態 | pagehide 後草稿/結果已清除；BFCache pageshow 也呈現初始空白狀態。若該瀏覽器本次未使用 BFCache，記錄現象；不可用合成事件聲稱 BFCache 已通過。 |
| B18 | DevTools 觀察初次載入、輸入、計算、複製、下載、隱藏/恢復及切語言的 Network/Storage | 記錄實際同源靜態 GET；輸入/結果無外部或 API request；無 URL/Storage/Cache/Cookie 寫入。沒有工具時對完整 Network/Storage 誠實標 NOT_RUN。 |
| B19 | 鍵盤-only 完成日期、weekday、姓名、重排、計算、報告與關閉 dialog | 所有功能有可見 focus、順序合理、錯誤與結果不只靠顏色；讀屏狀態不重複吵雜。 |
| B20 | 載入兩語頁面並切換語言/返回首頁 | 繁中/英文路由、canonical 候選、翻譯和對應 homepage link 正確；切語言先告知草稿會清除且頁面不會恢復它。 |

## M1/M2/M3 gate 和證據

- M1 必須 Node 24+ 的 npm test、npm run check、npm run build 通過，驗證至少 C01–C32；M1 的必要雙語主流程、即時失效、清除 dialog、鍵盤與 320px 由真實瀏覽器完成並記錄。遇到能力不足可按授權記 NOT_RUN，但不得把 mock、原始碼掃描或 sample 手算當成產品通過。固定 command/exit/manifest/實際觀測寫入 HANDOFF.md。
- M2 production build 與本機 HTTP 模型 5209 的 candidate/header/SEO/404 驗證獨立記錄；該測試不等於 Cloudflare live。公開 GitHub 依 docs/RELEASE.md 和 docs/GIT-PUBLICATION-SAFETY.md 驗 visibility、remote commit、來源 ZIP 及檔案 bytes/hash。
- M3 由主代理部署後驗兩語 live body/headers/SEO/404/流程及雙語首頁收錄；本文件本身不表示任何 gate 已通過。

## 相關固定規格

案例依據為[產品需求](PRODUCT.md)、[技術契約](TECHNICAL.md)、[隱私與安全](docs/PRIVACY-SECURITY.md)、[工程契約](docs/ENGINEERING.md)及[發布契約](docs/RELEASE.md)。


---

## 原文件 TASKS.md

# 任務閘門：輪值排班表

> 這份清單是未來實作順序，不代表任務已執行。每次只做一個 milestone；失敗後修正原 gate，再由主代理放行下一個 milestone。

## 通用規則

- 原功能對話 requested model 設定為 gpt-6.1-sol / max；設定值不等於已驗證的 backend identity。遵守 AGENTS.md，不遞迴委派、不另開功能對話、不要求使用者轉貼提示。
- 每個 T 任務完成時回寫 HANDOFF.md：實際修改路徑、精確命令/exit、Node 版本、manifest bytes/SHA-256、瀏覽器實際觀測、NOT_RUN 與風險。證據僅寫 AGENTS.md 允許的唯一根目錄 .runs/duty-roster/<本次唯一 task id>/。
- 各任務僅在列出的專案路徑修改；共用首頁、根專案、兄弟工具及本文件列出的共用固定文件不在功能對話允許路徑。需要 shared integration 時交主代理。
- M1 只本機；主代理明確放行 M1 後才開始 M2；M2 source 通過後才由主代理執行 M3。每一 gate 的失敗項不得勾選後續項目。

主代理M0補充允許範圍：各T任務都可更新本工具HANDOFF.md、START-HERE.md、project.json、docs/RELEASE-CANDIDATE.md及只追加TASK-ENTRY.md的真實狀態；dist/**及dist-production/**僅由已審核建置腳本生成。必要的本工具純函式helper與test fixture可新增在public/js/core/**、scripts/*.mjs、test/**，保持產品schema/API與所有已規定行為不變，回報精確新增路徑。不得藉此改PRODUCT/TECHNICAL/ACCEPTANCE門檻或共用規範。

M2不得把正式SEO寫回preview public/；production-only標頭、robots、sitemap、404與HTML轉換均由離線build:production在dist-production產生。M1 public運算與介面凍結；必要更動先回主代理確認受影響的M1重驗。M2必須提供release:check或check:release（離線驗source allowlist/config/固定產物）。主代理對M1放行時可一併授權整個M2的必要公開來源流程，T07不另外創造使用者批准關卡；原對話仍須自行完成具體來源副本審查與全部安全gates。

## M1：本機完整產品

### T00 — Scaffold、環境與研究閘門

- 前置：主代理接受本規格；工作樹無同路徑衝突。只讀確認 Node executable 版本，不改 persistent environment 或 PATH。
- allowed paths：package.json、.gitignore、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/en/index.html、public/styles/app.css、public/js/app.js、public/js/core/roster.js、public/js/core/report.js、test/roster.test.mjs、test/report.test.mjs、test/ui-state.test.mjs、test/security-contract.test.mjs、test/browser-checklist.md、HANDOFF.md。
- 實作：建立 ESM/private package，四個共用 npm 命令、127.0.0.1:4209 loopback server、只提供 public/ 的 MVP scaffold、真正檢查必要檔案/ESM/危險或外部資源/allowlist 的 check、離線 build 複製到 dist。不得先做不安全的簡化驗證或假測試。
- 驗收：記錄 Node >=24 的完整路徑與 node --version；執行 npm run check、npm test、npm run build；啟動 npm run dev 並只用明確任務程序驗 127.0.0.1:4209，port 衝突不得終止既有程序。
- 完成條件：命令不是空殼；server 僅 loopback、GET/HEAD、有明確 MIME/404/405、無 SPA fallback，只提供 public；dist preview noindex,nofollow；Node 沒有新增依賴。回寫 HANDOFF，狀態仍為 M1 in progress。

### T01 — 日期純函式、schema 與輪替核心

- 前置：T00 通過。
- allowed paths：public/js/core/roster.js、test/roster.test.mjs、test/security-contract.test.mjs、HANDOFF.md。
- 實作：依 TECHNICAL.md 精確 schema/error 優先順序實作 calculateRoster；用整數 Gregorian ordinal、ISO weekday、有限範圍及固定游標演算法。補 C01–C27、C32 的獨立手寫 expected 值與非突變/security cases；測試不得讀網路或真實個人資料。
- 驗收：node --test test/roster.test.mjs test/security-contract.test.mjs；npm run check。
- 完成條件：所有 error code/path、稀疏/accessor/symbol/custom properties、閏日/366/367、無輪值日期、無候選、重名/序號和三個手算例符合規格。修正若影響核心需重跑本 gate。回寫 HANDOFF。

### T02 — Product App 與雙語主要流程

- 前置：T01 通過。
- allowed paths：public/index.html、public/en/index.html、public/js/app.js、public/styles/app.css、public/js/core/roster.js、public/js/core/report.js、test/ui-state.test.mjs、test/browser-checklist.md、HANDOFF.md。
- 實作：建立繁中/英文表單、text + numeric-mode 日期欄、初始預設、載入範例確認、1..30 名單、新增/刪除/上移/下移、局部 weekday disclosure/摘要/全選/全清、逐欄錯誤與結果表。初始 controls disabled、input 無 name；先同步註冊事件再啟用；所有表單 submit handler 的首個動作 preventDefault。只用 value/textContent 顯示姓名。
- 驗收：npm run check、npm test；用實際本機 4209 瀏覽器執行 B01–B08、B19 的雙語假資料主流程，記錄 browser/版本/尺寸和結果。
- 完成條件：桌面/手機 wireframe 順序一致，序號區分同名，動態結果、空/錯誤/部分狀態文字完整；不把首頁、裝飾或 model 替代主要任務。回寫 HANDOFF。

### T03 — 報告、複製/下載競態與清理

- 前置：T02 通過。
- allowed paths：public/js/core/report.js、public/js/app.js、public/index.html、public/en/index.html、public/styles/app.css、test/report.test.mjs、test/ui-state.test.mjs、test/security-contract.test.mjs、test/browser-checklist.md、HANDOFF.md。
- 實作：依 TECHNICAL.md 建立中英文 buildReport 固定格式；報告每個未排日期及每個成員序號均完整；手動 copy、固定 .txt download、8 個 URL/30 秒 timeout/回收上限、revision/request ID/copy epoch/page generation 競態、clear 確認與 pagehide/pageshow 清除。清除不宣稱刪掉已下載檔案或取消已提交的瀏覽器操作。
- 驗收：node --test test/report.test.mjs test/ui-state.test.mjs test/security-contract.test.mjs；npm run check；人工跑 B11–B17、B20，原生 API 與真正 BFCache 依實際能力分開記錄。
- 完成條件：copy/report 完全一致，zh-TW/en、UTF-8 no BOM/LF/no final LF/fixed filename 已精確測試；編輯或離頁後舊 promise 不更新 UI；URL/timer 無未清理分支。mock 只驗可注入競態，不冒充原生功能。回寫 HANDOFF。

### T04 — 安全、SEO、響應式與完整 M1 驗收

- 前置：T01–T03 通過。
- allowed paths：package.json、.gitignore、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、public/index.html、public/en/index.html、public/styles/app.css、public/js/app.js、public/js/core/roster.js、public/js/core/report.js、test/roster.test.mjs、test/report.test.mjs、test/ui-state.test.mjs、test/security-contract.test.mjs、test/browser-checklist.md、HANDOFF.md。
- 實作：完善靜態危險 API/外部資源/allowlist檢查、preview noindex,nofollow、明確語言 metadata、錯誤關聯、keyboard/focus/status semantics、320px局部捲動、200% zoom、30人成員密集情境。重查所有輸入呈現、資料生命週期、非同步 invalidation；不放寬 CSP/security 基線來讓功能通過。
- 驗收：在候選輸入定稿後各執行 npm test、npm run check、npm run build 一次；再人工完成 ACCEPTANCE.md 必要 M1 cases，對全程觀察有實際證據才記通過。
- 完成條件：固定 manifest、測試命令及 exit code、兩語實際流程和必要邊界證據完整；無法執行的真機/完整 Network-Storage/BFCache項目依明文政策 NOT_RUN 並寫影響。原對話回報候選，M1 只有主代理獨立驗收放行後才算通過；不得自行進入 M2。回寫 HANDOFF。

## M2：Production candidate 與公開來源

### T05 — 主代理 M1 review gate（不改碼）

- 前置：T04 已完整提交證據。由主代理獨立驗收。
- allowed paths：HANDOFF.md（只追加 gate 結果）；測試證據僅限 AGENTS.md 許可的本次唯一 .runs 子目錄。
- 驗收：主代理檢查差異範圍、固定 schema/錯誤順序、手算測例、真實瀏覽器證據和所有 NOT_RUN。未明確放行不得開始 M2。
- 完成條件：主代理明確寫 M1 PASS/放行；若退回，返回 T01–T04 的原 owning task 修正並只重跑受影響 gate。

### T06 — Production 靜態候選與本機 HTTP 模型

- 前置：T05 主代理明確 M1 PASS。
- allowed paths：package.json、scripts/model.mjs、scripts/build-production.mjs、scripts/check-production.mjs、scripts/preview-production.mjs、public/index.html、public/en/index.html、public/_headers、public/robots.txt、public/sitemap.xml、wrangler.jsonc、test/production.test.mjs、test/seo.test.mjs、HANDOFF.md。
- 實作：production build 獨立產生 dist-production，不覆蓋 M1 dist；只加入固定 origin https://rota.glossquote.com、/index.html 與 /en/index.html self-canonical、雙向 zh-Hant/en/x-default 中文、精確 robots/sitemap/headers/CSP、靜態 assets-only Wrangler 設定。建本機模型於 127.0.0.1:5209，只模擬回應路由/headers；不呼叫 Cloudflare、不裝 CLI、不讀 token、不加 runtime/worker/API 或遙測。
- 驗收：npm run build:production、npm run check:production、npm run preview:production；用真實 browser/HTTP 檢查模型輸出與 404、headers、robots allow/disallow 最長匹配、canonical/sitemap。記錄此為 local candidate/model，不是正式站。
- 完成條件：M1 dist 保持固定、production 路徑/headers可重現，preview noindex,nofollow；主代理可檢閱來源副本、production manifest、全部測試和 NOT_RUN。回寫 HANDOFF。

### T07 — M2 source review 和公開 GitHub

- 前置：T06 全部本機 gate 通過且主代理明確 review M2 發布副本。Standing user instruction 已授權公開 source；不需再次詢問使用者。
- allowed paths：審核過的獨立本工具 publishing copy；HANDOFF.md；AGENTS.md 指定唯一 .runs/duty-roster/<task id>/ 證據資料夾。不可在根工作樹/兄弟工具執行 push。
- 實作：依 docs/GIT-PUBLICATION-SAFETY.md 使用 per-command git -c 和已存在官方 CLI 認證，發布 public KYStr/glossquote-labs-duty-roster。發布前 capture、發布後 verify Git settings guard；保留 Windows environment guard；不讀/輸出 credential，不做 global/system Git/gh 寫入。來源 ZIP 從固定 commit git archive 產生。
- 驗收：確認 repository public visibility、remote commit、clean source ZIP 根目錄、每檔與 git blob bytes/hash 一致；乾淨 copy 跑固定 test/check/build/production gates；各設定 guard before/after 結果與 manifest 寫入 HANDOFF。
- 完成條件：remote commit/visibility/ZIP證據匹配 M2 candidate，無設定漂移。任何認證缺失或 guard 漂移立即停並交主代理；不得嘗試設定認證或猜測還原。這只是 source publication，不是網站已部署。

## M3：主代理免費 Cloudflare 與雙語首頁

### T08 — 主代理 live release（功能對話不部署）

- 前置：T07 公開來源通過，主代理完成 M2 acceptance；主代理運用已授權 Cloudflare exact-file loader。
- allowed paths：無；功能對話不修改共享首頁、Cloudflare、憑證、DNS、其他 repo 或根目錄。主代理可依發布契約修改允許的 release/config/catalog 位置。
- 驗收：主代理部署至 rota.glossquote.com，驗正式雙語內容、headers/SEO/404/流程，再把首頁 catalog 草稿轉已發布、重建/驗證/發布首頁 source、部署首頁並驗兩語入口。
- 完成條件：HANDOFF 記錄 source commit、live hosting 狀態、首頁狀態及各 NOT_RUN。標記 awaiting external review；外部尚未確認前不得標版本 complete。後續外部修正返回原功能對話與對應 owning task。

## 相關固定文件

全程遵守[開始說明](START-HERE.md)、[功能對話契約](AGENTS.md)、[工程契約](docs/ENGINEERING.md)、[隱私與安全](docs/PRIVACY-SECURITY.md)、[設計系統](docs/DESIGN-SYSTEM.md)、[發布契約](docs/RELEASE.md)、[Git 發布安全](docs/GIT-PUBLICATION-SAFETY.md)和[交接紀錄](HANDOFF.md)。task 入口與目前 gate 另見 TASK-ENTRY.md、docs/RELEASE-CANDIDATE.md、project.json。

