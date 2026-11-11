# 電池續航計算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（build5 spec 作者），本文件為作者自查，**不是**獨立審查；readiness 由非作者 reviewer 另行核定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對 checkout 內 101 份既有規格與概念清單。最相近者 `battery-swap-plan`（活動換電池排程，輸入實測分鐘、明文排除額定估算）差異已寫入 SPEC scope；無其他以額定規格估算續航／容量的規格。

## 概念備註與本文件定版的差異（作者裁量紀錄）

- 概念備註 #29 寫「efficiency % input (default pinned)」；本輪任務簡報改定為「放電深度（depth-of-discharge）輸入，預設 100%，鉛酸約 50% 為標示的簡化指引」。兩者在數學上是同一個乘法係數（usable = Wh × 係數），故只保留一個欄位並命名為放電深度，避免兩個同義係數疊乘造成歧義；Peukert 效應列為明示非目標。
- 概念備註的串／並聯組合器保留為 `pack` 模式（串聯加電壓、並聯加容量、Wh 不變量以性質測試釘版）；以電流（A）輸入負載的路徑明示不納入。

## 案例雙重推導

28 筆核心案例（18 成功、10 錯誤）與 3 筆 controller 案例。成功案例的每個 expected 先由作者依 SPEC 公式手算，再以兩套獨立寫成的重算程式交叉核對，三者一致才寫入 fixtures：

- 手算要點：`phone-basic` 10000 × 3.7 / 1000 = 37 Wh，37 / 10 = 3.7 h，× 60 = 222 分 = 3 小時 42 分；`half-up-tie` 45 / 20 = 2.25 h → half-up 2.3，分鐘 135 = 2 小時 15 分；`minutes-tie` 41 / 40 = 1.025 h → 小時 1.0、分鐘 61.5 → 62；`solve-phone` 所需 50 Wh，50 / 3.7 × 1000 = 13513.51… → 進位 13514 mAh；`pack-4s2p` 單顆 12.95 Wh × 8 = 103.6 Wh，且 7000 mAh × 14.8 V / 1000 = 103.6 Wh（不變量）；`exact-not-display` 精確電量 12.9645 Wh（顯示 12.96），12.9645 / 0.43215 恰 = 30 h——若誤用顯示值計算，分鐘會不同，本案例即為此釘版。
- 重算法 A：Python `fractions.Fraction` 精確有理數，依 SPEC 順序實作 rhu／ceil／拆分。重算法 B：獨立另寫的 Python `decimal.Decimal`（60 位精度、ROUND_HALF_UP／ROUND_CEILING）。A、B 對 18 筆成功案例輸出逐值相同，且與手算全數一致。
- 10 筆錯誤案例另以第三支獨立實作的驗證順序程式（SCHEMA → ENUM → 欄位集合 → 型別 → 逐欄 INPUT_LIMIT → UNICODE → EMPTY → 文法 → RANGE）重跑，預期 code／field 全數吻合。
- fixtures.json 寫入後再讀回重驗一次：28/28 核心案例通過，含不成對 surrogate 案例以 `\ud800` JSON 轉義保存（檔案本身為純 ASCII）。

## 已釘版的關鍵裁量

- 續航雙顯示：runtimeHours 為精確值的 1 位小數 half-up；時／分顯示只由單一 runtimeTotalMinutes（精確分鐘 half-up 至整數）拆分，保證分部恆在 0–59 且兩部分不矛盾。
- solve 所需容量以無條件進位至整數 mAh，且由未捨入的所需電量計算；恰為整數時不超估（`solve-exact-integer`）。
- 負載 0 W 在續航模式為 `infinite` 狀態（電量照常、續航欄 null），在 solve 模式為 0／0；皆非錯誤。
- 核心禁止以二進位浮點運算（逢五進位邊界會翻盤），已在 SPEC implementation 釘版為 BigInt 定標整數或等價有理數。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。


## BAT-01／BAT-02 維護紀錄

維護者 `local-codex:01a1c8a3-9150-7bd0-aac8-4b7495c2da91`，task `labs-five-hour-repair-battery-20261111`。以上為原作者歷史自查。固定底稿來自 [原 PR #253](https://github.com/KYStr/glossquote-labs-home/pull/253) 的 `13ccc1ccb1d24ca1ec70b1912ad25c65521aa2e9`，維護依 [固定簡報](https://github.com/KYStr/glossquote-labs-home/blob/418aee70f60a04cbe19e339597c91a056bcad0c4/docs/reviews/five-hour-2026-11-11/dispatch/repair-battery/TASK.md)。

- 原 31 筆 fixture 與原字面預期均保留。新增 8 筆核心、1 筆控制器，共 40 筆。BAT-01 反推用 `ceil(10⁶ × 10⁵ × 100 ÷ 0.00001 × 1000 ÷ 3)`，得 `333333333333333333334` mAh。pack 用 `60 × 10¹¹ ÷ 0.000007` 再 half-up，得 `857142857142857143` 分。兩個值都回 RESULT_LIMIT。
- pack 三個安全邊界用 `mAh × V × 100 ÷ 1000 × 60 ÷ 0.000001`。精確分鐘為 `9007199254740990.48`、`9007199254740990.6`、`9007199254740991.92`，half-up 後各為 `9007199254740990`、`9007199254740991`、`9007199254740992`。前兩筆均可用 `150119987579016 × 60` 加 30 或 31 還原總分鐘，最後一筆回 RESULT_LIMIT。
- BAT-02 用 `6000 × 5 ÷ 1000 = 30 Wh`，`30 × 60 ÷ 10 = 180 分`，核對與同端 Wh 模式相符。四模式保留，兩語提示區分電芯、電池組及輸出額定口徑，反推進位限定在理想模型。
- 本紀錄由維護者填寫。三項維護面向與文件八節等待同候選的非作者檢查。產品九面向、瀏覽器、實際下載、部署皆 NOT_RUN。REG-01 登記修復另案。
- 維護查核以 Python 3.12.5 的 Fraction 獨立重算，核心 36/36、控制器模型 4/4，exit 0。原 31 筆字面預期完全相同。
