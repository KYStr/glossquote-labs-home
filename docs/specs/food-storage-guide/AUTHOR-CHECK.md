# 食物保存期限 — 作者檢查

作者：run 6 規格作者（subagent，家長登記與提交；本人不稱此文件為獨審）。來源工作：run 6 概念第 20 條 food-storage-guide。作者文件核對，待非作者 readiness。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對既有工具。最相近的 `pantry-plan`（`sources/legacy/pantry-plan/`，食材差額採買單）是「食譜需求扣庫存 → 採買缺額清單」，其 README 明言不判斷保存安全；本工具是「品項 × 位置保存期限表 → 安全期限與剩餘天數」，輸入、輸出與判定規則完全不同，差異已寫進 SPEC 的 scope 節。另比對 grocery-budget（金額估算，不查保存天數）。
- 15 筆字面案例：12 筆核心（9 筆成功、3 筆錯誤）＋ 3 筆 controller。`ground-beef-fridge-use-soon` 核對點為「絞肉冷藏：剩 1 天，儘快使用」。

## 來源核對（依 brief：來源優先於概念筆記）

- 概念筆記要求「冷藏／冷凍／常溫天數取自 USDA FoodKeeper，字面數據、註明出處」。已照做：30 項逐項對照 FoodKeeper 品項編號（SPEC implementation 表 `fk` 欄），數值照錄原文區間；週／月／年先以釘版換算（1 週 = 7 天、1 個月 = 30 天、1 年 = 365 天）換算為天再入表，不取中點。
- 交叉核對：FoodSafety.gov Cold Food Storage Chart（HHS／USDA／FDA／CDC）與 FoodKeeper 在重疊品項上一致（絞肉冷藏 1–2 天、牛排 3–5 天、帶殼蛋 3–5 週、剩菜冷藏 3–4 天）。
- 來源差異，已記錄、未掩蓋：Cold Food Storage Chart 對「熟肉／禽肉」冷凍給 2–6 個月，FoodKeeper #173「剩菜（含肉）」給 2–3 個月（60–90 天）。依 brief 釘版來源為 FoodKeeper，採 60–90 天；此差異不影響任何 fixture（剩菜 fixture 只用冷藏值）。
- 牛奶冷藏：FoodKeeper 給「包裝使用期限」而非天數，已如實 pin 為 `PKG` 路徑（需輸入 packageDate），未自行編造天數。香蕉常溫「待熟」同理 pin 為無天數（NOT_APPLICABLE）。

## 雙重推導（手算 → script 獨立重算）

手算（第一種方法）：每筆成功案例以日曆逐月累加手算 safeUntil、bestUntil、remainingDays 與 status：

- `ground-beef-fridge-use-soon`：2026-11-20 + 1 天 = 2026-11-21（safe），+ 2 天 = 2026-11-22（best）；2026-11-21 − 2026-11-20 = 1 天 → use-soon。
- `eggs-fridge-fresh`：2026-11-01 + 21 天 = 2026-11-22，+ 35 天 = 2026-12-06（11 月剩 29 天：11-01 + 29 = 11-30，再 + 6 = 12-06）；2026-11-22 − 2026-11-10 = 12 天 → fresh。
- `leftovers-expired`：2026-11-10 + 3 天 = 2026-11-13，+ 4 天 = 2026-11-14；2026-11-13 − 2026-11-15 = −2 天 → expired。
- `whole-chicken-freezer-year`：2026-11-01 + 365 天 = 2027-11-01（2027 非閏年，整一年）；剩餘：11-21→11-30 為 9 天，12 月 31、1 月 31、2 月 28、3 月 31、4 月 30、5 月 31、6 月 30、7 月 31、8 月 31、9 月 30、10 月 31、11 月 1 日為 1 天，合計 9+31+31+28+31+30+31+30+31+31+30+31+1 = 345 天 → fresh。
- `milk-fridge-package-date`：包裝期限路徑，safe = best = packageDate 2026-11-25；2026-11-25 − 2026-11-21 = 4 天 → fresh。
- `milk-freezer-90`：2026-11-01 + 90 天：11-01→12-01 為 30 天，12-01→01-01 為 31 天（61），01-01→01-30 為 29 天（90）= 2027-01-30；剩餘：11-21→12-21 為 30 天，12-21→01-21 為 31 天，01-21→01-30 為 9 天，合計 70 天 → fresh。
- `bread-pantry-boundary-zero`：2026-11-01 + 14 天 = 2026-11-15，+ 18 天 = 2026-11-19；2026-11-15 − 2026-11-15 = 0 天 → use-soon（邊界：當天即最後一天）。
- `hot-dogs-opened-differs`：已開封冷藏 7 天：2026-11-18 + 7 天 = 2026-11-25；2026-11-25 − 2026-11-21 = 4 天 → fresh（與未開封 14 天不同）。
- `canned-soup-pantry-long`：2026-11-21 + 730 天：+ 365 天 = 2027-11-21，再 + 365 天跨 2028-02-29 閏日得 2028-11-20（safe）；+ 1825 天：至 2031-11-21 共 1826 天（含 2028 閏日），故 1825 天 = 2031-11-20（best）；剩餘 730 天 → fresh。

Script（第二種方法）：`/tmp/fsg-check/rederive.py`，以 Python `datetime.date` 獨立重算：從 SPEC 表重新鍵入的 30 項表出發，對 9 筆成功案例逐一比對 safeUntil、bestUntil、rangeDays、remainingDays、status。結果：9/9 一致，FAILURES: 0。3 筆錯誤案例（NOT_APPLICABLE、NOT_RECOMMENDED、DATE_RANGE）無數值可重算，以手核為準：生絞肉常溫儲存格為空、帶殼蛋冷凍儲存格為 NR、2026-02-30 不是真實日期。

## 未驗項

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
- 執行環境限制（回報家長）：clone 完成後，執行環境對 git clone 輸出跳出 execution-risk 提示；依該提示，本次未在該 checkout 內執行任何 git／build／test，也未把檔案寫進該 repo。四份檔案草稿置於 `~/workspace/glossquote-factory/build6/specs/food-storage-guide-draft/docs/specs/food-storage-guide/`，待確認後由家長套用至 checkout、建分支 `muse/spec-food-storage-guide-20261121`、提交、推送並開 DRAFT PR。clone 的 checkout 位於 `~/workspace/glossquote-factory/build6/specs/food-storage-guide/`（即 repo 根目錄，尚未建分支、尚未提交任何內容）。
