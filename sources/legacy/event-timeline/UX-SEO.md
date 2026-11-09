# UX 與雙語 SEO 規格

> 規格狀態：M0 設計與文案規格，尚未建置、渲染或測試。介面語意、對比、鍵盤和實際裝置支援均待 M1/M2 驗收。

## 模式與設計方向

採 Gloss Tools 的 Product App 模式。主體是使用者正在排的活動順序和結果；不放通用 SaaS 導覽、登入列、dashboard 卡片、AI 對話或裝飾型 hero。

唯一醒目的產品手勢是沿活動順序延伸的細時間軸線。起訖時間貼近所屬活動列，次日標記直接貼在跨日時刻旁。這條線表示真實先後關係，不用假資料或抽象插圖。文字左對齊；時間使用等寬字，名稱和說明使用 UI 字體。

保留家族色彩語意，避免把所有特色同時堆在畫面上：

| 名稱 | 色碼 | 用途 |
|---|---|---|
| Paper | #F3F0E8 | 工作頁背景 |
| Ink | #111410 | 主要文字和標題 |
| Surface | #FFFFFF | 表單和報告可讀區 |
| Acid | #C8F56A | 唯一主要行動及安全的完成狀態；文字用 Ink |
| Muted text | #55594F | 次要說明，仍須通過對比 |
| Control border | #60645C | 輸入和必要控制邊界 |

以上是共用語意 token，不是新定義的家族色彩。提醒和錯誤使用共用語意色、圖示及文字；珊瑚不作小字。Product App 用平面表面、精準分隔和有限圓角，不用 marketing offset shadow、漸層、外部字型或無關插圖。字體採系統 fallback：UI 為 Geist、Segoe UI、system-ui、sans-serif；時間為 Geist Mono、Cascadia Mono、ui-monospace、monospace。不得下載或遠端載入字體。

## 桌面與手機線框

寬螢幕讓流程和結果共用主欄；不設空側欄。結果尚未產生時只顯示真實空狀態和下一步。

    ┌──────────────────── Gloss Tools / 活動時間表 ─────────── 語言 ┐
    │ 把活動順序排成時間表                                         │
    │ 開始時間 [09:00]   目標結束時間 [10:00] [ ] 目標在次日       │
    │ 活動流程                                                      │
    │ 09:00  ─ [活動名稱____________] [分鐘] [備註__________]       │
    │        ─ [上移] [下移] [移除此活動]                           │
    │ 09:10  ─ [活動名稱____________] [分鐘] [備註__________]       │
    │        ─ [上移] [下移] [移除此活動]                           │
    │ [新增活動]                                                    │
    │ [清除全部]                               [排出時間表]         │
    │                                                              │
    │ 結果（提交後出現）：逐列起訖 / 合計 / 結束 / 目標差異         │
    │ 唯讀文字報告                 [複製報告] [下載 TXT]             │
    │ 說明與 FAQ                                                      │
    └──────────────────────────────────────────────────────────────┘

320 CSS px 手機先顯示開始時間和活動列；每列欄位可換行，排序和刪除按鈕仍有文字與觸控目標。主要按鈕在欄位之後，結果跟在按鈕之後。

    ┌ 活動時間表                         語言 ┐
    │ 開始時間                              │
    │ [09:00___________________________]     │
    │ 目標結束時間                          │
    │ [10:00___________________________]     │
    │ [ ] 目標在次日                       │
    │ 活動 1                                 │
    │ 名稱 [___________________________]     │
    │ 分鐘 [__]   備註 [________________]   │
    │ [上移] [下移] [移除此活動]             │
    │ [+ 新增活動]                           │
    │ [清除全部]                             │
    │ [排出時間表]                           │
    │ 結果、報告、複製／下載                 │
    └───────────────────────────────────────┘

## 控制與鍵盤行為

- 每個 input 有常駐可見 label；placeholder 只能舉例，不能取代 label。時間範例為 09:00，使用 24 小時 ASCII 數字。時間欄位使用文字輸入，不使用可能因 locale 改寫格式的原生 time control；core 嚴格驗證實際內容。時長欄位用 numeric inputmode，解析仍只接受 ASCII。
- IME 組字期間不宣告每個中間拼字錯誤；所有輸入仍立即撤銷舊結果。組字尚未結束時點主要按鈕，阻止提交並說明完成輸入後再排程。
- 鍵盤次序依畫面：開始、目標、次日、每列名稱／分鐘／備註／上移／下移／刪除、新增、清除、排程、結果和報告動作。停用控制保留可見的 disabled 樣式與原因。
- 上移／下移用原生按鈕，至少 44×44 CSS px 觸控區，名稱含目標列序。操作後焦點仍在同一活動列的排序按鈕，並以一次 aria-live 訊息告知新位置。首列上移、末列下移和最後一列刪除會停用。
- 列表不依賴拖曳。即使未來增添拖曳，也不能取代鍵盤和單指按鈕。
- 每次欄位變更、增刪或排序都同步清空舊結果並停用複製／下載。結果區只在成功提交後顯示。
- 首個欄位錯誤以 aria-describedby 關聯欄位，不只靠顏色。提交失敗時只在有助修正時把焦點移到第一個錯誤欄位。
- 動態結果使用適當 status/aria-live；成功只公告一次，不逐列中斷螢幕閱讀器。計算同步完成，沒有 spinner。
- 60 列時所有列可順序操作；頁面可垂直捲動，不能在窄手機製造水平頁面捲動。
- 按鈕有 default、hover、pressed、visible focus、disabled 狀態；focus indicator 在 paper、white、acid 和 ink 背景均清楚可見。普通文字對比至少 4.5:1，控制邊界和非文字狀態至少 3:1。資訊不靠顏色單獨傳達。
- 200% 縮放、320 CSS px、長 40% 翻譯、手機安全區和虛擬鍵盤下仍能看到焦點和主要動作。保留自然重排與垂直捲動，不把核心控制藏進 icon 或橫向捲動區。
- 尊重 prefers-reduced-motion。本工具不需要非使用者觸發動畫；按下回饋遵守共用 120–180ms 範圍且位移不超過 4px。

## 狀態與固定介面文案

繁中和英文頁面都要逐項對照實作，狀態文案不得露出錯誤原文或堆疊。每種錯誤都要有同等意思的完整雙語文案。

| 狀態 | 繁體中文 | English |
|---|---|---|
| 頁面標題 | 把活動流程排成看得懂的時間表 | Turn an event plan into a clear timeline |
| 空白初始 | 輸入開始時間，再填寫至少一段活動。 | Add a start time and at least one activity. |
| 主要行動 | 排出時間表 | Build timeline |
| 排程成功 | 時間表已排出。編輯任何欄位會清除此結果。 | Timeline built. Editing any field clears this result. |
| 名稱空白 | 請輸入這段活動的名稱。 | Enter a name for this activity. |
| 名稱過長 | 名稱修剪後最多 80 個 UTF-16 code units。 | The trimmed name can contain up to 80 UTF-16 code units. |
| 時長格式 | 請輸入 ASCII 整數分鐘，例如 35。 | Enter whole minutes using ASCII digits, such as 35. |
| 時長範圍 | 每段時長必須是 1 到 720 分鐘。 | Each activity must be 1 to 720 minutes. |
| 同日目標錯誤 | 同日目標必須晚於開始時間；若要排到次日，請勾選「目標在次日」。 | A same-day target must be later than the start. Select “Target is the next day” if needed. |
| 次日無目標 | 請先輸入目標結束時間。 | Enter a target end time first. |
| 總長超限 | 全程最多 1440 分鐘；請縮短或移除活動。 | The timeline can be at most 1440 minutes. Shorten or remove an activity. |
| composing | 請完成輸入法組字後再排出時間表。 | Finish composing the text before building the timeline. |
| 成功複製 | 已複製文字報告。 | Report copied. |
| 複製不可用 | 無法一鍵複製；請選取下方報告再複製。 | One-click copy is unavailable. Select the report below to copy it. |
| 取消清除 | 已保留目前草稿。 | Your current draft is unchanged. |

目標比較需用完整文字呈現，例如「提早 5 分鐘」、「準時」或「超時 5 分鐘」／“5 minutes early”, “On time”, “5 minutes late”。次日時刻明寫「次日」／“next day”。按鈕說明動作結果，不使用「OK」、「提交」或只有 icon。

## 清除確認與錯誤文案

有欄位內容或已排結果時，使用原生確認：

- 繁中：清除目前時間表？所有欄位和結果都會清空。
- English: Clear this timeline? All fields and results will be cleared.

取消會完整保留。語言切換有資料時使用同一確認，並說明將前往另一語言且清除目前時間表；取消留在原頁。確認和取消只用原生 dialog，不另建自製對話框。

錯誤說明問題、修正路徑和目前安全狀態。剪貼簿失敗時 report 保持可選取；不支援的瀏覽器功能不會觸發上傳或自動重試。頁面初次載入、離線重載或原生 API 無法使用時，使用明確文字提供安全出口，不宣稱支援所有瀏覽器。

## SEO 欄位與頁面文案

繁中頁位於 `/index.html`，`<html lang="zh-Hant">`；英文頁位於 `/en/index.html`，`<html lang="en">`。沒有語言選擇頁。兩頁以可見文字連結互相切換；若目前頁有草稿或結果，先用原生確認說明離頁會清除資料，取消則保留本頁。切換後目標頁從空白初始狀態開始，不保證草稿保留。路徑不帶任何排程輸入。繁中 Gloss Tools 首頁連結固定為 `https://glossquote.com/index.html`，英文為 `https://glossquote.com/en/index.html`，符合 `docs/BRAND.md`。

### 繁體中文頁面

- Title：GlossQuote 活動時間表｜安排活動流程與結束時間
- Description：輸入開始時間與每段活動分鐘數，排出逐段起訖、跨午夜標記和目標結束時間差。活動資料只留在目前頁面記憶體。
- H1：把每一段流程排成看得懂的時間表
- 說明：填入開始時間、活動名稱和分鐘數，然後排出時間表。需要和目標結束時間比較時，輸入目標並說明它是否在次日。
- 首屏主要工作區先呈現開始時間、可選目標和活動列，不另造 hero 或虛構範例紀錄。
- FAQ：
  1. 問：這裡會保存我的時間表嗎？答：不會。欄位和結果只留在目前頁面記憶體；離開頁面會清除。
  2. 問：流程跨過午夜會怎麼顯示？答：跨日後的時刻會標示「次日」。工具不需要日期、時區或夏令時間。
  3. 問：沒有目標結束時間也能排程嗎？答：可以；留白並取消「目標在次日」，結果不會顯示提早或超時比較。
  4. 問：每段活動可以多長？答：每段 1 到 720 分鐘，全流程最多 1440 分鐘，最多 60 段。

### English page

- Title: GlossQuote Event Timeline | Plan an Event Schedule
- Description: Add a start time and activity durations to see each start and end, next-day markers, and the difference from an optional target. Data stays in this page’s memory.
- H1: Turn an event plan into a clear timeline
- Intro: Enter the start time, activity names, and whole-minute durations, then build the timeline. For a target end time, state whether it falls on the next day.
- Keep the start, optional target, and activity rows in the first view. Do not replace them with a generic hero or sample records.
- FAQ:
  1. Q: Is my timeline saved? A: No. Inputs and results stay in this page’s memory and are cleared when you leave.
  2. Q: What happens when the schedule passes midnight? A: Times after midnight are marked “next day.” No calendar date, time zone, or daylight-saving rules are used.
  3. Q: Can I build a timeline without a target end time? A: Yes. Leave it blank and keep “Target is the next day” unchecked; no early/late comparison is shown.
  4. Q: How long can each activity be? A: Each activity can be 1 to 720 minutes. The full timeline is limited to 1440 minutes and 60 activities.

兩個語言頁都提供明確的語言切換連結及返回同語言 Gloss Tools 首頁的連結；不另設語言選擇頁。不得虛構使用者、節省時間、排名、評價、瀏覽器相容性、100% 安全或永久免費等宣稱。不放未經需求支持的 tracking 或遠端影像；FAQ 不加結構化資料。

## Preview 與 production SEO 閘門

### M1 preview

- `/index.html`、`/en/index.html` 及 preview 404 都有 noindex,nofollow；preview robots 禁止索引，沒有 production canonical/hreflang、production sitemap 或可索引 robots。
- 本機命令只產生 preview。preview 手動驗收不能宣稱 production SEO 已發布。

### M2 production candidate

- 只有主代理明確通過 M1 後，原功能對話才建立 production 工具鏈和 production candidate。固定 origin 為 `https://agenda.glossquote.com`；M1 `dist/` preview 與 M2 `dist-production/` 完全分開，production build 不覆寫 preview。
- `/index.html` canonical 指向 `https://agenda.glossquote.com/index.html`；`/en/index.html` canonical 指向 `https://agenda.glossquote.com/en/index.html`。
- Production Open Graph title/description/locale 對應該語言，og:url 等於該頁 canonical，og:type=website；不提供虛構預覽圖。
- 兩個語言頁互相列出 `hreflang="zh-Hant"` 和 `hreflang="en"`，並共同列出 `hreflang="x-default"` 指向繁中 `https://agenda.glossquote.com/index.html`。不存在獨立語言選擇頁。
- robots.txt 只允許 production 頁並列 production sitemap URL。sitemap 只包含兩個 canonical 絕對網址，不含 localhost、query、hash、fixtures 或其他產品。
- 404 回 HTTP 404 且 noindex；未知路徑不可 fallback 成 200 app。
- 對兩頁實際檢查 title、description、H1、lang、canonical、互相一致 hreflang、繁中 x-default、robots、sitemap、404 status 及品牌首頁語言連結。

## Production HTTP security headers

M2 確認 Cloudflare Static Assets 的實際行為後再部署閉合政策。預設建議：

    /*
      X-Content-Type-Options: nosniff
      Referrer-Policy: no-referrer
      Permissions-Policy: camera=(), microphone=(), geolocation=(), clipboard-write=(self)
      X-Frame-Options: DENY
      X-Robots-Tag: index, follow
      Content-Security-Policy: default-src 'none'; script-src 'self' 'sha256-EXACT_PAGE_JSON_LD_HASH'; style-src 'self'; img-src 'self'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'

production 只有固定 WebApplication JSON-LD 區塊可用其逐頁精確 SHA-256 hash 通過 script-src；hash 必須由該頁實際 JSON-LD bytes 計算。其他 inline script/style、data URI、外部 font、connect-src 或 wildcard 均禁止。preview 以 noindex header 覆蓋 production 指令且不輸出 JSON-LD hash；404 使用 noindex。若需要新增來源，主代理先做範圍審查，原功能對話不可自行放寬 CSP。

## M2 與 M3 責任

M1 原功能對話只做本機實作和本機驗收，不登入或呼叫 GitHub/Cloudflare，不發布或部署。主代理完成獨立 M1 驗收並明確放行後，M2 原功能對話建立 production 工具鏈及 `dist-production/` candidate、跑 production gates，並用固定 ZIP 流程發布 public repo；M2 停在來源發布與可核對 candidate，不呼叫 Cloudflare、不部署、不更新首頁。M3 工具和共用首頁部署、線上雙語確認由主代理負責。
