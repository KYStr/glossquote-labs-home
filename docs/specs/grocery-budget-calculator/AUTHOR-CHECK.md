# 採買預算試算 — 作者檢查

作者：run 6 規格作者（grocery-budget-calculator，2026-11-21）。作者文件核對，待非作者 readiness；作者不得稱自己的文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 本 checkout 的 docs/specs/ 共 103 份既有規格，其中無 rent-budget 規格檔；scope 節與 rent-budget 的差異敘述依據本輪任務簡報與 RUN-STATUS 的定性（USDA 食物計畫加總 vs 租金負擔能力），未捏造 rent-budget 規格連結。另比對 50-30-20、food-storage-guide、pantry-plan 等鄰近概念，差異已寫進 scope。

## 數據來源核對（2026-11-21 實讀）

- 來源：USDA Food and Nutrition Service「USDA Food Plans: Monthly Cost of Food Reports」頁（2026 年 10 月報告，頁面更新 2026-11-13）。逐字表 A（Thrifty）與表 B（Low-cost）共 30 個每週值、戶人數調整因子（1 人 +20%、2 人 +10%、3 人 +5%、4 人不變、5–6 人 −5%、7 人以上 −10%）、每月換算因子 4.333、以及「成本以最接近的 0.10 美元捨入」皆直接取自該頁原文。
- 獨立交叉核對：Thrifty 參照四口之家（男性與女性 20–50 歲、孩童 6–8 與 9–11 歲）每週合計 73.70 + 58.70 + 48.30 + 55.80 = 236.50 美元，與 USDA 同頁公布的參照家庭每週值 236.50 美元逐字相符。

## 兩種推導（手算 → 腳本獨立重算）

- 方法一（手算）：9 個有效案例的未調整合計、調整後每週總額、每月總額、每人每週／每月平均、每日平均，皆以紙筆級算術逐項算出，寫入 fixtures 前先列出（例如 F9：130.50 × 1.10 = 143.55，恰落兩個 0.10 捨入點中間，half-up 取 143.60；F1：236.50 × 4.333 = 1024.7545，取 1024.80）。
- 方法二（腳本）：以 Python `fractions.Fraction` 精確有理數重算同一批案例（表值、調整因子、4.333 皆以分數／整數分運算，與 SPEC 文字無關的獨立程式，見 /tmp/grocery-recalc.py）。9 個案例的每週總額、每月總額、調整金額、每人平均、每日平均與全部 30 個明細小計，與手算值逐項一致，零差異。
- 每人每月平均另以第二段小程式（Fraction 半捨入到分）驗算：F1 256.20、F2 282.18、F3 383.00、F4 315.45、F5 269.23、F6 230.52、F7 243.70、F8 202.80、F9 311.10，與 fixtures 一致。

## 已揭露的差異（非缺陷）

- USDA 公布的每月金額以未捨入的每週費用計算；本工具每月總額以公布的已捨入每週總額 × 4.333 計算。參照四口之家 Thrifty：USDA 公布每月 1,024.60 美元，本工具 1,024.80 美元，相差 0.20 美元。此差異已寫進 SPEC（inputsOutputs 第 6 步後段）與 FAQ，並非算錯。明細每月小計之和亦可能與每月總額相差 0.10–0.40 美元（F1 相差 0.10 美元），同樣已揭露。
- 概念筆記只說「Thrifty／Low-cost，釘版版本」；作者按簡報規則「概念與可驗證的一手來源衝突時跟來源走」釘為 2026 年 10 月版（撰寫當下 USDA 公布的最新一期），並逐字列出 30 個表值與出處。

## 案例數

- 17 筆字面案例：14 筆核心（9 筆有效、5 筆錯誤）與 3 筆 controller 案例。`reference-family-thrifty` 核對點為「每週 236.50 美元與 USDA 公布值逐字相符」。

## 未驗項

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
- 未跑任何 registry / coordination 指令（登記由家長做）。
