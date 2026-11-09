# 閱讀進度規劃：介面與 SEO

狀態：SPEC_ONLY；本文件是介面與內容規格，沒有畫面或搜尋結果實測。

## 使用情境與設計方向

- 使用者：需要在期限內完成一本書的學生、讀書會成員或自學者。
- 時機：選定可開始日、截止日與每週可讀日；落後後手動更新已讀頁數與新開始日。
- 成功：一眼看見剩餘頁數如何沿日期分配、第一頁與最後一頁如何銜接，以及每天上限是否可行。
- 核心物件：按日期排序的頁碼分配清單。
- 主要風險：把計畫誤認為實際閱讀紀錄；隱藏零剩餘頁、無可讀日或每日上限不可行；錯把日期範圍或頁碼算錯。
- 平台：桌面與手機瀏覽器。鍵盤、繁體中文輸入法、日期控制、虛擬鍵盤與低階裝置都在驗收範圍。

模式：Product App。畫布以表單與真實排程為主，不設 SaaS hero、假統計、使用者見證或促銷區。

## 視覺系統

沿用 Gloss Tools 語意 token：暖紙色作背景、白色作工作區、墨色文字、acid green 標示被選取的可讀星期與成功的可行計畫；attention 使用既有 warning 色和文字圖示。所有文字、分隔線、控制邊界與 focus ring 遵照 docs/DESIGN-SYSTEM.md 的共用對比及尺寸要求。不要把 coral 當小字色，不使用遠端字型、圖示套件、彩色漸層或一排相同圓角卡片。

產品自己的識別手勢是「連續頁碼沿日期列往前接續」：排程每行用日期標籤加頁碼連續性提示；閱讀日有精確起訖頁，彈性日只顯示「彈性／休息」。不以空圖表或假進度條代替實際分配。

UI 字型使用 family UI token 和系統 fallback；數字頁碼可用 family data token。正文 15–17px、標題通常不超過 32–36px。對齊以左對齊為主，數字欄位可在足夠寬度下右對齊，但小螢幕仍須清楚標示單位。

## 版面草圖

桌面：表單與結果同一主畫布，表單佔較窄的一側，逐日計畫佔較寬的一側。結果不存在時，表單下方顯示空狀態，不留假資料。

    ┌──────────────── 閱讀進度規劃 ────────────────┐
    │ Gloss Tools                       繁體中文 | EN │
    │ [書名（選填）]                                  │
    │ [總頁數] [已讀頁數]                             │
    │ [開始日期] [截止日期]                           │
    │ [可讀星期：一 二 三 四 五 六 日]                 │
    │ [每日上限（選填）]       [產生閱讀計畫]          │
    │ 計畫只代表安排，不會記錄實際閱讀。              │
    ├───────────────────────────────────────────────┤
    │ 初始：選擇日期與總頁數後產生計畫。              │
    │ 結果：剩餘頁數／最後閱讀日／閱讀日／彈性日      │
    │       日期 → 頁碼連續分配清單                   │
    │       [唯讀報告] [複製] [下載 TXT] [清除]       │
    └───────────────────────────────────────────────┘

手機 320 CSS px：單欄，沒有固定側欄，主要動作緊接表單；輸入欄在虛擬鍵盤上方可捲到，結果逐行堆疊。

    ┌──────── 閱讀進度規劃 ────────┐
    │ 繁體中文 | English            │
    │ 書名（選填）                 │
    │ 總頁數                       │
    │ 已讀頁數                     │
    │ 開始日期                     │
    │ 截止日期                     │
    │ 可讀星期                     │
    │ 每日上限（選填）             │
    │ [產生閱讀計畫]               │
    │ 限制說明                     │
    │ 摘要                         │
    │ 日期 / 頁碼或彈性日          │
    │ 唯讀報告、複製、下載、清除   │
    └─────────────────────────────┘

## 控制項與行為

- 書名：可留空，單行文字欄位。Visible label「書名（選填）」／“Book title (optional)”。
- 總頁數、已讀頁數、每日上限：文字欄位加數字鍵盤提示，不用 type=number。Visible labels 保持顯示；欄位旁說明接受 ASCII 整數，總頁數 1–10000、已讀頁數 0–總頁數、每日上限 1–10000。
- 日期：開始與截止都有獨立標籤。支援的瀏覽器預設原生 date input；提供明確的文字輸入模式切換。文字模式提示精確格式 YYYY-MM-DD。無效或無法表達的文字不會自動轉成另一個日期。
- 星期：fieldset/legend 加七個獨立、帶文字的 checkbox；預設勾選一至五。選取狀態以 checkbox、文字與顏色共同呈現。
- 主要按鈕：首次顯示「產生閱讀計畫」／“Create reading plan”；已有結果後，輸入改動立即清除結果，按鈕改為「重新計算計畫」／“Recalculate plan”。不可自動替使用者選今天。
- 清除：清除目前書籍輸入、結果與報告。任何使用者輸入與預設不同時，先顯示確認對話框；取消保留原值與結果。
- 語言：繁中 / 英文是各自獨立的靜態 URL。以標示目標語言的原生連結前往另一頁；旁邊清楚提示「切換語言會清除目前輸入與計畫。」／“Changing language clears your inputs and plan.” 導覽會離開目前頁面，pagehide 先清除本分頁資料；新頁顯示其空白初始狀態。按瀏覽器返回或再次切回也不得還原前頁資料。不得把草稿放在 URL、history state、Web Storage 或 Cookie。繁中入口為 /index.html，英文為 /en/index.html。

## 可見狀態與必要文案

所有文字均有對應英文版本。控制項名稱、錯誤碼、結果狀態及報告標籤依 docs/PRIVACY-SECURITY.md 與 docs/DESIGN-SYSTEM.md。

| 狀態 | 繁體中文 | English |
|---|---|---|
| 初始空白 | 選擇開始與截止日期、輸入頁數，再產生計畫。 | Choose a start and end date, enter the page counts, then create a plan. |
| 常駐限制 | 這只是一份計畫，不會追蹤你實際讀完的頁數。輸入只留在此分頁；離開或重新載入即清除。 | This is a plan only; it does not track pages you actually read. Inputs stay in this tab and are cleared when you leave or reload. |
| 語言切換提示 | 切換語言會清除目前輸入與計畫。 | Changing language clears your inputs and plan. |
| 輸入已變更 | 資料已變更，舊計畫已清除。請重新計算。 | Your inputs changed. The old plan was cleared. Recalculate to see an updated plan. |
| 無剩餘頁 | 已無剩餘頁。這不代表曾記錄全書實際完成閱讀。 | No pages remain. This does not record that the book was actually completed. |
| 有可讀日的成功摘要 | 剩餘 {R} 頁；{D} 個可讀日；每日最低需求 {minRequired} 頁；最後閱讀日 {lastReadingDate}；閱讀日 {readingDays}；彈性／休息日 {flexDays}。 | {R} pages remain; {D} available reading days; at least {minRequired} pages per day; last reading day {lastReadingDate}; {readingDays} reading days; {flexDays} flexible/rest days. |
| 無可讀日 | 這段日期內沒有符合已選星期的可讀日。請更改日期或選取的星期。 | No selected reading weekday falls within this date range. Change the dates or selected weekdays. |
| 每日上限不可行 | 目前需要 {R} 頁，{D} 個可讀日最多可排 {capacity} 頁，缺少 {shortage} 頁。每日上限為 {cap} 頁；至少需要 {minDays} 個可讀日。這裡沒有排程，請調整條件。 | {R} pages remain. {D} available days can hold at most {capacity} pages, leaving a {shortage}-page gap. The cap is {cap} pages per day; at least {minDays} reading days are needed. No schedule was created; adjust the inputs. |
| 剪貼簿拒絕 | 無法使用剪貼簿。報告仍可在文字框中選取，請手動複製。 | Clipboard access was denied. Select the report in the text box and copy it manually. |
| 複製成功 | 已複製閱讀計畫。 | Reading plan copied. |
| 清除確認 | 要清除書名、頁數、日期、星期、計畫與報告嗎？ | Clear the title, page counts, dates, weekdays, plan, and report? |
| 清除確認按鈕 | 清除資料；保留目前內容 | Clear data; Keep current data |
| 報告沒有頁面列 | 本計畫沒有每日排程。 | There is no daily schedule for this plan. |

驗證訊息明說欄位、錯誤與修正方式，並以 aria-describedby 與錯誤欄位關聯。錯誤不只用顏色表示。invalid 時不留下任何舊摘要、頁碼列、複製或下載按鈕。

### 欄位錯誤文案

| 狀況 | 繁體中文 | English |
|---|---|---|
| 書名超出原始上限 | 書名太長，請縮短後再試。 | The title is too long. Shorten it and try again. |
| 裁切後書名超過 80 個 UTF-16 units | 書名裁切前後空白後最多可有 80 個字元。 | The trimmed title can be up to 80 UTF-16 code units. |
| 書名含控制字元或孤立 surrogate | 請移除控制字元或不完整的 Unicode 字元。 | Remove control characters or an incomplete Unicode character. |
| 未輸入總頁數 | 請輸入總頁數。 | Enter the total number of pages. |
| 總頁數不是 ASCII 整數 | 請輸入 1 至 5 位 ASCII 數字，不要加入空格或符號。 | Enter 1 to 5 ASCII digits without spaces or symbols. |
| 總頁數超出範圍 | 總頁數必須介於 1 至 10000。 | Total pages must be from 1 to 10000. |
| 未輸入已讀頁數 | 請輸入已讀頁數；若尚未開始，輸入 0。 | Enter pages completed; enter 0 if you have not started. |
| 已讀頁數不是 ASCII 整數 | 請輸入 1 至 5 位 ASCII 數字，不要加入空格或符號。 | Enter 1 to 5 ASCII digits without spaces or symbols. |
| 已讀頁數超出範圍 | 已讀頁數必須介於 0 與總頁數之間。 | Pages completed must be from 0 through the total page count. |
| 已讀頁數大於總頁數 | 已讀頁數不能大於總頁數。 | Pages completed cannot exceed total pages. |
| 日期空白 | 請選擇開始日期與截止日期。 | Choose both a start date and an end date. |
| 日期格式錯誤 | 請使用 YYYY-MM-DD，例如 2026-10-19。 | Use YYYY-MM-DD, for example 2026-10-19. |
| 日期不存在 | 這不是有效日期，請檢查年、月與日。 | This date does not exist. Check the year, month, and day. |
| 日期超出允許年份 | 日期必須介於 1900-01-01 與 2100-12-31。 | Dates must be from 1900-01-01 through 2100-12-31. |
| 截止日在開始日前 | 截止日期必須是開始日期當天或之後。 | The end date must be on or after the start date. |
| 區間超過 366 日 | 日期區間含首尾最多 366 天，請縮短日期範圍。 | The inclusive date range can be at most 366 days. Shorten it. |
| 沒有選取星期 | 至少選擇一個可讀星期。 | Select at least one reading weekday. |
| 星期資料不合法 | 請重新選擇星期一至星期日中的一個或多個日期。 | Select one or more weekdays from Monday through Sunday. |
| 沒有可讀日 | 這段日期內沒有符合已選星期的可讀日。請更改日期或選取的星期。 | No selected reading weekday falls within this date range. Change the dates or selected weekdays. |
| cap 格式錯誤 | 請輸入 1 至 5 位 ASCII 數字，或留空不設上限。 | Enter 1 to 5 ASCII digits, or leave the cap blank. |
| cap 超出範圍 | 每日上限必須介於 1 至 10000，或留空。 | The daily cap must be from 1 to 10000, or blank. |
| 非預期欄位型別 | 這個欄位格式不正確，請重新輸入。 | This field has an invalid value type. Enter it again. |
| 無法安全讀取計畫資料 | 無法安全檢查計畫資料。請重新整理並重新輸入。 | The plan data could not be validated safely. Reload and enter it again. |

## SEO 草案

Slug：reading-plan。正式入口預定為 https://reading.glossquote.com/index.html 與 https://reading.glossquote.com/en/index.html。正式部署與檢索設定等 M2 核准後才產生。

### 繁體中文

- title：閱讀進度規劃：依可讀日分配頁數｜GlossQuote Tools
- description：輸入總頁數、已讀頁數、日期範圍與可讀星期，將剩餘頁數分配到各閱讀日。可檢查每日頁數上限；工具不追蹤實際閱讀。
- H1：閱讀進度規劃
- 說明：選擇你真正能閱讀的日期與星期，平均分配尚未讀完的頁數。若進度落後，更新已讀頁數與開始日期後重新計算。計畫只用來安排，不會記錄你實際讀了幾頁。
- FAQ 1：「它如何分配剩餘頁數？」答：計算選定日期範圍內符合星期的可讀日，平均分配剩餘頁數；餘數由較早的可讀日先多分一頁。
- FAQ 2：「落後後怎麼更新計畫？」答：修改已讀頁數與新的開始日期，再按重新計算。工具不會自動追蹤閱讀或自動調整今天。
- FAQ 3：「會略過國定假日嗎？」答：不會。工具只依你選取的星期安排日期，不查詢所在地假日或學校行事曆；請自行調整可讀星期與日期。
- FAQ 4：「我的書名與計畫會保存或上傳嗎？」答：不需要帳號或雲端保存。資料只留在目前分頁；離開或重新載入後清除。複製與下載只會在你明確按下對應按鈕後執行。

### English

- title: Reading Plan: Set Pages by Reading Day | GlossQuote Tools
- description: Enter total and completed pages, a date range, and the weekdays you can read. Distribute remaining pages across those dates and check a daily page cap. The tool does not track reading.
- H1: Plan your reading progress
- Intro: Choose the dates and weekdays you can read, then split the remaining pages across them. If you fall behind, update the pages completed and the start date to calculate again. This is a plan, not a record of pages actually read.
- FAQ 1: “How are the remaining pages split?” Answer: The tool counts selected weekdays inside your date range and divides the remaining pages evenly. Earlier reading days receive the extra pages first.
- FAQ 2: “How do I update a plan after falling behind?” Answer: Change the completed page count and your new start date, then recalculate. The tool does not track reading or automatically move the start date to today.
- FAQ 3: “Does it skip public holidays?” Answer: No. It uses only the weekdays you select and does not check local holidays or school calendars. Adjust your dates and selected weekdays yourself.
- FAQ 4: “Are my book details saved or uploaded?” Answer: No account or cloud storage is used. Data stays in this tab and is cleared when you leave or reload. Copy and download happen only after you choose those actions.

### 索引規則

本機與候選預覽兩語頁都標示 noindex,nofollow，沒有 production canonical 或 production sitemap。M2 正式版才加入互相對應的 canonical、hreflang zh-Hant/en、x-default 指向繁中首頁、robots.txt、sitemap.xml、404 頁與靜態 CSP/security headers。production robots 只允許實際正式頁；404 不宣稱成功。正式連結包含兩語 GlossQuote 首頁：https://glossquote.com/index.html 與 https://glossquote.com/en/index.html。

不得以本地測試資料建立 schema 標記或虛構搜尋排名、評論、使用者數、節省時間、安全認證、永久免費或全面支援聲明。FAQ 必須在頁面可見且與結構化內容一致；M2 是否加入結構化資料由主代理按共用發布規格審核。
