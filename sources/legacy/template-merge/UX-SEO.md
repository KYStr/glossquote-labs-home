# 介面與搜尋資料：批次文字套版

狀態：規格，尚未實作。Surface mode：Product App。M1 頁面使用 `noindex,nofollow`，沒有正式 canonical/sitemap；`templates.glossquote.com` 只作候選 slug，不代表已部署。

## 搜尋文案

**繁中 title：** 批次文字套版｜依名單產生個人化通知  
**繁中 description：** 貼上 CSV 名單和通知範本，逐筆預覽個人化文字，找出缺值後下載 TXT 或 JSON；不會寄送訊息。  
**繁中 H1：** 一份通知，逐人套入名單

**English title:** Personalize Text from a CSV List | Preview Every Message  
**English description:** Add a CSV list and a `{{column}}` template, review each generated message, and download text or JSON. Nothing is sent.  
**English H1:** Turn one template into reviewed messages

## 桌面與手機工作區

桌面 Wide：

```text
┌──────────── 批次文字套版 ───── zh-TW | 名單未載入 ──────────────┐
│步驟：名單 / 範本 / 預覽│               編輯與預覽工作區       │ 欄位用法│
│ 1 名單                │ 名單 CSV [選擇檔案]                     │ {{姓名}}│
│ 2 範本                │ 範本編輯器                              │ 只支援  │
│ 3 檢查與產生          │ 您好{{姓名}}，編號{{ID}}                 │字面代入 │
│                       │ 欄位：姓名 · ID                         │         │
│                       │ 缺值 0；未知欄位 0                      │         │
│                       │ [產生 120 筆預覽]                       │         │
├───────────────────────┼─────────────────────────────────────────┤
│ 篩選/筆序 1–120       │ 第 1 筆 / 120 · 預覽文字                 │
│                       │ [複製這筆] [下載 TXT] [下載 JSON]        │
└───────────────────────┴─────────────────────────────────────────┘
```

手機 Compact：

```text
┌ 批次文字套版 ─ 狀態 ┐
│名單 → 範本 → 預覽   │
│ [選 CSV 名單]       │
│ 範本 textarea       │
│ 偵測欄位 / 缺值     │
│ □ 允許空白代入      │
│ [產生預覽]          │
├────────────────────┤
│ 第 1 / 120 筆       │
│ 內容（可換行）      │
│ [複製這筆]          │
│ [TXT] [JSON]        │
└────────────────────┘
```

手機使用可見步驟切換，但名單與模板的改動狀態常駐，核心功能不藏在手勢。預覽是畫布最大區；欄位清單為可收合 inspector，資訊與 textarea 間距充足。

## 狀態文案

Idle：「選一份 CSV 名單，或先輸入範本。」；loaded：「已讀取 120 筆、4 欄。」；validating：「正在檢查模板欄位和空值…」；needs-input：「3 筆缺少 Email。修正 CSV，或明確允許空白代入。」；running：「正在產生第 200 / 800 筆…［取消］」；success：「已產生 120 筆；尚未傳送任何訊息。」；empty：「CSV 只有標題列，沒有可產生的資料。」；blocked：「模板用了未知欄位「地址」，請改成現有欄名。」；stale：「範本或名單已改，舊預覽已作廢。」；copy fail：「無法直接複製；請選取下方文字後複製。」

## 無障礙與使用方式

所有欄位有可見 label；模板編輯器有固定說明、字數及錯誤關聯。模板可能很長，以 `textarea` 直接編輯，Tab 不被自製快捷鍵攔截。用按鈕上一筆／下一筆替代拖動；生成狀態只做摘要 live region，避免逐筆播報。UI 不自動寫 clipboard、不自動下載或傳訊。

目標 320px 無頁面水平捲動，200% zoom 保留欄位和預覽；主要觸控區 44×44px，focus ring 可見、正文對比 ≥4.5:1，尊重 reduced motion。預覽遇 `<script>`、`<img>` 類字串只顯示原文，不建立 DOM 元素。

## FAQ

### 繁體中文

**範本支援條件句或自動判斷嗎？** 不支援；只做 `{{欄名}}` 的一次字面代入。  
**資料會自動寄出嗎？** 不會。工具只建立可檢查、可下載或單筆複製的文字。  
**有空白欄位會怎樣？** 預設整批暫停並列出缺值；你可以先修正名單，或明確選擇讓空值代入空字串。

### English

**Does the template support conditions?** No. It performs one literal substitution for each `{{column}}` field.  
**Will messages be sent automatically?** No. You review, copy, or download the text yourself.  
**What happens to blank cells?** Generation is blocked by default and the missing rows are listed. You may explicitly allow blanks to become empty text.

## Browser gate

Node can verify CSV parsing, template compilation, exact single-pass substitution and limits. Real checks for keyboard editing, clipboard permission fallback, reflow, zoom, copy buttons and download remain **NOT_RUN_USER_FOCUS_INCIDENT** pending primary confirmation of an isolated browser mechanism. Never mark these PASS from Node tests.
