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
