# 泳池水量計算 — 作者檢查

作者 `cloud-dot`（Muse, for KYStr），run 5 規格作者工作，概念 #37。作者文件核對，待非作者 readiness；本文不是獨立審查，作者不自稱獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 查重：已比對 `docs/specs/` 全部目錄（101 份）、`sources/candidates/` 與 `sources/legacy/`，無泳池／水體體積規格。最相近者 legacy `tile-estimator` 已讀原文：其輸入為地面矩形與磁磚尺寸、輸出鋪設面積／片數／箱數，屬鋪材材料數量；本案為三維水體體積與注水時間，功能不重複，差異已寫入 SPEC scope。藥劑投放依概念明文列為非目標，未引入。
- 18 筆字面核心案例、3 筆 controller 案例。每個成功案例的 expected 以兩條獨立路徑推導，結果全數一致（18/18）：
  - 路徑 A（手算／高精度）：以 mpmath 50 位有效數字、十進位字串精確解析、真 π，依 SPEC 釘版運算順序計算，再以 half-up 捨入。
  - 路徑 B（雙精度）：以 IEEE-754 雙精度（Python float，與 JS `Number`／`Math.PI` 同語義）逐式照釘版順序（左結合乘法、`(shallow + deep) / 2`、未捨入值單次捨入）重算。
  - 手算錨點：`rect-single-depth` 8×4×1.5 = 48 m³ 整數精確；`circular-basic` V = 7.5π = 23.561944901923449…；`oval-basic` V = 9.8π = 30.787608005179974…；`circular-sloped` 平均深度 (1+1.6)/2 = 1.3、V = 6.58125π = 20.675606651437827…；加侖錨點 48000 / 3.785411784 = 12680.2585… → 12680。
- 捨入餘裕（離最近 tie 邊界的距離，以該輸出捨入單位計）：非 tie 案例最小為 `circular-basic` 注水分鐘 0.0222 分、`circular-sloped` m³ 0.0607（0.01 m³ 單位）、`circular-basic` 加侖 0.0927 加侖，皆高出雙精度運算噪聲（約 1e-12 量級）十個數量級以上，跨實作不翻轉。`fill-minutes-tie` 餘裕為 0 是刻意設計：10000 / 32 = 312.5 在二進位精確可表示（分子分母皆精確、商為 .5 結尾的短二進位小數），雙精度路徑無歧義，釘版 half-up → 313 分，專門區分銀行家捨入。`min-dimensions` 的雙精度 V = 0.0010000000000000002（0.1 不精確所致），但三個捨入輸出與精確推導（0.001 m³ = 1 L）全數一致。
- 釘版決定與概念備註的對照：
  - 深度輸入採「兩種模式」（single／sloped 明確切換，sloped 對三種形狀一體適用），而非只給單一深度——概念留了選擇權，採雙模式並以欄位啟用規則消除歧義。
  - 橢圓形「可選」→ 採納：半軸 π 路徑，與圓形同構、成本低且家用池常見。
  - 美制加侖「可含可略」→ 採納為次要輸出：1 gal = 3.785411784 L 為定義精確常數（美制液量加侖定義值），無查表不確定性。
  - 概念寫「exact pi arithmetic」→ 釘版為雙精度 `Math.PI` 路徑（非符號精確顯示）：與本廠 race-time-predictor 的雙精度釘版先例一致，且每個 fixture 已以 50 位精度對照證明捨入輸出與精確值相同、餘裕如上。此為對概念文字的刻意詮釋，記錄在此供獨審裁量。
  - m³（2 位）與公升（整數）皆由未捨入 V 各自單次捨入，公升由 `V * 1000` 未捨入值計算、不由顯示 m³ 反推；兩顯示同源，`min-dimensions` 釘版 m³ = 0 與公升 = 1 並存並以常駐說明揭露，非矛盾。
  - 注水時間沿用 battery-runtime-calculator 釘版：單一已捨入總分鐘再拆時／分，永不出現 60 分。
  - 範圍理由已寫入 SPEC：長寬直徑上限 100 m 涵蓋 50 m 奧運池，深度上限 10 m 涵蓋跳水池約 5–6 m，流速上限 10000 L/min 涵蓋商用泵浦；下限 0.1 一併排除零／負值與零體積。
  - raw 容量逐欄釘版（依 bill-split／race-time 先例）：shape 12、depthMode 8、數字欄 8。作者自查時以獨立重寫的驗證器跑 fixtures，初版「全欄 8 單位」會把合法值 `rectangular`（11 單位）誤殺為 INPUT_LIMIT，已在送出前修正 SPEC 並重跑全數通過（核心 18/18，含驗證順序與未啟用欄位規則）。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
