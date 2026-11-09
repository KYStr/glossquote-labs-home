# 月相計算機 / Moon Phase Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-moon-phase-calculator-20261109`

一位在台中接案的天文攝影工作者，週末想拍滿月與月出，先在手機上輸入日期確認當天月齡、照亮比與月相名稱，並查出下一個滿月與朔各落在哪一天，好排外拍行程與器材；手上只有日期，不想逐月翻農民曆或開需要連線的曆表網站。

MVP 範圍。以固定朔望月模型的日期級月相計算：輸入西元日期與 UTC 偏移，輸出月齡、照亮比、八階段月相名、距下一個朔／滿月的天數與日期（UTC 與所選偏移的當地日期）。非目標為逐時計算、月出月沒時刻、月食／日食預測、農曆換算、潮汐、真實曆表精度或把結果當天文台曆表。

首個可觀察案例。參考朔日 2000-01-06（`reference-epoch`）：以固定 JD 常數推得月齡 29.4 天、新月、照亮比 0.0%，下一個朔即當日。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/moon-phase-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
