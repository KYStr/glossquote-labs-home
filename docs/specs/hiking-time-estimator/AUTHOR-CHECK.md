# 登山時間預估 — 作者檢查

作者為 run 6 規格作者（本輪任務 `hiking-time-estimator`），來源工作為家長指派的 run 6 規格寫作。作者文件核對，待非作者 readiness；作者不得稱自己的文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 checkout 的既有預案。最相近者為 `running-pace-calculator`（Riegel 跑步配速／比賽預測）與 registry 登記的 `spec-race-time-predictor-20261109`（Riegel 比賽預測）；實質差異見 SPEC scope 節：本工具以路線距離與爬升、按 Naismith's rule 從零算出登山移動時間，不以外推已知成績預測比賽、不解跑步配速。
- 19 筆字面案例：16 筆核心（12 筆成功＋4 筆錯誤）與 3 筆 controller 案例。`classic-naismith` 核對點為「經典算例：12 km、爬升 600 m → 3:24」。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。

## 公式來源查核（概念筆記 vs 一手來源）

- 概念筆記稱 Naismith's rule 為「5 km/h ＋ 每爬升 600 m 加 1 小時」，與來源一致：Naismith 原文（1892）為每 3 英里 1 小時、每爬升 2,000 英尺加 1 小時；公制慣用取整為 5 km/h 與 600 m/h（2,000 英尺實為 609.6 m，本文釘版 600 m，不用 609.6 m）。來源：Naismith's rule（Wikipedia 條目，引用 Naismith 1892 原文與 Aitken 1977）。
- 下降調整採「釘版」而非「明確排除」：Langmuir（1984）《Mountaincraft and Leadership》——緩降（5°–12°）每下降 300 m 減 10 分鐘，陡降（>12°）每下降 300 m 加 10 分鐘，<5° 不修正。由於輸入只有下降總量、無法推算坡度，本文以使用者自選的 `descentType`（none／gentle／steep）承載坡度資訊，預設 `none`（經典 Naismith、不調整）。此設計決策記錄於此，供 reviewer 檢視。
- 等效平路距離採 Scarf 等效距離，Naismith 數 α = 7.92（3 英里 ÷ 2,000 英尺），公式 `equivalentFlatKm = distanceKm + 7.92 × ascentM ÷ 1000`。

## Fixture 雙重推導

每筆成功案例先手算、再以獨立方法重算，兩者一致才定稿。

**方法一（手算，逐筆）：** 以 `flatMin = 距離 × 12`、`ascentMin = 爬升 ÷ 10`、`descentAdjMin = ∓下降 ÷ 30`（緩降 −、陡降 ＋）求精確總分鐘，下限 0，half-up 捨入至整數分鐘；配速＝取下限後總時間 ÷ 距離（1 位小數）；等效平路距離＝距離 ＋ 7.92 × 爬升 ÷ 1000（2 位小數）。

- `classic-naismith`：12×12=144.0；600÷10=60.0；合計 204 → 204 分鐘＝3:24；配速 204÷12=17.0；等效 12＋7.92×0.6=16.752→16.75。
- `gentle-descent`：10×12=120.0；500÷10=50.0；−900÷30=−30.0；合計 140 → 2:20；配速 14.0；等效 10＋3.96=13.96。
- `steep-descent`：同上，＋30.0；合計 200 → 3:20；配速 20.0；等效 13.96。
- `fractional-inputs`：7.5×12=90.0；350÷10=35.0；合計 125 → 2:05；配速 125÷7.5=16.666…→16.7；等效 7.5＋2.772=10.272→10.27。
- `half-minute-rounding`：5.25×12=63.0；15÷10=1.5；合計 64.5 → half-up 進位為 65＝1:05；配速 64.5÷5.25=12.2857…→12.3；等效 5.25＋0.1188=5.3688→5.37。
- `descent-repeating-decimal`：8×12=96.0；400÷10=40.0；−100÷30=−3.333…→顯示 −3.3；合計 132.666…→133＝2:13；配速 132.666…÷8=16.5833…→16.6；等效 8＋3.168=11.168→11.17。
- `flat-only`：5×12=60.0；合計 60 → 1:00；配速 12.0；等效 5.00。
- `minimum-distance`：0.1×12=1.2；合計 1.2 → 1＝0:01；配速 1.2÷0.1=12.0；等效 0.10。
- `maximum-bounds`：200×12=2400.0；10000÷10=1000.0；＋10000÷30=＋333.333…→顯示 333.3；合計 3733.333…→3733＝62:13；配速 3733.333…÷200=18.666…→18.7；等效 200＋79.2=279.20。
- `descent-type-ignored-when-zero`：6×12=72.0；300÷10=30.0；下降 0 故調整 0（steep 無作用）；合計 102 → 1:42；配速 17.0；等效 6＋2.376=8.376→8.38。
- `gentle-descent-floor-at-zero`：0.1×12=1.2；−10000÷30=−333.333…→顯示 −333.3；合計 −332.133…→下限 0＝0:00；配速 0÷0.1=0.0；等效 0.10。
- `descent-default-none`：10×12=120.0；下降 600 但 descentType 省略→預設 none，調整 0；合計 120 → 2:00；配速 12.0；等效 10.00。

**方法二（獨立程式重算）：** 以 Python `fractions.Fraction` 精確有理數運算重寫同一組釘版規則（`/tmp/hiking-recalc.py`，與手算無共用程式碼），逐筆比對 `fixtures.json` 的 12 筆成功案例：12/12 完全一致，0 不符。4 筆錯誤案例（`distance-too-many-decimals` DECIMAL_FORMAT／`distance-zero` RANGE／`ascent-decimal` INTEGER_FORMAT／`descent-type-unknown` ENUM）按 SPEC 驗證順序與文法逐項核對，無需數值重算。

## 待 reviewer 注意的設計點

- `totalMinutes` 由精確總時間 half-up 捨入；三個 1 位小數分段值各自捨入，相加未必等於 `totalMinutes`，SPEC 已明示以 `totalMinutes`／`totalDisplay` 為準。
- `maximum-bounds` 總時間 62:13，`totalDisplay` 的小時數可超過 24，SPEC 已釘版。
- `gentle-descent-floor-at-zero` 的配速以取下限後的總時間（0）計算，得 0.0，SPEC 已釘版。
