# 接案費率試算 — 作者檢查

作者 run 6 規格作者，來源工作 `freelance-rate-calculator` 規格寫作。作者文件核對，待非作者 readiness。作者不得稱自己的文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 已比對本 checkout 的 103 份預案（`docs/specs/`）及 `tools/`。最相近的 salary-converter 在本 checkout 的 `docs/specs/` 與 `tools/` 均未見規格或產品目錄，故 scope 的區分依概念筆記陳述（從目標定費率 vs 已知費率的單位間換算），未附連結；compound-interest-calculator、rent-budget 的差異見 scope。

- 17 筆字面案例：14 筆核心（8 筆成功、6 筆錯誤）與 3 筆 controller 案例。`standard-rate` 核對點為「標準試算」。

## 數字推導（手算，第一種方法）

公式：grossTarget = target × (1 + overhead/100)；billableDays = days × utilization/100；billableHours = billableDays × hoursPerDay；dayRate = grossTarget / billableDays；hourlyRate = grossTarget / billableHours；monthlyTarget = target / 12。捨入 half-up：金額至整元，天數／時數至 1 位小數，費率由未捨入精確值算出。

- `standard-rate`：gross 1,200,000×1.20=1,440,000；bd 220×0.70=154；bh 154×8=1,232；day 1,440,000÷154=9,350.649…→9,351；hourly 1,440,000÷1,232=1,168.831…→1,169；monthly 1,200,000÷12=100,000。
- `no-overhead-full-utilization`：gross 960,000；bd 240；bh 1,920；day 4,000；hourly 500；monthly 80,000。
- `low-utilization`：gross 600,000×1.10=660,000；bd 200×0.50=100；bh 100×6=600；day 6,600；hourly 1,100；monthly 50,000。
- `fractional-billable-days`：gross 1,000,000×1.25=1,250,000；bd 230×0.65=149.5；bh 149.5×8=1,196；day 1,250,000÷149.5=8,361.204…→8,361；hourly 1,250,000÷1,196=1,045.150…→1,045；monthly 1,000,000÷12=83,333.333…→83,333。
- `half-up-rounding`：gross 1,000,500；bd 250×0.50=125；bh 125×8=1,000；day 1,000,500÷125=8,004；hourly 1,000,500÷1,000=1,000.5→half-up 進為 1,001；monthly 1,000,500÷12=83,375。
- `max-days-boundary`：gross 12,000；bd 365；bh 365×24=8,760；day 12,000÷365=32.876…→33；hourly 12,000÷8,760=1.369…→1；monthly 1,000。
- `min-values`：gross 1；bd 1×0.01=0.01→顯示 0.0；bh 0.01×0.5=0.005→顯示 0.0；day 1÷0.01=100；hourly 1÷0.005=200；monthly 1÷12=0.083…→0。
- `decimal-percent`：gross 800,000×1.125=900,000；bd 240×0.625=150；bh 150×7.5=1,125；day 6,000；hourly 800；monthly 800,000÷12=66,666.666…→66,667。
- 錯誤案例皆由驗證順序直接推導：`utilization-zero`（utilization 0 < 1 → RANGE）、`overhead-over-100`（overhead 101 > 100 → RANGE）、`decimal-target`（目標收入含小數 → INTEGER_FORMAT）、`days-over-365`（366 > 365 → RANGE）、`hours-two-decimals`（8.25 為 2 位小數 → DECIMAL_FORMAT）、`empty-target`（空白 → EMPTY）。

## 獨立重算（第二種方法）

以 Python `fractions.Fraction` 精確有理數運算 + `decimal.Decimal` ROUND_HALF_UP 捨入的獨立 script，逐案從 input 重算全部輸出數字，並以獨立的驗證函式重推 6 個錯誤案例的 code/field。2026-11-21 執行結果：14 個核心案例全數 PASS，無差異。Script 為一次性核對用，未隨附進規格包。

## 其他

- 公式為定義性算式，無引用的法令或官方表格；間接成本與可計費使用率皆為使用者自填假設，本文不宣稱產業標準比例，故無概念筆記與 primary source 衝突須更正之處。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
