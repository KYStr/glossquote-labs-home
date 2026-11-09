# CSS 線性漸層產生器規格任務

產品方向：Linear Gradient Builder。文件日期：2026-10-30。

本件只交付一份可獨立審查的工具製作規格，不是產品實作、部署或已可用工具。用途是讓網站維護者用明確的角度、色彩與停止點位置，組合可重現的 CSS 線性漸層背景；不用手寫任意 CSS，也不宣稱能自動評估對比或無障礙。

## 固定來源與範圍

- 主頁來源：[README 固定基線](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。
- 本次觀察的目錄：[catalog](https://github.com/KYStr/glossquote-labs-home/blob/dd059fc489ffc79c64754182ce09bc84151ae054/catalog.json)。目錄不是可承接預案庫存。
- 最新登記檢查已查至 revision 306；新工作仍須以真正最新 revision 和 blob CAS 登記、承接並讀回。舊工作的 owner、claim 與保留項不改。
- 最近似既有規格：[Color Palette](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/10-color-palette/SPEC.md) 以不透明單色轉換、平面兩色對比、色票變數及 color/background-color 配對輸出為主；FAQ 明確排除漸層。本件不複製它的調色盤或對比計算。
- [圖片縮放](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/09-image-resizer/SPEC.md)、[圖片疊合校稿](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/53-image-overlay/SPEC.md) 處理使用者圖片並輸出點陣圖；[圖片列印尺寸](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/31-print-size/SPEC.md) 做尺寸/PPI 試算。本件無圖片輸入、像素編輯或列印計算。
- 預計核心：有限數量不透明 HEX 色彩停止點、明確位置和角度、正常可見預覽、確定格式 CSS 複製及下載；完整規格須將所有限制、錯誤順序、同位置停止點及修改失效行為定義到可直接實作。
- 不含帳戶、雲端上傳、任意 CSS 匯入、外部素材、圖像匯出、動畫、徑向或重複漸層、透明度、色彩對比認證、自動調色、新服務或費用。不要用微小改名擴張成另一個色票工具。

## 本規格任務完整驗收

下列八項是文件完整度面向，不是未製作產品的品質分數。作者須提供具體正文、例子、對照及自查；不同的 reviewer 以同一固定候選逐項審查，每項至少 90 且必要檢查完整才可 accepted。ready 另依協議由非作者明確核定，作者不可自報。

| ID | 必須交付的證據 |
| --- | --- |
| goal | 明確受眾、真實問題、成功條件與非目標；僅一份實用未消耗工具預案。 |
| scope | 包含/排除功能及與最新 catalog、registry 用途/流程/輸入輸出差異矩陣；固定可讀來源，不搶既有 owner、不靠改名重複。 |
| userFlow | 桌面正常使用完整旅程、取消、錯誤恢復及重複操作；無帳戶/API/費用或新服務。 |
| inputsOutputs | 精確格式、容量、邊界、編碼、有效/無效例與資料生命週期；可直接實作核對。 |
| implementation | 明確靜態架構及模組、雙語/可及性/隱私安全、依賴限制與直接實作步驟。 |
| acceptance | 完整 functionality/boundaries/privacy/security/usability/accessibility/localization-seo/toolchain-provenance/compatibility 方法、預期與證據；未測 null/NOT_RUN；桌面必要，無資源手機/裝置不擅加門檻。 |
| tests | 最小充分有效/無效/邊界/競態資料及必要原生 GUI 證據，區分純測與體驗；不捏造 PASS 或用數量代替品質。 |
| handoff | GitHub 固定 document/source commit、待實作與驗收方式，引用可讀無私人路徑秘密；不同非作者核完整八節才 ready，不自評/部署/catalog。 |

## 文件交接界線

交付路徑為本 repo 的 `docs/specs/linear-gradient-builder/SPEC.md` 和 `AUTHOR-CHECK.md`，以固定 commit、開啟的 draft PR、相同預案 ID 和完整原驗收交接。規格的產品驗收須列齊九面向；純核心測試、測試替身與正常瀏覽器觀察不能互代。未測標示 NOT_RUN，不能因暫時缺裝置刪除桌面必要要求。

本 brief 固定後才能登記規格任務並取得唯一 claim。製作需在規格真正 ready 後另建 production task、明允 executor、承接並讀回；這份 brief、文件完成或規格 claim 都不等於產品開工或發布權限。後續若有新的相近工作，先比對而不是搶走原責任。
