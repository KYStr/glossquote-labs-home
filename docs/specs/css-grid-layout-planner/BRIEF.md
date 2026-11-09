# CSS Grid 區塊配置表 — 製作說明書任務 brief

產品識別：`css-grid-layout-planner`。本件只交付一份可由非作者核對的完整製作規格，不是工具實作、品質通過或部署。

## 1. 受眾與可觀察成果

讓製作簡單網頁區塊、活動頁或小型儀表板的人，以明確的列／行起訖線配置矩形區塊，先看跨格與留白，再取得可核對的 CSS。成功流程是：設定網格→逐塊設定位置→發現並修正超界或重疊→產生真 CSS Grid 預覽與位置清單→複製或下載同一結果 CSS。需求頻率未經用戶研究，不假稱已有流量或市場驗證。

產品限於明確、非重疊的靜態矩形配置；不是自動排版或自動設計整個網站。使用者仍負責頁面的語意、原始碼順序、內容與可及性。

## 2. 範圍與硬邊界

- 原生 HTML/CSS/ESM、Node.js 24+ 內建模組，零 runtime／開發外部依賴；純靜態、無服務、無帳號、無遙測、無應用持久化、無輸入上傳。
- 繁體中文與英文完整同功能頁；明確產生結果，編輯立即令舊結果失效。
- 1–6 欄、1–6 列；列高 24–160 CSS px；欄列共用間距 0–32 CSS px；1–12 個矩形區塊。欄為等比例，列為固定像素，不接受自由 CSS。
- 區塊使用正整數 row-start、column-start、row-end、column-end；終點不含，必須在明確網格內。所有數值 raw 格式、長度與首錯順序由完整規格固定，不偷偷截斷、夾值或自動補齊。
- 不接受重疊是本工具的產品限制，不宣稱 CSS Grid 本身不允許重疊。空白格合法。調小網格不能偷偷移動、刪掉或縮小既有區塊。
- 增刪、上下移動來源順序與數字欄位皆有可見鍵盤操作；不能只靠拖曳。視覺座標改變不代表閱讀／Tab 順序改變，介面需明示。
- 結果包含真 CSS Grid 預覽、區塊序號／座標／跨度對照，以及固定 selector 的確定 UTF-8 CSS。只輸出 CSS，不把輸入當 HTML 或 style 原文執行；使用範例須區分結構示例與可下載輸出。
- 固定寬度預覽放在具名局部捲動區，不將整頁撐出窄視窗；清楚說明輸出不是自動響應式設計或實際內容適配保證。
- 不做 implicit tracks、自動放置、named areas、subgrid、巢狀網格、媒體查詢、自由 selector、HTML 匯入／匯出、圖片、Canvas、PNG、列印、拖曳必需流程、最佳化排列或內容測量。
- 剪貼簿只由明確按鈕寫入，不讀取；下載只由明確按鈕啟動。結果失效與已啟動下載的有限 URL lease 必須分開，規格不得同時承諾立即撤銷與下載一定已接收。失敗、晚到 promise、連按、hidden/pagehide 都有可觀察定義。
- 本件不建立新 repo、網站、domain、workflow、部署、費用、憑證、權限或軟體授權。公開 source 不等於授權他人任意使用。

## 3. 與既有項目的去重依據

已核公開 catalog 的 56 個項目、共用 registry 的 72 份規格及既有 PR。保留所有既有 owner；reserved 不當成 ready，也不重做首次盤點。

| 最接近方向 | 已有用途與輸出 | 本件不同的必要流程 |
| --- | --- | --- |
| 物品標籤列印 | 名稱／份數展開到四種固定紙張標籤，使用瀏覽器列印 | 使用者逐塊指定網頁跨格座標，輸出 CSS；無紙張或列印 |
| 照片聯絡表 | 圖片按順序排縮圖，輸出 PNG 與檔名索引 | 不讀圖片，不自動排滿；任意明確矩形跨度、留白與重疊拒絕 |
| 箱內排列容量試算 | 實體尺寸與固定朝向的三維規則格容量 | 不計實體容量或搜尋朝向，處理瀏覽器二維 CSS 版面 |
| 線性漸層／卡片陰影 | 色彩或陰影外觀與 CSS | 本件改變區塊位置／跨度，不改塗繪效果 |
| Option Matrix | 全選項的笛卡兒積列舉 | 不列舉組合或排名，而是有限座標配置 |

固定來源：主頁基線 [README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)；近似本地來源保存 commit `be197ea30d909b1353e7f77bdf16b1811ac41f71` 中 `coordination/local/2026-10-29/specs/{30-label-printer,33-box-fit,45-image-contact-sheet}/SPEC.md`；目前目錄 [catalog](https://github.com/KYStr/glossquote-labs-home/blob/eed6e533c077ffc351f0f015836f314d4e37a31e/catalog.json)。來源保存不是其產品的新驗收，也不變更其責任。

技術基礎：[W3C CSS Grid Level 1，2025-03-26 固定版本](https://www.w3.org/TR/2025/CRD-css-grid-1-20250326/)，用於明確線座標、track/gap 與來源順序語義。標準不規定本產品的欄列數、重疊拒絕或匯出格式，這些是本規格自己的有限決策。

## 4. 必交完整規格八節

1. goal：受眾、問題、可觀察成功與非目標。
2. scope：包含／排除、固定來源及逐項用途差異；不靠改名湊庫存。
3. userFlow：初始、編輯、增刪／來源排序、產生、修錯、取出、清除與語言離開、重複操作。
4. inputsOutputs：精確 raw/schema、端點、矩形線座標與重疊判定、首錯優先、確定 CSS／UTF-8／MIME／檔名與錯例。
5. implementation：純核心／controller／DOM 邊界、真 CSS Grid 與安全 sink、資源生命週期、雙語／可及性、離線可建及命令。
6. acceptance：下列九個未來產品面向各有方法、預期與可反駁證據；逐項至少 90 且必要檢查完整，未測 NOT_RUN。
7. tests：獨立 expected、端點與相鄰、跨度／鄰接／重疊、縮網格、排序、晚到 callback、真桌面 CSS 幾何／鍵盤／下載。
8. handoff：固定候選、作者自查與 open draft PR；非作者八節布林完整度核；修訂保留歷史。文件 ready 不等產品 accepted；製作另取合法 production claim。

未來產品面向固定為 `functionality`、`boundaries`、`privacy`、`security`、`usability`、`accessibility`、`localization-seo`、`toolchain-provenance`、`compatibility`。每項必須有同候選實證，不能以純函式測試代真 CSS、原生剪貼簿／下載、輔助工具或首次使用觀察，不能用平均分補足低項。

## 5. 交付方式

在本 repo 的 `docs/specs/css-grid-layout-planner/` 交付 `SPEC.md` 與 `AUTHOR-CHECK.md`，由非作者核對。完整規格需固定小型可手算例、明確失敗／恢復與雙語文案，不能把決策推給下一位製作者。未實作不得寫產品測試通過。新提供作者程式碼若有，逐非空行附具體中文說明；不改第三方來源雜湊。所有產品檔只包含必要產品內容，不放私人路徑、執行識別、對話或秘密。
