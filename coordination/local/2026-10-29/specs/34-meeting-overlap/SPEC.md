# 會議空檔交集 — 既有規格保存

Task ID: `labs-34-meeting-overlap` · Spec ID: `spec-34-meeting-overlap`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求

規格狀態：**尚未實作**。以下需求是可驗收的產品契約；尚無產品行為或驗收結果可宣稱。

## 使用者工作與術語

召集人手動錄入同一天、同一共同時間基準下的可出席區間，請工具找出所有參與者都能參加且容得下完整指定長度的連續窗口。區間採半開語意 [start, end)：包含開始分鐘，不包含結束分鐘。共同時區／地點文字是使用者提供的說明標籤；工具不判斷其真偽或進行任何轉換。

「可用窗口」是全員交集經長度過濾後的區間。若窗口是 10:00–12:00、會議長 60 分鐘，合法開始時刻從 10:00 到 11:00，兩端都可選、粒度為整分鐘；11:00 是最晚開始時間。窗口的結束時間不包含在可用範圍中。

## 功能需求

### FR-01：雙語靜態頁面

- 提供繁中 /index.html 和英文 /en/index.html，繁中頁設定 lang="zh-Hant"，英文頁設定 lang="en"。
- 預設只顯示目前頁面的語言。語言連結前往另一個獨立靜態頁，不帶草稿、日期、查詢字串或 fragment。
- 介面明示兩語是兩個獨立頁面；離開會丟棄記憶體草稿。若有任何非空輸入、會議長度偏離初始60分鐘、列結構偏離初始兩人各一段，或已有提交結果，切換前要求頁內確認；取消則留在當前頁且保留狀態。乾淨初始頁可直接切換。

### FR-02：新工作區預設值

每次乾淨載入均提供空白日期、空白共同時區／地點、會議長度 "60"、兩位參與者、每人一段空白區間。沒有自動填入今天日期、姓名或範例空檔。空白值不構成有效排程，直到使用者完成必要欄位並提交。

### FR-03：日期與共同時間基準

- 日期必填，原始值須精確符合 ASCII yyyy-mm-dd，年份 0001–9999；按西曆閏年規則檢查日期是否存在。原樣以日期標籤顯示，不使用 Date、時區或 DST API 計算日期。
- 共同時區／地點描述必填。先用 ECMAScript trim() 去除首尾空白，再以 Unicode code point 計數為 1–60；原始 UTF-16 code unit 長度上限 256。
- 名稱必填。先 trim，再以 Unicode code point 計數為 1–40；原始 UTF-16 code unit 長度上限 256。
- 共同時間基準標籤不做時區名稱驗證、不換算。介面須緊鄰欄位說明：所有時段須已使用同一時間基準；工具不轉換時區或 DST。
- 名稱和描述都是純文字，沒有 HTML、Markdown、指令或可執行內容語意。拒絕 C0/C1 控制碼和未配對 UTF-16 surrogate；不把原始內容放入 URL、HTML 插入點、日誌或網路請求。

### FR-04：參與者與可用時段列

- 參與者 2–20 人，每人至少 1 段、至多 12 段，全表至多 240 段。
- 預設兩人。新增參與者為空白姓名並帶一段空白區間；刪除會移除該參與者及其區間。少於 2 人時停用刪除；超過 20 人時停用新增。
- 每人可新增或刪除其區間列；少於 1 段時停用刪除，達 12 段或全表 240 段時停用新增。邊界不得只靠停用狀態；核心仍驗證限制。
- 同名參與者有效，以穩定、唯一的 participant id 區分；每個人所屬區間以 participant 內唯一 interval id 區分。ID 不是使用者可編輯資料，不顯示在報告中。
- 每段開始時間嚴格 HH:MM，僅允許 00:00–23:59。結束時間嚴格 HH:MM，允許 00:00–23:59 以及結束專用 24:00。每段必須 start < end；不得跨日或將 24:00 用作開始。端點視為 [start,end)。
- 同一參與者的區間可亂序、相交或相接；計算時排序並合併，不要求使用者預先整理。

### FR-05：會議長度

- 預設 60 分鐘；必填正整數 1–1440。
- 原始值是 ASCII 數字字串，接受 1–4 位 [0-9]，不接受符號、小數、空白、全形數字或指數寫法；解析後依範圍檢查。前導零合法，例如 "0060" 等於 60。
- 以文字輸入搭配 inputmode="numeric"，不用 type="number"。軟鍵盤是提示，不能取代核心驗證。

### FR-06：求全員交集

1. 對每一人將輸入分鐘轉成 0–1440 的整數端點，依 start、再 end 遞增排序。
2. 合併重疊或相接區間：若下一段 start <= 目前 end，延長目前 end 至兩者較大值。
3. 從第一人的合併區間開始，逐一與下一人的區間集合做半開區間交集。只保留 start < end 的交集；每階段排序並合併相接輸出。
4. 對每個交集計算 durationMinutes = endMinute - startMinute，只保留 durationMinutes >= meetingDurationMinutes。
5. 計算 latestStartMinute = endMinute - meetingDurationMinutes。結果以開始分鐘、結束分鐘遞增排序；不計算少數人可用窗口、不打分、不猜偏好，也不枚舉無窮多個開始時刻。
- 所有時間都在同一個輸入日內。24:00 只表示該日結尾；輸出不標成次日。
- 驗證有效但 windows 為空時是成功的空結果，與缺欄位或格式錯誤有別。

### FR-07：提交與結果失效

- 只有使用者啟動「找出共同時段」／英文 Find common times 才驗證並提交。
- 每次任一日期、時間基準、長度、姓名、區間時間或列增刪變更，立即清空已提交結果和文字報告；必須再次提交才產生新結果。
- 無效輸入以欄位附近的繁中或英文訊息說明，將焦點移到第一個可修復欄位而不擾亂 IME 組字。核心錯誤碼是測試介面，不要求在 UI 顯示。
- 無交集狀態說明可調整時段或會議長度；不將其顯示成系統錯誤。

### FR-08：結果與可選純文字報告

- 每個窗口顯示開始、結束、可用長度和可安排開始範圍。可安排開始範圍為 [startMinute, latestStartMinute]，端點皆可開始，分鐘粒度；另顯示最晚開始時刻。
- 顯示日期、共同時間基準、會議長度、參與者人數及符合條件的窗口數，避免使用者把計算誤當時區轉換或邀請。
- 使用者可開啟一份頁內唯讀純文字報告。報告列出日期、共同時間基準、會議長度、參與者人數和每個結果窗口；沒有結果時列明無符合窗口。報告使用目前頁面語言，保留原始 trim 後的時間基準文字。
- 報告只提供選取／閱讀，不提供剪貼簿 API、下載、列印或分享動作。報告文字是純文字，不作 HTML 解讀。

### FR-09：清除與生命週期

- 「清除全部」清空日期、時間基準、所有參與者和區間、提交結果及報告，回到 FR-02 初始值。啟動前必須顯示頁內確認；取消完全保留原值與焦點狀態。
- 草稿、normalized data 和結果只放記憶體。不得使用 local/session storage、IndexedDB、Cookie、Cache API、URL query/hash、分享連結、遙測、分析、日誌或網路端點保存／傳送內容。
- pagehide 時同步清空所有資料和報告狀態並使任何 pending 工作失效。若 BFCache 還原觸發 pageshow 且 event.persisted === true，必須再初始化為 FR-02 空狀態。
- 初始頁面在程式載入前不會提交任何表單資料；不依賴 JavaScript 才能阻止 GET/POST 傳送。JavaScript 未啟動時顯示需啟用 JavaScript 才能使用的說明，資料控制保持停用。

### FR-10：介面與效能邊界

- 主畫布以參與者與區間工作表為主；結果緊鄰主要提交動作。新增／刪除控制在其所影響區塊旁，兩語切換為次要導覽。
- 移除／新增列後鍵盤焦點留在合理位置：新增移至新列第一欄，刪除移至同一位置下一列、上一列或相鄰新增按鈕。按鈕有文字可理解名稱，不能只用拖曳或圖示。
- 320 CSS px、200% 縮放、虛擬鍵盤、中文 IME、長姓名／描述、20 人及 240 段下不遮住欄位、錯誤、結果或主要動作；不要求整頁水平捲動。
- 本機運算上限為 20 人／240 段；演算法必須是排序及線性合併／交集，不枚舉每分鐘候選點。裝置很慢時需維持輸入可見，不以無限 spinner 偽裝工作。

## 資料與錯誤契約概要

完整 schema、每一欄位型別、驗證優先序和穩定 error code 見 [TECHNICAL.md](TECHNICAL.md)。不符合 schema 的資料一律拒絕，不忽略未知欄位或缺少的參與者。錯誤輸出不得回傳原始姓名、時區／地點或時間字串。

## 非 MVP 功能

未來若另行批准，才可討論匯入／匯出、排程儲存、行事曆整合、邀請、自然語言剖析、跨日或時區轉換、候選偏好排序、native clipboard 或檔案下載。它們不屬於本規格，不應以「很小的便利功能」形式混入 M1 或 M2。


---

## 原文件 TECHNICAL.md

# 技術規格

規格狀態：**尚未實作**。本文件定義實作介面與可重現的資料契約，不代表程式或檢查已存在。

## 執行模型與限制

- 正式工具是無伺服器邏輯的靜態原生 HTML、CSS 和瀏覽器 ESM 頁面。沒有外部 runtime dependency、CDN、遠端字型、第三方 API、analytics 或 telemetry。
- Node.js 24+ 僅供離線開發、純函式測試、檢查、靜態 build 和 loopback HTTP 驗收；演算法只用 Node/browser 內建功能。
- 開發預覽命令為 npm run dev，必須只綁定 127.0.0.1:4214，且只提供 public/。不得綁 0.0.0.0 或公開連接埠。
- production 候選預覽使用 127.0.0.1:5214；此流程只在主代理放行 M2 後建立。M1 不建立 production template、正式發布檔或公開 source ZIP。部署及首頁更新僅由主代理在 M3 執行。
- 演算法和日期校驗不得使用 Date、Intl 時區轉換、DST 資料、網路、隨機數或系統目前時間。只有 UI event handler 觸碰 DOM；核心純函式不讀寫全域狀態。

## 建議檔案樹

    package.json
    public/
      index.html
      en/index.html
      styles/app.css
      js/app.mjs
      js/core/meeting-overlap.mjs
    scripts/
      serve.mjs
      check.mjs
      build.mjs
    test/
      core.test.mjs
      app-contract.test.mjs
      static-security.test.mjs

M1 preview build 只複製經檢查的 public/ 到 dist/；dist/ 不含測試、腳本、規格或工作草稿。production 候選使用獨立 dist-production/，不得由 M1 build 默默寫入。具體 M2 production 工具必須由主代理放行後實作，採閉合檔案白名單且和 preview 產物分離。

## 精確 draft schema

核心入口接受由 app 建立的 JSON-like plain data。所有使用者原始值都保留為字串；分鐘數只在驗證成功後變為 number。

    type IntervalDraft = {
      id: string;
      startRaw: string;
      endRaw: string;
    };

    type ParticipantDraft = {
      id: string;
      nameRaw: string;
      intervals: IntervalDraft[];
    };

    type MeetingDraft = {
      dateRaw: string;
      timeBasisRaw: string;
      durationMinutesRaw: string;
      participants: ParticipantDraft[];
    };

結構規則：

1. 每一筆 object 的 prototype 必須是 Object.prototype；不接受 class instance、Date、null-prototype record 或陣列作為 record。
2. 只接受上列精確 own string keys。未知 key、遺漏 key、Symbol key、accessor、非 enumerable 欄位一律拒絕；檢查 descriptor 時不可讀取屬性值或呼叫 getter。欄位順序不影響結果。
3. 每個 raw 欄位必須是原始 primitive string。參與者與區間陣列必須由 Array.isArray 判定為陣列且 prototype 正好是 Array.prototype，沒有 symbol/額外自有屬性、沒有洞，所有 index 都是 enumerable data property。不得先用 map/filter 展開可能有洞的陣列。非陣列或改過 prototype 的陣列以 WRONG_TYPE 回報；陣列 symbol key 用 SYMBOL_KEY；額外自有 property 用 ARRAY_EXTRA_PROPERTY；洞用 ARRAY_NOT_DENSE；index accessor／non-enumerable descriptor 分別用 ACCESSOR_PROPERTY／NON_ENUMERABLE_PROPERTY。
4. 所有字串先受 256 UTF-16 code unit raw 上限；id 受 32 ASCII 字元上限。沒有輸入物件的隱含預設欄位，也不容許未知欄位在 normalize 時被略過。
5. Proxy 的 trap 無法在一般 JavaScript 中安全且通用地偵測；此 API 的呼叫者必須提供 app 產生的普通資料物件。對普通 accessor/getter 必須在取值之前拒絕；不得宣稱可以安全消化任意 Proxy。

欄位內容規則：

| 欄位 | 型別與語法 | 正規化及範圍 |
|---|---|---|
| dateRaw | string；精確 ASCII yyyy-mm-dd | 年 0001–9999；真實 Gregorian 日期；回傳原格式日期標籤 |
| timeBasisRaw | string | trim 後 1–60 Unicode code points；原始最多 256 UTF-16 code units |
| durationMinutesRaw | string；1–4 個 ASCII 數字 | 解析整數 1–1440；接受前導零 |
| participant.id | string；^[a-z][a-z0-9_-]{0,31}$ | 全表唯一；UI 以記憶體計數器產生 p1、p2… |
| participant.nameRaw | string | trim 後 1–40 Unicode code points |
| interval.id | string；同一 ID 語法 | 每位參與者內唯一；UI 以記憶體計數器產生 s1、s2… |
| interval.startRaw | string；精確 HH:MM | ASCII 00:00–23:59；正規化為 0–1439 |
| interval.endRaw | string；精確 HH:MM | ASCII 00:00–23:59 或 24:00；正規化為 0–1440 |

nameRaw 和 timeBasisRaw 先掃描 UTF-16，拒絕未配對 surrogate；拒絕 U+0000–U+001F、U+007F–U+009F 控制碼，不把控制碼當成可隱藏的 trim 字元。其後用 ECMAScript trim()，並以 Array.from(trimmed).length 計 Unicode code points。HTML、標記、方向控制文字、搜尋或時區名稱皆無特殊語意；不採 HTML parser 做正規化。日期、時間、分鐘原始欄位不 trim，任何前後空白都會使格式錯誤。

participant 數量須為 2–20；每人區間 1–12；總段數上限 240。先確認所有陣列具備正確結構並取得 length，若總數超過 240 先回總量錯誤，再檢查每人 1–12。合法結構下 20 × 12 等於 240；總量錯誤是防禦性上限，保留獨立錯誤與測試。

主代理 M1 審查補充（2026-10-19，優先於下文一般結構檢查順序）：陣列型別／prototype 通過後，以 own length data descriptor 先做資源上限檢查，再列舉 keys、洞、index descriptor 或複製元素。participants.length >20 立即回 PARTICIPANT_COUNT_HIGH，path=participants；各 participant 的 intervals.length 若超過尚餘總額 240−先前已驗證區間數，立即回 TOTAL_INTERVALS_HIGH，path=participants，兩個 ID 均為 null。超限分支不讀任何 index 值或 getter，優先於該超限陣列的 symbol／extra／洞／index／row schema 錯誤。上限內仍沿用下文完整驗證優先序（總數檢查後才逐人檢查 1–12）。此措施使元素驗證／複製至多 20 個人及 240 段；不宣稱能對任意巨大未知 own-key 物件或 Proxy 提供常數時間安全。

## 核心函式與回傳型別

核心檔案公開以下純函式：

    type Locale = "zh-Hant" | "en";

    type ValidationError = {
      code: ErrorCode;
      path: string;
      participantId: string | null;
      intervalId: string | null;
    };

    type NormalizedDraft = {
      date: string;
      timeBasis: string;
      meetingDurationMinutes: number;
      participants: Array<{
        id: string;
        name: string;
        intervals: Array<{
          id: string;
          startMinute: number;
          endMinute: number;
        }>;
      }>;
    };

    type MeetingWindow = {
      startMinute: number;
      endMinute: number;
      durationMinutes: number;
      latestStartMinute: number;
    };

    type MeetingResult = {
      date: string;
      timeBasis: string;
      meetingDurationMinutes: number;
      participantCount: number;
      windows: MeetingWindow[];
    };

    type ValidationResult =
      | { ok: true; value: NormalizedDraft }
      | { ok: false; error: ValidationError };

    type CalculationResult =
      | { ok: true; value: MeetingResult }
      | { ok: false; error: ValidationError };

    export function validateDraft(input: unknown): ValidationResult;
    export function calculateMeetingWindows(input: unknown): CalculationResult;
    export function formatClock(minute: number, boundary: "start" | "end"): string | null;
    export function buildPlainTextReport(result: MeetingResult, locale: Locale): string;

所有函式不得改寫 input 或依賴呼叫次序。validateDraft 回傳新建的 normalized objects/arrays；錯誤不包含任何使用者原始值。calculateMeetingWindows 先執行同一 validateDraft，再計算 result；有效空結果仍回 ok:true。formatClock 接受整數 0–1439 作 start、0–1440 作 end；只有 boundary=end 且 minute=1440 才輸出 24:00，其他越界或非整數回 null。buildPlainTextReport 只接受由核心生成的 MeetingResult，確定性產生下節所列字串，不讀取 DOM/locale environment/current time。

## 穩定錯誤碼與優先序

錯誤物件形狀固定；path 只含固定 schema 欄名與十進位陣列索引，不回顯未知 key 或文字。participantId 只在該 ID 已通過語法且全表唯一後填入；intervalId 只在其已通過語法且在該 participant 內唯一後填入。ID 本身錯誤或重複時，相應 ID 欄位為 null。row schema/type 錯誤時兩個 ID 欄位皆為 null。UI 依 code 及 path 映射雙語欄位訊息，不要求顯示 code。

固定 code：

- 結構：ROOT_NOT_PLAIN_OBJECT、UNKNOWN_FIELD、MISSING_FIELD、SYMBOL_KEY、ACCESSOR_PROPERTY、NON_ENUMERABLE_PROPERTY、WRONG_TYPE、ARRAY_NOT_DENSE、ARRAY_EXTRA_PROPERTY。
- 識別字：INVALID_PARTICIPANT_ID、DUPLICATE_PARTICIPANT_ID、INVALID_INTERVAL_ID、DUPLICATE_INTERVAL_ID。
- 數量：PARTICIPANT_COUNT_LOW、PARTICIPANT_COUNT_HIGH、TOTAL_INTERVALS_HIGH、INTERVAL_COUNT_LOW、INTERVAL_COUNT_HIGH。
- 文字及日期：RAW_TEXT_TOO_LONG、TEXT_CONTROL_CHARACTER、TEXT_UNPAIRED_SURROGATE、NAME_EMPTY、NAME_TOO_MANY_CODEPOINTS、TIME_BASIS_EMPTY、TIME_BASIS_TOO_MANY_CODEPOINTS、DATE_FORMAT、DATE_NOT_REAL。
- 數值與區間：DURATION_FORMAT、DURATION_RANGE、START_TIME_FORMAT、START_TIME_RANGE、END_TIME_FORMAT、END_TIME_RANGE、INTERVAL_START_NOT_BEFORE_END。

驗證優先序固定為：

1. 每個 record 先檢查 prototype；錯誤回 ROOT_NOT_PLAIN_OBJECT。其後依序找第一個 unknown own string key（path 為該 record），第一個缺少的 schema key（path 為該 record），Symbol key（path 為該 record），最後依 schema 宣告順序檢查 accessor、non-enumerable 欄位及 primitive type。如此不會呼叫 getter。
2. 驗證 participants 陣列的型別／prototype、Symbol key、額外 key、密集 index 和 index descriptor，再檢查人數下限及上限。
3. 依 participant index 順序檢查其精確 record 形狀及 intervals 陣列的型別／prototype、Symbol key、額外 key、密集 index 和 index descriptor，累加各 intervals length；若總段數 >240，回 TOTAL_INTERVALS_HIGH。
4. 依 participant index 檢查每人的 1–12 段限制。此階段尚未把 row ID 放入錯誤物件。
5. 依欄位順序驗證 participant IDs 的語法和全表唯一性，再驗證 interval IDs 的語法及所屬 participant 內唯一性。遇到重複 ID 時，錯誤的該列 ID 為 null。
6. 驗證 root 的 dateRaw、timeBasisRaw、durationMinutesRaw，依此順序；再依 participant index 檢查 nameRaw，最後依 participant／interval index 檢查 startRaw、endRaw 和 start < end。
7. 字串各自先檢查 raw 256 code unit 上限，再依表列執行欄位語法／控制字／長度規則；name/timeBasis 的 unpaired surrogate 和控制碼在 trim 之前拒絕。

以上順序只決定第一個 error；不會累積多錯誤或顯示原始輸入。participants 形狀錯誤（含缺欄、錯型別、額外欄、accessor、洞）先於內容錯誤。participant row 形狀錯誤的 participantId=null；interval row 形狀錯誤的 participantId/intervalId 均為 null。

## 時間演算法

所有分鐘端點是整數，午夜為 0，24:00 為 1440。核心步驟：

1. 對每位 participant 複製、按 startMinute 再 endMinute 遞增排序。
2. 摺疊每位 participant 的區間；目前 end 與下一段 start 相等時也合併。時間窗一律半開。
3. 兩個已排序、不重疊且不相接的集合用雙指標線性求交；交集 start=max(starts)，end=min(ends)，只輸出 start<end；下一個 end 較早的一側前進，若相同則兩側皆前進。
4. 每一步輸出再排序並合併相接區間，讓連續窗口只出現一次。以所有人為必要條件，沒有參與者可被略過。
5. 計算每窗長度並以指定會議分鐘過濾，latestStartMinute=endMinute-meetingDurationMinutes。

上限固定 20 人／240 段；排序總成本不超過 O(240 log 240)，交集為各步集合長度的線性掃描。不可按分鐘展開時段、生成候選 start list、呼叫 Date 或進行多數票計分。

## 純文字報告格式

報告使用 LF 換行、沒有 BOM、沒有尾端 LF。繁中與英文固定模板如下；時間基準只插入已驗證且 trim 的純文字值，不作 Markdown/HTML 解析。結果窗口按核心排序。

繁中：

    會議空檔交集
    日期：{date}
    共同時間基準：{timeBasis}
    會議長度：{meetingDurationMinutes} 分鐘
    參與者：{participantCount} 人

    可用窗口：
    {每窗一行：{index}. {start}–{end}；可用 {durationMinutes} 分鐘；可開始 {start}–{latestStart}；最晚開始 {latestStart}}

若 windows 為空，保留「可用窗口：」標題，下一行改為「沒有足夠長的全員共同時段。」。英文標題為 Meeting overlap；其餘標籤依序為 Date、Shared time basis、Meeting length、Participants、Available windows。英文窗口格式為 {index}. {start}–{end}; {durationMinutes} available minutes; starts {start}–{latestStart}; latest start {latestStart}。英文空結果亦保留 Available windows: 標題，下一行為 No common interval fits the meeting length. 兩語均不得在最後加 LF。

## App 狀態及生命週期

App state 僅存在 app.mjs module closure：

    type AppMemory = {
      draft: MeetingDraft;
      result: MeetingResult | null;
      reportText: string | null;
      locale: Locale;
      generation: number;
      nextParticipantNumber: number;
      nextIntervalNumber: number;
    };

- 初始值由 FR-02 建立，participant IDs 為 p1/p2，interval IDs 為 s1/s2，兩個 next counters 均為 3。新增列先取用對應 counter 再遞增；刪除不回收 ID。確認清除及 BFCache reset 回到上述初始 counters。沒有 localStorage 等替代存放。
- 每次 input/change/add/remove 更新 draft 時，先清 result/reportText 並增加 generation，再更新欄位錯誤；不因 composition event 改寫原文。
- 提交時讀目前 DOM 控制值，建構精確 plain data draft；驗證成功才設 result。錯誤只設欄位 path/status 文案。同步計算小於 240 段，不建立 worker 或長時間 pending 任務。
- 「清除全部」使用頁內自製確認區，不呼叫 window.confirm 或原生 dialog；取消不改 AppMemory，確認則重建乾淨初始狀態、增 generation，重設控制項和結果。
- 語言切換連結離開前以頁內確認；接受才導航，不傳值。取消不變更狀態。
- pagehide 時同步清空 draft 欄位字串、result、reportText、錯誤及相關 DOM value，generation 遞增且兩個 ID counters 回到 3。pageshow persisted 時再建立初始 state；不恢復 BFCache 中的使用者內容。
- 不建立延遲 callback、clipboard promise、object URL、下載、history state、service worker 或任何需要額外取消 token 的生命週期。

## 安全與靜態檢查要求

- 欄位不得設定可供表單序列化的 name；使用無 action/method 表單亦不夠，MVP 不用 form submit 路徑，所有按鈕明確 type=button。JavaScript 初始化前 fieldset disabled。
- 可將使用者字串放入 input.value 或 textContent；不得使用 innerHTML、outerHTML、insertAdjacentHTML、eval、Function、URL query/hash、console、fetch、XHR、WebSocket、sendBeacon、Cookie、Storage、IndexedDB、Cache API 或 service worker。
- CSP 不允許 unsafe-inline、unsafe-eval 或外部連線；樣式和模組採同源靜態檔。Production 若加入 JSON-LD，CSP 僅以精確 hash 放行該固定 JSON-LD 內容；不得為方便而加入 inline script 全域許可。
- Check 腳本要對危險 DOM API、外部資源、未允許檔案、未閉合語法和禁止 storage/network API 給出非零退出；不能只檢查字串存在或永遠成功。測試使用假姓名／日期／地點，不需網路。


---

## 原文件 UX-SEO.md

# 介面與 SEO 規格

規格狀態：**尚未實作**。本文件提供頁面層級、文案和驗收目標；目前沒有頁面截圖或搜尋表現可宣稱。

## 使用者工作與視覺方向

- 使用者：主持人、老師或召集人，已從聊天收集多人可出席時間，現在要在相同日期和時間基準下找出足夠長的共同時段。
- 平台：桌面與手機瀏覽器。常用任務是填參與者、輸入時間區間、調整會議分鐘數、執行一次交集、閱讀候選窗口。
- 成功狀態：明確看到全部人皆可用且符合長度的窗口，以及各窗口最晚開始時間；空集合也能知道要調整什麼。
- 風險：錯誤時間可能造成會議安排混亂；頁面必須清楚拒絕含糊、跨日、格式錯誤或不一致的輸入，不自行修補或轉換。
- Surface mode：Product App。直接使用 GlossQuote 家族暖紙、墨色和酸綠等語意 token；以時段工作表作為獨有結構。文字、時間欄、候選窗口採清晰對齊和精確分隔線。視覺強調只放在真正的全員共同窗口與主要計算按鈕，不採通用 SaaS hero、卡片牆、遠端字型或裝飾動畫。
- 排版沿用系統字體 fallback；monospace 只用在 HH:MM、ISO 日期和數值；Geist 可作系統可用字體，但不可下載或遠端載入。正文 15–17 px、輔助字至少 12 px、產品標題通常不超過 32–36 px。

## 資訊層級與線框

桌面：左對齊；標題和單句用途在頂部，主要畫布是參與者與區間表，設定欄位跟在其上方，新增／刪除與各列相鄰。結果緊貼唯一主要動作；純文字報告為同區域的次要展開區。MVP 不需要固定工具軌或 inspector。

線框內的姓名、日期和時間是排版示意，不是初始值；實際首次載入必須依 FR-02 呈現空欄位，不放示範紀錄或假結果。

    ┌───────────────────────────────────────────────────────────────┐
    │ Meeting overlap             語言切換                         │
    │ 找出所有人都能參加的同日會議窗口                              │
    ├───────────────────────────────────────────────────────────────┤
    │ 日期 [yyyy-mm-dd]   共同時區／地點 [____________]             │
    │ 所有時間已使用同一時間基準；工具不轉換時區或夏令時間。         │
    │ 會議長度 [60] 分鐘                                             │
    ├───────────────────────────────────────────────────────────────┤
    │ 參與者 1  姓名 [__________]                                   │
    │ 可用時段   開始 [09:00] 結束 [10:30]   [刪除時段]              │
    │                                                   [新增時段]  │
    │ 參與者 2  姓名 [__________]                                   │
    │ 可用時段   開始 [10:00] 結束 [12:00]   [刪除時段]              │
    │                                                   [新增時段]  │
    │ [新增參與者]                                                   │
    │ [找出共同時段]                                                 │
    ├───────────────────────────────────────────────────────────────┤
    │ 結果／欄位錯誤／有效空結果；提交成功後才有結果                 │
    │ [展開唯讀文字報告]                                             │
    └───────────────────────────────────────────────────────────────┘

手機：單欄、欄位標籤在輸入控制上方；每個 interval 一個窄工作列，控制可自然換行，刪除與新增按鈕仍有文字。不要把「姓名、開始、結束」壓成固定三欄，也不要讓頁面橫向捲動。表格如果轉為分組列，參與者標題仍與所屬區間關聯。

    Meeting overlap
    找出所有人都能參加的同日會議窗口
    日期
    [2028-02-29]
    共同時區／地點
    [台北本地時間]
    會議長度
    [60] 分鐘
    ── 參與者 1 ───────────────────
    姓名 [________]
    開始 [09:00]  結束 [10:30]
    [移除時段]   [新增時段]
    [移除參與者]
    [新增參與者]
    [找出共同時段]
    結果／欄位錯誤

## 操作、錯誤與狀態

- 頁面載入時為空白輸入狀態，只有明確說明和主要操作。JavaScript 還未初始化或被停用時，表單欄位不可輸入；頁面說明需要 JavaScript 才能本機計算，不會提交資料。
- 所有輸入都是具名、可見 label 的 text controls；日期、時間、分鐘使用 inputmode=numeric 提示但保留 text 語意，避免瀏覽器接受小數／本地化格式或使用 Date 作 date picker。欄位不在 IME composition 中被改寫。
- 新增／移除參與者與區間使用有文字名稱的按鈕；不依賴拖曳、圖示或 hover。新增列後焦點到新欄位；刪列後焦點到同索引下一列，再上一列，再新增列按鈕。
- 主要按鈕明確命名為「找出共同時段」／Find common times。資料每改一處，舊結果及報告立即消失；透過狀態文字說明需要重新提交。
- 欄位錯誤用文字和程式關聯的 error element 表達，顏色只作輔助；一次聚焦第一個錯誤且不搶走正在組字的輸入法焦點。
- 有效但無交集時顯示「沒有足夠長的全員共同時段。可調整任一人的時段或會議長度。」／“No common interval fits the meeting length. Adjust an availability window or the meeting length.” 這是空結果，不用 danger 狀態。
- 有窗口時顯示日期、時間基準、長度、參與者數，逐條列出候選窗口的可用開始／結束、可用分鐘、開始範圍及最晚開始。開始範圍兩端皆可選，結束端點不包含。
- 唯讀報告以可選展開區呈現。時間基準等使用者文字以 textarea.value 或 textContent 顯示；不得解析成 HTML。
- 清除全部總是用頁內確認區呈現影響：「清除日期、時間基準、所有人與時段，以及已算出的結果」；確認清除，取消保留當前所有欄位、結果與焦點。禁止原生 confirm/dialog。
- 語言切換在有輸入資料或結果時要求確認，並說明草稿只在目前頁面記憶體、離開即清除；取消保留。確認後到另一個無參數、乾淨的語言頁。
- pagehide 清除資料；BFCache pageshow 重新建立空工作區。使用者重新載入或回到頁面時不承諾保留內容。
- 低效能裝置輸入最多 240 段，計算需同步但有界。不得按每分鐘列出候選起點；結果窗口中以「開始範圍」摘要連續可選分鐘。

## 鍵盤、行動裝置與無障礙

- 所有新增、刪除、提交、清除確認、取消、語言切換和展開報告都可鍵盤操作；Tab 順序依欄位視覺順序。按鈕可用 Enter/Space 啟動，焦點指示器在紙色、白色和酸綠表面均清晰。
- 動態列使用 fieldset/legend 或等效標籤關聯參與者和區間；刪除按鈕的 accessible name 包含人名或列序，重複名字另附列序。
- 驗證錯誤以 aria-describedby 關聯欄位；提交結果／空結果以適當 status region 宣告一次，不將每次輸入都重複播報。
- 中文 IME 使用 compositionstart/end；composition 中不重排焦點、不截斷字元、不自動轉成 ASCII。非 ASCII 數字等到提交時由錯誤訊息解釋，不得靜默替換。
- 320 CSS px 無整頁水平捲動；200% 縮放不失去內容或功能；虛擬鍵盤不能遮住正在編輯的欄位、錯誤和主要動作。20 人／240 段測試不得令新增控制或結果變得不可達。
- 一般文字對比至少 4.5:1，控制邊界和非文字狀態至少 3:1；焦點可見、不只用顏色表示成功／錯誤；觸控主要控制目標 44×44 CSS px。
- 尊重 prefers-reduced-motion；Product App 不加裝飾動畫。結果排序穩定，螢幕閱讀器不被每次更新中斷。
- 完整 Network／Storage 檢查、原生能力和不同真實裝置都必須有對應證據。Node 測試只能證明純邏輯或靜態文字檢查，不能宣稱驗證瀏覽器、IME、螢幕閱讀器、原生剪貼簿、離線快取或真機效能。

## 繁體中文 SEO 文案

- 預定正式頁：https://meet.glossquote.com/index.html
- title：會議空檔交集｜找出全員可用的會議時段
- description：輸入同一天、同一時間基準下每位參與者的空檔與會議長度，計算所有人都能參加的連續時段。資料只在目前頁面記憶體處理，不連接行事曆、不轉換時區。
- H1：找出所有人都能參加的會議時段
- 首屏說明：手動輸入每位參與者同一天的空檔，查看全員共同可用且足以容納會議的窗口。所有時間必須已使用相同時區或地點基準；本工具不做轉換。
- 按鈕：找出共同時段；新增參與者；新增時段；清除全部；展開文字報告。

### 繁中 FAQ

1. **這個工具會讀我的行事曆或傳送邀請嗎？** 不會。請手動輸入每位參與者的空檔；工具只在目前頁面記憶體計算交集，不讀行事曆，也不會傳送邀請。
2. **不同時區的時間可以直接一起計算嗎？** 不可以。請先確認所有輸入都使用相同的時間基準；工具不轉換時區或夏令時間。
3. **可用時段重疊或相接時怎麼算？** 同一人的重疊或相接區間會先合併，再與每位其他參與者求交集；不足會議長度的窗口不會列出。
4. **結束時間可以填 24:00 嗎？** 可以，但僅可作同日區間的結束；開始時間不能是 24:00，時段也不能跨午夜。
5. **離開頁面後會保留我的輸入嗎？** 不會。草稿只在目前頁面記憶體；切換語言或離頁會清除，回到頁面會從空白狀態開始。

## English SEO copy

- Planned production page: https://meet.glossquote.com/en/index.html
- Title: Meeting overlap | Find a time everyone can attend
- Description: Enter each person's availability for one day and one shared time basis to find continuous windows that fit your meeting. This page calculates locally in memory; it does not read calendars or convert time zones.
- H1: Find a meeting time everyone can attend
- Intro: Enter each person's availability for the same day. See the continuous windows everyone can attend for the full meeting length. All times must already use the same time zone or place reference; this tool does not convert them.
- Primary button: Find common times. Secondary actions: Add participant; Add interval; Clear all; Show text report.

### English FAQ

1. **Does this tool read calendars or send invitations?** No. Enter each person's availability yourself. The calculation runs in this page's memory; it does not read calendars or send invitations.
2. **Can I combine times from different time zones?** No. Convert them yourself first so every entry uses the same time basis. This tool does not convert time zones or daylight saving time.
3. **What happens when one person's intervals overlap or touch?** They are merged before the tool intersects that person's availability with every other participant's. Windows shorter than the meeting are omitted.
4. **Can an interval end at 24:00?** Yes, as the end of a same-day interval only. A start cannot be 24:00, and intervals cannot cross midnight.
5. **Will my draft remain if I leave this page?** No. The draft stays in the current page's memory and is cleared when you leave or switch languages. Returning starts with a blank workspace.

## 語言與正式搜尋索引

- M1 preview server 必須只綁 127.0.0.1:4214；preview 頁必須回傳 noindex，M1 不宣稱已可公開搜尋。
- route 固定繁中 /index.html、英文 /en/index.html；繁中 lang/hreflang 為 zh-Hant，英文為 en。不得新增語言選擇首頁、/zh-TW/ 或其他別名。
- M2 在主代理放行後才可在正式候選寫 canonical、雙語 hreflang、x-default、robots.txt、sitemap.xml、404 noindex、閉合 CSP 和正式 metadata。正式 origin 只可使用已核准的 meet.glossquote.com，不把預定字串說成已部署。
- 正式 canonical 對應當前語言頁；每頁 hreflang 指向繁中 /index.html、英文 /en/index.html，x-default 指向繁中 /index.html。只列實際雙語頁，不列 preview、dist 或不存在路由。robots 允許正式 HTML 與必要同源 CSS/JS，預覽禁止索引。
- JSON-LD 若加入只能複述頁面可見 FAQ/工具能力，不得加價格、評分、用戶數、承諾或外部 action；CSP 只允許精確固定內容 hash，不可用 unsafe-inline 或 unsafe-eval。
- 網域正式發布、索引收錄或排名尚未驗證，不得捏造搜尋量、SEO 效果、客戶、使用次數、節省時間或免費永久等主張。


---

## 原文件 ACCEPTANCE.md

# 驗收規格

規格狀態：**尚未實作／尚未驗收**。下列都是待執行的固定 oracle；列出案例不代表程式、瀏覽器或裝置已通過。

## 驗收分層與狀態

- **Core**：離線 Node 24+ node:test 測純函式、輸入 schema、精確輸出、錯誤碼及報告位元組。這些案例只驗邏輯，不代表 UI、瀏覽器 API 或正式網站行為。
- **Local app/HTTP**：檢查兩語靜態頁、loopback only、必要資源和本機預覽標頭；不代表 live site、公開網路、搜尋引擎、真實裝置或部署通過。
- **Browser/manual**：實際以瀏覽器操作的 UI、鍵盤、焦點、IME、生命週期及視覺驗收。依目前 focus incident，所有本機瀏覽器／原生／CUA UI 操作（包含 hidden tab、導航、截圖、輸入和點擊）均是 NOT_RUN_USER_FOCUS_INCIDENT；不得以 CLI 或 DOM harness 冒稱通過。
- 所有案例一開始都是 PENDING，沒有既有 pass。測試輸出應逐項記錄 PASS／FAIL／NOT_RUN、環境、日期及證據位置；不把案例數除以總數當品質分數。
- 用以下固定 factory 建立測試輸入：D(dateRaw,durationRaw,participants,timeBasisRaw="UTC+08:00") 產生 exact MeetingDraft；P(id,nameRaw,intervals) 產生 participant；I(id,startRaw,endRaw) 產生 interval。除非案例指定，IDs 唯一且符合規則；其他欄位有效，參與者至少兩位；未列出的參與者使用 09:00–12:00。W(start,end,duration,latest) 表示單一 MeetingWindow 的四個精確值。
- 錯誤 oracle 精確比較 code、path、participantId、intervalId。UI 不必顯示代碼，但須拒絕或呈現等義的兩語錯誤並清掉舊結果。

## Core 可重現案例

| ID | 輸入／步驟 | 精確 oracle |
|---|---|---|
| C01 | 2028-02-29，60 分；p1 Ada 09:00–12:00，p2 Bo 10:00–11:30 | ok:true；日期原樣；人數 2；windows=[W(10:00,11:30,90,10:30)] |
| C02 | p1 同人區間 09:00–10:00、09:30–11:00；p2 09:00–11:00；會議 120 分 | 重疊先合併；windows=[W(09:00,11:00,120,09:00)] |
| C03 | p1 區間 09:00–10:00、10:00–11:00；p2 09:00–11:00；會議 120 分 | 相接先合併；windows=[W(09:00,11:00,120,09:00)] |
| C04 | p1 09:00–10:00、11:00–13:00；p2 09:30–10:00、11:30–12:30；會議 30 分 | windows=[W(09:30,10:00,30,09:30), W(11:30,12:30,60,12:00)]；開始、結束排序 |
| C05 | p1 10:00–11:00；p2 09:00–11:00；會議 60 分 | 剛好等長仍合法；windows=[W(10:00,11:00,60,10:00)] |
| C06 | p1 09:00–09:45；p2 09:00–10:00；會議 60 分 | ok:true 且 windows=[]；短交集被過濾，不是 error |
| C07 | p1 09:00–10:00；p2 10:00–11:00；會議 1 分 | 半開區間在 10:00 僅相接，windows=[] |
| C08 | p1 09:00–12:00；p2 10:00–12:00；p3 10:30–11:30；會議 45 分 | 全三人交集 windows=[W(10:30,11:30,60,10:45)] |
| C09 | p1 23:00–24:00；p2 23:30–24:00；會議 30 分 | windows=[W(23:30,24:00,30,23:30)]；end 格式為 24:00，不標次日 |
| C10 | p1、p2 均 00:00–24:00；會議 1440 分 | windows=[W(00:00,24:00,1440,00:00)] |
| C11 | p1、p2 均 23:59–24:00；會議 1 分 | windows=[W(23:59,24:00,1,23:59)] |
| C12 | startRaw=24:00，其他欄位有效 | error={code:START_TIME_RANGE,path:"participants[0].intervals[0].startRaw",participantId:"p1",intervalId:"s1"} |
| C13 | endRaw=24:01，其他欄位有效 | error={code:END_TIME_RANGE,path:"participants[0].intervals[0].endRaw",participantId:"p1",intervalId:"s1"} |
| C14 | startRaw=endRaw=10:00 | error={code:INTERVAL_START_NOT_BEFORE_END,path:"participants[0].intervals[0]",participantId:"p1",intervalId:"s1"} |
| C15 | startRaw=11:00、endRaw=10:00 | 同 C14 的 error code/path/IDs；不得自行跨日解讀 |
| C16 | 日期 2024-02-29，p1/p2 09:00–10:00，會議 60 分 | 日期有效；windows=[W(09:00,10:00,60,09:00)] |
| C17 | 日期 1900-02-29 | error={code:DATE_NOT_REAL,path:"dateRaw",participantId:null,intervalId:null} |
| C18 | 日期 0001-01-01，其他欄位有效 | 日期有效且回傳原字串；不得因 JS Date 年份偏移失敗 |
| C19 | 日期 0000-01-01 | error={code:DATE_NOT_REAL,path:"dateRaw",participantId:null,intervalId:null} |
| C20 | 會議長度 "0001"，兩人同有 09:00–09:01 | 解析為 1；windows=[W(09:00,09:01,1,09:00)] |
| C21 | 會議長度 "0" | error={code:DURATION_RANGE,path:"durationMinutesRaw",participantId:null,intervalId:null} |
| C22 | 會議長度 "1441" | error={code:DURATION_RANGE,path:"durationMinutesRaw",participantId:null,intervalId:null} |
| C23 | 會議長度 "1.0" | error={code:DURATION_FORMAT,path:"durationMinutesRaw",participantId:null,intervalId:null} |
| C24 | 會議長度 "６０"（全形數字） | error={code:DURATION_FORMAT,path:"durationMinutesRaw",participantId:null,intervalId:null} |
| C25 | 兩人 nameRaw 各 40 個 ASCII 字元，名字相同，區間相同 09:00–10:00、會議60分 | 重複名字和 40 code points 都有效；windows=[W(09:00,10:00,60,09:00)] |
| C26 | 21 位有效 participant，各一段 | error={code:PARTICIPANT_COUNT_HIGH,path:"participants",participantId:null,intervalId:null}；不忽略任何人 |
| C27 | 只有 1 位 participant | error={code:PARTICIPANT_COUNT_LOW,path:"participants",participantId:null,intervalId:null} |
| C28 | p1 intervals=[]，p2 有一段 | error={code:INTERVAL_COUNT_LOW,path:"participants[0].intervals",participantId:null,intervalId:null} |
| C29 | p1 有 13 段、p2 有 1 段，總數未超 240 | error={code:INTERVAL_COUNT_HIGH,path:"participants[0].intervals",participantId:null,intervalId:null} |
| C30 | 20 人各 12 段；每人12段依序為 00:00–00:02、00:02–00:04…00:22–00:24；會議24分 | 240 段合法；各人合併成 00:00–00:24；windows=[W(00:00,00:24,24,00:00)] |
| C31 | 20 人；p1 有13段，其餘19人各12段，共241段 | error={code:TOTAL_INTERVALS_HIGH,path:"participants",participantId:null,intervalId:null}；先於每人13段上限 |
| C32 | root 加 unknown=true | error={code:UNKNOWN_FIELD,path:"$",participantId:null,intervalId:null}；不回顯 unknown key |
| C33 | root.dateRaw 改為 getter，getter 會增加計數器 | error={code:ACCESSOR_PROPERTY,path:"dateRaw",participantId:null,intervalId:null}；getter 次數精確為0 |
| C34 | participants 為長度2但 index 1 是洞 | error={code:ARRAY_NOT_DENSE,path:"participants[1]",participantId:null,intervalId:null} |
| C35 | participant row 刪除 intervals key | error={code:MISSING_FIELD,path:"participants[0]",participantId:null,intervalId:null} |
| C36 | p1 nameRaw 為一個未配對 high surrogate | error={code:TEXT_UNPAIRED_SURROGATE,path:"participants[0].nameRaw",participantId:"p1",intervalId:null} |
| C37 | p1 nameRaw 含 LF | error={code:TEXT_CONTROL_CHARACTER,path:"participants[0].nameRaw",participantId:"p1",intervalId:null} |
| C38 | p1 nameRaw 為 257 個 ASCII code units | error={code:RAW_TEXT_TOO_LONG,path:"participants[0].nameRaw",participantId:"p1",intervalId:null}；先於 trimmed count |
| C39 | p1 nameRaw 為 41 個 ASCII 字元 | error={code:NAME_TOO_MANY_CODEPOINTS,path:"participants[0].nameRaw",participantId:"p1",intervalId:null} |
| C40 | p1 id 重複 p2 id | error={code:DUPLICATE_PARTICIPANT_ID,path:"participants[1].id",participantId:null,intervalId:null} |
| C41 | p1 內兩段 interval.id 相同 | error={code:DUPLICATE_INTERVAL_ID,path:"participants[0].intervals[1].id",participantId:"p1",intervalId:null} |
| C42 | I 的 startRaw 為 9:00 | error={code:START_TIME_FORMAT,path:"participants[0].intervals[0].startRaw",participantId:"p1",intervalId:"s1"} |
| C43 | 將 C01 成功結果交給繁中報告函式 | 完整字串：會議空檔交集 LF 日期：2028-02-29 LF 共同時間基準：UTC+08:00 LF 會議長度：60 分鐘 LF 參與者：2 人 LF LF 可用窗口： LF 1. 10:00–11:30；可用 90 分鐘；可開始 10:00–10:30；最晚開始 10:30。UTF-8 無 BOM、無尾端 LF |
| C44 | 將同一 C01 結果交給英文報告函式 | 完整字串：Meeting overlap LF Date: 2028-02-29 LF Shared time basis: UTC+08:00 LF Meeting length: 60 minutes LF Participants: 2 LF LF Available windows: LF 1. 10:00–11:30; 90 available minutes; starts 10:00–10:30; latest start 10:30。UTF-8 無 BOM、無尾端 LF |
| C45 | 將 C06 空結果交給英文報告函式 | 標頭同 C44，最後兩行為 Available windows: LF No common interval fits the meeting length.；無窗口列、無尾端 LF |
| C46 | input=null | error={code:ROOT_NOT_PLAIN_OBJECT,path:"$",participantId:null,intervalId:null} |
| C47 | p1 row 加 unexpected=true | error={code:UNKNOWN_FIELD,path:"participants[0]",participantId:null,intervalId:null}；不回顯未知 key |
| C48 | root 加 Symbol("x") 自有屬性 | error={code:SYMBOL_KEY,path:"$",participantId:null,intervalId:null} |
| C49 | root.dateRaw 改成 non-enumerable data property | error={code:NON_ENUMERABLE_PROPERTY,path:"dateRaw",participantId:null,intervalId:null} |
| C50 | durationMinutesRaw 改成 number 60 | error={code:WRONG_TYPE,path:"durationMinutesRaw",participantId:null,intervalId:null} |
| C51 | participants 陣列加 foo 自有屬性 | error={code:ARRAY_EXTRA_PROPERTY,path:"participants",participantId:null,intervalId:null} |
| C52 | p1.id 改成 P1 | error={code:INVALID_PARTICIPANT_ID,path:"participants[0].id",participantId:null,intervalId:null} |
| C53 | p1 的第一段 id 改成 S1 | error={code:INVALID_INTERVAL_ID,path:"participants[0].intervals[0].id",participantId:"p1",intervalId:null} |
| C54 | p1.nameRaw 為空字串 | error={code:NAME_EMPTY,path:"participants[0].nameRaw",participantId:"p1",intervalId:null} |
| C55 | timeBasisRaw 為空字串 | error={code:TIME_BASIS_EMPTY,path:"timeBasisRaw",participantId:null,intervalId:null} |
| C56 | timeBasisRaw 為 61 個 ASCII 字元 | error={code:TIME_BASIS_TOO_MANY_CODEPOINTS,path:"timeBasisRaw",participantId:null,intervalId:null} |
| C57 | dateRaw=2024-2-29 | error={code:DATE_FORMAT,path:"dateRaw",participantId:null,intervalId:null} |
| C58 | 第一段 endRaw=9:00 | error={code:END_TIME_FORMAT,path:"participants[0].intervals[0].endRaw",participantId:"p1",intervalId:"s1"} |
| C59 | 第一段 startRaw=０９:００ | error={code:START_TIME_FORMAT,path:"participants[0].intervals[0].startRaw",participantId:"p1",intervalId:"s1"} |
| C60 | 兩人 nameRaw 都是 20 個 U+1F642 笑臉字元；date=2028-02-29、會議60分，p1 09:00–12:00、p2 10:00–11:30 | Unicode code points=20、UTF-16 units=40；成功，兩個名稱完整保留，windows=[W(10:00,11:30,90,10:30)] |
| C61 | 第一段 intervals[0] 換成數字 7 | error={code:ROOT_NOT_PLAIN_OBJECT,path:"participants[0].intervals[0]",participantId:null,intervalId:null}；與所有非 plain record 的規則一致 |
| C62 | p1.intervals 長度2但 index 1 是洞 | error={code:ARRAY_NOT_DENSE,path:"participants[0].intervals[1]",participantId:null,intervalId:null} |
| C63 | 用 C01 時段/date/duration；p1.nameRaw="  Ada  "、p2.nameRaw=" Bo "、timeBasisRaw=" UTC+08:00 " | 成功；normalized names=["Ada","Bo"]、timeBasis="UTC+08:00"；windows=[W(10:00,11:30,90,10:30)] |
| C64 | dateRaw=9999-12-31 | 日期有效且原樣回傳，不呼叫 Date 或時區 API |
| C65 | participant array index 1 的 participant row 為有額外屬性的 class instance | error={code:ROOT_NOT_PLAIN_OBJECT,path:"participants[1]",participantId:null,intervalId:null}；不讀 row getter |
| C66 | root 加 unknown=true，同時 dateRaw=2023-02-29 | error={code:UNKNOWN_FIELD,path:"$",participantId:null,intervalId:null}；schema error 先於任何值錯誤 |
| C67 | dateRaw=2023-02-29 且 timeBasisRaw="" | error={code:DATE_NOT_REAL,path:"dateRaw",participantId:null,intervalId:null}；root 語意依 date、timeBasis、duration 次序 |
| C68 | p1.id=P1 且 p1.nameRaw="" | error={code:INVALID_PARTICIPANT_ID,path:"participants[0].id",participantId:null,intervalId:null}；ID 先於 name |
| C69 | 第一段 id=S1 且 startRaw=9:00 | error={code:INVALID_INTERVAL_ID,path:"participants[0].intervals[0].id",participantId:"p1",intervalId:null}；ID 先於時間語法 |
| C70 | dateRaw=2023-02-29 且 p1 缺 intervals key | error={code:MISSING_FIELD,path:"participants[0]",participantId:null,intervalId:null}；整體 schema 先於日期語意 |
| C71 | p1.nameRaw 為257 code units 且末尾含 LF | error={code:RAW_TEXT_TOO_LONG,path:"participants[0].nameRaw",participantId:"p1",intervalId:null}；raw 長度先於控制字及 trimmed 長度 |
| C72 | p1.endRaw=24:01 且 p1.startRaw=24:00 | error={code:START_TIME_RANGE,path:"participants[0].intervals[0].startRaw",participantId:"p1",intervalId:"s1"}；先驗 start，再驗 end |

LF 在 C43–C45 表示單一 U+000A。報告測試須逐 byte 驗證 UTF-8、無 BOM、無尾端換行；不要以 UI copy 或 clipboard 作測試替身。C01–C72 連同每一欄位的最低／最高值矩陣必須覆蓋 TECHNICAL 列出的全部 ErrorCode，且 C66–C72 必須精確驗證優先序；每個失敗都比較穩定 code、path、participantId 和 intervalId。ACCEPTANCE 中的例子是固定 oracle，不是已測結果。

主代理 M1 資源上限補充案例（2026-10-19）：

- C73：participants 是 length=21 的普通 sparse array，index 0 有 getter spy；立即回 PARTICIPANT_COUNT_HIGH/path participants/兩 ID null，getter 次數 0，優先於洞或 accessor。
- C74：第一人的 intervals 是 length=241 的普通 sparse array，index 0 有 getter spy；立即回 TOTAL_INTERVALS_HIGH/path participants/兩 ID null，getter 次數 0。
- C75：20 個有效 participant record，前 19 人各 12 個合法區間，最後一人 intervals length=13 且 index 0 是 getter；剩餘總額 12，立即回 TOTAL_INTERVALS_HIGH/path participants/兩 ID null，getter 次數 0。
- C76：20 人各 12 個合法區間（全部 00:00–24:00、個別合法 ID）仍完整成功；不得因資源預檢漏驗上限內 schema。原 C01–C72 上限內結果與一般錯誤優先序維持不變。

## Browser / 手動驗收

下列全部是待測項；受目前 focus incident 限制，不能在本機以瀏覽器自動化、hidden tab、原生控制或 CUA 執行，狀態須記為 NOT_RUN_USER_FOCUS_INCIDENT，直到主代理提供合規隔離能力並解除限制，或提供已授權的外部人工證據。不得由 Node 測試替代成 PASS。

| ID | 操作與固定資料 | 預期 |
|---|---|---|
| B01 | 開繁中頁首次載入 | 空日期、空時間基準、60 分、2 人各一空段；沒有今日日期、假姓名或示範結果 |
| B02 | 2028-02-29，UTC+08:00，60分；Ada 09:00–12:00、Bo 10:00–11:30；提交 | 10:00–11:30，可用90分，可開始10:00–10:30，最晚10:30；無 network request |
| B03 | B02 成功後把 p2 結束改成11:00 | 結果和報告立即清空、需重算狀態可見；重新提交後得到 10:00–11:00，60分，最晚10:00 |
| B04 | 以鍵盤新增 participant | 新人有空白姓名及一空白區間；焦點到新姓名；提交錯誤會指向該人，不略過 |
| B05 | 以鍵盤移除非最後一段或參與者 | 刪除成功後焦點留在同索引下一列，否則上一列，再否則新增按鈕；不跳到頁首 |
| B06 | 兩人各設定 09:00–10:00 和 10:00–11:00，長度1分 | 顯示有效空結果，文字說明可調整；不得報錯或把端點當相交 |
| B07 | 填日期 2023-02-29 再提交 | 日期欄附近顯示繁中錯誤，焦點關聯欄位；任何舊結果已清空 |
| B08 | 填姓名 40個 A、同名兩人、相同時段 | 接受同名；提交後有唯一60分窗口，UI 不以名字當 row identity |
| B09 | 先產生結果，再展開唯讀報告 | 報告精確依 TECHNICAL 模板、欄位 readonly、字串是文字；無 copy/download/print 控制 |
| B10 | 填完整輸入並算出結果，啟動清除，選取消 | 自製頁內確認；欄位、結果、報告和焦點狀態保留 |
| B11 | 同一頁再清除並確認 | 回到 FR-02 初始值；不叫原生 confirm/dialog；錯誤、結果、報告都消失 |
| B12 | 有草稿時啟動語言切換並取消 | 留在原 URL，草稿與結果保留 |
| B13 | 有草稿時確認切換英文 | 到 /en/index.html，無 query/hash，欄位是乾淨預設，不保留任何草稿 |
| B14 | keyboard only 完成輸入、提交、讀結果、展開報告、清除取消 | 所有流程能完成；焦點順序可預測、焦點框可見、沒有僅 hover 功能 |
| B15 | viewport 320 CSS px、含錯誤和兩行時間輸入 | 所有欄位、按鈕、錯誤、結果可達；頁面無水平捲動或覆蓋 |
| B16 | 200% 縮放並開啟虛擬鍵盤時編輯頁面底部輸入 | 不遺失內容／功能；焦點欄位與主要操作可捲動到可見範圍 |
| B17 | 中文輸入法在姓名／時間基準組字後提交 | composition 中不搶焦點、不截斷；提交後中文字保留，非法數字明確拒絕而非自動替換 |
| B18 | 頁面禁用 JavaScript 後載入，嘗試 Tab | 表單維持 disabled；顯示需要 JS 的文字；無 GET/POST、URL 內容或資料請求 |
| B19 | initial load 到計算、改稿、清除、hidden/pagehide，全程監測 Network/Storage | 除本機靜態資源外無請求；無 cookie、storage、indexedDB、cache、URL state、service worker、console 個資 |
| B20 | 真正導致頁面離開，再以 BFCache 返回（event.persisted=true） | pageshow 後必須是 FR-02 空狀態；無舊輸入、結果或報告。Harness 只能另證明 handler 分支，不算真正 BFCache |
| B21 | 20人各12段共240段，填有效相同時段後提交 | 每人／全表上限可達；結果正確，介面仍可操作，實際低階裝置須記型號和等待時間 |
| B22 | 在每個語言頁查看標題、description、lang、切換連結 | 繁中 zh-Hant /index.html、英文 en /en/index.html；切換不帶參數、不呈現第三語言選擇頁 |
| B23 | 關閉網路後重新載入，觀察是否已有必要靜態資源快取 | 記錄實際載入結果，不宣稱永久離線；若資源未快取，依產品限制回報，不能加外部服務 |
| B24 | 僅檢查報告、輸入字串與動態列渲染 | name/timeBasis 帶尖括號字串只顯示文字；無 HTML 執行、無反射至 URL/console |
| B25 | 真機 iOS/Android 實際開 20 人和虛擬鍵盤 | 記錄型號、OS、瀏覽器及是否可操作；沒有設備即 NOT_RUN，不可用桌面縮放冒充 |
| B26 | 以螢幕閱讀器讀動態欄位、錯誤、空結果和候選列表 | 有參與者／時段關聯、錯誤可理解、狀態宣告不重複；只由實際 AT 驗證 |

## 本機命令和驗收界線

只有各任務先建立腳本後才執行對應命令：node --test（測試檔建立後）、npm test、npm run check、npm run build、npm run dev。所有自動化測試離線、使用假資料。HTTP 驗收只連 127.0.0.1:4214，確認雙語路徑、同源資源與 preview noindex；production 候選只在 M2 放行後連 127.0.0.1:5214。

M1 若只完成 Core、check、build 和 HTTP 而 browser case 因 focus incident 未執行，必須報「本機程式 gate 已跑，M1 瀏覽器驗收 NOT_RUN_USER_FOCUS_INCIDENT；不得聲稱完整 M1」。不得用截圖、靜態 DOM、JSDOM、Node mock 或 headless CLI 代稱真實鍵盤、IME、AT、BFCache、手機或無障礙視覺驗收。完整 Network 要從初載追到頁面隱藏及 pagehide；原生剪貼簿、下載和 print 不適用於本 MVP。


---

## 原文件 TASKS.md

# 執行任務與里程碑

規格狀態：**M0 規格完成，產品仍未實作**。依序一次做一項；任一項未通過前不得勾選後續任務。不得把規格範例或未執行的驗收清單標為 pass。

## T00 — 建立本機靜態骨架

- 前置：完整閱讀本工具六份規格、適用的專案與家族契約；先確認目標資料夾和工作樹既有變更，不覆寫他人資料。
- Allowed paths：僅本工具目錄內的 package.json、public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、public/js/core/meeting-overlap.mjs、scripts/serve.mjs、scripts/check.mjs、scripts/build.mjs、生成的 dist/，以及主代理提供的 HANDOFF.md 狀態區段。這些路徑如尚不存在，只能在本工具目錄建立。
- 實作：建立 ESM、private 的 Node 24+ skeleton；runtime dependency 為零。npm run dev 指向 node scripts/serve.mjs，固定 127.0.0.1:4214，只提供 public/；建立真實可失敗的 check 和只把 public/ 複製到 dist/ 的 preview build。兩個 HTML 頁面使用外部同源 module/style、載入前停用輸入控制，沒有 form GET/POST、外部資源或使用者資料。
- 此時才可執行：node --check scripts/serve.mjs；npm run check；npm run build；npm run dev 後以命令列 HTTP client 只連 127.0.0.1:4214，確認 /index.html 與 /en/index.html 及本機資源回應。開發伺服器以本任務啟動、記錄其 process/port，完成後只終止自己啟動且已識別的程序。
- 完成條件：檢查不只是永遠成功 stub；host/port 固定 loopback；preview route 及 noindex 生效；server 不暴露 workspace 其他目錄；dist/ 只含 public 靜態 allowlist。尚未建立測試檔，這一項不得執行 npm test 假裝有測試覆蓋。
- 回寫 HANDOFF：記錄檔案樹、Node 版本、host/port、preview build hash 和 HTTP 命令結果；未執行瀏覽器檢查標 NOT_RUN。

## T01 — 純函式、schema 與時間交集

- 前置：T00 通過；確認規格與原始工作樹未被其他任務改動。
- Allowed paths：僅 public/js/core/meeting-overlap.mjs、test/core.test.mjs、scripts/check.mjs、主代理提供的 HANDOFF.md 狀態區段。
- 實作：照 TECHNICAL.md 精確建四個 exported pure functions、schema validation/error precedence、日期純算術、24:00 end-only parser、同人合併、多人線性相交、窗口長度／latest start 和雙語純文字模板。測試落實 ACCEPTANCE C01–C72、完整 malformed/schema 錯誤矩陣；getter 測試必須確認 getter 執行次數為0。所有測試離線、假資料、可重現；不把 Proxy 偵測能力寫成保證。
- 此時才可執行：npm test；npm run check。失敗先修本項 allowed paths，再重跑受影響命令。
- 完成條件：核心 oracle 精確對上，無原始值回顯、未知 key／洞／accessor 拒絕，valid empty 與 invalid 明確不同；核心不呼叫 Date、不改輸入、不產生副作用。
- 回寫 HANDOFF：列出確切測試數和每項 pass/fail，列出錯誤代碼覆蓋及尚未補的案例；不能把測試數當通過率。

## T02 — 雙語工作表與計算結果

- 前置：T01 全通過；先重讀本規格的 FR、UX 和錯誤 mapping。
- Allowed paths：僅 public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、scripts/check.mjs、test/app-contract.test.mjs、生成的 dist/、主代理提供的 HANDOFF.md 狀態區段。
- 實作：以兩個獨立頁面提供可標籤的日期、共同時間基準、會議分鐘、2–20 participant 與每人1–12 interval 控制。初始值精確符合 FR-02；加入/移除有鍵盤按鈕及焦點復位；文字用安全 DOM API。僅在按下主要按鈕提交，成功可看窗口／空結果及展開 readonly report；不加原生 clipboard/download/print。
- 此時才可執行：npm test；npm run check；npm run build；命令列確認 dev HTTP 仍只聽 127.0.0.1:4214 並有兩語頁。
- 完成條件：頁面 route、lang、欄位限制、中文與英文文案一致；無輸入 name 導致瀏覽器送出；所有 UI 原始文字都只當文字。這些命令不證明視覺或真實瀏覽器交互。
- 回寫 HANDOFF：記錄新增 UI 狀態、純函式／app test 區分、無障礙待驗項。

## T03 — 錯誤、失效、確認與記憶體清理

- 前置：T02 通過。
- Allowed paths：僅 public/js/app.mjs、public/index.html、public/en/index.html、public/styles/app.css、scripts/check.mjs、test/app-contract.test.mjs、生成的 dist/、主代理提供的 HANDOFF.md 狀態區段。
- 實作：完成欄位錯誤 code→兩語文案、提交焦點、輸入立即使舊結果/報告失效、composition 保護、頁內清除確認、語言切換確認、pagehide 清空和 BFCache persisted pageshow 重置。不得加自動儲存、跨語言狀態、URL state、原生 dialog 或任何 async clipboard/下載生命週期。
- 此時才可執行：npm test；npm run check；npm run build。只可用 Node pure/harness 檢查可分離的純狀態函式，不宣稱這證明瀏覽器 pagehide/BFCache/IME。
- 完成條件：狀態 handler 可由隔離單元測試確定 invalidation／取消／清除順序；真正瀏覽器驗收依 B03、B10–B20 尚未執行，需明確標 NOT_RUN_USER_FOCUS_INCIDENT，不能向後宣稱完整 M1。
- 回寫 HANDOFF：記錄 pagehide/pageshow handler 的測試範圍和未驗證的真實 lifecycle。

## T04 — metadata、預覽安全及完整靜態檢查

- 前置：T03 通過，所有 UI 文案已定稿。
- Allowed paths：僅 public/index.html、public/en/index.html、public/styles/app.css、public/js/app.mjs、scripts/check.mjs、scripts/build.mjs、test/static-security.test.mjs、生成的 dist/、主代理提供的 HANDOFF.md 狀態區段。
- 實作：套用繁中／英文 title、description、H1、FAQ 和 noindex preview；固定路由與切換 URL。閉合 CSP 使用外部同源 CSS/ESM，不加 inline/eval/remote resources；檢查腳本實際掃描禁止 storage/network/危險 DOM API、語法、必要檔及 preview build 白名單。不要把 robots/sitemap/canonical 寫進 preview。
- 此時才可執行：npm test；npm run check；npm run build；npm run dev 後命令列 HTTP 檢查兩頁、preview noindex、CSP、未列路徑回 404、無意外 URL/query；每個 server target 僅 127.0.0.1:4214。
- 完成條件：雙語內容與 route 一致，production SEO 尚未建置；預覽不得被誤標成公開可索引頁。regex/static check 只能作必要 gate，不宣稱是完整安全證明。
- 回寫 HANDOFF：記錄檢查器實際覆蓋及其限制、HTTP headers/status、dist/ allowlist。

## T05 — M1 本機驗收凍結

- 前置：T01–T04 均通過，工作樹只有本工具 allowed paths，所有測試和檢查輸出完整。
- Allowed paths：只可在本工具目錄修正已列的 source/test/script、生成的 dist/ 和主代理提供的 HANDOFF.md 狀態區段；不改任何共用首頁、shared status、credential、Windows 環境或 Git 設定。
- 實作／檢查：先執行 npm test、npm run check、npm run build；再用本機命令列完成 ACCEPTANCE HTTP checks。保存本機證據。Browser/manual cases B01–B26 需使用者電腦焦點 incident 明確允許的實際隔離能力；不得啟動 hidden tab、CUA、原生 UI 或新隔離服務。
- 命令：npm test；npm run check；npm run build；npm run dev；本機 HTTP client 僅向 127.0.0.1:4214；如執行 Windows 長時間任務，遵守工作區環境保護並作指定前後紀錄。
- 完成條件：所有已執行的本機 gate 有可重現輸出。若 B01–B26 未能合規執行，逐項標 NOT_RUN_USER_FOCUS_INCIDENT，M1 狀態為「本機程式 gates 已完成，完整 UI 驗收未完成」；不可聲稱完整 M1。將確切 candidate source hashes 和未驗項交主代理作決策。
- 回寫 HANDOFF：列結果、版本/hash、運行環境、HTTP 路徑、未驗的 browser/manual evidence；不得將同意的 NOT_RUN 改寫為 PASS。

## T06 — M2 正式候選與來源發布（須主代理明確放行）

- 前置：收到主代理針對本工具的明確 M2 放行，且放行記錄列出接受的未驗項或要求補齊的瀏覽器證據。沒有放行不得新增 production 工具鏈或發布。
- Allowed paths：僅 package.json、public/index.html、public/en/index.html、public/robots.txt、public/sitemap.xml、scripts/build-production.mjs、scripts/check-production.mjs、scripts/serve-production.mjs、scripts/release-check.mjs、test/production.test.mjs、生成的本工具 dist-production/，以及主代理提供的 HANDOFF.md 狀態區段。若主代理提供的 release publisher 要求其他路徑，先停下交主代理決定，不自行擴張。
- 實作：在 M1 dist/ 之外建立閉合 production build；正式候選加正確 canonical/hreflang/x-default、robots/sitemap、404 noindex、CSP；preview 仍 noindex 且不被修改。HTTP/release tests 固定兩頁及 headers/資源 allowlist。使用 primary-approved 的固定來源發布流程產出獨立 public GitHub repository；不讀取或配置憑證、不改 global/system Git/auth。候選和 live deploy 分開。
- 此時才可執行：npm run check:production；npm run build:production；npm test；npm run preview:production（固定 127.0.0.1:5214）；npm run release:check。只有在放行工具提供且核准上述命令／publisher 後執行；不得假設命令已存在或自行對未知遠端發布。
- 完成條件：固定來源 ZIP／repository commit 與 visibility 經主代理確認；本機 production 候選檔案白名單閉合；舊 M1 核心及 app source bytes 的差異如實列出；不代表 live website 已部署。
- 回寫 HANDOFF：記錄 M2 gate、固定來源版本/hash、公開 repo URL/commit/visibility、candidate HTTP 證據及仍未驗項。

## M3 — 部署和首頁整合（主代理專責）

此階段不由原功能對話或本工具作者執行。本工具只能提供經 M2 放行的固定 source candidate、production artifact 和證據；主代理使用其部署／首頁 gate 驗證預定網域、雙語首頁入口和 live headers。未部署前網域仍只是規劃，不列 published、online 或 indexed。

