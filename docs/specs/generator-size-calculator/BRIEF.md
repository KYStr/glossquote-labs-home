# 發電機容量試算 / Generator Size Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-generator-size-calculator-20261121`

停電備援、露營或工地用電前，先確認要買多大的發電機：列出同時要用的家電（運轉瓦數＋啟動瓦數），算出總運轉瓦數與啟動突波，對照 25% 安全裕度與功率因數 0.8，建議發電機 kVA 與最接近的市售規格。

MVP 範圍。家電清單 1–12 列、12 項 Honda 官方瓦數預設表、總運轉瓦數、最大單一啟動增量、啟動突波、25% 安全裕度、功率因數 0.8 換算 kVA、無條件進位到 0.1 kVA、市售規格推薦表（至 20 kVA）與超規提示。非目標為電池續航（電池能撐幾小時）、電費、油耗／續航時間、品牌或型號推薦、安裝與安全認證。

首個可觀察案例。冰箱＋燈具＋電視（`fridge-lights-tv`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/generator-size-calculator/`，固定分支與 PR 交驗。
