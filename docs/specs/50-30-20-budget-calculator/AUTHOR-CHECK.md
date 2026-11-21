# 50/30/20 預算分配 — 作者檢查

作者 `muse subagent (run 6 spec author, session f5cd6071-5cf1-4cae-8667-b37fa51268ae)`，來源工作 run 6 規格寫作（概念第 37 條）。作者文件核對，待非作者 readiness。本任務未跑任何 registry / coordination 指令，登記由家長做。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 checkout 的既有預案：最相近的 grocery-budget-calculator、retirement-withdrawal-calculator、rent-budget、subscription-budget、debt-payoff-planner 與 compound-interest-calculator 差異見 scope 節。其中 grocery-budget-calculator 與 retirement-withdrawal-calculator 為本輪第 11、12 條平行概念，本 checkout 尚無其規格，故 scope 節只記名稱與實質差異，未附連結；compound-interest-calculator 連結以本 checkout HEAD 的實際 blob SHA 引用。
- 比例來源已核實：Elizabeth Warren 與 Amelia Warren Tyagi《All Your Worth: The Ultimate Lifetime Money Plan》（2005），50% 需求（must-haves）、30% 想要（wants）、20% 儲蓄（savings），基數為稅後收入；最低應繳金額歸需求、超額還款歸儲蓄／還債，與公開二手來源一致。概念筆記未與來源衝突，無需更正。
- 15 筆字面核心案例、3 筆 controller 案例，共 18 筆。

## 手算推導（第一種方法）

通用規則：exact = income × pct / 100；每月金額 = exact 四捨五入至整數元（half-up）；餘差 residual = income − 三類四捨五入後合計，必為 −1、0 或 +1，≠ 0 時加到 exact 最大的類別，並列最大時依需求、想要、儲蓄／還債順序；每年 = 每月 × 12；difference = actual − target；actualPercent = actual / income × 100，四捨五入至小數 1 位；unallocated = income − 三類 actual 之和。

- `default-split`：60000 × 50% = 30000；× 30% = 18000；× 20% = 12000；合計 60000，residual 0。每年 30000 × 12 = 360000、18000 × 12 = 216000、12000 × 12 = 144000。
- `odd-income-rounding`：33333 × 50% = 16666.5 → 16667；× 30% = 9999.9 → 10000；× 20% = 6666.6 → 6667；合計 33334，residual −1；exact 最大為需求 16666.5，需求 16667 − 1 = 16666。每月 16666 / 10000 / 6667，合計 33333。每年 199992 / 120000 / 80004。
- `custom-split-rounding-up`：10001 × 33% = 3300.33 → 3300；× 33% = 3300.33 → 3300；× 34% = 3400.34 → 3400；合計 10000，residual +1；exact 最大為儲蓄 3400.34，儲蓄 3400 + 1 = 3401。每月 3300 / 3300 / 3401，合計 10001。每年 39600 / 39600 / 40812。
- `custom-split`：80000 × 60% = 48000；× 25% = 20000；× 15% = 12000；合計 80000，residual 0。每年 576000 / 240000 / 144000。
- `custom-split-tie-break`：10001 × 40% = 4000.4 → 4000；× 40% = 4000.4 → 4000；× 20% = 2000.2 → 2000；合計 10000，residual +1；需求與想要 exact 並列最大 4000.4，依順序調整需求，需求 4000 + 1 = 4001。每月 4001 / 4000 / 2000，合計 10001。每年 48012 / 48000 / 24000。
- `actuals-on-track`：目標 25000 / 15000 / 10000（見 default-split 算法，50000 × 50% / 30% / 20%）。差異：24000 − 25000 = −1000（under）；14000 − 15000 = −1000（under）；11000 − 10000 = +1000（over）。實際占比：24000 / 50000 = 48.0%；14000 / 50000 = 28.0%；11000 / 50000 = 22.0%。合計 actual 24000 + 14000 + 11000 = 49000；unallocated 50000 − 49000 = 1000，status under。
- `actuals-over-needs`：目標 45000 × 50% = 22500；× 30% = 13500；× 20% = 9000。差異：27000 − 22500 = +4500（over）；12000 − 13500 = −1500（under）；6000 − 9000 = −3000（under）。實際占比：27000 / 45000 = 60.0%；12000 / 45000 = 26.666…% → 26.7%；6000 / 45000 = 13.333…% → 13.3%。合計 45000；unallocated 0，status balanced。
- `actuals-overspend`：目標 20000 / 12000 / 8000。差異：22000 − 20000 = +2000（over）；15000 − 12000 = +3000（over）；8000 − 8000 = 0（on-target）。實際占比：55.0% / 37.5% / 20.0%。合計 45000；unallocated 40000 − 45000 = −5000，status over。
- `small-income`：1000 × 50% = 500；× 30% = 300；× 20% = 200。每年 6000 / 3600 / 2400。
- `actuals-partial`：目標 30000 / 18000 / 12000。只填需求：32000 − 30000 = +2000（over）；32000 / 60000 = 53.333…% → 53.3%。想要、儲蓄 variance 為 null；totals 為 null。
- `max-income`：100000000 × 50% = 50000000；× 30% = 30000000；× 20% = 20000000。每年 600000000 / 360000000 / 240000000。
- `income-decimal-rejected`：income 原始字串 `12345.67` 含小數點，非 ASCII 整數字串，文法 INTEGER_FORMAT，field income。
- `percent-sum-mismatch`：50 + 30 + 25 = 105 ≠ 100，跨欄 PERCENT_SUM，field null。
- `zero-income`：income `0` 在範圍 1–100000000 之外，RANGE，field income。
- `percent-out-of-range`：needsPct `101` 在範圍 0–100 之外，RANGE，field needsPct。

## 第二種方法獨立重算

以 Python `Fraction` 精確分數運算從頭實作同一組釘版規則（half-up 捨入、餘差調整至 exact 最大類別、並列依需求→想要→儲蓄順序、每年 × 12、差異與 1 位小數占比），逐案比對 fixtures.json 的 expected（腳本 `/tmp/recalc-503020.py`，非產品程式、非手算表）：11 個 ok 核心案例全數 PASS，0 失敗；4 個錯誤案例的錯誤碼與欄位以人工逐欄對照驗證順序規則（容量 → 空值 → 文法 → 範圍 → 合計），與腳本跳過（script 僅印出 SKIP-verify-by-hand）一致。3 個 controller 案例為狀態機 checkpoint 描述，無數值推導，逐欄人工核對 draft / lateResult / afterReset 與核心案例一致。

## 其他

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
- 餘差範圍附註：以整數收入與三類比例計，residual 恆為 −1、0 或 +1（手算時由每類捨入誤差 |error| ≤ 0.5、三類合計 |Σerror| ≤ 1.5 且 residual 為整數推得；預設 50/30/20 下 residual 只會是 −1 或 0，+1 需自訂比例才出現，見 `custom-split-rounding-up` 與 `custom-split-tie-break`）。
