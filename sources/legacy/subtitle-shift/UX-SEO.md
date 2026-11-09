# UX、在地化與 SEO 規格

## 頁面結構與設計

使用者一進頁面就看見工作內容：簡短說明、大型 SRT 輸入框、精簡的平移控制、一個明確提交按鈕，以及成功後才出現的狀態／錯誤和結果。沿用 GlossQuote 家族設計 token 的色彩、間距、字體、邊界與焦點處理，同時組成符合字幕編輯工作的版面，不複製其他工具或通用儀表板。

輸入與結果是主要工作區。方向及秒數可在窄螢幕並排，但前提是都容易操作；320 CSS px 時堆疊控制項，所有按鈕仍可觸及，textarea 可內部捲動且頁面不需橫向捲動。200% 縮放或放大文字時，標籤和按鈕可換行，完整輸出仍可選取。

使用原生且有標籤的 textarea、select/radio、文字輸入、按鈕及連結。秒數輸入設 decimal input mode，但驗證仍以 ASCII 文字為準；不得偷偷轉換逗號小數、全形數字或貼入字元。不要把控制項藏在無文字圖示後。鍵盤焦點使用對比足夠的家族樣式。保留標準選取、貼上與復原。IME 組字時不得更新 textarea value。

主要輸出是一個含完整 canonical SRT 的唯讀 textarea。以 textarea 的 value 屬性呈現；字幕文字只作純文字顯示，不解讀為 HTML。不得為最多 2,000 列建立 DOM 卡片。可選的小摘要最多只預覽首尾各三列，必須清楚標為預覽；完整輸出與下載仍不得截短。不可把截斷摘要稱為完整結果。

處理中、完成和錯誤狀態要有適當的螢幕閱讀器宣告。欄位錯誤與控制項關聯。無效提交後保留焦點；成功後宣告結果，但不從使用者正在組字的輸入框搶焦點。清除與語言切換確認使用頁內無障礙 dialog，提供明確取消／繼續按鈕、鍵盤焦點限制、Escape 取消與焦點還原。不得使用 window.confirm、列印或主動開啟原生檔案對話框。

## 雙語介面文字

繁體中文頁：

- 文件語言：zh-Hant
- Title：字幕時間平移｜GlossQuote Tools
- H1：字幕時間平移
- Description：貼上 SRT 字幕，整份提前或延後指定秒數，檢查完整結果並下載。純文字處理，不讀取影片或音訊。
- 輸入標籤：SRT 字幕文字
- 方向標籤：平移方向
- 提前選項：提前
- 延後選項：延後
- 初始方向：預選「提前」
- 秒數標籤：秒數（最多三位小數）
- 提交：平移字幕
- 輸出標籤：完整輸出 SRT（唯讀）
- 下載：下載 subtitles-shifted.srt
- 清除：清除草稿
- 語言連結：English
- 隱私說明：內容只在此頁記憶體處理；切換語言或離開頁面會清除草稿。

英文頁：

- 文件語言：en
- Title：Subtitle Time Shift | GlossQuote Tools
- H1：Subtitle Time Shift
- Description：Paste SRT subtitles, shift every cue earlier or later by a precise amount, review the full result, and download it. Text only; no video or audio is read.
- Input label：SRT subtitle text
- Direction label：Shift direction
- Earlier：Earlier
- Later：Later
- Initial direction：Earlier selected
- Seconds label：Seconds (up to three decimal places)
- Submit：Shift subtitles
- Output label：Complete SRT output (read-only)
- Download：Download subtitles-shifted.srt
- Clear：Clear draft
- Language link：繁體中文
- Privacy note：Text is processed in this page's memory; changing language or leaving clears the draft.

頁面需可見並翻譯「SRT 支援為本工具明列的子集合」說明，連到國會圖書館參考頁。不得宣稱相容所有 SRT 方言，也不得暗示已用影片驗證同步。

## 錯誤與生命週期訊息

兩種語言都要傳達相同結果：

- SRT 或設定無效：指出可辨識欄位／位置，說明如何修正，保留草稿。
- 平移超出時間範圍：指出 cue ordinal，說明整份檔案都沒有輸出。
- Worker 不可用或失敗：說明此瀏覽器無法完成處理，草稿仍只留在目前頁面。
- 下載 URL 達容量上限：說明沒有建立新下載；舊下載 URL 仍只保留至各自期限。
- 清除／切語言確認：說明繼續會丟棄目前草稿與結果。
- 結果失效：任一輸入或設定改變後，立即移除舊輸出並停用下載。
- Worker 逾時：說明本次計算逾時，草稿保留且沒有部分結果。

UI 不必顯示內部錯誤代碼。不得把完整貼上的字幕文字回顯到錯誤、toast、dialog、網址或 log。

## 響應式與裝置限制

支援純鍵盤操作、瀏覽器文字縮放到 200%、320 CSS px viewport、螢幕閱讀器標籤／狀態、減少動態效果偏好與一般 IME 組字。避免 hover-only 說明、只靠拖曳的操作、過小點擊區與只靠顏色的狀態。打字時不重排輸入。長輸出可設定明確高度並在 textarea 內捲動、選取，但 value 必須完整。

2,000 列上限須在主執行緒以外處理。不可顯示核心無法驗證的進度承諾。本產品沒有 service worker，因此不承諾完整離線。若發現遠端瀏覽器資產或第三方請求，即違反隱私界線。

## 搜尋意圖、metadata 與 FAQ

搜尋意圖只是產品假設，不是量測需求。頁面解決明確工作：以固定量平移全部 SRT 字幕時間。不得編造搜尋量、排名或使用者研究成果。

預覽版：

- 兩個語言路由都輸出頁面層級 noindex，不放正式 canonical。
- 本機預覽為 127.0.0.1:4216，並非公開網址。
- M1 預覽輸出獨立放在 dist/，不得覆蓋正式候選版。

正式候選版，只能在主代理 M2 GO 後建立：

- 繁中網址與 canonical：https://subtitles.glossquote.com/index.html
- 英文網址與 canonical：https://subtitles.glossquote.com/en/index.html
- 兩頁互相提供 hreflang zh-Hant 及 en。
- x-default 指向 https://subtitles.glossquote.com/index.html。
- 不建立 /zh-TW/ 路徑或語言選擇中介頁。
- sitemap 只列兩個 canonical 語言頁，除非主代理明確核准發布清單中的另一個靜態頁面。
- robots.txt 允許兩個頁面與完成渲染所需的同源 CSS/JS 資產，不可封鎖頁面資產。
- 404 response 必須 noindex，也不得含草稿或輸出。
- M3 前從 dist-production/ 正式候選版檢查 metadata 與 headers。

繁中 FAQ：

1. 如何平移 SRT 字幕時間？
   貼上符合本工具格式的 SRT，選提前或延後並輸入秒數，然後檢查完整結果。
2. 可以平移多少？
   秒數可為 0 到 3,600 秒，最多三位小數；移動後所有時間仍須位於 00:00:00,000 到 99:59:59,999。
3. 為什麼整份字幕被拒絕？
   本工具只接受明列的 SRT 子集合；若格式不符或任一 cue 超出時間範圍，整份不輸出部分結果。
4. 會讀取影片或上傳字幕嗎？
   不會。貼上的文字在本頁記憶體處理，沒有影片、音訊或雲端處理。
5. 能修正逐漸累積的不同步嗎？
   不能。本工具只做每個 cue 完全相同的時間平移。

英文 FAQ：

1. How do I shift SRT subtitle timing?
   Paste SRT text supported by this tool, choose earlier or later, enter seconds, and review the complete result.
2. How far can I shift it?
   The amount is 0 to 3,600 seconds with up to three decimal places; every shifted cue must remain between 00:00:00,000 and 99:59:59,999.
3. Why was the whole subtitle file rejected?
   This tool accepts only its documented SRT subset. A format error or any cue outside the time range rejects the entire result.
4. Does it read video or upload subtitles?
   No. Pasted text is processed in this page's memory; no video, audio, or cloud processing is used.
5. Can it fix gradually increasing desynchronization?
   No. It applies exactly the same time offset to every cue.

若使用 production structured data，必須與可見文案相符且使用該頁語言。CSP 可以只允許精確審閱過的 JSON-LD hash。若同源外部 markup 可滿足發布設計，優先不使用 inline JSON-LD。不得使用 unsafe-inline 或 unsafe-eval。正式候選版獨立產生於 dist-production/，本機使用 port 5216。M3 部署由主代理執行。
