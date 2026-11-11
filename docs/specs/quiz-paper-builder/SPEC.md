# 題庫抽卷與答案表 / Quiz Paper Builder

預案 `spec-quiz-paper-builder-20261111`，文件契約 v1。`fixtures.json` 的完整 HTML、錯誤物件與控制器快照為字面驗收輸入。資料處理以本規格的順序為準。

## 1. goal

補習班助教或社區課程講師已在試算表維護單選題。當天要從兩至五個主題各抽幾題，印給無線上測驗帳號的學員。原流程需逐題複製、重編題號、對照正解並檢查學員檔。一次操作的完成條件是讀入一份 CSV，逐主題設定配額，在同頁先看到編號題本與講師答案，分別下載可離線開啟及列印的兩份 HTML。兩檔依同一生成快照編號，能以相同題庫、配額及代碼重建所抽的 ID 及順序。

講師確認題幹、選項和正解資料後分發。學員輸出的結構性保證是從獨立投影排除 `correct`、題庫 ID、主題及其他教師 metadata。題幹與選項是題庫原文，可能本身描述答案。更改任何題的 `correct` 合法字母時，其他設定相同的學員輸出 bytes 恆等。

## 2. scope

| 支援 | 邊界 |
| --- | --- |
| 讀一份 CSV 檔或貼入題庫，選來源後按鈕明確啟動 | 檔名副檔名和 MIME 僅作選檔提示，內容契約由 CSV 驗證 |
| 單選題四個固定選項、主題配額、標題、重現代碼、兩份可列印 HTML | 512 KiB 原始來源、500 題、30 主題、一次抽 1–60 題、每份成品 2 MiB |
| 桌面優先，平板可核對及操作，手機可完成同流程 | 網站首次需要靜態資源；在已完成載入的頁面內離線處理。成品可由相容瀏覽器離線開啟 |
| 入口 HTTPS 或可信任的 HTTP loopback，支援 Web Crypto SHA-256、module Worker、File、Blob、TextEncoder/Decoder | 瀏覽器或 WebView 缺少任一必要能力時，顯示可復原的雙語能力錯誤。網站的 `file://` 啟動屬範圍外 |
| 單一靜態工具，繁中與英文 | 線上出題／答題、計分、分數管理、帳號、同步、平台匯入、其他題型、圖像、數學式排版、選項洗牌、考試安全認證、固定頁數屬範圍外 |

相鄰工具的本地問答卡輸出含同一份題目和答案對照，附可重現洗牌的自學流程。雲端 r3 問答卡使用瀏覽器隨機序列，匯出 TXT 與進度 JSON。批次套版編譯 `{{欄名}}` 並輸出逐筆文字／JSON。此處的核心是已有四選題庫、各主題無重複抽樣和角色檔案配對。[本地問答卡輸出](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/candidates/56-flashcards/public/js/core/export.mjs) · [雲端候選](https://github.com/KYStr/glossquote-labs-home/blob/3b1f36083d08eb3a780c3d6cccc31e1ff1d63fcf/archives/cloud-candidates/2026-10-29/flashcards/source/public/js/app.mjs) · [套版核心](https://github.com/KYStr/glossquote-labs-template-merge/blob/837048c6d60ba79b5e2216937f7f993e36d36681/public/js/core/template.mjs)

Moodle 可從題庫類別抽隨機題並以 GIFT 匯入；Google Forms 提供選擇題答案鍵、配分及作答回饋。本工具面向要帶走兩份離線題本的講師。[Moodle 測驗](https://docs.moodle.org/404/en/Editing_a_quiz) · [Moodle GIFT](https://docs.moodle.org/502/en/GIFT) · [Google Forms](https://support.google.com/docs/answer/7032287?hl=en)

## 3. userFlow

### 3.1 畫面與文案

Product App 以文件預覽為主要工作區。桌面 `≥75rem` 將輸入／配額列在預覽旁，預覽佔至少 65% 可用欄寬。`48–<75rem` 可將題庫輸入折疊於明確標籤下，配額維持和結果相鄰。`<48rem` 照來源→配額→預覽→下載直排。按需求揭露 CSV 欄位說明，使用現有 Gloss Tools 紙／墨、控制邊框、焦點、斷點和系統字型權杖。[共用設計基線](https://github.com/KYStr/glossquote-labs-home/blob/fadbbb0bc32ac83965c21805008cb8ea6a2d18f6/docs/TOOL-DESIGN-BASELINE.md)

~~~text
桌面    [題庫與設定]   [學員題本] [講師答案]
        來源、配額     ┌ 文件預覽 ───────────────────┐
        標題、代碼     │ 標題、連續題號與內容        │
        預覽／取消     └ 兩個具名下載動作 ──────────┘

窄螢幕  題庫 → 配額與標題 → 預覽角色切換 → 兩個具名下載動作
~~~

| 介面文字 | zh-Hant | en |
| --- | --- | --- |
| H1 | 題庫抽卷與答案表 | Quiz Paper Builder |
| 來源欄標籤 | 貼上題庫 CSV | Paste question-bank CSV |
| 選檔標籤 | 選取題庫 CSV | Choose question-bank CSV |
| 範例動作 | 載入假題範例 | Load sample questions |
| 範例標示 | 假題範例，請換成你的題庫。 | Sample questions. Replace them with your question bank. |
| 讀取動作 | 讀取題庫 | Read question bank |
| 配額區標題 | 各主題題數 | Questions per topic |
| 配額標籤 | {topic}，最多 {available} 題 | {topic}, up to {available} questions |
| 題本標題欄／預設 | 題本標題／練習題 | Paper title / Practice quiz |
| 代碼欄／說明 | 抽卷代碼／保留此代碼可重建同一批題目。 | Draw code / Keep this code to redraw the same selection. |
| 生成動作 | 預覽題本與答案 | Preview paper and answer key |
| 預覽按鈕 | 學員題本／講師答案 | Student paper / Answer key |
| 下載按鈕 | 下載學員題本／下載講師答案 | Download student paper / Download answer key |
| 取消／重設 | 取消／重設題庫與設定 | Cancel / Reset bank and settings |
| 換語確認 | 切換語言會清空目前題庫與設定。／清空並切換／留在此頁 | Switching language clears the current bank and settings. / Clear and switch / Stay here |
| 閱讀下載提示 | 下載後用瀏覽器開啟檔案，再使用瀏覽器的列印功能。 | Open the downloaded file in your browser and use its print command. |
| 隱私提示 | 題庫在這個頁面處理。題幹和選項保留原文，分發前請看過學員題本。 | This page processes the bank locally. Prompts and choices keep their wording. Review the student paper before sharing it. |

使用真正的 label、按鈕和原生可輸入欄。配額欄為文字加 `inputmode="numeric"`，保留非法輸入供修正。配額欄緊鄰上限及錯誤。預覽切換為兩個有名按鈕，使用 `aria-pressed`。DOM 只掛載目前角色預覽，切換時移除舊節點。兩個下載動作各自有名稱且在結果旁，學員下載為主要動作。各狀態提供可見文字，`role=status` 及 `aria-live=polite` 只公告狀態變動。提交錯誤使關聯欄位 `aria-invalid=true`，焦點移至第一個可修正欄；檔案錯誤焦點到可讀錯誤區，顯示 record／欄位。忙碌啟動同步設狀態與取消，工作完成焦點移至結果標題，取消後回啟動按鈕。Inline 換語確認取消時恢復焦點。可及性維持鍵盤可達、44px 主要觸控目標、可見焦點、不以顏色單獨標示、對比 4.5:1／3:1、320px 單向 reflow、200% 縮放、動態內容可朗讀及 reduced motion。

### 3.2 操作與狀態

| Phase | zh-Hant 狀態 | en 狀態 | 操作 |
| --- | --- | --- | --- |
| `empty` | 選取 CSV 或貼上題庫開始。 | Choose a CSV or paste a question bank to begin. | 任一來源或假題範例可用 |
| `dirty-source` | 題庫來源已更新，請讀取題庫。 | The source changed. Read the question bank. | 讀取現行來源，設定欄保留標題／代碼 |
| `reading` | 正在讀取題庫… | Reading question bank… | 可取消或編輯來源 |
| `configured` | 已讀取 {questions} 題，請設定各主題題數。 | Loaded {questions} questions. Set a quota for each topic. | 顯示各主題可抽數量，配額皆 0 |
| `dirty-settings` | 設定已更新，請重新預覽。 | Settings changed. Preview again. | 以現行題庫重新預覽 |
| `generating` | 正在抽題並準備兩份預覽… | Drawing questions and preparing both previews… | 可取消或修改設定 |
| `ready` | 題本和答案已準備好。 | The paper and answer key are ready. | 先顯示學員題本，可切換和下載 |
| `error` | 顯示 §4.4 錯誤 | Show the error from §4.4 | 修正保留的現行輸入後重試 |
| `cancelled` | 已取消。可調整內容再試。 | Cancelled. You can edit and try again. | 保留現行來源；有效題庫、配額和設定可繼續用 |

1. 初始來源為空。選一檔、貼字或載入範例會取代目前來源。檔案來源與貼上來源只保留一個，清成空字串視為無來源。選檔取消事件沒有新 File 時保留現狀。選或貼只更新來源，按「讀取題庫」才解析。當前來源已驗證時，讀取按鈕停用，保留有效題庫與配額。範例使用 `fixtures.json` 的四筆假題。
2. 讀取完成後依主題排序顯示題數與配額。每次成功載入新來源將該題庫的配額設回 0。題本標題及代碼保留目前草稿，初次值依第 4 節。配額合計以文字即時更新，最終錯誤由「預覽題本與答案」給出。
3. 任一真實來源變動同步清預覽、兩種下載權、Blob URL、舊題庫及其配額，並取消當代工作。任一標題、代碼或配額真實變動同步清預覽、下載權、Blob URL 並取消當代工作，保留有效題庫。重複同值事件無效；編回舊值仍需重新產生。文字 composition 開始即讓結果失效，composition 中禁用讀取和產生，結束後以目前值正常編輯。
4. 按預覽同步撤銷原結果，驗證現行設定，再讓 Worker 從同一快照生成兩種模型和 bytes。成功預設學員視圖。錯誤、取消、dirty 都沒有可下載的結果。取消讀取保留現行來源但題庫須重新讀取；取消生成保留現行有效題庫及設定。
5. 下載只在使用者按下角色下載按鈕時，交由同一成功快照的指定 bytes 建立 Blob，按鈕結果顯示「已交給瀏覽器下載。」／「Download handed to the browser.」。完整寫檔結果由瀏覽器決定。四個並存 URL 達上限時先等計時回收，畫面顯示「請等候現有下載連結回收。」／「Wait for the current download links to expire.」。建立 URL 或觸發下載失敗顯示「無法啟動下載，請重試。」／「Could not start the download. Try again.」，保留有效快照供重試。
6. 重設清空並回來源欄。語言切換若有來源、設定變動或忙碌，先以頁內確認，接受後清空再去另一語入口。`pagehide` 同步清空，`pageshow.persisted` 再按目前語系初始值建立空頁。離頁、重設、換語與 BFCache 清除見 §5.3。

## 4. inputsOutputs

### 4.1 型別、界線與 CSV

`locale` 僅 `"zh-Hant" | "en"`。來源為 exact discriminated record `{kind:"paste",text:string}` 或 `{kind:"file",file:File}`。讀檔後 core bytes 入口為 `Uint8Array`，貼上入口為原始 JS string。主執行緒 File.size 判上限，Worker 按實際 bytes 再判。檔案解碼使用 `new TextDecoder("utf-8",{fatal:true,ignoreBOM:true})`。bytes 上限 `524288`，包括 BOM。貼上先以 UTF-16 code units `>524288` 作立即 byte 下界，再驗全部代理配對，按 UTF-8 實際 bytes 判上限。無效代理永不交給 `TextEncoder` 代換。HTML textarea 的標準值可能已把剪貼來源 CRLF 轉為 LF，工具從所讀 textarea value 保留；檔案引用欄內 CRLF 原樣保留。貼上由使用者操作一般文字欄，程式不呼叫 Clipboard API。[Encoding Standard](https://encoding.spec.whatwg.org/#interface-textdecoder) · [HTML textarea](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element)

1. 從已驗 UTF-8 字串開頭去恰好一個 `U+FEFF`。其後仍以 `U+FEFF` 開頭回 `CSV_BOM`。其他位置的該碼點是普通資料，須符合各欄規則。去 BOM 後零長度回 `SOURCE_EMPTY`。
2. 表頭為解開引用後依序八欄 `id,topic,prompt,a,b,c,d,correct`，可用合法引號包覆標題欄值。僅接受逗號。記錄分隔接受 LF／CRLF，可混用。引用欄內保留 LF／CRLF，單獨 CR 任何位置回 `CSV_NEWLINE`。一個結尾 record separator 不產空記錄，額外空行按普通空欄記錄驗證。沒有自動略過列或推斷欄名。
3. 欄首 `"` 開啟引用，引用內 `""` 還原一個 `"`，引用內逗號是普通內容。結束引用後下一個 token 只可為逗號、分隔符或 EOF。裸引號、結束後雜字、EOF 仍未關引用回 `CSV_QUOTE`。掃描到 NUL 或單獨 CR 就依該 token 報錯。若仍在引用內，先遇見的 NUL 或單獨 CR 早於 EOF 的未關引用錯誤。記錄與欄從 1 計數，記錄 1 為表頭。引號內換行不改 record 編號。
4. 依來源順序消費記錄，每列先詞法，再欄寬與欄位。讀到開啟第 9 欄的分隔符立即 `CSV_WIDTH`，位置 column 9。完成不足八欄時，位置為第一個缺欄。啟動 record 502 即 `CSV_ROW_LIMIT`，位置 column null。在第一個欄位語意不符時停止。僅表頭時 `CSV_EMPTY_BANK`，定位 record 2、column null。任何失敗整批無可用題庫。[CSV 引用參考](https://www.rfc-editor.org/rfc/rfc4180.html)

| 欄 | 驗證順序與保留值 |
| --- | --- |
| `id` (1) | `^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$` 且全文比對，大小寫敏感，先格式再查前列重複。後出現的欄報錯 |
| `topic` (2) | 1–60 Unicode 碼點，先長度，再 C0/C1 或 `U+2028/2029`，再首尾 `U+0020`。字串完全相等才同組。第 31 個新主題在此報錯 |
| `prompt` (3) | 1–500 碼點，先長度、再控制碼、再全空白。引用欄內 LF 或成對 CRLF 允許 |
| `a,b,c,d` (4–7) | 依順序各 1–200 碼點，先長度、再控制碼、再全空白。引用欄內 LF 或成對 CRLF 允許。四欄通過後，以後一個重複欄（依 b,c,d 順序）報 `OPTION_DUPLICATE` |
| `correct` (8) | 完整單字元 `A`、`B`、`C`、`D` |

C0/C1 在此為 `U+0000–001F` 及 `U+007F–009F`。全空白集合固定為 `0009–000D,0020,00A0,1680,2000–200A,2028,2029,202F,205F,3000,FEFF`，僅用於非空白測試。CRLF 按兩個碼點計。以 Unicode 碼點計數，未配對代理非法。保留大小寫、換行、空格、引號、字形及 Unicode 序列。題庫、標題與代碼一律無 trim、NFC、NFKC 或 locale folding。正則驗證以全文比對；JS `$` 可停在末端換行前，實作者須用全匹配長度或明確拒絕額外字元。

題庫 `Bank={rows:Row[],topics:Topic[]}`，`Row={id,topic,prompt,choices:[string,string,string,string],correct}`；`Topic={topic:string,available:integer}`。`rows` 原來源順序，`topics` UTF-16 code unit 逐位比較升序（共同前綴較短者在前）。應用程式使用 `Map` 或明確 array 索引分組，任意 topic 不用作物件屬性或 DOM ID。

### 4.2 抽卷設定

`Settings={title:string,seed:string,quotas:string[]}`，僅這三欄。初始標題依語系為「練習題」／「Practice quiz」，代碼 `lesson-1`；有題庫後按 `Bank.topics` 的同一順序以字串 `"0"` 填每個配額。所有輸入原值送驗，數字字串不自動更正。

驗證精確順序為形狀（含向量長度、dense 元素與 string 型別）、標題長度、標題字元、代碼、逐配額格式及範圍、合計。標題 1–80 碼點，單行，禁止 C0/C1、`U+2028/2029` 及未配對代理，字元違規一律回 `TITLE_CONTROL`；長度檢查將未配對代理暫計為一，再依字元規則拒絕。保留標題前後空格。代碼 1–32 個 ASCII 字母、數字、`_`、`-`，區分大小寫。配額格式為整個 `0|[1-9][0-9]{0,2}`，例如 `"01"`、`"1.0"`、`"1 "`、`"１"`、`"1e1"` 均格式錯。合法格式後用十進制整數轉型，各主題 0…available。合計需 1…60；無小數或舍入。出錯向量索引 `quotaIndex` 從 0 計，先到的主題優先。

### 4.3 模型、序列化與下載

| 資料模型 | Exact 欄位 |
| --- | --- |
| `StudentDocument` | `{title,questions:[{number,prompt,choices:[a,b,c,d]}]}` |
| `AnswerDocument` | `{title,answers:[{number,id,topic,correct,answer}]}`，`answer` 取該列相應選項的原字串 |
| `Output` | `{student,answer,studentBytes:Uint8Array,answerBytes:Uint8Array}` |

`number` 從 1 連續正整數。序列化函式簽章分開為 `renderStudent(student,locale)`、`renderAnswer(answer,locale)`。各僅接收上表對應 exact model；投影需逐欄建構，學員模型無正解、ID、主題及講師欄，無原始列展開。兩個 renderer 使用固定外殼及各自 body。下表與 `fixtures.json` 的完整字面檔凍結標籤、屬性順序、CSS 內容、字元與空行。變動字串僅置於文本位置：轉義 `& < > " '` 為 `&amp; &lt; &gt; &quot; &#39;`，`CR` 為 `&#13;`。LF 保留，原始 CRLF 的 CR 仍可從解析後的文字取回。`bdi` 隔離使用者雙向文字，顯示以固定 `white-space:pre-wrap` 保留空白與換行。

| 位置 | 固定結構 |
| --- | --- |
| 外殼 | HTML doctype、`html[lang]`、`head` 第一個 `charset=utf-8`、緊接 meta CSP、viewport、`robots=noindex,nofollow`、轉義標題、單一固定 `style`、`body > main > h1 > bdi` |
| 學員 body | `ol.questions > li.question` 依題號，`p > bdi` 為題目，`ol.choices[type=A] > li > bdi` 依 A–D |
| 講師 body | `table` 含 `thead` 五個 `th[scope=col]`、`tbody` 每列題號用 `th[scope=row]`。後四欄為 ID、主題、字母、答案文字。ID、主題、答案文字在 `bdi` 內 |
| 講師欄頭 zh-Hant | 題號、題庫 ID、主題、正解、正解文字 |
| 講師欄頭 en | No.、Question ID、Topic、Answer、Correct choice |
| 每份檔案 | UTF-8 無 BOM，LF，末尾一個 LF。`quiz-student.html`、`quiz-answer-key.html`，Blob `text/html;charset=utf-8` |

meta CSP 位於任何樣式或其他資源前。政策 `default-src 'none'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'; style-src 'sha256-…';`。`…` 由 `fixtures.json: htmlContract.styleSha256Base64` 固定。樣式雜湊以 `<style>` 與 `</style>` 之間的精確 UTF-8 bytes 計，沒有自動換行或縮排。固定 HTML 只有文檔、文字與樣式，無動態 URL、script、form、超連結或遠端資源。不要使用 `innerHTML` 或 `iframe srcdoc` 建應用程式預覽，安全 DOM 工廠依同模型建立相同語義。[CSP meta 與 hash](https://www.w3.org/TR/2026/WD-CSP3-20261027/)

兩份 `Uint8Array.byteLength` 各須 `≤2097152`，檢查順序學員後講師，任一超限整對失敗。有效 payload 的學員文字上界為 `60 × (500 + 4 × 200) × 6 + 2 × 80 × 6 = 468960` bytes，加固定模板；講師每題的可變文字更短。真實可達上界仍受 512 KiB 源資料限制。測試直接對 byte gate 注入 2 MiB 與 +1 的合成陣列，另測正常生成的真實長度。樣式以 print margin、重複表頭、`break-inside:avoid` 和 `page-break-inside:avoid` 讓放得下的一組保在同頁。題組高度超過整頁時允許自然換頁、內容可讀且不裁切。瀏覽器可能自行加入頁眉／頁腳。列印使用者自行發起。

### 4.4 固定錯誤

錯誤物件恆為 `{code,scope,record,column,quotaIndex}`，位置欄為整數或 null。CSV 語法／欄位錯誤使用 `scope:"source"` 與位置。`SOURCE_*` 及讀檔／編碼失敗三個位置皆 null。`QUOTA_*` scope 為 `quota`，格式／範圍提供索引，合計為 null。其他 `scope` 依下表，三個位置皆 null。錯誤不帶原輸入、例外文字或路徑。畫面對有 record 的錯誤附「第 {record} 筆，第 {column} 欄。」／「Record {record}, column {column}.」，欄 null 省略後半句。所有失敗同步撤銷兩角色的輸出。

| Code | Scope | zh-Hant | en |
| --- | --- | --- | --- |
| `SOURCE_EMPTY` | source | 選取一份 CSV 或貼上題庫。 | Choose a CSV or paste a question bank. |
| `SOURCE_TOO_LARGE` | source | 題庫超過 512 KiB，請縮小後再讀取。 | The bank exceeds 512 KiB. Reduce its size and try again. |
| `SOURCE_UTF8` | source | 請將檔案另存為有效的 UTF-8 CSV。 | Save the file as valid UTF-8 CSV. |
| `SOURCE_UNICODE` | source | 貼上的文字含無效 Unicode，請修正後重貼。 | The pasted text contains invalid Unicode. Correct it and paste again. |
| `SOURCE_READ_FAILED` | source | 無法讀取檔案，請重新選取或貼上。 | Could not read the file. Choose it again or paste its text. |
| `CSV_BOM` | source | 檔首只可有一個 BOM。 | Use at most one BOM at the start. |
| `CSV_NUL` | source | CSV 含 NUL 字元，請移除。 | Remove the NUL character from the CSV. |
| `CSV_NEWLINE` | source | 換行須為 LF 或 CRLF。 | Use LF or CRLF line breaks. |
| `CSV_QUOTE` | source | 請修正 CSV 欄內的引號。 | Fix the quoting in this CSV field. |
| `CSV_WIDTH` | source | 每筆 CSV 須有八欄。 | Each CSV record must have eight fields. |
| `CSV_HEADER` | source | 請按範例修正表頭及順序。 | Match the sample header and its field order. |
| `CSV_EMPTY_BANK` | source | 表頭後至少加入一題。 | Add at least one question after the header. |
| `CSV_ROW_LIMIT` | source | 一次最多讀取 500 題。 | Load at most 500 questions at a time. |
| `ID_FORMAT` | source | 題庫 ID 須以半形英數開頭，最多 32 字元。 | Start the ID with an ASCII letter or digit and use at most 32 characters. |
| `ID_DUPLICATE` | source | 題庫 ID 已出現，請使用不同 ID。 | This question ID is already in the bank. Use a different ID. |
| `TOPIC_LENGTH` | source | 主題須有 1–60 個字元。 | Use 1–60 characters for the topic. |
| `TOPIC_CONTROL` | source | 主題須為一行，請移除控制字元。 | Use one line for the topic and remove control characters. |
| `TOPIC_SPACE` | source | 請移除主題前後的半形空格。 | Remove leading or trailing ASCII spaces from the topic. |
| `TOPIC_LIMIT` | source | 一次最多讀取 30 個主題。 | Load at most 30 topics at a time. |
| `TEXT_LENGTH` | source | 題幹須有 1–500 字元，各選項須有 1–200 字元。 | Use 1–500 characters for a prompt and 1–200 for each choice. |
| `TEXT_CONTROL` | source | 請移除題幹或選項的控制字元。 | Remove control characters from the prompt or choice. |
| `TEXT_BLANK` | source | 題幹和選項不能只有空白。 | Prompts and choices must contain visible text. |
| `OPTION_DUPLICATE` | source | 同一題的四個選項須各不相同。 | Use four distinct choices for this question. |
| `CORRECT_FORMAT` | source | 正解須為大寫 A、B、C 或 D。 | Enter an uppercase A, B, C, or D as the correct choice. |
| `SETTINGS_SHAPE` | quota | 配額與目前題庫不同步，請重新讀取題庫。 | The quotas no longer match the bank. Read it again. |
| `TITLE_LENGTH` | title | 題本標題須有 1–80 個字元。 | Use 1–80 characters for the paper title. |
| `TITLE_CONTROL` | title | 題本標題須為一行，請移除控制字元。 | Use one line for the title and remove control characters. |
| `SEED_FORMAT` | seed | 抽卷代碼須為 1–32 個半形英數、底線或連字號。 | Use 1–32 ASCII letters, digits, underscores, or hyphens for the draw code. |
| `QUOTA_FORMAT` | quota | 請輸入 0 或最多三位的半形整數。 | Enter 0 or a whole number of up to three ASCII digits. |
| `QUOTA_RANGE` | quota | 題數超過此主題可抽上限。 | The quota exceeds the available questions for this topic. |
| `QUOTA_TOTAL` | quota | 各主題合計須為 1–60 題。 | Draw 1–60 questions in total. |
| `OUTPUT_TOO_LARGE` | output | 產物超過 2 MiB，請減少抽題數。 | An output exceeds 2 MiB. Draw fewer questions. |
| `WORKER_UNAVAILABLE` | worker | 此環境無法安全執行，請使用支援的瀏覽器開啟工具。 | Open this tool in a supported browser to process the bank. |
| `WORKER_FAILED` | worker | 處理中斷，請以目前輸入重試。 | Processing stopped. Try again with the current input. |
| `WORKER_TIMEOUT` | worker | 處理逾時，請重試或縮小題庫。 | Processing timed out. Try again or use a smaller bank. |

詞法先於同列語意，但開啟第 9 欄或第 502 筆時立即失敗。表頭在詞法及欄寬後依序比第一個不符欄。資料列 `id→topic→prompt→a→b→c→d→選項查重→correct`；新主題上限與 ID 重複分別屬該欄驗證。檔案 `size→讀取→實際 byte 上限→fatal UTF-8→BOM→CSV`。貼上 `code-unit 下界→配對代理→UTF-8 上限→BOM→CSV`。啟動工作前無可用能力回 `WORKER_UNAVAILABLE`，正常啟動後本輪 I/O 或處理失敗使用上述對應錯誤。`fixtures.json` 有同列與跨列優先序的例子。

## 5. implementation

### 5.1 純核心和模組

| 路徑（相對 `tools/quiz-paper-builder/`） | 契約 |
| --- | --- |
| `public/js/core/quiz.mjs` | 自包含 ESM。`parseBank(input) -> Result<Bank>`，`validateSettings(bank,settings) -> Result<{title,seed,counts:number[]}>`，`buildPaper(bank,settings,locale,digest?) -> Promise<Result<Output>>`。`Result<T> = {ok:true,value:T} \| {ok:false,error:QuizError}` |
| `src/worker-body.mjs` | module Worker 接口。載入時送 `{kind:"ready"}`，一個 Worker 接一個 run，讀檔或生成後送一筆終態。讀 File 可用 `arrayBuffer()`，大小／錯誤受 §4.4 界線。檔案名不進題庫或輸出 |
| `public/js/controller.mjs` | 具注入 Worker、定時器、Blob URL、下載 adapter 的控制器。`createController(locale,deps)` 提供 `dispatch(event)`、`snapshot()`、`getPreview()`，同步狀態轉移，生產環境依 §5.2–5.3 |
| `public/js/app.mjs`、`public/js/locales/{zh-Hant,en}.mjs`、`public/styles/app.css` | DOM 事件、雙語字典及共享視覺權杖。任一工作初始化於應用程式入口。error code 與動態值只以 `textContent` 或 `value` 呈現 |
| `public/index.html`、`public/en/index.html`、`public/404.html`、`public/_headers` | 兩語入口和固定靜態資產，HTML 沒有使用者資料。預覽環境的輸出 metadata 見 §6 |
| `scripts/{check,build,check-generated,tree-hash,serve}.mjs`、`test/*.test.mjs` | Node 24 ESM built-ins，零相依套件。用固定源清單建置及檢驗，維護同一份核心算法 |

`parseBank` 依有限狀態機掃描，字串用片段／buffer 組裝，禁止重複整段拼接造成二次方成本。`validateSettings` 回傳整數向量；`buildPaper` 同步驗其設定後，以固定輸入 `UTF8("gq-quiz-v1\n" + seed + "\n" + id)` 逐題計 SHA-256。最後一個字元是 ID 末字，無額外 LF。以 64 字元小寫十六進位字典序排序。同一主題同 digest 時以 ASCII ID 升序。依 `Bank.topics` 順序和各主題前 `count` 個排名連續編號。不依原 CSV 順序、JS locale 或 options 的 `correct` 值排名。新增／移除題目可能改變該主題；改代碼可能剛好抽到相同 ID。`digest` 測試接縫接收 `Uint8Array` 並回恰好 32 bytes，生產使用 `crypto.subtle.digest("SHA-256", bytes)`，沒有替代隨機或弱雜湊。固定批次最多 16 個 digest 同時在途。

記 `B≤524288` UTF-8 bytes、`N≤500` 題、`T≤30` 主題、`K≤60` 抽題、`H` 為兩份最終 HTML bytes 合計。解析時間 `O(B)`，hash 總輸入至多 `N×76` bytes（固定 prefix 11 bytes、seed≤32、LF 1、id≤32），分組排序 `O(N log N + T log T)`，投影與序列化 `O(H+K)`。資料空間 `O(B+N+T+H)`；只保留一個現行來源、一份有效題庫、至多一個 Worker 及一對當代預覽／bytes。主執行緒與 Worker 題庫 clone 各至多一份，輸出 ArrayBuffer transfer；URL lease ≤4 筆、每筆 ≤2 MiB。Worker 建立、回應或本地檔案讀取的 wall-clock 受環境限制。從開始到完成設定前景計時器讀取 20 秒、生成 30 秒；timer 能執行時到期撤銷並回 `WORKER_TIMEOUT`。

### 5.2 Worker 與控制器

初始靜態 ESM 載入建置樹中的 `js/worker-source.mjs`。build 讀取自包含的 `quiz.mjs` 與無 import 的固定 `worker-body.mjs`，內容為兩份完整 UTF-8 source 中間插入一個 LF，保留各自尾端。將完整字串寫作 `export const workerSource = <JSON.stringify 的字串>;\n`。worker-source 由建置產生，無外部 import。開始每個 run 時，以固定字串建 JS Blob URL 後 `new Worker(url,{type:"module"})`，重新建立 Worker 不發 HTTPS 請求。收到 `ready` 即撤銷此內部靜態程式 Blob URL；終止、錯誤或逾時也撤銷。成品 HTML Blob URL 只於明確下載時建立。網站 HTTP CSP 允許 `worker-src blob:`，其餘依第 6 節。應用程式資料不進程式 Blob，也不進跨網路請求。缺 API、安全內容環境或 Worker 建立能力時回 `WORKER_UNAVAILABLE`。

| 方向 | Exact message |
| --- | --- |
| worker → app，初始 | `{kind:"ready"}`，只對目前 Worker 實例有效 |
| app → worker，讀取 | `{kind:"read",epoch,run,source}` |
| app → worker，生成 | `{kind:"generate",epoch,run,bank,settings,locale}` |
| worker → app，讀取完成 | `{kind:"loaded",epoch,run,bank}` |
| worker → app，生成完成 | `{kind:"generated",epoch,run,output}`，transfer 兩個輸出 buffer |
| worker → app，失敗 | `{kind:"failed",epoch,run,error}` |

epoch、run 為正安全整數。epoch 起始 1，每次 reset／pagehide／persisted pageshow／已接受換語增加一。run 由控制器生命週期自 1 單調增加，只在建立一輪時分配，清空不重用。計數用盡時返回 `WORKER_FAILED` 並要求重新載入。成功、失敗及取消均將 active 設 null，終止 Worker、清 timeout。先查 active 與 Worker 實例。舊實例、具合法但已過期 epoch/run 的訊息、已移除實例的 error 無效。當代訊息缺欄、形狀不符、或在首個 `ready` 前回終態時，回 `WORKER_FAILED` 並銷毀整對產物。`ready` 第二次無效。結果恰須一對，兩者皆由最後一次有效快照產生。

控制器 observable `Snapshot` 精確包含 `phase,locale,epoch,hasSource,bank,settings,active,preview,downloads,downloadCount,notice,error`。`bank` 為 `null` 或 `{questions,topics}`；`active` 為 null 或 `{kind:"read"|"generate",epoch,run}`；`preview` 為 `null|"student"|"answer"`；`downloads` 為 `{student:boolean,answer:boolean}`；`downloadCount` 為活躍成品 lease 數；`notice` 為 `null|"download-requested"|"download-limit"|"download-unavailable"`。`settings` 是原字串，無 bank 時 quotas 為 `[]`。error 是 §4.4 或 null。`getPreview()` 僅在 ready 回目前模型；輸出 bytes 不進 Snapshot。

事件以 `{type:…}` 當 discriminant，具名 payload 如下。Fixture 的 `worker` 事件代表假 adapter 回覆，`fromRun` 標出發送實例。`adapterCreateFails` 是 fixture 注入參數，表示建立靜態程式 URL 後 Worker constructor 拋錯，須撤銷該 URL；此參數不屬產品事件 payload。`download` 正常效果除 Snapshot 外回指定檔名、MIME、精確 bytes。沒有作用的操作維持 Snapshot。

| 事件 | payload 與效果 |
| --- | --- |
| `source` | `source` 為讀入的 File／貼上 string，或 null；依 `3.2` 變動。`sample` 等於貼入固定範例 |
| `title`、`seed`、`quota` | `value:string`，quota 另含 `index`。無相應 topic 的 quota 無效；對應索引保留 raw string |
| `read`、`generate` | 無 payload。讀取無來源回 SOURCE_EMPTY；現行來源已有 bank 的 read 無效；無 bank 的生成無效。已有 active 時兩種啟動事件均無效 |
| `worker` | `{fromRun,message}`，依上列 exact wire；fixture 的 `bankRef` 從 banks 展開。 `outputRef` 由 successCases 的 ID 找到兩模型與兩檔字面 bytes，展開為真實物件後注入 |
| `cancel`、`timeout` | cancel 無 payload；timeout 含 epoch/run，僅 active 相等有效。timeout 回 `WORKER_TIMEOUT` |
| `select`、`download` | `role:"student"|"answer"`；只有 ready 有效。切換預覽不重算；下載不改目前視圖 |
| `lease-expired` | `leaseId` 為本地 adapter handle，已回收或過期訊息無效。釋放後清下載上限 notice |
| `reset`、`pagehide`、`pageshow`、`language` | 前二無 payload；pageshow 含 `persisted:boolean`，language 含 `locale` 和 `confirmed:boolean`。已接受換語或 persisted 回返以預設值空頁 |

無效使用者事件包括未識別型別、未知 role、錯誤索引，直接忽略。Worker 或應用程式不捕捉全域操作輸入，只處理自己的 DOM。單語 UI 字串取固定字典，錯誤與資源例外不紀錄使用者內容。

### 5.3 生命週期與平台

下載 adapter 同一事件內組 Blob 及臨時 `a[download]`，觸發後同步移除節點；從成功建立起每個 URL 最多 30 秒。最多四個同時 lease，使用 generation 與單獨 handle 定時回收。第四個成功 lease 使兩下載按鈕停用，notice 為 `download-limit`；任一 lease 到期使兩者恢復，清空上限 notice。其餘正常成功顯示 `download-requested`，一般到期保留此 notice。若建立或點擊拋錯，立即 revoke 已建 URL，保留快照、清除暫時節點並顯示通知。來源／設定編輯、重讀、重預覽、重設、換語、pagehide、BFCache 回返同步撤銷全部成品 URL 並清 timers。取消處理丟棄該輪 worker、timer 和中間值，且保持已有效的現行題庫與設定。換語先清理再固定路徑導航。

重設、語言接受、pagehide 與 persisted pageshow 清空 File、textarea、設定、已驗題庫、輸出、預覽節點、Worker、Blob URL、錯誤、通知，回預設。`pagehide` 到回返前不得重新開始工作。一般失焦與 `visibilitychange` 保留當前狀態。記憶體管理交由執行環境，產品清除可達引用。瀏覽器管理已下載的檔案。

站點不建立 local/session storage、IndexedDB、cache storage、service worker、cookie、歷史狀態或含使用者資料的 URL；程式不讀剪貼簿、呼叫遠端 API、網路遙測或列印 API。靜態資源初載後再開始的處理不發網路請求。精確測試應監看包含同源及自動注入路徑的實際網路和儲存變動。

## 6. acceptance

以下為 `spec.acceptanceCriteria` 的九個必要產品 ID 與具體驗收。每項同固定產品 PR head 以獨立評分至少 90、必要檢查完成，附環境、步驟、實際輸出與證據位置。本次文件階段產品九項均 `NOT_RUN`。規格任務獨審則用本文件的八節。

| ID | 產品通過條件 |
| --- | --- |
| `functionality` | 以四筆假題驗完整兩語流程，`lesson-1` G01／M01，`lesson-3` G02／M01。兩份資料模型、題號、固定檔名、MIME 與完整 fixture bytes 全等。反轉來源、選項順序及兩種正解投影以字面測試 |
| `boundaries` | BOM/CRLF/LF、malformed UTF-8/Unicode、NUL、表頭、欄寬、重複與 512 KiB、500/501 題、30/31 主題、60/61 抽題、各欄碼點、取消、重複和晚到 Worker、輸出 byte gate 都符合位置與優先序 |
| `privacy` | 隔離瀏覽器從載入到離頁實測 Network／Storage，假題的讀取、取樣與匯出無額外請求及使用者持久資料。重設、語言、BFCache 回返清工作引用、Worker、URL。答案翻轉時學生 bytes 全等，正解欄、題庫 ID 和主題 metadata 不進學生模型 |
| `security` | 精確輸入、Worker shape、固定資源、兩角色模板與 CSP style hash。惡意形狀 fixture 顯示為字面，DOM 沒有由其產生的元素、handler 或網路。開啟離線 HTML 確認樣式允許且其餘限制生效 |
| `usability` | 桌面與平板以題庫→配額→預覽→兩份下載完成。手機逐段可操作。錯誤附位置可修正、取消保留可用資料、改值後舊結果立即失效，學員與講師動作清楚可辨 |
| `accessibility` | 真鍵盤、焦點、讀屏狀態與欄位錯誤、320 CSS px、200% zoom、主要觸控目標與對比，兩語長字串及長題幹不裁切。A4／Letter 螢幕列印預覽中題目和表格順序可讀，完整輸出頁不遺漏 |
| `localization-seo` | 固定雙語文案、lang、title、description、H1、互返 hreflang/x-default/canonical、各語返回首頁、preview noindex/robots；正式入口依實際批准的 HTTPS origin 核實 |
| `toolchain-provenance` | Node 24 ESM built-ins，獨立 literals、兩次建置的相對路徑與逐檔 bytes 雜湊一致。只讀隔離環境實跑並鎖定同一公開 PR head；記錄來源及允許路徑 |
| `compatibility` | 核准隔離的真 Chrome、Edge、Firefox、Safari 確認 Worker／file input／下載／UTF-8／列印預覽。真平板、手機和讀屏各記型號、OS、瀏覽器／AT 版本。原生列印及實體紙張由具相應授權的驗收者記錄；不依模擬標 PASS |

反轉來源測試時選項的顯示順序固定 A–D，原輸入選項不得被洗牌。供公開部署前核對的兩語 metadata 如下。

| 欄位 | 繁中 | English |
| --- | --- | --- |
| 靜態入口 | `/index.html` | `/en/index.html` |
| `lang` | `zh-Hant` | `en` |
| `title` | 題庫抽卷與答案表 | Quiz Paper Builder |
| `description` | 依主題從 CSV 抽題，分開下載題本和解答 | Draw multiple-choice questions by topic and download separate student and answer-key files |
| 返回首頁 | `https://glossquote.com/index.html` | `https://glossquote.com/en/index.html` |

每頁 canonical 為當頁完整 URL；兩頁共同提供 `zh-Hant`、`en`、`x-default`（繁中）三個完整 URL，切語用對應入口。預覽 origins 明確固定 `http://127.0.0.1:4180`，兩語用 noindex,nofollow meta 與 `X-Robots-Tag`，`robots.txt` 禁爬且無 sitemap。正式 build 只接受主統籌批准的 HTTPS 工具 origin；同源 canonical、hreflang 與 sitemap、robots 指向批准入口，正式候選是否可索引由發布檢查驗證。下載 HTML 自帶 noindex,nofollow。應用程式 HTTP headers 使用 `Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`，另含 `X-Content-Type-Options: nosniff` 及 `Referrer-Policy: no-referrer`。固定本機 ESM 與 CSS，不需遠端字型或 CDN。

## 7. tests

### 7.1 文件與產品命令

從四檔的同一目錄執行 [作者檢查](AUTHOR-CHECK.md) 的 Node 24 離線命令，重算原始 hash、完整 HTML、錯誤位置、邊界建構值及控制器快照。作者 fixture 由人工指定投影和字面結構，獨立 oracle 不讀產品程式。

產品實作者在 `tools/quiz-paper-builder/` 根目錄提供以下腳本。Windows PowerShell 可將 `npm` 替為 `npm.cmd`。測試只用合成資料，無安裝步驟。

~~~sh
node --version
npm test
npm run check
npm run build:preview
npm run check:generated:preview
node scripts/tree-hash.mjs dist
npm run build:preview
npm run check:generated:preview
node scripts/tree-hash.mjs dist
~~~

`npm test` 使用 `node --test`；`check` 核對 exact source allowlist、各 ESM 語法、兩語字典與 source contract。`build:preview` 先驗固定 source snapshot，於同工作目錄 stage 後安全取代自有 dist，驗證失敗保留上一個已驗 dist。`check:generated:preview` 核對完整檔案、標頭、robots、metadata 與一致的 worker-source bytes。`tree-hash.mjs` 輸出依 UTF-16 路徑序比較的 `<SHA-256><space><UTF-8 byteLength><space><relative POSIX path>`，拒未知檔、跳轉符號連結與硬連結，無時間戳記。比較兩次完整 stdout，逐檔一致才通過。`node scripts/serve.mjs --port 4180` 僅 bind `127.0.0.1` 並服務已驗預覽，拒路徑穿越與未知旗標，不啟動瀏覽器。測試伺服器由當事執行者依自身 process handle 結束。產品發布由主統籌用 `node scripts/build.mjs --production --origin <approved HTTPS origin>` 及對應 `node scripts/check-generated.mjs --production --origin <approved HTTPS origin>` 驗證實際部署輸入。

### 7.2 字面與真實檢查

`fixtures.json` 含以下區塊。

- `sources` 為逐字 CSV 或 byte hex、`banks` 為精確 Bank 字面、`bankSummaries` 為固定可見統計。`ranking` 記兩組完整 SHA-256 與已知最小 ID，`papers` 記完整 exact Student/Answer 模型。`htmlFiles` 存檔名字面、MIME、全文、byteLength 與 SHA-256。
- `successCases` 鎖定主題份額、題號、倒序等 byte 等價、英中兩語及正解翻轉、轉義與保留 CRLF。`errorCases` 為完整 code、scope、record、column、quotaIndex，提供 exact input 或明示 `boundaryCases` 的有限合成構造。
- `boundaryCases` 用小型重複構造檢查 512 KiB±1、500／501、30／31、60／61、碼點與 2 MiB 內部輸出 gate，另有 UTF-16 主題排序及人工同 digest 平手案例。`controllerTraces` 用假 Worker 明確傳遞兩語完整 Snapshot、下載 effect、取消、reset、pagehide、BFCache 和晚到回應。比較每事件所有 Snapshot 欄位與下載／撤銷／取消／逾時／導航 effects。`effect:null` 表示沒有這五類效果，Worker 及 Blob lifecycle 另比 `adapterCounts`。固定 `lease-N` 是 fake adapter 的 handle，`revokeLeaseIds` 隨導航效果核對清理。每次下載 effect 展開 `fileRef` 比對檔名、MIME 和 bytes。
- 獨立排序 oracle 對每主題以 ordinal 比較雜湊找最小值、必要時移除已選重複取最小，和產品 group-sort 分路。至少一個假 digest 的平手例由 ASCII ID 直接人工排序；UTF-16 順序例以實際單元值驗證。

真實隔離瀏覽器矩陣逐個記錄產品 commit、瀏覽器／OS 版本、viewport、zoom、步驟與可查證證據。桌面 Chrome／Edge（Windows）各完整兩語載入、錯誤修正、取消、兩檔下載與離線開啟；Firefox／Safari 檢查 module Blob Worker、下載字元及 CSP、A4／Letter 頁預覽。平板 Safari 及手機 Safari／Chrome 檢查觸控重排與虛擬鍵盤，NVDA＋Chrome 或 VoiceOver＋Safari 跑真讀屏，至少一套桌面使用真實 200% zoom。監看 Network／Storage 與頁面返回，確認遲訊息不重現。原生列印、實體裝置、真 AT、真瀏覽器無具體證據則 `NOT_RUN`，因桌面隔離缺少時填 `NOT_RUN_USER_FOCUS_INCIDENT`。產物、日期及 PASS／FAIL／NOT_RUN 按實跑範圍記錄。

## 8. handoff

- 作者 `local-codex:01a1c8b8-1d30-7593-9793-f99d5f42f564`，任務 `labs-quiz-paper-builder-spec-20261111`，claim `fh-quiz-claim-936e2143-6cba-431f-978a-def04adf3bf1`。registry r1651 精確讀回 `working`。固定來源是派工 TASK 與原研究 BRIEF。規格候選在 `codex/labs-quiz-paper-builder-spec-20261111-01a1c8b8`，由公開 PR 的 head 與本任務 HANDOFF 固定候選 SHA；同 commit 的四檔為審查範圍。[registry r1651](https://github.com/KYStr/glossquote-labs-home/blob/1d09642d3e46f0dcde3f95ed56ff7b5f27489559/coordination/work-registry.json) · [固定派工](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/reviews/five-hour-2026-11-11/dispatch/new-spec-quiz-paper-builder/TASK.md) · [固定研究](https://github.com/KYStr/glossquote-labs-home/blob/14d3dff09fe8f283726a7e8cb9eaadd905500516/docs/specs/quiz-paper-builder/BRIEF.md)
- 來源用作者合成四筆題庫及固定算法驗證資料。引用的產品原始碼是區隔證據，候選沒有搬入他人工具原始碼。第三方文件作規格參照。此規格工作授權固定四檔來源公開；產品實作、部署、正式子網域和雙語首頁依各自授權及驗收流程進行。
- 下一位 reviewer 從固定 commit 取回 [BRIEF](BRIEF.md)、本文件、[fixtures](fixtures.json)、[AUTHOR-CHECK](AUTHOR-CHECK.md)，驗 diff 範圍、字面案例、雙語、完整錯誤和狀態契約。對八節逐項 ≥90 且必要文件檢查完成，另由獨立 actor 處理文件 readiness。`register-spec` 使用 §6 九項產品 criteria；產品實作者另取有效 production claim，程式唯一正式路徑 `tools/quiz-paper-builder/`。
- 後續產品里程碑依 §5 建純核心、Controller／Worker、雙語入口與安全離線下載，依 §7 驗同一產品 PR head，補 `HANDOFF.md`、`VERIFICATION.md` 與真瀏覽器及相容證據。資源、原生列印及裝置缺口保留真實狀態。主統籌接受產品後才整合免費發布與雙語首頁。外部驗收依使用者實際結果回填。
