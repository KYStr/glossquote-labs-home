# 儲蓄目標計算 / Savings Goal Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-savings-goal-calculator-20261109`

存錢的人已經有目標金額、目前存款和一個假設年利率，卡在兩個反問題：期限定了，每月要存多少？或是每月能存的金額定了，幾個月達標、最後一月還要存全額嗎？本工具只解這兩個反問題，用閉式年金公式加精確有理數運算給出可照做的數字，不逐月模擬、不出明細表。

與既有 compound-interest-calculator 的分工釘死在本簡報與 SPEC scope：該工具是正向模擬器（給投入看成長，附每月明細與有效年利率，目標答案來自對逐月進位模擬的二元搜尋）；本工具是反向求解器（給目標解月存或月數，答案來自不捨入的閉式公式）。兩者模型不同，同一輸入答案可能差幾分錢，SPEC 與 FAQ 明示，不假裝一致。

MVP 範圍。模式 A：目標、目前存款、年利率、期限（月）→ 每月需存金額（月底存款／普通年金，金額無條件進位到分）。模式 B：目標、目前存款、年利率、每月存款 → 達標月數（精確最小整數月）、最後一月較小尾款、全額存入時餘額。零利率走精確線性分支；已達標（already-funded）、不需新增存款（growth-sufficient）、永遠達不到（unreachable，含 no-growth 與超過 1200 個月的 beyond-horizon）皆為釘版語意狀態，不是錯誤。非目標為逐月／逐年明細、有效年利率、CSV、通膨、稅務、不定期存入、月初存款模式、收益保證。

首個可觀察案例。零利率基本除法（`payment-basic-zero-rate`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/savings-goal-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
