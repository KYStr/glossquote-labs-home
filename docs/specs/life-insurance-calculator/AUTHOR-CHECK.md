# 壽險保額試算 — 作者檢查

作者為 run-6 規格作者（subagent），來源工作為家長指派的 run-6 規格寫作（概念第 38 條）。作者文件核對，待非作者 readiness；作者不稱本文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已讀 `docs/SPECIFICATION-STOCK.md` 與 `docs/specs/retry-budget/`（SPEC.md、BRIEF.md、fixtures.json、AUTHOR-CHECK.md），格式與之對齊：同樣的狀態表、錯誤碼（EMPTY／INPUT_LIMIT／INTEGER_FORMAT／RANGE）、下載 canonical JSON 規則、九面向 acceptance 表、三個 controller 案例。
- 已比對 run-6 去重紀錄（RUN-STATUS.md）：最相近的 nhi-premium-calculator（算應繳健保費）、compound-interest-calculator、savings-goal、retirement-withdrawal、50-30-20-budget、rent-budget、mortgage-amortization、debt-payoff-planner、salary-converter 的實質差異寫進 scope 節。nhi-premium-calculator 在本次 checkout 的 `docs/specs/` 與 `tools/` 均未出現，故 scope 只以 slug 指名並以功能區分，未偽造連結；compound-interest-calculator 與 mortgage-amortization 以相對路徑連結（兩者確實存在於本次 checkout）。

## 數字推導：手算與第二種方法

主公式（SPEC inputsOutputs §2–§4）：`incomeReplacement = 年收入 × 扶養年數`；`educationTotal = 每位教育費 × 扶養人數`；`needsTotal = 收入替代 + 房貸 + 其他負債 + 喪葬費 + 教育總額`；`totalOffsets = 現有保障 + 可動用資產`；`recommendedCoverage = max(0, needsTotal − totalOffsets)`；`multipleBenchmark = 年收入 × 10`；`differenceVsBenchmark = 建議保額 − 對照值`；建議為 0 時狀態 covered，否則 shortfall。

手算（每案逐項加總，第一種推導）：

- typical-family：1,200,000×10=12,000,000；教育 500,000×2=1,000,000；需求 12,000,000+3,000,000+200,000+350,000+1,000,000=16,550,000；扣抵 1,000,000+500,000=1,500,000；建議 15,050,000；對照 12,000,000；差距 +3,050,000。
- single-no-dependents：600,000×5=3,000,000；需求 3,000,000+0+100,000+350,000+0=3,450,000；建議 3,450,000；對照 6,000,000；差距 −2,550,000。
- already-covered：900,000×10=9,000,000；教育 300,000×1=300,000；需求 9,000,000+1,000,000+0+350,000+300,000=10,650,000；扣抵 8,000,000+3,000,000=11,000,000；建議 max(0, −350,000)=0；對照 9,000,000；差距 −9,000,000；covered。
- zero-income：收入替代 0；教育 500,000×2=1,000,000；需求 0+2,000,000+500,000+350,000+1,000,000=3,850,000；扣抵 100,000；建議 3,750,000；對照 0；差距 +3,750,000。
- max-years-many-dependents：2,000,000×40=80,000,000；教育 1,000,000×10=10,000,000；需求 90,000,000；建議 90,000,000；對照 20,000,000；差距 +70,000,000。
- exact-offset-match：需求 10,000,000；扣抵 10,000,000；建議 0；對照 10,000,000；差距 −10,000,000；covered。
- all-zero：各項皆 0；建議 0；對照 0；差距 0；covered。
- max-income-one-year：需求 99,999,999；建議 99,999,999；對照 999,999,990；差距 99,999,999−999,999,990=−899,999,991。
- zero-years-with-debts：收入替代 0；教育 200,000×3=600,000；需求 0+500,000+50,000+350,000+600,000=1,500,000；建議 1,500,000；對照 12,000,000；差距 −10,500,000。
- 錯誤案例手算：decimal-income（年收入含小數 → INTEGER_FORMAT）、negative-debt（負號 → INTEGER_FORMAT）、years-out-of-range（41 > 40 → RANGE）、dependents-out-of-range（11 > 10 → RANGE）、empty-mortgage（空白 → EMPTY）、income-too-long（9 位數 → INPUT_LIMIT，容量先於範圍）。

第二種推導：獨立 Python script（`/tmp/recalc-life-insurance.py`，未進版本庫）從公式與驗證規則重新實作 `run(input)`（欄位順序、EMPTY → INPUT_LIMIT → INTEGER_FORMAT → RANGE、BigInt 等價的 Python 整數運算），讀 `fixtures.json` 逐案比對。第一次比對抓出 1 處手算錯誤：decimal-income 原寫年收入 `"1200000.5"`（9 字元），按「容量先於文法」的釘版順序應為 INPUT_LIMIT 而非手算寫的 INTEGER_FORMAT；已將該案輸入改為 `"120000.5"`（8 字元，過容量、犯文法），重跑後 15 個核心案例 0 處不符，JSON 亦通過 `json.tool` 驗證。

## 出處核對與概念修正紀錄

- 10 倍年收入法則：LIMRA／Life Happens 2021 Insurance Barometer Study 新聞稿原句「A good rule of thumb is consumers should have 10 times their salary」，已查核，URL 釘版於 SPEC scope 節。
- DIME 公式：Debts + Income×年數 + Mortgage + Education，見 Sophia Learning 與 4LifeInsurance 指南，已查核；扣抵現有保障與可動用資產是該等來源所述的標準調整（非 DIME 經典公式本身），SPEC scope 節已明示此區分。
- 喪葬費用預設 NT$350,000：內政部《臺閩地區殯葬消費行為調查研究》國人平均治喪費用約 35 萬元（經陽光禮儀文章引述），已查核；SPEC 寫明此為可改寫的預設值、不是法定金額。
- 概念修正（依簡報規則「概念筆記與可驗證來源衝突時跟來源走」及家長任務書的擴充概念）：原始概念第 38 條寫「income-replacement method pinned, e.g. 10× annual income rule」；家長任務書將概念擴充為需求法主算法（年收入、扶養人數／年數、現有負債、現有保障與資產）。本規格以需求法為主算法，10 倍法則保留為 LIMRA 出處的對照值、明確不參與建議保額；DIME 變體採納，因同一批來源支持其加總結構與扣抵調整。無通膨／折現為刻意簡化，已釘版於 scope 與 FAQ。

## 案例數與未驗項

- 18 筆字面案例：15 筆核心（9 筆正常／邊界、6 筆錯誤）＋ 3 筆 controller（state-dirty-error、state-cancel-late、state-replace-late，沿用 retry-budget 的 checkpoint 形狀，輸入改為本工具欄位與預設值）。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
