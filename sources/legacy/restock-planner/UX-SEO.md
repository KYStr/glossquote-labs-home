# 補貨數量試算介面與 SEO 規格

狀態：M0 規格，尚無實際畫面。此工具是 Product App，不是行銷 landing page。工作區沿用 Gloss Tools 語意 tokens 和安全/可及性底線，版面為本工具的補貨工作表，不複製其他工具或通用 SaaS 儀表板。

## 工作與視覺層級

使用者先知道要填期間用量、現貨、到貨時間和包裝規格，再清楚按一次試算。工作表本身是最大區域；不要用裝飾性 hero、等尺寸卡片、假圖表或高亮數字取代真實輸入。

- 一個主要動作：`試算補貨` / `Calculate restock`。
- 主要輸入附近就地說明觀測期間、到貨天數和到貨後涵蓋期的關係；固定平均耗用及到貨假設可在明確命名的「計算方式」說明區展開。
- 最多 30 列，以表格式工作表表達；新增/刪除操作和受影響列相鄰。不要以拖曳作唯一操作。
- 試算結果直接放在輸入工作表下方；文字報告是完整唯讀 textarea，可鍵盤聚焦和選取。沒有複製或下載按鈕。
- 成功、警告與錯誤同時使用文字、圖示及顏色，不以顏色單獨表意。補貨量 0 仍顯示，不隱藏該列。
- 使用 family tokens：暖紙色工作面、墨色正文、酸綠僅用於主要完成/安全選擇，珊瑚作有限強調，不以珊瑚小字呈現風險。操作數值可用 monospace；表單標籤用 UI 字型與系統 fallback，不下載字型。

## Desktop 工作表草圖

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Gloss Tools / 補貨數量試算              Home     English              │
├──────────────────────────────────────────────────────────────────────┤
│ 補貨數量試算                                                        │
│ 依已知用量與現貨，估算要補幾包及到貨前是否可能短缺。                 │
│ 觀測天數 [30]   到貨天數 [7]   到貨後涵蓋天數 [30]                   │
│ 固定平均估算 · 訂單假設在到貨天數結束時可用 [計算方式 ▾]             │
│                                                                      │
│ 品項       單位  期間用量  現貨  安全備量  每包單位數                 │
│ [名稱]     [ml]  [整數]   [整數] [整數]   [整數]       [移除]         │
│ [＋ 新增品項]       [範例：一般補貨] [範例：到貨前短缺]                │
│ [清除全部]                                      [試算補貨]            │
│                                                                      │
│ 結果（按下試算後出現）                                               │
│ 每列：建議包數 / 總單位 / 到貨前估計短缺 / 現貨可用整天數             │
│ 完整採購文字（readonly，可鍵盤選取）                                 │
└──────────────────────────────────────────────────────────────────────┘
```

寬版只用一個工作區，不加無關側欄。結果和警告就在對應品項旁/下方；總假設留在結果標題附近。長清單在頁面內自然捲動，不截斷結果或報告。

## Mobile 320 CSS px 草圖

```text
┌──────────────────────────────┐
│ 補貨數量試算     English     │
│ 依已知用量估算補貨量。       │
│ 觀測天數 [30]                │
│ 到貨天數 [7]                 │
│ 到貨後涵蓋 [30]              │
│                              │
│ 品項 1                       │
│ 名稱 [________________]      │
│ 單位 [___]                   │
│ 期間總用量 [___]             │
│ 現貨 [___]                   │
│ 安全備量 [___]               │
│ 每包單位數 [___]             │
│ [移除品項]                   │
│ [新增品項]                   │
│ [範例] [清除全部]            │
│ [試算補貨]                   │
│ 結果與完整文字報告           │
└──────────────────────────────┘
```

320 CSS px 下欄位單欄堆疊，不出現整頁水平捲動；操作按鈕達 44×44 CSS px 目標，動態列和警告不遮住焦點或主動作。200% 縮放仍保留欄位、錯誤、按鈕與整份報告。

## 狀態文案

| 狀態 | 繁中 | English |
|---|---|---|
| 初始 | 填好每個品項，再按「試算補貨」。目前尚未計算。 | Fill in each item, then select “Calculate restock.” Nothing has been calculated yet. |
| 草稿已變更 | 輸入已變更；舊結果已清除。請重新試算。 | Inputs changed. The previous result was cleared. Calculate again. |
| 計算中 | 正在試算補貨… | Calculating restock… |
| 成功 | 已完成試算。結果依目前輸入與固定平均耗用假設計算。 | Plan calculated from the current inputs using the fixed-average-use assumption. |
| 空結果 | 目前估算不需要補貨；仍列出到貨前短缺與現貨可用天數。 | The estimate calls for no new packs. Shortage and stock runway are still shown. |
| 零用量 | 觀測用量為 0；現貨可用天數無法估算。安全備量仍會計入補貨量。 | Observed use is zero, so stock runway is not estimated. Safety reserve still affects the order. |
| 欄位錯誤 | 請檢查標示的欄位。其他品項不會先產生部分結果。 | Check the marked field. No partial item results were produced. |
| 系統限制 | 此頁無法安全完成試算。請重新載入後再試；資料不會送到其他服務。 | This page cannot safely complete the calculation. Reload and try again; data is not sent to another service. |
| 無結果報告 | 試算成功後會在此顯示完整可選取的文字。 | The complete selectable report appears here after a successful calculation. |

輸入錯誤需在欄位旁以語意提示修正方式，不顯示技術代碼、不把原始內容回顯到警示、不只用紅色框表示。聚焦只在使用者提交錯誤後移到第一個錯誤欄位；輸入中不搶焦點。

## 確認與語言切換文案

所有確認都在頁內呈現，不呼叫瀏覽器原生確認/提示或 OS 對話框。取消始終保留畫面現狀。

| 用途 | 繁中 | English |
|---|---|---|
| 切換語言（有非初始草稿或結果） | 切換語言會離開此頁並清除此頁輸入與結果。此工具不會自動保存。要切換嗎？ | Changing language leaves this page and clears its inputs and result. This tool does not save automatically. Continue? |
| 載入範例 | 載入範例會取代目前輸入並清除結果；載入後不會自動試算。要繼續嗎？ | Loading this example replaces the current inputs and clears the result. It will not calculate automatically. Continue? |
| 清除全部 | 清除會恢復預設天數和一列空白品項，並清除結果。要清除嗎？ | Clear resets the day values and leaves one blank item. The result will be cleared. Continue? |
| 確認按鈕 | 切換語言 / 載入範例 / 清除全部（依情境） | Change language / Load example / Clear all (by context) |
| 取消按鈕 | 取消 | Cancel |

語言控制是正常連結，href 指向另一固定路由；若草稿等於初始預設且無結果，可直接導航。若有任何非初始草稿或結果，先開可及頁內確認區。確認後才導航；取消回原連結焦點，不清除欄位。新語言頁是新草稿，不承諾跨語保留。

## 可及性與互動

- 所有欄位有持續可見的 label、就近 help/error 和明確單位。數字用文字 input 加 `inputmode="numeric"`，避免 number input 自動接受小數/指數字串；欄位以核心嚴格驗證為準。
- 所有工作可用鍵盤完成；DOM 順序與視覺順序一致；focus ring 清楚且不被 sticky 區遮住。新增/刪除、範例、清除、確認、提交和報告文字都可鍵盤操作。
- 每次輸入改變立刻清結果；IME composition 的輸入也先清舊結果，但組字中不重寫欄位、不觸發驗證/計算/焦點移動，`compositionend` 後使用者才可提交。
- 初始載入無 JavaScript 時，資料欄位和試算按鈕維持 disabled；沒有可 GET 提交的 form。noscript 提示啟用本頁程式，不能宣稱資料可以保存或離線使用。
- 結果狀態以簡短 `role="status"` 通知；錯誤以欄位關聯和合適 live region 宣告，不一次朗讀 30 列報告。文字報告是 readonly textarea，保留完整內容和可選取性。
- 尊重 `prefers-reduced-motion`。不使用自動動畫；不支援彩色獨立狀態。
- 驗收目標 WCAG 2.2 AA。對比、200% 縮放、320 CSS px、IME、純鍵盤和輔助科技須依 ACCEPTANCE 分層記錄；焦點事件未解除前所有本機互動 UI 均為 `NOT_RUN_USER_FOCUS_INCIDENT`。

## SEO 文案

這些是預定可索引正式頁的文案，不代表目前已有網域或排名。M1 預覽對兩頁都設 noindex/nofollow，不提交 sitemap，不提供 production canonical。

| 欄位 | 繁中頁 `/index.html` | 英文頁 `/en/index.html` |
|---|---|---|
| `lang` | `zh-Hant` | `en` |
| title | `補貨數量試算｜Gloss Tools` | `Restock Quantity Planner \| Gloss Tools` |
| description | `用觀測用量、現貨、到貨天數、安全備量與每包數量，估算補貨包數、到貨前短缺與現貨可用整天數。` | `Estimate restock packs, possible shortage before arrival, and whole days of stock from observed use, current stock, lead time, reserve, and pack size.` |
| H1 | `算出這次要補幾包` | `Plan how many packs to restock` |
| 導言 | `填入已知期間用量和現貨，檢視固定平均耗用假設下的補貨估算。` | `Enter observed use and current stock to review a restock estimate under a fixed-average-use assumption.` |

正式候選預定為 `https://restock.glossquote.com/index.html` 與 `https://restock.glossquote.com/en/index.html`。只有 M2 才能在 production 檔加入兩頁 self-canonical、reciprocal `hreflang="zh-Hant"` / `hreflang="en"` 和 `x-default` 指向中文頁。robots/sitemap 只列實際預定兩頁並允許必要頁面資產；404 設 noindex。兩頁有繁中/英文互連、visible FAQ 與對應 WebApplication JSON-LD；CSP 僅對 JSON-LD 加精確 hash，無 `unsafe-inline`、`unsafe-eval`、外部資產或第三方連線。具體 M2 gate 依 `docs/RELEASE.md`。

### 繁中 FAQ（須在頁面可見）

1. **這個工具怎麼算出建議補幾包？** 先用觀測期間總用量估固定平均耗用，再計入到貨前天數、到貨後希望涵蓋的天數與安全備量，扣掉現貨，最後依每包單位數向上取整。它是依輸入假設的估算，不是需求預測。
2. **如果觀測用量是 0，還會計算嗎？** 會。用量為 0 時不估算現貨可用整天數；安全備量仍會納入目標，所以仍可能需要補貨。
3. **在途訂單會扣進現貨嗎？** 不會。此版只看目前現貨，不處理在途訂單或多倉庫；耗用改變時，固定平均估算也可能不符合實際情況。

### English FAQ (visible on page)

1. **How does the planner estimate the number of packs?** It estimates a fixed average from observed use, includes lead time, desired coverage after arrival and safety reserve, subtracts current stock, then rounds up to whole packs. It is an estimate from your inputs, not a demand forecast.
2. **Can it calculate when observed use is zero?** Yes. Stock runway is not estimated at zero use. Safety reserve still counts toward the target, so an order may still be suggested.
3. **Are incoming orders included in current stock?** No. This version uses current stock only and does not handle incoming orders or multiple warehouses. A changing usage rate may make the fixed-average estimate inaccurate.

## M2 搜尋與發布限制

不宣稱搜尋量、排名、需求或節省金額。M2 必須從實際候選檔重驗 canonical、雙語互連、x-default、可見且匹配的 FAQ/WebApplication JSON-LD、CSP hash、robots、兩頁 sitemap、404 noindex、安全標頭和 `dist-production/` allowlist。M3 才由主代理部署並更新雙語首頁。來源發布不等於 live site；外部驗收狀態依實際證據填寫。
