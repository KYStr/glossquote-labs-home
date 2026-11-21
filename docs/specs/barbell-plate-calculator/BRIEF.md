# 槓鈴配重 / Barbell Plate Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-barbell-plate-calculator-20261121`

舉重者在健身房要上某個目標總重時，先輸入目標總重、槓鈴重與手邊有的槓片組，確認每邊要掛哪幾片、掛不掛得出來，掛不出來時知道差多少、最近能掛到幾公斤。

MVP 範圍。公斤制、固定 IWF 標準槓片組（25 / 20 / 15 / 10 / 5 / 2.5 / 1.25 kg）、每邊對稱配重、由大到小貪心釘版、餘數與最近可達重量說明。非目標為磅制換算、1RM 最大重量估算、暖身組遞增表、槓鈴夾重量、微型槓片（0.5 kg 以下）、不對稱配重、把結果當訓練處方或安全保證。

首個可觀察案例。100 kg 目標、20 kg 槓，每邊 25 + 15 kg。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/barbell-plate-calculator/`，固定分支與 PR 交驗。
