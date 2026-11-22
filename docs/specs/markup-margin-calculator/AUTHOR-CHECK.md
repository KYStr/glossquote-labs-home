# 加價率與毛利率換算 — 作者檢查

2026-11-11 維護紀錄。由獨立維護任務 `labs-five-hour-repair-pricing-20261111` 修訂，原作者及承接記錄見 [PR #243 的固定作者核對](https://github.com/KYStr/glossquote-labs-home/blob/1d5de750bf4371a81c1c8d8b57bf38fceea19d66/docs/specs/markup-margin-calculator/AUTHOR-CHECK.md)。下列更新為維護者自查，須由非作者在固定新候選上重審。

原作者署名見上方固定版本，run 5 補庫概念 #20。本文件是作者本人對文件的核對，明確不是獨立審查；ready 與否由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- §6 已預宣告九個產品面向與必要證據；本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。
- 差異比對（設計層級）：discount-calculator 與 percentage-calculator 為單一金額百分比／折扣運算，無雙率恆等式與售價反解；breakeven-calculator 求損益平衡數量與營收，不反推售價；rational-arithmetic 為通用分數運算，無定價語義；bakers-percentage-calculator 為配方比例。registry 層級的查重由統籌在登記時核實，本人未執行 registry 指令。
- 精確運算沿用分帳計算機（bill-split-calculator，本批 run 5 規格）的先例：金額以整數分、百分比以千分之一百分比（milli）表示，全程 BigInt，roundHalfUp 只用於比例顯示，兩個求解的售價由精確值向上取整至分。本案在此之上新增兩個釘版決定：(1) 百分比結果以百分之一（hundredths）表示、負值捨入遠離零（roundRatio），使低於成本的負毛利率對稱捨入；(2) 目標毛利率 ≥100% 釘版為語意狀態 NO_SOLUTION，與值域 RANGE 分開——150.5% 是完全合法的百分比輸入，只是方程式無有限解，此區別以 `solve-margin-hundred`、`solve-margin-over-hundred` 兩案釘版。
- 本案無外部法規、費率表或官方公式來源：加價率 ＝ 利潤 ÷ 成本、毛利率 ＝ 利潤 ÷ 售價為通行會計定義，已在 SPEC 釘版為恆等式；對照表每一列由恆等式推導（見下），未抄錄任何外部表格。維護的最低分位規則依本次任務契約，並用精確有理數驗算。

## Fixture 雙重推導（手算＋獨立重算）

原候選的三套作者核對留在上方固定版本。此版的字面值先用下列整數分與分數推導，再以離線文件驗算器核對 38 個核心案例和 3 個狀態模型案例。百分比 milli 為百分比×1000，hundredths 為百分比×100。

| 案例 | 手算 |
| --- | --- |
| `report-basic` | 利潤 10000−8000＝2000；加價 2000/8000＝25.00%（2500）；毛利 2000/10000＝20.00%（2000）。 |
| `report-repeating-markup` | 利潤 1000；加價 1000/3000＝33.333…% → 3333；毛利 1000/4000＝25.00%（2500）。 |
| `report-repeating-margin` | 利潤 2000；加價 2000/7000＝28.5714…% → 2857；毛利 2000/9000＝22.222…% → 2222。 |
| `report-below-cost` | 利潤 7999−10000＝−2001；加價 −2001/10000＝−20.01%（−2001）；毛利 −2001/7999＝−25.0156…%，絕對值捨入 → −2502。belowCost=true。 |
| `report-free-price` | 利潤 −5000；加價 −5000/5000＝−100.00%（−10000）；售價 0，毛利率無定義 → null。belowCost=true。 |
| `report-zero-profit` | 利潤 0；兩率皆 0；belowCost=false。 |
| `report-half-tie` | 利潤 4；加價 4/16000＝0.025% → 以 hundredths 計恰 2.5，遠離零進位 → 3；毛利 4/16004＝0.024994…% → 2。 |
| `report-extreme-ratio` | 利潤 99,999,998；加價 99999998/1 → 999,999,980,000（精確整數）；毛利 99999998/99999999 ＝ 99.999999…% → 顯示 10000（100.00%），精確值恆 ＜100%，SPEC 與 FAQ 已揭露。 |
| `solve-markup-basic` | 售價 8000×(100000＋25000)/100000＝10000；利潤 2000；毛利 2000/10000＝2000。 |
| `solve-markup-repeating` | m＝33333，門檻＝1333.33 分。售價 1333→1334，毛利 333→334，marginHundredths 2498→2504；新增 actualMarkupHundredths 3340。1333 分時加價 33.3% 未達 33.333%。 |
| `solve-markup-zero` | m＝0；售價＝成本 4500；利潤 0；毛利 0。 |
| `solve-markup-tie` | 售價 2×125000/100000＝2.5，向上取整 → 3；利潤 1；毛利 1/3＝33.333…% → 3333。 |
| `solve-markup-large` | 售價 12345678×107500/100000＝13,271,603.85 → 向上取整得 13271604；利潤 925926；毛利 925926/13271604＝6.9762…% → 698。 |
| `solve-margin-basic` | 售價 8000×100000/80000＝10000；利潤 2000；加價 2000/8000＝2500。 |
| `solve-margin-half` | 售價 5000×100000/50000＝10000；利潤 5000；加價 5000/5000＝100.00%（10000）。對照表 50 ↔ 100 的同一列。 |
| `solve-margin-repeating` | k＝33333；售價 1000×100000/66667＝1499.925… → 1500；利潤 500；加價 500/1000＝50.00%（5000）。 |
| `solve-margin-zero` | k＝0；售價＝成本 4500；利潤 0；加價 0。 |
| `solve-margin-high` | k＝99900；售價 1000×100000/100＝1,000,000（成本千倍），毛利 999,000，加價 99900.00%（9,990,000），實際毛利 99.90%（9990）。 |
| `solve-markup-one-cent-target`／`solve-margin-one-cent-target` | 精確門檻分別 5/4、4/3 分。2 分售價的兩個實際率為 100.00% 和 50.00%；1 分為 0.00% 和 0.00%，皆低於目標。 |
| `solve-margin-zero-min-cost` | 目標 0%、精確門檻 1 分，故最低價 1 分。0 分的毛利率無法定義，整數不等式 0 < 1 證明較低價格不足。 |
| `solve-markup-ceil-over-cap` | 99,992,000 × 100008 / 100000 = 99,999,999.36 分，向上整為 100,000,000，超過上限 99,999,999。 |
| `solve-margin-hundred` | k＝100,000 ≥ 100,000 → NO_SOLUTION/marginPercent（字串與值域合法，非 RANGE）。 |
| `solve-margin-over-hundred` | k＝150,500 ≥ 100,000 → NO_SOLUTION/marginPercent（同上）。 |
| `solve-markup-price-over-cap` | 售價 99,999,999×101000/100000＝100,999,998.99 → 100,999,999 ＞ 上限 99,999,999 → RANGE/markupPercent（計算後檢查）。 |
| `solve-margin-price-over-cap` | k＝99,999 ＜ 100,000 可解；售價 99,999,999×100000/1＝9,999,999,900,000 ＞ 上限 → RANGE/marginPercent（計算後檢查）。 |

既有成功求解的目標 milli 意義與另一實際率欄保留；全部 10 筆均新增對應的 actualMarkupHundredths 或 actualMarginHundredths。除 `solve-markup-repeating` 上表列出的數值，既有成功求解及 report 的其他原欄位數值不變。

錯誤案例逐筆以手算核對釘版驗證順序：`cost-zero`（"0" 文法通過、分值 0＜1 → RANGE/cost）；`cost-over-range`（"9999999.99" 為 10 單元在容量內、文法通過、999,999,999 分＞上限 → RANGE/cost）；`cost-format`（"10.005" 小數 3 位＞2 → DECIMAL_FORMAT/cost）；`percent-format`（"33.3333" 小數 4 位＞3 → DECIMAL_FORMAT/markupPercent）；`percent-range`（"999999.99" 為 9 單元＝容量、文法通過、999,999,990 milli＞99,999,999 → RANGE/markupPercent）；`percent-empty`（"" 容量與 surrogate 先過 → EMPTY/marginPercent）；`price-input-limit`（"12345678901" 為 11 單元＞10 → INPUT_LIMIT/price，先於文法與範圍）；`mode-enum`（"REPORT" 非列舉 → ENUM/mode）；`schema-extra-field`（多出 currency 鍵 → SCHEMA，field=null）；`schema-mode-mismatch`（report 模式 price=null 且 markupPercent 非 null → 一致性 SCHEMA，field=null）。三個 controller 案例沿用 `report-basic` 的 input/result 逐字對應，狀態轉移與預設值已逐項核對。

對照表雙重推導：加價率 ＝ 毛利率 ÷（100 − 毛利率）逐列手算——10% → 1/9＝11.11%；20% → 1/4＝25.00%；25% → 1/3＝33.33%；30% → 3/7＝42.86%；40% → 2/3＝66.67%；50% → 1＝100.00%；60% → 3/2＝150.00%；70% → 7/3＝233.33%；75% → 3＝300.00%；80% → 4＝400.00%；90% → 9＝900.00%；95% → 19＝1900.00%；0% → 0——再以 Fraction 腳本重算 hundredths（1111、2500、3333、4286、6667、10000、15000、23333、30000、40000、90000、190000）逐列一致。本表為推導結果，未抄外部表格。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN。未固定候選或未獨評前不計 ready。
