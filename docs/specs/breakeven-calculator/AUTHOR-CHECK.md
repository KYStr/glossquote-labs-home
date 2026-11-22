# 損益平衡計算 — 作者檢查

2026-11-11 維護紀錄。由獨立維護任務 `labs-five-hour-repair-pricing-20261111` 修訂，原作者及承接記錄見 [PR #240 的固定作者核對](https://github.com/KYStr/glossquote-labs-home/blob/77b72cb74db4cae3bba2c4c1bff7cae5dbc63639/docs/specs/breakeven-calculator/AUTHOR-CHECK.md)。下列更新為維護者自查，須由非作者在固定新候選上重審。

作者：run 5 規格作者（cloud-dot 子代理；登記、claim 與 submit 由家長代理處理，作者未執行任何 registry/coordination 指令）。作者文件核對，待非作者 readiness。本文件不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。格式對照 `docs/SPECIFICATION-STOCK.md` 與模板規格 `docs/specs/retry-budget/`。
- 查重：在本分支 `docs/specs/` 全部 101 個目錄中無 breakeven／損益平衡既有規格。最接近者 compound-interest-calculator、mortgage-amortization（時間價值，無成本結構）、meeting-cost-calculator（時間成本，無售價與打平銷量）的實質差異已寫入 SPEC 的 scope。同批 sibling markup-margin-calculator 只做單一單位成本↔售價比率換算、無固定成本與銷量維度，差異亦已寫明。

## 設計決定（概念備註未定或需調和處）

- **兩個營收都報**：理論營收（F×P/M，假設可賣小數單位）與整數單位營收（ceil 後單位 × 售價）並列，關係釘版：未捨入理論值 ≤ 整數單位值、差 < 一個售價、理論銷量恰整數時相等。理由：只報理論值會讓使用者低估實際需要的營收；只報整數值會看不出進位吃掉多少。
- **邊際貢獻兩個都報**：單位邊際貢獻（金額，整數分精確、無捨入）與邊際貢獻率（百分比，R(q,2)），因率是損益平衡推導的中間量且定價討論常用。
- **進位規則**：損益平衡銷量恆無條件進位（ceil），並在 SPEC 與 FAQ 釘版理由：U ≥ 1 時少賣一件有 (U−1)×M < F，仍虧損。這些成功案例驗證不變式 (U−1)×M < F ≤ U×M。
- **錯誤分類調和**：概念備註把「price ≤ variable cost」標為 NO_BREAKEVEN；本規格依家長錯誤分類釘版單一語義碼 `NO_MARGIN`（field=null 的整份語義結果，不是欄位錯誤，與 RANGE 區分），同一條件不設第二個碼。price = 0 屬欄位 RANGE，先於語義檢查（`price-zero-range` 案例釘版）。
- **fixedCost = 0 且 P > V** → 損益平衡銷量 0、營收 0（不視為錯誤）；expectedUnits = 0 時 percent 安全邊際為 null（除以零無定義），其餘欄位照常；percent 只在 E = 0 時為 null，E = U 時為 `0.00`（`expected-equals-breakeven` 與 `expected-zero` 兩案例對照釘版）。
- **單一捨入規則**：R(q, d) = floor(q×10^d + 1/2)/10^d，全部顯示捨入只套一次、只來自未捨入有理數；負數 tie 向 +∞，與本系列既有規格的 half-up 函數同型。

## 手算推導（第一法，整數分）

- `ceil-rounds-up`：F=12,345,600c、P=40,000c、V=15,000c、M=25,000c。理論銷量 12,345,600/25,000 = 493.824 → 進位 494（493×25,000=12,325,000 < F ≤ 494×25,000=12,350,000）。理論營收 12,345,600×40,000/25,000 = 19,752,960c = 197529.60；整數營收 494×40,000 = 19,760,000c = 197600.00。率 25,000×100/40,000 = 62.5 → 62.50。
- `fractional-cents`：F=100,050c、P=1,999c、V=999c、M=1,000c。率 1000×100/1999 = 50.0250125… → 50.03。理論銷量 100.05 → 101。理論營收 100,050×1,999/1,000 = 199,999.95c → 半進位 200,000c = 2000.00（跨元進位）。整數營收 101×1,999 = 201,899c = 2018.99。
- `ratio-half-up-tie`：M=107c、P=4,000c，率 = 107×100/4,000 = 2.675 恰為 tie → half-up 2.68；精確 half-even 也是 2.68。F=1,070,000c，銷量恰 10,000，兩營收皆 40,000,000c。
- `ratio-half-up-distinguishes-half-even`：F=M=533c、P=20,000c，兩種銷量都是 1、兩種營收都是 200.00。貢獻率 533×100/20,000＝2.665%，half-up 2.67%，half-even 2.66%。
- 四種 NO_MARGIN 以 Q=0 與 Q=2 代入利潤式核對。等價、有固定成本時皆為 −50000.00；等價、零固定成本時皆為 0.00；低價、有固定成本時由 −50000.00 到 −50100.00；低價、零固定成本時由 0.00 到 −2.00。各案保留同一 error envelope。
- 安全邊際三態（同 F=12,000,000c、M=25,000c、U=480）：E=800 → units 320、percent 40.00、profit 800×25,000−12,000,000 = 8,000,000c；E=400 → units −80、percent −20.00、profit −2,000,000c、belowBreakeven true；E=0 → units −480、percent null、profit −12,000,000c。
- 語義與文法案例（NO_MARGIN ×4、RANGE ×2、DECIMAL_FORMAT、EMPTY、INPUT_LIMIT、INTEGER_FORMAT）逐一按 SPEC 釘版的驗證順序手推：容量先於文法（`9999999999.99` 長度 13 → INPUT_LIMIT 而非 RANGE）、文法先於範圍（`100.999` → DECIMAL_FORMAT）、欄位錯誤先於語義（`price=0` → RANGE 而非 NO_MARGIN）。

## 原候選重算與維護驗算

下列 18 個核心案例及三個 controller 案例是原候選作者記錄。維護候選另以文件驗算器核對全部 21 個核心和三個 controller 案例。

- 以另寫的 Python 實作（`fractions.Fraction` 精確有理數，完全照 SPEC 的文法、驗證順序、R 捨入與格式化重寫，未讀取 fixtures 的 expected 產生邏輯）重跑全部 18 個核心案例，與 fixtures.json 逐欄深比對：**18/18 完全一致**。
- 3 個 controller 案例交叉核對：state-cancel-late 的 lateResult 與 state-replace-late 的 olderLateResult 皆等於核心 `ceil-rounds-up` 的 result；state-replace-late 的 newerDraft 重算得 NO_MARGIN；state-dirty-error 的 edit 重算得 RANGE/price。全部通過。
- 每個成功案例在重算時斷言不變式：(U−1)×M < F ≤ U×M（U ≥ 1）、未捨入理論營收 ≤ 整數單位營收、差距 < 售價。全部成立。
- 寫入 fixtures 時曾自查修正一處：`expected-equals-breakeven` 的 percent 初稿誤寫 null，已改為 `0.00`（null 僅限 E=0），重算確認。

## 未執行

產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，九面向分數 null。未經非作者獨評前不計 ready。
