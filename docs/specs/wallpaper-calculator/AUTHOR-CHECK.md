# 壁紙用量計算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（build5 spec 工作副本）。作者文件核對，待非作者 readiness；本文件不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 repo 預案庫：無 wallpaper／壁紙 既有預案。最相近者 paint-coverage-calculator（油漆以面積換算公升數，無「幅」、無圖案重複、無每捲可裁幅數），實質差異已寫入 SPEC scope 節。
- 14 筆字面核心案例、3 筆 controller 案例。每個 expected 先以手算由釘版規則推導，再以一份獨立 Python 整數／分數運算腳本（未共用任何產品程式碼）重算，兩者全數一致才寫入 fixtures。

## 手算推導（第一推導）

- `basic-perimeter`：周長 1200 cm ÷ 捲寬 53 → ceil = 23 幅；幅長 250 + 10 = 260；每捲 floor(1005 / 260) = 3 幅；捲數 ceil(23 / 3) = 8；面積 1200 × 250 = 300,000 cm² = 30.00 m²。
- `pattern-repeat-roundup`：幅長 ceil(260 / 32) × 32 = 9 × 32 = 288；幅數 ceil(1000 / 53) = 19；每捲 floor(1005 / 288) = 3；捲數 ceil(19 / 3) = 7；面積 25.00。
- `walls-mode-two-walls`：牆一 ceil(400 / 53) = 8 幅 → ceil(8 / 3) = 3 捲；牆二 ceil(300 / 53) = 6 幅 → 2 捲；合計 14 幅、5 捲；面積 (100,000 + 75,000) cm² = 17.50。
- `openings-list-deduction`：開口寬 90 + 150 = 240 cm，有效寬 960 → ceil(960 / 53) = 19 幅 → 7 捲；開口面積 90 × 210 + 150 × 120 = 36,900 cm² = 3.69；淨面積 30.00 − 3.69 = 26.31。
- `openings-area-only`：同一 3.69 m² 只扣淨面積 → 26.31；幅數 23、捲數 8 不變（與上一案對照，釘住兩種扣除的差異）。
- `waste-ten-percent`：ceil(23 × 110 / 100) = ceil(25.3) = 26 幅 → ceil(26 / 3) = 9 捲。
- `repeat-exact-multiple`：240 + 10 = 250，恰為 25 的 10 倍 → 幅長 250；幅數 ceil(530 / 53) = 10；每捲 floor(1005 / 250) = 4；捲數 ceil(10 / 4) = 3；面積 530 × 240 = 127,200 cm² = 12.72。
- `walls-mixed-heights`：牆一 ceil(250 / 32) × 32 = 256、ceil(300 / 53) = 6 幅、floor(1005 / 256) = 3、2 捲；牆二 ceil(270 / 32) × 32 = 288、ceil(200 / 53) = 4 幅、3、2 捲；合計 10 幅、4 捲；面積 12.40。
- `single-strip`：ceil(50 / 53) = 1 幅 → 1 捲；面積 50 × 250 = 12,500 cm² = 1.25。
- 錯誤案：`strip-too-long`（幅長 310 > 捲長 300，drops = 0）、`openings-exceed-wall`（開口寬 700 + 600 = 1300 ≥ 周長 1200）、`walls-list-combination`（MODE_COMBINATION）、`decimal-format-height`（2.505 三位小數）、`perimeter-zero`（RANGE），皆依 SPEC 釘版的驗證順序手推。

## 獨立重算（第二推導）

- 以 Python（整數運算 + `fractions.Fraction` 驗證公尺字串換算為整數公分精確成立）另寫一份與 SPEC 公式一一對應的計算，逐案比對全部成功案的逐牆明細與總計：9 個成功核心案全數與手算一致。
- 重算過程中確認一項必須釘版的細節：cm² 換算 m² 不一定是恰好兩位小數（例如 101 cm² = 0.0101 m²），因此 SPEC 將面積輸出釘為「以 exact cm² 值 round half up 到 0.01 m² 的兩位小數字串」，公式 `floor((cm2 + 50) / 100)` 百分位，並以 101／150／50／49 cm² 四個邊界值驗證過（0.01／0.02／0.01／0.00）。本批 fixtures 的面積恰皆為兩位小數整值，不影響上述釘版。

## 設計決定記錄

- 開口語意採「寬度扣幅、長度不縮短」：一幅是天花板到地板的整條；清單模式以開口寬度扣掉不需掛幅的位置，開口上下餘料保守視為已用。只給面積時無位置資訊，只扣淨面積。此為估算工具的保守慣例，SPEC 已明文釘版並要求介面揭露，不承諾餘料拼貼的節省。
- 逐牆模式不支援清單扣除（MODE_COMBINATION）：清單無法表達開口屬於哪面牆；逐牆模式改用面積模式。拒絕以「扣第一面牆」等任意歸屬冒充精確。
- 損耗套用順序釘為「先膨脹逐牆幅數、再換算逐牆捲數」，且剩料不跨牆流用——這是保守估算，與逐牆明細的揭露一致。
- 修剪裕度為固定常數 TRIM = 10 cm（上下各 5 cm），不做成輸入欄位，避免與圖案重複取整的先後順序產生第二種解讀；取整順序釘為「先加裕度、再向上取整到完整重複」。
- 概念筆記（brief #6）的 `rolls = ceil(total length / roll length adjusted)` 是概略式；本 SPEC 依委派要求改採逐幅 drops 法（`drops = floor(rollLength / stripLength)`、`rolls = ceil(strips / drops)`），因為總長法會默認捲尾剩料可跨幅拼湊、與逐幅裁切的實務不符。差異在此記錄，公式以 SPEC 為準。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
