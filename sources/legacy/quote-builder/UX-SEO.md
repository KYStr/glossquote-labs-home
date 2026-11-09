# 介面與搜尋規格：報價單快速製作

狀態：規格，尚未實作。產品介面採 Product App 模式，畫面以報價草稿和實際預覽為主。正式 URL 尚未核定；本地候選及 dist 必須 `noindex`，不得假設 canonical、sitemap 或 production 網域。

## 雙語頁面文字

### 繁體中文

- `title`: `報價單快速製作｜Gloss Tools`
- `description`: `輸入雙方名稱、品項、數量、單價和自訂折扣，預覽並下載靜態 HTML 報價單與 JSON。計算在此頁完成；不提供稅務判斷或發票。`
- `H1`: `把品項整理成一份清楚的報價`
- 副標：`填入明確金額與自訂稅率，先檢查預覽，再下載給客戶。`
- 主按鈕：`產生預覽`；成功後：`下載 HTML`、`下載 JSON`；修改後：`預覽已過期，請重新產生`。
- 資料提示：`報價只在這個頁面處理。下載由你明確啟動；關閉頁面會清除目前草稿。`

FAQ：

1. **這會替我確認稅率嗎？** 不會。稅率由你輸入；工具只按你輸入的數字計算，不判斷是否適用。
2. **下載的是發票嗎？** 不是。HTML 和 JSON 是你自行填寫的報價資料，不包含發票、簽章或法律效力判斷。
3. **修改品項後，舊報價還能下載嗎？** 不行。來源一改，預覽和舊下載連結立即失效；重新產生後才能下載新版。

### English

- `title`: `Simple Quote Builder | Gloss Tools`
- `description`: `Enter parties, line items, quantities, prices, a fixed discount, and an explicit rate. Preview and download a static HTML quote and editable JSON. No tax advice or invoice claims.`
- `H1`: `Turn line items into a clear quote`
- Supporting text: `Enter the amounts and rate you choose, review the quote, then download it for your client.`
- Primary action: `Create preview`; ready actions: `Download HTML`, `Download JSON`; changed draft: `Preview is out of date. Create it again.`
- Data notice: `Your draft stays in this page. Downloads start only when you choose them; closing the page clears the draft.`

FAQ:

1. **Does this verify my tax rate?** No. You enter the rate; the tool only calculates from that value and does not determine whether it applies.
2. **Is the download an invoice?** No. The HTML and JSON are quote data you entered. They do not provide an invoice, signature, or legal validity check.
3. **Can I download the old quote after editing?** No. Editing invalidates the preview and its download links. Create a new preview before downloading again.

## 工作區線框

Desktop（Product App；預覽是主要產物，表單就近編輯）：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 報價單快速製作 / Simple quote builder       草稿：編輯中   語言切換 │
├──────────────────────────────────────┬───────────────────────────────┤
│ 輸入工作區（約 40%）                  │ 報價預覽（約 60%，主畫布）   │
│ 出價方 ______   客戶 ______           │ 出價方 → 客戶                │
│ 幣別 [TWD]                            │ 品項    數量 單價 金額       │
│ 品項  說明     數量   單價  刪除      │ …                            │
│ 01    ______  _____  _____  [移除]    │ 小計                 0.00   │
│      [+ 加一列]                       │ 折扣                 0.00   │
│ 折扣 ______  自訂稅率 ______          │ 自訂稅率 / 稅額       0.00   │
│ 備註 _________________________        │ 合計                 0.00   │
│ [產生預覽] [匯入 JSON]                │ 備註 …                      │
│                                      │ [下載 HTML] [下載 JSON]     │
└──────────────────────────────────────┴───────────────────────────────┘
```

Mobile（`<48rem`；工作區單欄，功能由明確頁籤切換，不隱藏）：

```text
┌──────────────────────────────┐
│ 報價單快速製作     語言切換  │
│ [編輯報價] [預覽報價]        │
├──────────────────────────────┤
│ 出價方 ______                │
│ 客戶   ______                │
│ 品項 1                       │
│ 說明 __________________      │
│ 數量 ______  單價 ______     │
│ [+ 加一列]                   │
│ 折扣 ______  稅率 ______     │
│ 備註 __________________      │
│ [產生預覽]                   │
│                              │
│ 預覽頁：完整直向報價內容     │
│ [下載 HTML] [下載 JSON]      │
└──────────────────────────────┘
```

在手機上主操作不可被虛擬鍵盤或固定列遮住；不以橫向雙欄表格要求兩維捲動。項目欄位標籤在輸入後仍可見；表格若較窄則每列改成垂直欄位組，不裁掉刪除操作。

## 狀態、鍵盤與版面

- 初始空白：提供一個空白項目和「加入品項」；不顯示假報價範例冒充真資料。
- 編輯：所有變更均在記憶體；預覽失效狀態文字與下載按鈕同步更新。
- 驗證錯誤：摘要連結至錯誤欄位；提交後可聚焦第一個錯誤，但不搶走正在輸入的焦點。
- 匯入中/待確認：顯示檔案讀取狀態、「取消匯入」，以及將取代草稿的明確確認；取消保留原值。
- 預覽就緒：合計置於預覽區明顯位置；下載按鈕緊鄰預覽。下載失敗說明可重試，不展示舊 Blob。
- 無法產生：欄位錯誤或產物 bytes 超限，明確說明整批無下載。
- 鍵盤順序為出價方→客戶→幣別→品項列（說明/數量/單價/刪除）→總額欄位→備註→產生→預覽/下載。新增列後焦點移至新列說明。
- 所有操作有可見雙層 focus，標籤不以 placeholder 取代；錯誤同時有文字與圖示，不只靠顏色。觸控控制至少 44×44 CSS px；320px 寬及 200% zoom 保留所有欄位與操作；尊重 `prefers-reduced-motion`。
- 使用共通 `docs/DESIGN-SYSTEM.md` tokens，不引入外部字型、圖示、遠端圖片、追蹤或抽象 hero。任務畫布承載真正預覽，品牌欄收斂。

## 搜尋與發布界線

- 路徑候選：`/quote/`，英文 `/quote/en/`（最終路徑由主代理確認）；M1 雙語 HTML 互鏈但兩頁皆 `noindex,nofollow`。
- M1 不設定 production canonical、hreflang、sitemap，也不宣稱正式網站。待主代理確定正式 URL 及發布授權後，才按共通發布規格新增 metadata。
- title/description/H1 兩語各自對應實際功能；不宣稱稅務合規、法律效力、保證節省時間或任何未驗證排名/支援度。
- 真正瀏覽器下載、HTML 開啟外觀、手機尺寸及 200% zoom 由有隔離的 browser gate 驗證。依目前工作區指示，此項先記 `NOT_RUN_USER_FOCUS_INCIDENT`；Node DOM、靜態檔或 HTTP 測試不能替代。
