# 信用卡還款試算 / Credit Card Payoff Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-credit-card-payoff-calculator-20261109`

一位上班族晚上在手機上看著信用卡帳單：欠款餘額和年利率 APR 都在帳單上，但銀行只顯示「最低應繳金額」，看不出照目前繳法到底要幾個月才還得完、總共要多付多少利息。他想先自己試算兩件事：每個月固定繳一個金額，要多久還清、總利息多少；或者要在目標月數內還清，每個月該繳多少。若每月還款連利息都 cover 不了，工具要直接指出這筆欠款永遠還不完，而不是給一張假排程。

MVP 範圍。單張卡、單一固定 APR、每月固定還款或目標月數兩種模式；利息逐月按剩餘餘額計算，整數分、half-up；含永遠還不完偵測與逐月攤還明細。非目標為連接銀行或帳單匯入、最低應繳金額規則模擬、年費／違約金／預借現金／循環信用分段利率、多卡整合、理財或債務協商建議、把試算當銀行正式試算或核准。

首個可觀察案例。固定月付逐月攤還（`fixed-payment-basic`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/credit-card-payoff-calculator/`，固定分支與 PR 交驗。 [本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
