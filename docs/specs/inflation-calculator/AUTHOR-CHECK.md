# 通膨計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，run-5 規格作者（concept #24）。本文件是作者文件核對，**不是**非作者獨評；未執行任何 registry/coordination 指令，登記與送審由上層處理。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：比對 checkout 內 101 份既有規格與本批同梯 23 份 run-5 規格，無 inflation／CPI／購買力同名或同功能者。最相近的 compound-interest-calculator 在其 scope 明示排除 inflation adjustment（名目餘額逐月模擬成長），savings-goal-calculator 解年金月存額／達標月數；本案做物價水準換算（含 CPI 指數模式），差異已寫入 SPEC scope。

- 雙推導（24 核心案例、586 個數值輸出含全部逐年表列）：方法 A 以 Python `fractions` 精確有理數按釘版公式手算推導、精確 half-up 捨入（等值年率為無理數，改以 mpmath 60 位精度推導）；方法 B 另寫 IEEE-754 雙精度腳本，照 SPEC 釘版運算順序（`Number` 解析、base 先除後加、`Math.pow`、roundD 只在輸出）獨立重算。兩路徑每個輸出逐值相等才寫入 fixtures；controller 案例的 lateResult 直接引用核心案例的已驗證結果。

- 捨入邊界餘裕（未捨入雙精度值到最近 roundD 邊界的距離，輸出單位）：全套最小為 `cpi-deflation` 等值年率的 1.067e-06（4 位小數輸出）；金額／2 位小數輸出中最小為 `rate-fractional` 逐年表第 5 列名目值的 5.094e-05。兩者皆高出跨引擎 `Math.pow` 可能差異（約 1 ulp，換算後 ≤1e-12）六個數量級以上。
- 作者修正一：初版 `rate-high` 用金額 50000，第 7 年名目值 50000 × 1.1^7 ＝ 97435.855 恰落在半分 tie 上（餘裕 5.6e-11），任何引擎的 pow 差異都可能翻面。改金額為 50003 後，該案例最差餘裕 3.170e-04，其餘案例不變。此事同時證明：整數利率 × 整數金額的冪次表特別容易踩 tie，選值必須量測。

- 釘版決策紀錄：兩模式都出貨（概念備註的兩方向各對應一模式）。年數採整數文法（不採 1 位小數年數：逐年表需要整數列界，分數年會逼出第二套捨入故事）。CPI 模式的 yearsBetween 只為等值年率存在，故可為 null 且給值時 ≥1（指數 1/0 無定義）。利率下限嚴格 > −100（base 必須 > 0 才能做購買力除法；恰 −100 由 `err-rate-floor` 釘為 RANGE）。逐年表每列獨立 `Math.pow(base, k)` 重算而非迭代乘法，使末列恆等於標題值且不受累積誤差影響。逐欄 raw 上限依本批逐欄慣例按欄位訂（金額 12、利率 8、CPI 9、年數 3、標籤 24 單元）。

- 非有限規則的由來與驗證：r＝−99.999、n＝200 時 base ＝ 1.0000000000065512e-05（雙精度實測），`Math.pow(base, 200)` ＝ +0（下溢），a／factor 非有限。故 SPEC 釘 purchasingPower 為 null（標題與逐年表各自判定），並在 tests 節設指定檢查斷言標題三值（futureValue 0、purchasingPower null、cumulativePercent −100），不逐列字面比對。反向溢位不存在：factor 上限 11^200 ＝ 1.899e208（實測），a × factor ≤ 約 1.9e217。

- 範圍線：本工具不內建任何 CPI 資料集，只接受使用者輸入的指數；SPEC scope 已明言若附官方 CPI 表須另以固定來源版次立約。方法說明（固定利率是簡化、CPI 結果取決於使用者指數來源）已釘版雙語原文，常駐結果旁並收入 FAQ。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
