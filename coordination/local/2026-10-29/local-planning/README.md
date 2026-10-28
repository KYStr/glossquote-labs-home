# GlossQuote-Labs 工具專案藍圖

建立日期：2026-09-23。這是 **12 個獨立工具的開發文件**；不是已完成的工具、網站或可發布套件。品牌方向是各種實用工具，以使用者自己的裝置處理為核心。

2026-10-07更新：[品牌首頁](https://glossquote.com/index.html)、[05單位換算](https://units.glossquote.com/index.html)與[06日期計算](https://date.glossquote.com/index.html)均已正式上線，提供繁中與英文，三個獨立GitHub來源均公開。M11正式發布必要驗收PASS：82項live HTTP檢查、26份公開檔案位元組比對與兩語三站實際導覽通過。其餘10項仍是藍圖。首頁來源位於[00-home](./00-home/README.md)，詳細驗收、版本與人工待驗見[DEPLOYMENT-MILESTONE.md](./DEPLOYMENT-MILESTONE.md)；以下早期藍圖說明不是即時發布狀態。

新工具完成後必須發布其獨立公開GitHub來源、驗收正式網址，再更新00-home/catalog.json的雙語條目並重建及部署首頁。首頁直接產生可供搜尋引擎讀取的HTML，不在使用者瀏覽時查詢其他工具；新工具也需連回同語言首頁。未正式可用的項目保持draft，不顯示成可開啟工具。來源與主機狀態分別寫入各自HANDOFF。

## 怎麼開始

1. 從下表選一個工具。第一次建議選 **05 常用單位換算**，驗證完整的介面、測試與交接流程；也可依興趣選其他第一批工具。
2. 把該工具的**整個資料夾**複製到新的專案目錄。
3. 在新專案打開 START-HERE.md，把裡面的「開工提示」交給實作 LLM。
4. 模型依 TASKS.md 一次完成一項，更新 HANDOFF.md。換模型時先讀交接檔。
5. 驗收完成後才另開發布任務。這批文件沒有決定正式網域、託管服務或商業模式。

資料夾各自帶必要規範，**不需要複製父目錄，也不需要其他工具先完成**。資料夾編號是穩定識別碼，建議順序看「階段」欄及 [ROADMAP.md](ROADMAP.md)。

## 第一批完整藍圖

| 資料夾／開工入口 | 工具 | 類別 | 難度估計 | 階段 |
|---|---|---|---|---|
| [01-text-workbench](./01-text-workbench/START-HERE.md) | 文字整理與統計 | 文字 | 中 | 第一批 |
| [02-json-workbench](./02-json-workbench/START-HERE.md) | JSON 檢查與格式化 | 開發 | 中高 | 第二批 |
| [03-text-diff](./03-text-diff/START-HERE.md) | 逐行文字差異比較 | 文字／開發 | 中 | 第二批 |
| [04-csv-workbench](./04-csv-workbench/START-HERE.md) | CSV 檢視與欄位整理 | 資料 | 中高 | 第二批 |
| [05-unit-converter](./05-unit-converter/START-HERE.md) | 常用單位換算 | 計算 | 低 | 第一批 |
| [06-date-calculator](./06-date-calculator/START-HERE.md) | 日期差與加減天數 | 生活／計算 | 低中 | 第一批 |
| [07-focus-timer](./07-focus-timer/START-HERE.md) | 專注計時 | 時間管理 | 低中 | 第一批 |
| [08-decision-matrix](./08-decision-matrix/START-HERE.md) | 權重決策矩陣 | 規劃／決策 | 中 | 第二批 |
| [09-image-resizer](./09-image-resizer/START-HERE.md) | 圖片縮放與匯出 | 圖片 | 中 | 第二批 |
| [10-color-palette](./10-color-palette/START-HERE.md) | 配色與文字對比檢查 | 設計 | 中 | 第一批 |
| [11-video-to-audio](./11-video-to-audio/START-HERE.md) | 影片取出 MP3 音訊 | 影音 | 高 | 技術驗證後 |
| [12-audio-transcription](./12-audio-transcription/START-HERE.md) | 短音檔本機逐字稿 | 語音／AI | 高 | 技術驗證後 |

「難度」是根據狀態、演算法與外部資產負擔的相對判斷，不是估工承諾或市場研究。11、12 必須先通過文件中的技術驗證閘門；失敗就記錄原因與待決事項，不能用遠端服務偷偷替代。

## 每個資料夾有什麼

| 檔案 | 內容 |
|---|---|
| START-HERE.md | 給你的操作方式與可直接交給其他模型的提示 |
| AGENTS.md | 允許範圍、閱讀順序、實作與安全規則 |
| README.md | 本工具的使用者、價值與 MVP 概要 |
| PRODUCT.md | 需求編號、預設值、規則、上限與非目標 |
| TECHNICAL.md | 目錄、函式、演算法、狀態、來源與限制 |
| UX-SEO.md | 桌面／手機線框、狀態文案、標題、說明與 FAQ |
| ACCEPTANCE.md | 可觀察且具體的測試輸入、預期結果與需求對照 |
| TASKS.md | 逐步任務、前置、可改檔案、命令與完成條件 |
| HANDOFF.md | 未來實作者記錄狀態、證據與接手資訊 |
| docs/BRAND.md | GlossQuote-Labs 的統一品牌承諾 |
| docs/DESIGN-SYSTEM.md | 完整的家族設計系統快照 |
| docs/ENGINEERING.md | 原生 Web／Node 工具鏈、命令與驗證基線 |
| docs/PRIVACY-SECURITY.md | 資料生命週期、下載、取消與網路邊界 |
| project.json | 可機器讀取的名稱、分類、階段與初始狀態 |

目前的 project.json 與 HANDOFF.md 都表示尚未實作。真正進度以後續 HANDOFF.md 的實際證據為準；不要因為文件完整就認定產品完成。

## 品牌基線

**GlossQuote-Labs：為日常問題，製作好用的工具。**

每個工具用直白的功能名稱，採一致的資料與操作原則；不強迫每頁長一樣。首批不做帳號、追蹤、上傳後端、雲端同步與金流。模型／引擎下載與使用者內容分開處理：公開靜態資產可以在明示後下載，工作內容留在本機。

本次沿用現有設計契約的安全、task canvas、無障礙與 token；對外名稱統一為 GlossQuote-Labs。現有 GlossGate 屬另一個開發者工具，本批不改其程式或任務佇列。

## 規劃與品質文件

- [建議開發順序及完成門檻](ROADMAP.md)
- [下一批候選功能](FUTURE-IDEAS.md)
- [本批授權、範圍與驗收](PLANNING-TASK.md)
- [藍圖品質檢查紀錄](QUALITY-REPORT.md)
- [文件撰寫規格](AUTHORING-CONTRACT.md)

在**本藍圖總資料夾**執行文件結構檢查：

~~~powershell
node scripts/validate-blueprints.mjs
~~~

這個命令只讀本資料夾並檢查必要文件、自包含連結與共同規範一致性；不測產品功能、不下載資產、不啟動網站。不需要 npm install。

產品的 npm run dev/test/check/build 是未來 T00 要建立的契約，現在沒有程式可執行。
