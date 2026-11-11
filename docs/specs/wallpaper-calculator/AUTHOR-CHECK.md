# 壁紙用量計算 — 作者檢查

原作者見 [固定來源](https://github.com/KYStr/glossquote-labs-home/blob/f8939291d2e283f1e6496d3a9cc802a054732200/docs/specs/wallpaper-calculator/AUTHOR-CHECK.md)。WALL-01／02 由本次維護修訂，候選文件待非作者審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 repo 預案庫：無 wallpaper／壁紙 既有預案。最相近者 paint-coverage-calculator（油漆以面積換算公升數，無「幅」、無圖案重複、無每捲可裁幅數），實質差異已寫入 SPEC scope 節。
- 19 筆字面核心案例（11 筆成功、8 筆錯誤）及 3 筆 controller 案例。原作者以手算與 Python 整數／分數重算原稿。修訂字面值由維護者以整數算式與離線文件驗證器推導。

## 手算推導（第一推導）

- `basic-perimeter`：周長 1200 cm ÷ 捲寬 53 → ceil = 23 幅；幅長 250 + 10 = 260；每捲 floor(1005 / 260) = 3 幅；捲數 ceil(23 / 3) = 8；面積 1200 × 250 = 300,000 cm² = 30.00 m²。
- `pattern-repeat-roundup`：幅長 ceil(260 / 32) × 32 = 9 × 32 = 288；幅數 ceil(1000 / 53) = 19；每捲 floor(1005 / 288) = 3；捲數 ceil(19 / 3) = 7；面積 25.00。
- `walls-mode-two-walls`：牆一 ceil(400 / 53) = 8 幅 → ceil(8 / 3) = 3 捲；牆二 ceil(300 / 53) = 6 幅 → 2 捲；合計 14 幅、5 捲；面積 (100,000 + 75,000) cm² = 17.50。
- `openings-list-deduction`：開口寬度合計 90 + 150 = 240 cm。採購估算寬度為 1200 cm，ceil(1200 / 53) = 23 幅、8 捲。原結果為 19 幅、7 捲。開口面積 90 × 210 + 150 × 120 = 36,900 cm²，淨面積 26.31 m²。
- `openings-area-only`：同一開口面積 3.69 m² 得淨面積 26.31 m²，與尺寸清單同為 23 幅、8 捲。
- WALL-01：ceil(318 / 53) = 6 幅，floor(780 / 260) = 3 幅／捲，合計 2 捲。淨面積 318 × 250 − 159 × 120 = 60,420 cm²，顯示 6.04 m²。原估算 1 捲只有 41,340 cm²。
- WALL-02：300 cm > 250 cm，回第 1 列開口的 `heightM`。等高案例 250 cm 合法，淨面積為 57,000 cm²，顯示 5.70 m²。另以字面案例固定逐欄格式優先、跨欄首個超高列優先。
- `waste-ten-percent`：ceil(23 × 110 / 100) = ceil(25.3) = 26 幅 → ceil(26 / 3) = 9 捲。
- `repeat-exact-multiple`：240 + 10 = 250，恰為 25 的 10 倍 → 幅長 250；幅數 ceil(530 / 53) = 10；每捲 floor(1005 / 250) = 4；捲數 ceil(10 / 4) = 3；面積 530 × 240 = 127,200 cm² = 12.72。
- `walls-mixed-heights`：牆一 ceil(250 / 32) × 32 = 256、ceil(300 / 53) = 6 幅、floor(1005 / 256) = 3、2 捲；牆二 ceil(270 / 32) × 32 = 288、ceil(200 / 53) = 4 幅、3、2 捲；合計 10 幅、4 捲；面積 12.40。
- `single-strip`：ceil(50 / 53) = 1 幅 → 1 捲；面積 50 × 250 = 12,500 cm² = 1.25。
- 錯誤案：`strip-too-long`（幅長 310 > 捲長 300，drops = 0）、`openings-exceed-wall`（開口寬 700 + 600 = 1300 ≥ 周長 1200）、`walls-list-combination`（MODE_COMBINATION）、`decimal-format-height`（2.505 三位小數）、`perimeter-zero`（RANGE），皆依 SPEC 釘版的驗證順序手推。

## 獨立重算（第二推導）

- 原稿 9 個成功核心案例曾經 Python 獨立重算。維護者以離線 Node 整數驗證器對照修訂後的 19 個核心與 3 個 controller 字面案例，並核對 SPEC 中兩份固定下載的完整 bytes 和 SHA-256。
- 重算過程中確認一項必須釘版的細節：cm² 換算 m² 不一定是恰好兩位小數（例如 101 cm² = 0.0101 m²），因此 SPEC 將面積輸出釘為「以 exact cm² 值 round half up 到 0.01 m² 的兩位小數字串」，公式 `floor((cm2 + 50) / 100)` 百分位，並以 101／150／50／49 cm² 四個邊界值驗證過（0.01／0.02／0.01／0.00）。修訂後 WALL-01 的 60,420 cm² 也涵蓋小數位進位。

## 設計決定記錄

- 尺寸清單和總面積都只從毛面積扣除開口面積。整幅採購以全牆寬及牆高估算，因本版沒有開口位置、裁切配置或餘料可重用資料。結果與報告保留寬度摘要欄位。
- 逐牆模式使用總面積。尺寸清單目前限定周長模式，可用共同牆高檢查每列開口高度。
- 損耗套用順序釘為「先膨脹逐牆幅數、再換算逐牆捲數」，且剩料不跨牆流用——這是保守估算，與逐牆明細的揭露一致。
- 修剪裕度為固定常數 TRIM = 10 cm（上下各 5 cm），不做成輸入欄位，避免與圖案重複取整的先後順序產生第二種解讀；取整順序釘為「先加裕度、再向上取整到完整重複」。
- 概念筆記（brief #6）的 `rolls = ceil(total length / roll length adjusted)` 是概略式；本 SPEC 依委派要求改採逐幅 drops 法（`drops = floor(rollLength / stripLength)`、`rolls = ceil(strips / drops)`），因為總長法會默認捲尾剩料可跨幅拼湊、與逐幅裁切的實務不符。差異在此記錄，公式以 SPEC 為準。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
