# 碳足跡計算 — 作者檢查

作者為 run 6 規格作者（subagent，分支 `muse/spec-carbon-footprint-calculator-20261121`）。作者文件核對，待非作者 readiness。作者不得稱自己的文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對既有預案。最相近的 `electricity-cost-calculator`（電費計算）與 `fuel-cost-calculator`（油錢計算）實質差異見 scope：本工具算公斤 CO2e，不算錢。
- 15 筆字面案例：12 筆核心、3 筆 controller。`typical-household` 核對點為「典型家戶六類合計 9076.4 公斤 CO2e，飲食占比最大」。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。

## 來源更正（概念筆記 vs 可驗證來源，以來源為準）

1. 概念筆記寫「台灣環保署等官方來源」。實際查核：電力排碳係數由經濟部能源署公布，不是環境部。本文釘版 114 年度（2025 年）民生住宅電力排碳係數 0.471 kg CO2e/度（能源署 2026-06-02 公告）；家戶工具取住宅值，不取公用售電業整體 0.467 或產業 0.466。
2. 飲食牛肉係數：常見引用約 60 kg CO2e/kg 是 Poore & Nemecek (2018) 的中位數附近數值；本文釘版採 Our World in Data 彙整的同一研究全球平均 99.5 kg CO2e/kg（含土地利用變化），並在 SPEC 明示平均與中位數落差及生產方式差異極大。豬肉 12.3、雞肉 9.9、養殖魚 13.6、雞蛋 4.7、米 4.5 同為該研究全球平均。
3. 捷運／鐵路係數：DEFRA 2024 公布值為 0.03546 kg CO2e/延人公里，本文取至 3 位小數 0.035，並在係數表揭露。
4. 飛行係數：採 DEFRA 2024 economy 含輻射強迫（RF 1.9）值，短程 0.153、長程 0.148；短／長程分界為單程 3,700 公里（DEFRA 定義），並在係數表揭露。
5. 油料係數：IPCC 2006 指南預設值為燃燒端 CO2（汽油 2.31、柴油 2.68 kg CO2/公升），不含 CH4／N2O 與開採煉製上游排放，並在係數表揭露。

## Fixture 推導：手算（第一種方法）

係數：用電 0.471；汽油 2.31；柴油 2.68；公車 0.102；鐵路 0.035；短程飛行 0.153；長程飛行 0.148；飲食牛肉 99.5、豬肉 12.3、雞肉 9.9、魚 13.6、蛋 4.7、米 4.5。捨入皆半向上至 1 位小數；總量取未捨入總和捨入，非已捨入類別值之和。

- `typical-household`：用電 300×12×0.471 = 1695.6；車 12000×8÷100 = 960 公升 ×2.31 = 2217.6；公車 1000×0.102 = 102.0；鐵路 2000×0.035 = 70.0；飛行 2000×0.153 = 306.0；飲食：牛肉 0.5×52×99.5 = 2587.0，豬肉 52×12.3 = 639.6，雞肉 52×9.9 = 514.8，魚 26×13.6 = 353.6，蛋 26×4.7 = 122.2，米 104×4.5 = 468.0，小計 4685.2。總量 1695.6+2217.6+102.0+70.0+306.0+4685.2 = 9076.4；公噸 9076.4÷1000 = 9.0764 → 9.1。占比：1695.6÷9076.4 = 18.68% → 18.7；2217.6÷9076.4 = 24.43% → 24.4；102÷9076.4 = 1.12% → 1.1；70÷9076.4 = 0.77% → 0.8；306÷9076.4 = 3.37% → 3.4；4685.2÷9076.4 = 51.62% → 51.6。
- `electricity-only`：250×12×0.471 = 1413.0；總量 1413.0；公噸 1.413 → 1.4；用電占比 100.0，其餘 0.0。
- `all-zero`：六類皆 0，總量 0.0，公噸 0.0，占比皆 0.0（0÷0 以 0.0 計，不產生 NaN）。
- `diesel-car`：20000×6.5÷100 = 1300 公升 ×2.68 = 3484.0；總量 3484.0；公噸 3.484 → 3.5。
- `flights`：短程 1500×0.153 = 229.5，長程 10000×0.148 = 1480.0，合計 1709.5；公噸 1.7095 → 1.7。
- `diet-low-meat`：米 3×52×4.5 = 702.0，蛋 1×52×4.7 = 244.4，合計 946.4；公噸 0.9464 → 0.9。
- `rounding-half-up`：公車 75×0.102 = 7.65 → 半向上 7.7（銀行家捨入會得 7.6，故本案可區分兩種捨入）；總量 7.7；公噸 0.00765 → 0.0。
- `max-electricity`：100000×12×0.471 = 565200.0；公噸 565.2。
- `range-error`：carKmPerYear 500001 > 500000 → RANGE，field carKmPerYear。
- `decimal-format-error`：electricityKwhPerMonth "12.345" 為 3 位小數 → DECIMAL_FORMAT，field electricityKwhPerMonth。
- `empty-error`：electricityKwhPerMonth "" → EMPTY，field electricityKwhPerMonth。
- `bad-fuel-type`：carFuelType "electric" 不在 gasoline／diesel 列舉內 → SCHEMA，field carFuelType。
- 3 筆 controller 案例（`state-dirty-error`、`state-cancel-late`、`state-replace-late`）沿用 retry-budget 的狀態機語義，expected 逐 checkpoint 列出；`state-cancel-late` 與 `state-replace-late` 的 lateResult 即 `typical-household` 的 result（總量 9076.4）。

## Fixture 推導：獨立重算（第二種方法）

以 Python `decimal.Decimal`（ROUND_HALF_UP）寫獨立計算腳本，先算 8 筆成功核心案例，再以第二支驗證腳本讀取 fixtures.json 逐案比對。結果：8 筆成功案例全部 MATCH（含 `rounding-half-up` 的 7.65 → 7.7 與 `typical-household` 六占比 18.7／24.4／1.1／0.8／3.4／51.6）；4 筆錯誤案例為規則判定，不經數值重算；3 筆 controller 案例為狀態 checkpoint 描述，不經數值重算。驗證腳本輸出 `ALL OK`（15 案：12 核心、3 controller）。
