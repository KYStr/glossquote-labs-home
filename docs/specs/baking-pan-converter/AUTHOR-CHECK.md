# 烤盤尺寸換算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（build5 規格撰寫，工作目錄 `build5/specs/baking-pan-converter`）。作者文件核對，**非獨立審查**，待非作者 readiness；登錄、claim 與 submit 由統籌辦理，作者未執行任何 registry／coordination 指令。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 去重：比對 checkout 內 `docs/specs/` 既有目錄。最相近者為 bakers-percentage-calculator（烘焙百分比：食材配比↔重量）與 cooking-measurement-converter（料理單位：食材體積↔重量）——本工具只做烤盤容量比與單一麵糊總量縮放，不碰食材與配比，實質差異與邊界已寫入 SPEC 的 scope 節（並在 FAQ 釘版互指）。最終去重仍由統籌與 reviewer 核對。

## 烤盤表的推導（第一法：精確算術手推）

幾何列以 Decimal 50 位有效數字、π 取 50 位、1 inch = 2.54 cm 精確換算，逐列推導後 round-half-up 至整數毫升釘版。精確值與距最近捨入 tie（x.5）的距離：

| id | 精確幾何體積（ml） | 釘版 volumeMl | 距 tie |
| --- | --- | --- | --- |
| round-6 | 926.66663777…（π×7.62²×5.08） | 927 | 0.1666 |
| round-7 | 1261.29625696…（π×8.89²×5.08） | 1261 | 0.2037 |
| round-8 | 1647.40735604…（π×10.16²×5.08） | 1647 | 0.0926 |
| round-9 | 2084.99993499…（π×11.43²×5.08） | 2085 | 0.4999 |
| round-10 | 2574.07399381…（π×12.70²×5.08） | 2574 | 0.4260 |
| square-8 | 2097.544192（精確有理數，20.32²×5.08） | 2098 | 0.0442 |
| square-9 | 2654.704368（精確有理數，22.86²×5.08） | 2655 | 0.2956 |
| rect-9x13 | 3834.572976（精確有理數，22.86×33.02×5.08） | 3835 | 0.4270 |
| loaf-9x5 | 1843.5447000（精確有理數，22.86×12.70×6.35） | 1844 | 0.0447 |

方形／長方列是精確有理數（無 π），捨入無浮點歧義；圓形列最小餘裕 0.0926 ml，π 以 50 位計算，推導唯一。深度一律取標稱：圓／方／長方 2 inch = 5.08 cm，吐司模 2.5 inch = 6.35 cm，每列採用的深度已在 SPEC 表中逐列釘版——體積是「由釘版尺寸推出」，不是抄來的容量數字。

標稱列來源（2026-11-09 作者親查）：標準烤盤尺寸換算表（Brown Eyed Baker, “Baking Basics: Converting Pan Sizes”, https://www.browneyedbaker.com/how-to-convert-pan-sizes/ ，該表自述慣例 1 inch = 2.54 cm、1 cup = 237 ml）載明 Bundt 10 × 3½ inch = 12 cups、Tube 10 × 4 inch = 16 cups；另一獨立換算工具（Softonic, “Pan Size Converter”, https://tools.en.softonic.com/pan-size-converter ）的容量表同列 10-inch bundt = 12、10-inch tube = 16，兩來源一致。進表換算按來源自身慣例：12 × 237 = 2844 ml、16 × 237 = 3792 ml，basis 標 nominal、depthCm 為 null。注意坊間另有「10 吋 Bundt 約 10–12 杯」的區間說法，本表不採區間，釘單一標稱值並揭露。

## Fixture 推導（兩法對照）

- 第一法（規格釘版算法）：Node 腳本以 IEEE-754 雙精度、π = Math.PI、圓形運算順序 ((π × r) × r) × depth、長方 (L × W) × depth、捨入 r(x, p) = floor(x × 10^p + 0.5) / 10^p，連同 SPEC 的完整驗證順序（SCHEMA → 逐欄 INPUT_LIMIT → UNICODE → EMPTY → ENUM／DECIMAL_FORMAT → RANGE、未啟用欄位只查容量）實作參考版，跑全部 15 個核心案例：**15/15 與 fixtures.json 的 expected 深度比對一致**（含 5 個錯誤案例的 code／field）。
- 第二法（獨立重算）：Python 以 Fraction 精確有理數（表格對表格）與 Decimal 60 位 π（自訂圓形）從 SPEC 的釘版規則重算每個顯示值（factor、percent、scaledQuantity、volumeMl、depthRelation），結果與第一法逐值相同。
- 捨入餘裕（顯示值 × 顯示刻度後，距最近 tie 點的距離，單位為顯示刻度）：factor 最小 0.0618（`table-loaf-to-custom-rect`，2184/1844）；percent 最小 0.0815（`custom-max-diameter`）；scaledQuantity 最小 0.1903（`table-upscale-round`）；自訂圓形 volumeMl 最小 0.2963 ml（`custom-round-pi` 來源側 500π = 1570.7963… → 1571）。全部遠大於雙精度運算誤差（約 1e-13 相對），π 路徑在 Math.PI 雙精度與 60 位 π 兩種推導下輸出相同。恰為整數的顯示值（`same-pan` 的 1.00、`custom-round-pi` 的 1.44 = (24/20)²）距 tie 為最大 0.5 刻度，無歧義。
- Controller 3 案例沿用本工廠標準狀態機形狀（dirty-error／cancel-late／replace-late），lateResult 直接引用 `table-upscale-round` 的已核結果，未另行編造數字。

## 設計決定與揭露

- 自訂尺寸單位：任務允許「公分輸入＋英吋顯示換算」或「單位列舉」二選一——本規格釘前者：核心輸入一律公分，英吋僅為欄旁只讀顯示（÷ 2.54、2 位），不進核心結果與報告，避免雙單位輸入的驗證分歧。表格列則同時釘英吋標稱與公分換算兩種標示。
- 共享簡報概念 #40 原寫「烤盤容量表（釘版字面體積）」；本規格依任務書的細化要求改為「體積由釘版標稱尺寸＋釘版深度以幾何公式推出後釘版」，Bundt／中空模才用標稱容量。屬細化而非牴觸，推導全程如上可查。
- factor／percent／scaledQuantity 一律由未捨入容量推導、各自只捨入一次；volumeMl 僅顯示，SPEC 已明禁以 volumeMl 回算，避免自訂盤出現雙重捨入漂移。
- 深度提醒只給釘版文字、不算時間／溫度調整；SPEC 的 scope 與 FAQ 已明示此界線，並把「逐食材換算」指回 bakers-percentage-calculator，守住兩規格邊界。

## 未執行

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，九面向分數 null。未固定候選或未獨評前不計 ready。
