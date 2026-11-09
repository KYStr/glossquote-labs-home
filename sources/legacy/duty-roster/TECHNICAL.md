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
