# 密碼強度檢查 / Password Strength Checker — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-password-strength-checker-20261121`

使用者在註冊或更換密碼前，把現有密碼貼進本機頁面，立即看到熵位元、強度等級、兩種攻擊情境下的預估破解時間，以及具體改進建議；密碼絕不離開頁面、不儲存、不傳送。

MVP 範圍。單一密碼欄位、釘版的自訂加權評分模型（字元池熵減模式扣分，見 SPEC.md）、固定 16 條常見密碼表與 40 詞字典表、雙語靜態頁、報告下載。非目標為產生密碼、洩漏資料庫查詢、密碼儲存或管理、特定網站的密碼政策範本、百分比式「安全分數」。

首個可觀察案例。`Tr0ub4dor&3`：11 碼、四類字元、無扣分，72.1 bits，強（strong）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/password-strength-checker/`，固定分支與 PR 交驗。
