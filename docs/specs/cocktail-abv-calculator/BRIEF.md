# 調酒酒精度 / Cocktail ABV Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-cocktail-abv-calculator-20261121`

在家調酒或在吧檯點單前，先把配方裡 2–6 種材料的體積與酒精度加總，知道這一杯到底有多烈、相當於幾標準杯，而不是憑感覺猜。

MVP 範圍。2–6 種材料（每種體積 ml＋酒精度 ABV%）→ 總體積、總酒精度、純酒精公克數、台灣標準杯數。非目標為估算血液酒精濃度、依體重／性別／時間推算酒意或代謝、酒駕判定、推薦配方、查酒品資料庫、把結果當醫療或法律建議。

首個可觀察案例。經典瑪格麗特（`classic-margarita`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/cocktail-abv-calculator/`，固定分支與 PR 交驗。
