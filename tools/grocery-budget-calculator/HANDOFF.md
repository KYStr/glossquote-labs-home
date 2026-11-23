# Grocery Budget Calculator — HANDOFF

- 工具：採買預算試算 / Grocery Budget Calculator（`tools/grocery-budget-calculator/`）
- 規格：`spec-grocery-budget-calculator-20261121`，規格 PR #379，登記 rev 1742，規格候選 commit `354c16abacab2d9d935667f032f401834f8ccf9f`
- 來源：`~/workspace/glossquote-factory/build6/specs/grocery-budget-calculator/docs/specs/grocery-budget-calculator/`（BRIEF.md、SPEC.md 8 節、fixtures.json 17 筆、AUTHOR-CHECK.md）；`test/fixtures.json` 為規格 fixtures 的逐字複本（SHA-256 `558e6d92bff162c49e04295d8e978e83b841f2d81f3a6ea8298c08cd936e9a4c`）
- 基底分支：`codex/initial-publication`（clone 時 head `8c265267`）；工作分支：`muse/grocery-budget-calculator-production-20261121`
- 實作不走登記系統（照第五輪模式：規格登記用 8 節標準，實作登記要求 9 面向，對不上；直接做、開草稿 PR、逐件核對）

## 實作方式

- 純核心 `public/js/core/grocery-budget.mjs`：USDA 食物計畫表 2026 年 10 月版逐字表 A（Thrifty）與表 B（Low-cost）共 30 個每週值，以整數分寫死；戶人數調整因子與 4.333 皆為精確有理數；捨入只在 SPEC 指定的步驟以整數 half-up 執行一次；不用 `toFixed` 或浮點累加。
- 每週總額由未調整合計 × 調整因子、半捨入到 $0.10；每月總額由每週總額 × 4.333、半捨入到 $0.10（不由明細小計加總）；每人每週／每月與每日平均半捨入到分；明細每月小計為調整前金額 × 4.333、半捨入到 $0.10。
- 驗證順序：`plan` → 15 欄（每欄：容量 8 → surrogate → EMPTY → 文法 → 範圍 0–10）→ 跨欄全戶 1–20 人。`plan` 不在 `{"thrifty","low-cost"}` 為 RANGE；未知／缺欄／錯型別／accessor 為 SCHEMA。
- Worker：`scripts/build.mjs` 把固定核心 + `worker-handler.mjs` 嵌入 `dist-preview/js/worker-source.js`；頁面以 Blob URL 建立 module Worker；controller 以世代號擋晚到回傳；取消／編輯／重設即 terminate。
- 雙語靜態頁 `public/index.html` / `public/en/index.html`（preview noindex、同語 home 連結用 `../../`）；15 組步進器（0–10 人）、Thrifty／Low-cost 單選、全戶人數即時顯示；結果含摘要、分攤明細表、戶人數調整行；下載 `grocery-budget-report.json`（固定檔名、compact JSON、鍵按 UTF-16 排序、一個 LF、2 MiB 上限）。
- 零 runtime 依賴，Node ≥ 24，ESM。

## 驗證（見 VERIFICATION.md）

- `node --test`、`node scripts/check.mjs`、`node scripts/build.mjs --mode preview`（跑兩次 byte-identical）、`node scripts/check-generated.mjs --mode preview`。
- 九面向產品驗收（真實瀏覽器、Network/Storage、Chrome/Edge、200% zoom 等）皆 NOT_RUN：本機無可用隔離瀏覽器機制，須由 reviewer 在隔離環境補驗。

## Errata candidates（規格本身的問題，逐條；未默默改規格）

1. 無算術 errata：9 筆有效核心案例以 Python `fractions.Fraction` 獨立重算（表值、調整因子、4.333 皆以分數／整數分運算），與 fixtures 逐項一致，零差異；另以 BigInt 有理數重算覆蓋全部 15 組 × 兩計畫 × 人數 1／10 與戶人數 1–7、20 的邊界，亦零差異。USDA 參照四口之家每週 236.50 美元與公布值一致；每月 1,024.80 美元與 USDA 公布 1,024.60 美元相差 0.20 美元為 SPEC 已揭露的已知差異，非缺陷。
2. SPEC 未釘 `plan` 欄的容量上限與空字串處理：15 個人數欄明釘 raw 最多 8 單元，但 `plan` 未明釘。本實作取：`plan` 空字串或未知字串皆為 RANGE（`plan` 不在固定枚舉之中即 RANGE，與 SPEC 條文一致）；`plan` 含不成對 surrogate 為 UNICODE（與「先容量、再 surrogate、再該欄文法」的通則一致）；不對 `plan` 套 8 單元 INPUT_LIMIT（該上限的條文只寫在 15 個人數欄）。建議 reviewer 確認此讀法，或由原作者補釘。
3. SPEC userFlow 寫「超過 25 列採 25 列分頁」，但明細最多只有 15 列（15 組年齡／性別），分頁永遠不會觸發。本實作未做分頁（明細區為有 label 的可捲動區域），符合實際列數；若未來組數增加才需分頁。
4. SPEC implementation 節寫 `src/core.mjs` / `src/controller.mjs` / `src/app.mjs`，與任務格式及本輪 house pattern（`public/js/core/*.mjs`、`public/js/controller.mjs`、`public/js/app.js`）不一致。本實作照任務格式與 house pattern，未照 SPEC 的 `src/` 路徑。

## 下一位 owner

- 獨立 reviewer：對同一 PR head 驗九面向（功能、邊界、隱私、安全、可用性、可及性、在地化／SEO、工具鏈／來源、相容性），補真實隔離瀏覽器證據；確認上述 errata candidate 2 的 `plan` 讀法。
- 主代理：整合目錄／發布時才處理正式 canonical、hreflang、sitemap 與正式 origin；本候選保持 preview noindex。
