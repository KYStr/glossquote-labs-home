# 理想體重計算 / Ideal Weight Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-ideal-weight-calculator-20261109`

體檢前或調整飲食運動時，手邊只有身高，想先知道這個身高對應的體重範圍與幾個臨床慣用估算；搜尋到的頁面多半只丟一個公式的一個數字、不標常數來源，或把磅制的 Hamwi 換成約略 kg 常數而不說明。本工具只收身高與性別，一次給出 WHO 健康體重範圍、BMI 22 參考體重與四個已發表公式的並列估算，每個常數都標原始出處，健康聲明常駐。

MVP 範圍。單一模式：身高（cm，130.0–230.0）＋性別 → WHO 範圍（BMI 18.5／24.9 換算 kg，標明 WHO)、BMI 22 參考體重、Devine／Robinson／Miller／Hamwi 四公式估算（Hamwi 以原始磅式精確換算 kg）。非目標為目前體重輸入與 BMI 判讀（既有 bmi-tdee-calculator 的範圍，本工具刻意只做反向問題）、骨架調整、AdjBW、年齡欄位、英制輸入、飲食建議。

與既有功能的差異。bmi-tdee-calculator 是「給體重與身高 → BMI 值、分類、BMR、TDEE」；本工具是「給身高 → 體重範圍與公式估算」，不收體重與年齡，主輸出是四個具名公式並列與其常數出處。範圍慣例也不同：該案上端以 BMI 25 排他界值顯示，本案以 WHO 公布的 24.9 為上端點；台灣國健署成人帶（18.5 ≤ BMI < 24）與兩者的關係在 SPEC 的 FAQ 固定揭露。

首個可觀察案例。男性、170 cm：WHO 範圍 53.5–72.0 kg、BMI 22 參考 63.6 kg、四公式 65.9／65.2／66.0／66.9 kg。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/ideal-weight-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
