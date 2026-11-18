# 料理單位換算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（run 5 規格作者）。本文是作者本人對文件的核對，**不是獨立審查**；未經非作者 reviewer 核對前不計 ready。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff，格式對齊 docs/SPECIFICATION-STOCK.md 與範本 docs/specs/retry-budget/。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 鄰近預案差異已寫入 SPEC scope：bakers-percentage（配方比例）、oven-temperature-converter（溫度）、coffee-brew-ratio（粉水比）皆不做通用單位／重量換算，非改名重複。

## 來源查證（2026-11-09）

體積基準有兩組候選，查證後釘版其一並在 SPEC 揭露：

- 採用：1 cup = 240 ml、1 tbsp = 15 ml、1 tsp = 5 ml。來源 FDA 21 CFR 101.9(b)(5)(viii) 家用量測定義；NIST《Metric Kitchen》指南同列此組值供家庭料理使用。三個整數互為倍數（16 tbsp = 1 cup、3 tsp = 1 tbsp），核心可用精確整數運算。
- 不採用：美國習慣單位精確值 1 cup = 236.588 ml、1 tbsp = 14.787 ml、1 tsp = 4.929 ml（NIST SP 811）。已在 SPEC 的 inputsOutputs 與 FAQ 揭露此取捨。

密度表全表同源 King Arthur Baking《Ingredient Weight Chart》（2026-11-09 查證，乾貨 spooned & levelled、紅糖 packed）：水 227、中筋麵粉 120、細砂糖 198、紅糖 213、糖粉 113、奶油 227、植物油 198、蜂蜜 336、可可粉 84、牛奶 227、長米（生）198、燕麥片 89（g/杯）。

- 衝突 1（蜂蜜）：原表以 21 g／tbsp 刊出，×16 = 336；多家二手表寫 340。釘版 336（二手表的 340 無原表出處），SPEC 表值註記已載明。
- 衝突 2（水、牛奶）：原表水為 227 g／杯（以 8 oz 重量計），與 240 ml 水約 240 g 的物理重量不同；部分換算站因此把水改成 237 或 244/245（牛奶）。本表堅持全表同源，釘版原表 227／227，並在 SPEC 揭露；純體積換算不查表，不受影響。
- 模型選擇：原表 g/杯以美國習慣杯量測，本工具套用到釘版 240 ml 杯（差異 ≤ 約 1.4%），已在 SPEC 揭露，未隱藏。

## Fixture 推導（兩種方法，結果一致）

19 筆核心案例（14 成功、5 錯誤）與 3 筆 controller 案例。

- 手算（第一法）：依 SPEC 釘版公式以分數手算。例：tbsp-sugar-to-grams = 15 × 198 / 240 = 12.375 → 半進位 12.38；grams-flour-to-cup-fraction = 100/120 = 0.8333… → 0.83，分數 floor(0.8333×8+0.5) = 7 → 7/8；max-amount-boundary = 100000/240 = 416.666… → 416.67，eighths = 3333 → 416 5/8；grams-honey-to-tbsp = 336 × 240 / 336 / 15 = 16。
- 獨立重算（第二法）：以 Python `fractions.Fraction` 精確有理數另寫一份換算（不共用產品程式碼），對 fixtures.json 逐筆深度比對 value、unit、fractionText、ingredient、gramsPerCup——14 筆成功案例全數相符，0 筆不符。5 筆錯誤案例依 SPEC 釘版的逐欄順序（容量→surrogate→EMPTY→文法／列舉→範圍，跨欄檢查在後）逐筆人工核對錯誤碼與欄位。
- Controller 3 筆的 afterRun／afterEdit／afterRerun 等 checkpoint 沿用範本語義，lateResult 與 SPEC result 五鍵形狀一致。

## 未驗與狀態

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，九面向分數 null。本文只交付文件，未固定產品候選、未獨評前不計 ready。
