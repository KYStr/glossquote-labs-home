# 酒精濃度估算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory/build5/specs/bac-calculator`（run-5 spec author，父層統籌登記）。作者文件核對，待非作者 readiness；本文不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)，格式對齊 `docs/specs/retry-budget/` 範本與 `docs/SPECIFICATION-STOCK.md`。
- 查重：checkout 內 101 份既有預案無酒精／BAC 類；最相近的 caffeine-half-life（咖啡因、指數半衰期、無法定門檻）差異已寫入 SPEC scope。
- 字面案例 16 筆：13 核心（6 成功＋7 錯誤）＋3 controller。產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。

## 來源查證（2026-11-09 檢索，官方／出版來源）

**重要更正（概念備註錯誤）**：概念備註 #15 稱台灣法定參考值為「0.15 / 0.25 / 0.4 mg/L」。查證後現行台灣法規只有兩個濃度門檻，**不存在 0.4 mg/L 這個門檻**：

- 行政：吐氣酒精濃度達每公升 **0.15 mg/L** 或血液中酒精濃度達 **0.03%** 以上不得駕車（道路交通安全規則第 114 條；違反者依道路交通管理處罰條例第 35 條處罰）。來源：新北市政府警察局交通警察大隊「酒駕新規定」、交通部 168 交通安全入口網、國軍退除役官兵輔導委員會「酒後駕車所涉之行政責任及刑事責任」。
- 刑事：吐氣達每公升 **0.25 mg/L** 或血液達 **0.05%** 以上構成刑法第 185 條之 3 不能安全駕駛罪。來源：法務部主管法規查詢系統刑法第 185-3 條現行條文、法務部新北地檢署宣導頁、司法院立法說明。

SPEC 已改以兩個真實門檻釘版 band（below-threshold / administrative / criminal），未採用 0.4。

**吐氣換算比 2000:1 的依據**：法規成對值 0.15 mg/L ↔ 0.03%（=0.3 g/L=300 mg/L 血液，300/0.15=2000）與 0.25 mg/L ↔ 0.05%（500/0.25=2000）精確一致，故 breathMgL = bacGL / 2 不是任意常數，而是法規自身的對應關係。SPEC 已註明此為法規對應換算的參考值，非儀器量測。

**Widmark 常數查證**（與出版來源一致，概念備註無誤）：BAC = A/(r×W) − β×t；r 男 0.68／女 0.55；β = 0.15 g/L/h（= 0.015 %/h）；乙醇密度 0.789 g/ml，A = 容量 ml × ABV × 0.789。多個出版 BAC 方法學頁面（Widmark 1932 為原始出處）數值一致。

## 雙重推導（成功案例先手算，再以獨立腳本重算）

手算（精確分數，A = V × ABV% × 0.789 / 100）：

| 案例 | A (g) | r×W | P (g/L) | B (g/L) | breath | band | minZero / minBelow |
| --- | --- | --- | --- | --- | --- | --- | --- |
| beer-male-peak | 13.8075 | 47.6 | 0.29007… | =P（t=0） | 0.145 | below | ⌈116.03⌉=117 / 0 |
| beer-male-eliminated | 13.8075 | 47.6 | 0.29007… | 0.29007−0.30 <0 → 0 | 0 | below | 0 / 0 |
| wine-female-administrative | 14.202 | 30.25 | 0.46948… | 0.39448… | 0.197 | administrative | ⌈157.79⌉=158 / ⌈37.79⌉=38 |
| spirits-male-criminal | 31.56 | 54.4 | 0.58014… | =P | 0.290 | criminal | ⌈232.05⌉=233 / ⌈112.05⌉=113 |
| multi-drink-mixed | 42.2115 | 33 | 1.27913… | 1.12913… | 0.565 | criminal | ⌈451.65⌉=452 / ⌈331.65⌉=332 |
| just-above-admin | 14.79375 | 47.6 | 0.31079… | =P | 0.155 | administrative | ⌈124.31⌉=125 / ⌈4.31⌉=5 |

獨立重算：另以 Python `fractions.Fraction` 依 SPEC 釘版規則（驗證順序、文法、範圍、精確有理數、half-up 一次捨入、band 以未捨入值判定、分鐘數 ceil(B×400)）重新實作一次，對 fixtures.json 全部 13 個核心案例深度比對——**13/13 一致，0 不符**。錯誤案例（row=2 的 RANGE、13 列 ROW_LIMIT、空陣列 EMPTY、DECIMAL_FORMAT、ENUM、row=1 RANGE、elapsed RANGE）皆由重算腳本依同一驗證順序獨立產生相同 code/field/row。3 個 controller 案例的 lateResult 直接取 beer-male-peak 的 result 字面值，與核心案例互相鎖定。

捨入邊界檢查：6 個成功案例的未捨入 B 距最近的 0.001 捨入界線至少 0.0002 以上（最緊為 multi-drink 的 breath 0.56456…，距 0.5645 界線 0.00006…——以精確分數運算判定，無浮點歧義）；band 判定距 0.3/0.5 門檻最近者為 beer-male-peak（0.29007，距 0.3 有 0.0099）與 just-above-admin（0.31079，距 0.3 有 0.0108），不成對誤判。

## 作者自訂的釘版決定（供 reviewer 注意）

- 全部飲料視為 t=0 一次攝入、即時吸收，是 Widmark 單點推估的標準簡化，已在 scope 與聲明揭露；逐杯時間軸列為非目標。
- band 與分鐘數以未捨入精確值計算，顯示值一次 half-up；SPEC 已要求介面註明此事，避免顯示 0.300 卻屬 below-threshold 的誤讀。
- weightKg 下限 20 kg（成人工具定位）、drinks 上限 12 列、elapsed 上限 1440 分，皆為作者釘版的產品界線，非法規值。
