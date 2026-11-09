# 中央來源、接續手冊與40份預案：交付總表

庫存與工作狀態觀測：registry **r945**。文件 ready 且未消耗 **42 份**，其中本輪新增 **40 份**；新增40件製作task明確允許本地與雲端，尚無承接者。不是40個已完成網站。

| 交付項目 | 結果 | 來源／證據 |
| --- | --- | --- |
| 單一來源與接續手冊 | 已合併，共用repo可以直接閱讀保存來源 | [PR71](https://github.com/KYStr/glossquote-labs-home/pull/71) · [修訂獨審](../../reviews/consolidation-20261109/PR71-7a0e9bf.md) |
| A組20份資料／文件／開發預案 | 八節獨審後ready | [PR72](https://github.com/KYStr/glossquote-labs-home/pull/72) · [獨立審查](https://github.com/KYStr/glossquote-labs-home/blob/8b01db023d77f7f1ef7a5b9d4361cd718745c8a6/docs/reviews/stock-a-20261109/INDEPENDENT-REVIEW-a5e7356.md) |
| B組20份日常／活動／手作預案 | 八節獨審後ready | [PR73](https://github.com/KYStr/glossquote-labs-home/pull/73) · [獨立審查](https://github.com/KYStr/glossquote-labs-home/blob/e611748399179ad2a8eaee5ca86d7eb4f91b7aab/docs/reviews/consolidation-20261109/SPEC-STOCK-B-c8edde6.md) |
| 40件製作工作 | 來源／brief／九面向固定；local-codex、cloud-dot皆允許 | [機器可讀清單](stock-handoff.json) · [可用庫存](../../READY-STOCK.md) |
| 歷史產品／正式網站 | 本輪沒有重新驗收或部署 | [原owner、候選與阻塞](../../WORK-STATUS.md) |

## 怎樣接著做

先讀 [START-HERE](../../../START-HERE.md) 和 [完整接續說明書](../../AGENT-HANDBOOK.md)。以最新GitHub registry取得本人ACK、claim與精確readback，再到 `tools/<slug>/` 製作；每人預領至5件、同時1件working。新工具不再建立獨立repo。舊工具依 [來源遷移規則](../../SOURCE-LAYOUT.md) 由原owner移入，舊repo不刪除、不封存。

每份預案附 SPEC、BRIEF、fixtures、AUTHOR-CHECK。作者檢查內的draft／NOT_RUN是寫作時的真實紀錄；目前文件ready以registry及非作者審查為準，產品NOT_RUN仍保留。核心、雙語、取消／過期輸出、實際隔離瀏覽器、隱私、SEO與正式發布各有必要gate。

## 主代理核對

- 主代理與非作者各自從公開固定候選乾淨來源驗證：5,237份保存檔案、38,516,492 bytes；166組來源／目的地tree可追溯。完整候選5,309個Git blobs核實。此數不含後續新增40預案，亦非產品測試數。
- 首頁／協作／只讀索引51項唯一測試、靜態check、preview build與6產物byte核對通過；只重跑受影響檢查。來源完整性和文件審查不冒充產品瀏覽器驗收。
- 初審發現13份已追蹤dist檔漏傳，補齊後重新從公開乾淨副本通過。另對齊18個原repo root tree和9個目錄的10份既有審查附檔歸屬。保留原FAIL與新PASS證據。
- A組換行工具修正雙BOM／輸出超限的無條件冪等敘述；B組找零配置修正兩代同時保留的狀態上限。兩者均交回原作者，非作者核對新固定head。
- 本輪共365件字面案例（A205、B160），供未來實作獨立對照；不是已跑365項產品測試。各審查報告逐項區分閱讀、獨立算例與NOT_RUN。
- Git設定及Windows持久環境前後指紋保持不變；沒有操作桌面、IME、剪貼簿或本機互動瀏覽器。

## 本地／雲端合作與保留事項

- 最新雲端任務板policy revision14仍為ready門檻40、每人5預領／1working；統籌採用回報屬self_report，未當成實際執行證據。這是讀回觀測，沒有替雲端簽收或派工作。
- 對照本輪起點69個既有open PR，截止本輪檢查沒有新head差異。八組歷史本地／雲端重複來源皆保留；本輪未重做其產品或更換owner。
- 原11/03退修、必要瀏覽器／正式站Network及Storage／真機缺口依原task繼續；本輪文件整理不將它們結案。
- 原雲端統籌下一次須重讀新入口及最新登記；已允許的40件新製作可依其自身高優先工作與實際claim接續，沒有宣稱已自動啟動。
- 本輪只移入可審查來源，沒有做D槽搬遷或刪除既有本地資料；不要把來源整合當作5GB磁碟清理。

## 委派紀錄

兩位規格作者實際以 subagent 工具啟動，要求 `gpt-6.1-sol`／`max`，各20件並交叉獨審；主代理負責架構、來源整合、實際diff核對、獨立驗證及最終交接。工具接受的要求設定可確認，backend模型身分未有獨立遙測可確認。沒有以角色提示詞冒充模型切換。

## 本輪新增預案

| 功能 | 固定預案ID | 製作task | 文件 |
| --- | --- | --- | --- |
| Unicode 鍵值碰撞檢查 / Unicode Key Collision Audit | `spec-unicode-key-collisions-20261109` | `labs-prod-unicode-key-collisions-20261109` | [SPEC](../../specs/unicode-key-collisions/SPEC.md) |
| 文字偏移位置互查 / Text Offset Map | `spec-text-offset-map-20261109` | `labs-prod-text-offset-map-20261109` | [SPEC](../../specs/text-offset-map/SPEC.md) |
| 文字檔換行與 BOM 檢查 / Text File Line Ending Audit | `spec-text-file-line-endings-20261109` | `labs-prod-text-file-line-endings-20261109` | [SPEC](../../specs/text-file-line-endings/SPEC.md) |
| 小數欄位清洗 / Decimal Column Parser | `spec-decimal-column-parser-20261109` | `labs-prod-decimal-column-parser-20261109` | [SPEC](../../specs/decimal-column-parser/SPEC.md) |
| 頻次加權百分位查詢 / Frequency-weighted Percentile | `spec-weighted-percentile-20261109` | `labs-prod-weighted-percentile-20261109` | [SPEC](../../specs/weighted-percentile/SPEC.md) |
| 表格候選鍵健檢 / Table Candidate Key Audit | `spec-candidate-key-audit-20261109` | `labs-prod-candidate-key-audit-20261109` | [SPEC](../../specs/candidate-key-audit/SPEC.md) |
| JSON Patch 離線預檢 / JSON Patch Preflight | `spec-json-patch-preflight-20261109` | `labs-prod-json-patch-preflight-20261109` | [SPEC](../../specs/json-patch-preflight/SPEC.md) |
| Markdown 章節連結檢查 / Markdown Section Link Audit | `spec-markdown-anchor-audit-20261109` | `labs-prod-markdown-anchor-audit-20261109` | [SPEC](../../specs/markdown-anchor-audit/SPEC.md) |
| 單檔文字補丁預檢 / Single-file Unified Patch Check | `spec-unified-patch-check-20261109` | `labs-prod-unified-patch-check-20261109` | [SPEC](../../specs/unified-patch-check/SPEC.md) |
| 固定位元組欄位拆解 / Fixed-width Record Slicer | `spec-fixed-width-slicer-20261109` | `labs-prod-fixed-width-slicer-20261109` | [SPEC](../../specs/fixed-width-slicer/SPEC.md) |
| 二進位記錄欄位檢視 / Binary Record Inspector | `spec-binary-record-inspector-20261109` | `labs-prod-binary-record-inspector-20261109` | [SPEC](../../specs/binary-record-inspector/SPEC.md) |
| 記錄序號與時間缺口檢查 / Log Sequence and Time Gap Audit | `spec-log-gap-audit-20261109` | `labs-prod-log-gap-audit-20261109` | [SPEC](../../specs/log-gap-audit/SPEC.md) |
| 重試時間預算試算 / Retry Time Budget Planner | `spec-retry-budget-20261109` | `labs-prod-retry-budget-20261109` | [SPEC](../../specs/retry-budget/SPEC.md) |
| 模組依賴冗餘檢查 / Module Dependency Reduction | `spec-dependency-reduction-20261109` | `labs-prod-dependency-reduction-20261109` | [SPEC](../../specs/dependency-reduction/SPEC.md) |
| 兩兩覆蓋測試矩陣 / Pairwise Test Matrix | `spec-pairwise-test-matrix-20261109` | `labs-prod-pairwise-test-matrix-20261109` | [SPEC](../../specs/pairwise-test-matrix/SPEC.md) |
| 數值區間覆蓋檢查 / Numeric Range Coverage Audit | `spec-range-coverage-audit-20261109` | `labs-prod-range-coverage-audit-20261109` | [SPEC](../../specs/range-coverage-audit/SPEC.md) |
| SemVer 版本順位比較 / SemVer Precedence Comparison | `spec-semver-precedence-20261109` | `labs-prod-semver-precedence-20261109` | [SPEC](../../specs/semver-precedence/SPEC.md) |
| 設計間距 Token 對照 / Design Spacing Token Audit | `spec-spacing-token-audit-20261109` | `labs-prod-spacing-token-audit-20261109` | [SPEC](../../specs/spacing-token-audit/SPEC.md) |
| 封存成員路徑預檢 / Archive Member Path Preflight | `spec-archive-path-preflight-20261109` | `labs-prod-archive-path-preflight-20261109` | [SPEC](../../specs/archive-path-preflight/SPEC.md) |
| 路由樣式交疊檢查 / Route Pattern Overlap Audit | `spec-route-overlap-audit-20261109` | `labs-prod-route-overlap-audit-20261109` | [SPEC](../../specs/route-overlap-audit/SPEC.md) |
| 相框掛點定位 / Frame Row Marking | `spec-frame-row-marking-20261109` | `labs-prod-frame-row-marking-20261109` | [SPEC](../../specs/frame-row-marking/SPEC.md) |
| 窗簾同花位落剪 / Curtain Pattern Cuts | `spec-curtain-repeat-cut-20261109` | `labs-prod-curtain-repeat-cut-20261109` | [SPEC](../../specs/curtain-repeat-cut/SPEC.md) |
| 收銀盤留款清點 / Cash Float Tray | `spec-cash-float-tray-20261109` | `labs-prod-cash-float-tray-20261109` | [SPEC](../../specs/cash-float-tray/SPEC.md) |
| 同行群分桌 / Party Table Seating | `spec-table-seating-20261109` | `labs-prod-table-seating-20261109` | [SPEC](../../specs/table-seating/SPEC.md) |
| 交換禮物配對 / Gift Exchange Match | `spec-gift-exchange-match-20261109` | `labs-prod-gift-exchange-match-20261109` | [SPEC](../../specs/gift-exchange-match/SPEC.md) |
| 包裹計費重核對 / Parcel Billable Weight | `spec-parcel-billable-weight-20261109` | `labs-prod-parcel-billable-weight-20261109` | [SPEC](../../specs/parcel-billable-weight/SPEC.md) |
| 試織花樣針數表 / Knit Gauge Pattern Planner | `spec-knit-gauge-planner-20261109` | `labs-prod-knit-gauge-planner-20261109` | [SPEC](../../specs/knit-gauge-planner/SPEC.md) |
| 洗烘兩機接續表 / Laundry Machine Handoff | `spec-laundry-machine-handoff-20261109` | `labs-prod-laundry-machine-handoff-20261109` | [SPEC](../../specs/laundry-machine-handoff/SPEC.md) |
| 澆水補壺路線 / Watering Can Refill Route | `spec-plant-watering-route-20261109` | `labs-prod-plant-watering-route-20261109` | [SPEC](../../specs/plant-watering-route/SPEC.md) |
| 活動借用周轉檢查 / Loan Kit Turnover Check | `spec-loan-kit-turnover-20261109` | `labs-prod-loan-kit-turnover-20261109` | [SPEC](../../specs/loan-kit-turnover/SPEC.md) |
| 底片張數配置 / Film Roll Frame Budget | `spec-film-roll-budget-20261109` | `labs-prod-film-roll-budget-20261109` | [SPEC](../../specs/film-roll-budget/SPEC.md) |
| 單車齒比與展開表 / Bicycle Gear Rollout Table | `spec-bicycle-gear-table-20261109` | `labs-prod-bicycle-gear-table-20261109` | [SPEC](../../specs/bicycle-gear-table/SPEC.md) |
| 活動票本連號盤點 / Event Ticket Range Check | `spec-event-ticket-ranges-20261109` | `labs-prod-event-ticket-ranges-20261109` | [SPEC](../../specs/event-ticket-ranges/SPEC.md) |
| 單場散打輪轉板 / Drop-In Court Queue | `spec-court-queue-rotation-20261109` | `labs-prod-court-queue-rotation-20261109` | [SPEC](../../specs/court-queue-rotation/SPEC.md) |
| 聚會回合計分表 / Game Night Scorecard | `spec-game-night-scorecard-20261109` | `labs-prod-game-night-scorecard-20261109` | [SPEC](../../specs/game-night-scorecard/SPEC.md) |
| 多站取件時窗路線 / Pickup Window Route | `spec-pickup-window-route-20261109` | `labs-prod-pickup-window-route-20261109` | [SPEC](../../specs/pickup-window-route/SPEC.md) |
| 桌遊牌套庫存分配 / Card Sleeve Stock Fit | `spec-card-sleeve-fit-20261109` | `labs-prod-card-sleeve-fit-20261109` | [SPEC](../../specs/card-sleeve-fit/SPEC.md) |
| 串珠花樣用量與順序 / Bead String Pattern | `spec-bead-string-pattern-20261109` | `labs-prod-bead-string-pattern-20261109` | [SPEC](../../specs/bead-string-pattern/SPEC.md) |
| 工作室次數費用交會表 / Studio Visit Fee Breakpoints | `spec-service-block-breakpoints-20261109` | `labs-prod-service-block-breakpoints-20261109` | [SPEC](../../specs/service-block-breakpoints/SPEC.md) |
| 活動備用電池替換表 / Event Battery Swap Plan | `spec-battery-swap-plan-20261109` | `labs-prod-battery-swap-plan-20261109` | [SPEC](../../specs/battery-swap-plan/SPEC.md) |
