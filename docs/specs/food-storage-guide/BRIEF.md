# 食物保存期限 / Food Storage Guide — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-food-storage-guide-20261121`

使用者打開冰箱，看到一份買了幾天的食物，不確定還能不能安全吃、該今天吃掉還是丟掉。查品項、存放位置與開始日期，得到安全期限、品質上限、剩幾天與三段狀態。

MVP 範圍。30 項釘版食物（USDA FoodKeeper 字面數據）× 常溫／冷藏／冷凍，開始日期加保存天數下限得安全期限，剩餘天數分三段狀態；牛奶冷藏等包裝期限品項走包裝日期路徑；無數據與不建議冷凍明確報錯。非目標為採買清單、食譜份量、庫存盤點、營養熱量、線上查詢、提醒推播、判斷食物實際是否變質。

首個可觀察案例。絞肉冷藏剩 1 天（`ground-beef-fridge-use-soon`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/food-storage-guide/`，固定分支與 PR 交驗。
