# 使用者介面與 SEO 規格：成績目標試算

狀態：**規格，尚未實作。** Surface mode：Product App。頁面服務「已有部分成績，想知道剩下項目需達多少加權平均」，以表單和可核對結果為主，不做通用 SaaS hero。

## 使用者流程與資訊順序

1. 輸入 0–100 目標分數。
2. 為每項輸入名稱及百分比權重；已評分者填 0–100 分，尚未評分者留白。持續顯示權重合計及格式規則。
3. 按「試算 / Calculate」。無效欄位顯示可修復錯誤，不產生部分結果。
4. 結果先顯示「已取得的總成績貢獻」，再顯示「剩餘項目需達的加權平均」或「即使剩餘全為 100 的最高可能總成績」。
5. 可複製目前結果或下載報告；任何表單變更都立即清除結果。範例需明確按下才載入。

不得只用「你還需要 X 分」作主標，避免將總成績貢獻與剩餘平均混淆。清楚說明結果取決於輸入，且不是校規或每一項最低分。

## 版面草圖

### 桌面主要工作區

~~~text
┌──────────────────────────────────────────────────────────────────┐
│ Gloss Tools / 成績目標試算        語言切換   返回繁中首頁          │
├──────────────────────────────────────────────────────────────────┤
│ 成績目標試算                                                     │
│ 用已知權重和成績，估算尚未評分項目合計需達到的加權平均。         │
│ 非官方校規計算；本頁不保存輸入。                                 │
│ 目標分數 [        ] / 100       權重合計 [ 0.00 / 100.00% ]       │
│ 評分項目表                                                       │
│ 名稱                  權重 (%)          成績 (%)       操作       │
│ [______________]      [______]          [______]       移除       │
│                  未評分請留白；填 0 表示已評分且得 0 分。         │
│ [+ 新增項目] [載入範例] [清除表單]                [試算]           │
│ 結果                                                             │
│ 已取得的總成績貢獻：32.00 / 100                                  │
│ 剩餘項目需達的加權平均：63.34 / 100                              │
│ 這是剩餘項目依權重合併後的平均，不是每一項都需達 63.34。         │
│ [複製結果] [下載報告]                                             │
└──────────────────────────────────────────────────────────────────┘
~~~

### 手機（320 CSS px 起）

~~~text
┌──────────────────────────┐
│ 成績目標試算   語言       │
│ 返回繁中首頁              │
│ 已有部分成績，試算剩餘... │
│ 目標分數                  │
│ [____________] / 100      │
│ 權重合計 0.00 / 100.00%   │
│ 評分項目 1                │
│ 名稱 [____________]       │
│ 權重 (%) [____________]   │
│ 成績 (%) [____________]   │
│ 未評分留白；0 是已得零分。│
│ [+ 新增] [移除此項目]     │
│ [載入範例] [清除表單]       │
│ [試算]                    │
│ 結果 / 欄位錯誤           │
│ [複製] [下載報告]         │
└──────────────────────────┘
~~~

手機不保留四欄橫向表格。各列標題和欄位標籤始終可見；新增／移除、格式說明和結果皆可用鍵盤與讀屏操作。40 列使用一般頁面縱向捲動，不做整頁橫向捲動。

## 控制項及狀態

- Header 只放工具名稱、繁中／English 切換和當前語言首頁連結；不放 slogan、會員入口或多餘導覽。
- 目標與各列欄位用 type=text、可見標籤及 inputmode=decimal。小數規則在欄位旁顯示；提供「插入小數點 / Insert decimal point」按鈕，以文字插入並保留游標位置。逗號不自動轉句點。
- 成績欄說明固定表示：空白是尚未評分；0 是已評分且得 0 分。IME composition 中不即時報錯；按計算後驗證。
- 權重合計以不中斷輸入的狀態訊息顯示，初始 0.00 / 100.00%。只有恰為 100.00 且其他欄位有效才能成功計算；使用者仍可在欄位空白或不合法時按試算，以取得欄位錯誤。
- 初始輸入 fieldset 和所有工作按鈕均 disabled；全部事件 listener 掛妥且初始化成功後才啟用輸入及安全操作，試算按鈕此時可用並在按下時驗證。初始化失敗時所有工作控制維持 disabled。成功、不可達、先已達標、完成達標及完成未達標都以文字和圖示／語意色呈現。
- 範例只更新表單不自動試算；中英文均清楚標註假資料。
- 任何數字、名稱或列編輯都清除舊結果及複製成功提示。重新計算才重新啟用複製／下載。
- 「清除表單 / Clear form」有資料、結果、pending 動作或有效下載連結時先要求確認；取消時表單/結果/提示/連結維持不變，確認時清除全部並回到目前語言空白表單。內容已空時可直接回到空白狀態。
- 複製拒絕時提供可選取文字結果。下載最多 8 個各自 30 秒有效連結；容量滿時不撤銷已有連結。
- 語言切換先開確認對話框，說明確認會清除目前全部項目與結果。取消保留語言和輸入；確認後導向另一固定同源語言 URL，顯示空白表單。
- 初始化失敗時按鈕維持 disabled，使用固定短文案，不顯示原始錯誤或表單內容。

## 雙語 SEO 與可見文案

### 繁體中文

- Title：**成績目標試算｜Gloss Tools by GlossQuote**
- Description：**輸入已評分項目、百分比權重與目標，試算尚未評分項目合計需達到的加權平均。成績規則以學校官方說明為準。**
- H1：**成績目標試算**
- 說明：**已拿到部分成績，想知道剩下的項目平均至少要多少？輸入各項權重與已評分成績，查看已取得的總成績貢獻，以及剩餘項目所需的加權平均。**
- 提示：**權重必須合計為 100%。成績空白代表尚未評分；輸入 0 代表已評分且得 0 分。此工具只按你輸入的資料試算，不代表學校官方算分規則。**
- 主要操作：**試算**
- 次要操作：**新增項目**、**載入範例**、**清除表單**、**複製結果**、**下載報告**
- 未評分：**尚未評分（留白）**
- 已知貢獻：**已取得的總成績貢獻**
- 需要分數：**剩餘項目需達的加權平均**
- 不可行：**目標目前無法達到**；**即使所有剩餘項目都是 100，最高總成績也只有 {value}。**
- 精度註記：**目標比較使用未四捨五入的精確值；畫面上的已取得貢獻四捨五入至小數兩位。**
- 剩餘平均註記：**這是剩餘項目依權重合併後所需的平均，不表示每一項都要達到這個分數。**
- 語言切換確認：**切換語言會清除目前表單和結果。要繼續嗎？** 按鈕：**清除並切換**、**留在此頁**
- 清除確認：**清除會移除目前表單、結果和下載連結。要清除嗎？** 按鈕：**清除表單**、**取消**
- 資料說明：**輸入只在目前頁面處理；本版不保存。第一次載入仍需下載網站檔案。**

### English

- Title: **Grade Target Calculator | Gloss Tools by GlossQuote**
- Description: **Enter graded components, percentage weights and a target to estimate the weighted average needed across ungraded components. Check your school's official grading rules.**
- H1: **Grade Target Calculator**
- Intro: **Already have some grades? Enter each component's weight and any score you have. See your earned contribution to the final grade and the weighted average needed across the remaining components.**
- Notice: **Weights must total exactly 100%. Leave a score blank if it is not graded yet; enter 0 for a graded score of zero. This calculator follows your inputs and may not match your school's official grading rules.**
- Primary action: **Calculate**
- Secondary actions: **Add component**, **Load example**, **Clear form**, **Copy result**, **Download report**
- Ungraded: **Not graded (leave blank)**
- Earned contribution: **Earned contribution to final grade**
- Required score: **Weighted average needed across remaining components**
- Unreachable: **This target is not currently reachable**; **Even with 100 on every remaining component, the maximum final grade is {value}.**
- Precision note: **Target status uses the exact, unrounded value. The earned contribution shown here is rounded to two decimal places.**
- Remaining-average note: **This is the weighted average across all ungraded components, not a minimum score for each component.**
- Language confirmation: **Changing language clears the current form and result. Continue?** Buttons: **Clear and switch**, **Stay here**
- Clear confirmation: **Clearing removes the current form, result and download links. Clear them now?** Buttons: **Clear form**, **Cancel**
- Data note: **Your inputs are processed in this page and are not saved. The first page load still downloads the website files.**

### 雙語範例數值

Target / 目標 70.00；Component A / 項目 A：weight 40.00、graded score 80.00；Component B / 項目 B：weight 60.00、score blank / 留白（未評分）。按下 Calculate / 試算後，earned contribution / 已取得貢獻為 32.00，remaining weight / 剩餘權重為 60.00%，required weighted average / 所需剩餘加權平均向上取至 63.34。

## FAQ（頁面和 JSON-LD 必須一致）

以下問答需在兩語可見 FAQ 出現。JSON-LD 只能從可見內容產生，不可增加聲稱。

### 繁體中文

1. **剩下的項目平均要多少才會達到目標？** 工具先算已評分項目的加權貢獻，再用尚未評分的權重求出所需加權平均，向上取至 0.01 分。只適用於你輸入的分數與權重。
2. **成績空白和輸入 0 有什麼不同？** 空白表示尚未評分，不會當成 0 分；輸入 0 表示已評分且得 0 分。
3. **所需平均是否代表每個剩餘項目都必須達到這個分數？** 不是。這是依剩餘權重合併後的平均，不代表個別項目的最低分；實際結果仍取決於權重與分數。
4. **如果工具說目標不可達，代表什麼？** 即使所有空白項目都得到 100，依目前權重和已知分數算出的最高總成績仍低於目標。請核對輸入與學校官方規則。
5. **工具會替我套用學校的計分規則嗎？** 不會。工具不連接校務系統，也不知道曲線、類別權重、補考或其他校規；請以學校公布的規則為準。

### English

1. **What average do I need on the remaining components?** The calculator totals the weighted contribution from graded components, then calculates the weighted average needed across the ungraded weights. It rounds that required average up to 0.01. The result only reflects your inputs.
2. **Is a blank score the same as zero?** No. A blank score means the component has not been graded. Enter 0 when it has been graded and the score is zero.
3. **Does the required average mean every remaining component must reach that score?** No. It is the weighted average across all remaining components, not a minimum for each one. Actual results still depend on component weights and scores.
4. **What does an unreachable target mean?** Even if every ungraded component receives 100, the maximum final grade calculated from your current weights and scores is below the target. Check your inputs and your school's official rules.
5. **Does this calculator know my school's grading rules?** No. It does not connect to school systems or know about curves, category weights, retakes or other rules. Check the rules published by your school.

## SEO 與正式網址規則

- 正式候選 origin：[https://grades.glossquote.com](https://grades.glossquote.com)；只有 M2/M3 domain、HTTP 和實際內容確認後才能稱為正式網址。文件不代表 DNS、發布或 Cloudflare 部署已驗證。
- 預覽為 http://127.0.0.1:4208/；預覽及 M1 build 必須有 noindex,nofollow，不輸出正式 canonical 或 sitemap。
- 正式繁中頁為 [https://grades.glossquote.com/index.html](https://grades.glossquote.com/index.html)，英文頁為 [https://grades.glossquote.com/en/index.html](https://grades.glossquote.com/en/index.html)。依 [docs/RELEASE.md](docs/RELEASE.md) 發布後才輸出 self-canonical、雙向 hreflang zh-Hant／en 及指向繁中 canonical 的 x-default。Sitemap 只列兩個 canonical；404 不顯示試算成功頁。
- 返回雙語首頁依 [docs/BRAND.md](docs/BRAND.md)：繁中 [https://glossquote.com/index.html](https://glossquote.com/index.html)，英文 [https://glossquote.com/en/index.html](https://glossquote.com/en/index.html)。正式驗收確認路徑和頁面語言相符。
- M2 可加入 WebApplication 及符合可見問答的 FAQPage JSON-LD；不加 rating、review、未驗證價格、瀏覽器支援或搜尋排名。preview noindex，正式 canonical 僅在確認後出現。
- robots.txt 不能封鎖必要 CSS/JS；檢查 sitemap URL 的實際索引 headers/meta，包含繼承的 X-Robots-Tag。這是 release gate，不以搜尋排名或流量作成功指標。

## 品牌與無障礙

使用 [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) 的 family tokens 與 Product App 行為。以標籤、細分隔線和文字提示呈現權重與成績關係；評分表是主要工作畫布。不要將每列做成巢狀卡片，不放假圖表或預填成績。

驗收目標為 WCAG 2.2 AA：完整鍵盤流程、焦點不被 sticky 元件遮住、欄位錯誤關聯、一般文字對比至少 4.5:1、觸控目標約 44×44 px、狀態不只靠顏色、200% 縮放、320 CSS px 重排、虛擬鍵盤安全區、prefers-reduced-motion。版面容納比繁中長至少 40% 的英文標籤。

## 明確不宣稱

不宣稱採用特定學校規則、適用所有科目、保證取得目標、100% 安全、永久免費、永遠離線、支援所有瀏覽器、搜尋排名、流量或使用者數。
