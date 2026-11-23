# 單車車架尺寸計算 — 作者檢查

作者 run 6 規格作者（bike-frame-size-calculator），來源工作 run 6 規格寫作。作者文件核對，待非作者 readiness。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 格式對照 `docs/SPECIFICATION-STOCK.md` 與既有規格 `docs/specs/retry-budget/`（BRIEF／SPEC 八節／fixtures／AUTHOR-CHECK 四件，九面向 acceptance、controller 三態測例、固定下載檔命名規則）。
- 已比對既有預案：`docs/specs/` 內無 bike-frame-size 同名或同義預案。最相近者為 running-pace-calculator（配速／Riegel 運動表現預測）與 bicycle-gear-table（`spec-bicycle-gear-table-20261109`，齒比展開），實質差異見 SPEC §2：本件是購車前的車架幾何選型，不算速度／時間／齒比。

## 來源核實與取捨（概念筆記第 25 條要求核實來源）

- 公路車 `inseam × 0.67`：核實。OmniCalculator〈Bike Size Calculator〉載明此式為 1980 年代法國教練 Cyrille Guimard 所創；Icebike、ToolFigure 等尺寸指南亦載明 0.67。採用。
- 登山車 `road − 11 cm`：核實。同一 OmniCalculator 頁載明 `Mountain frame size = Road frame size − 11 [cm]`。採用。
- 混合車（城市／旅行幾何）`inseam × 0.64`：核實。同一頁載明 trekking／city 車架為 `inseam × 0.64`。採用，並在 SPEC 中標明此係數對應城市／旅行幾何。
- 起始座墊高度 `inseam × 0.883`（LeMond 法）：核實。OmniCalculator、Icebike、ToolFigure 均載明 0.883，由五通中心沿座管量至座墊頂。採用為次要輸出。
- 身高→尺碼字母表：合併 RoadBikeRider 公路車身高表與 Icebike 身高表，兩表在 170–178 → M、178–185 → L 等列一致，邊界以半開區間釘版。
- 已核實的異說，一律不採用（SPEC §4 末段列明）：公路車另有 0.70 係數、登山車另有 inseam × 0.66（公分）與 inseam × 0.226（英吋）算法、混合車另有 0.685／0.68 係數。沒有任何標準機構制定這些係數（Icebike、ToolFigure 明言），且各算法彼此不一致：inseam 80 公分時，0.66 公分法得登山車 52.8 公分，與本件 road−11 法的 42.6 公分相差逾一個級距。為使 builder 無法替換係數，本件釘版 Guimard 系單一自洽家族。
- 英吋欄定性為「公分中心值的算術換算對照（1 in = 2.54 cm 精確值），不是店家英吋標示」，因公路車／混合車在店家本不用英吋標示，登山車現代品牌亦多改用字母；SPEC 與 FAQ 均明示此點，避免把換算值誤讀為店家尺寸。
- 提醒帶：典型書本法跨高約為身高 45.5–46.5%（Icebike），本件提醒帶取較寬的 40–50%（含端點）以免誤報；ratio 恰為 0.50 的 `road-max` 案例驗證含端點不提醒。

## Fixture 雙重推導（手算 → 獨立重算）

手算：每例先以紙筆級算術由釘版公式直推（未捨入中間值列於下表），再以獨立 Python script（Decimal 半入捨入，`/tmp/bike_check.py`，另以第二支驗證 script 直接讀 fixtures.json 逐例比對）重算。9 組核心案例兩種推導全部一致；3 組錯誤案例與 3 組 controller 案例為規則直述，無數值推導。

| 案例 | 手算（未捨入中間值） | script 重算 |
| --- | --- | --- |
| road-typical | 80×0.67=53.60；53.60÷2.54=21.102→21.1；範圍 52.60–54.60，÷2.54→20.709→20.7／21.496→21.5；座墊 80×0.883=70.64→70.6；ratio 80÷175=0.457 無提醒；身高 175→M | 一致 |
| mtb-typical | 53.60−11=42.60；42.60÷2.54=16.772→16.8；範圍 41.60–43.60→16.378→16.4／17.165→17.2；座墊 70.6；M | 一致 |
| hybrid-typical | 80×0.64=51.20；51.20÷2.54=20.157→20.2；範圍 50.20–52.20→19.764→19.8／20.551→20.6；座墊 70.6；M | 一致 |
| road-small | 72×0.67=48.24→48.2；48.24÷2.54=18.992→19.0；範圍 47.24–49.24→18.598→18.6／19.386→19.4；座墊 72×0.883=63.576→63.6；身高 160→S | 一致 |
| road-tall | 88×0.67=58.96→59.0；58.96÷2.54=23.213→23.2；範圍 57.96–59.96→22.819→22.8／23.606→23.6；座墊 88×0.883=77.704→77.7；身高 190→XL | 一致 |
| mtb-tall | 58.96−11=47.96→48.0；47.96÷2.54=18.882→18.9；範圍 46.96–48.96→18.488→18.5／19.276→19.3；座墊 77.7；XL | 一致 |
| hybrid-short | 68×0.64=43.52→43.5；43.52÷2.54=17.134→17.1；範圍 42.52–44.52→16.740→16.7／17.528→17.5；座墊 68×0.883=60.044→60.0；身高 155→XS | 一致 |
| road-min-inseam | 50×0.67=33.50；33.50÷2.54=13.189→13.2；範圍 32.50–34.50→12.795→12.8／13.583→13.6；座墊 50×0.883=44.15→44.2（半入）；ratio 50÷170=0.294→提醒 | 一致 |
| road-max | 110×0.67=73.70；73.70÷2.54=29.016→29.0；範圍 72.70–74.70→28.622→28.6／29.409→29.4；座墊 110×0.883=97.13→97.1；ratio 110÷220=0.500 含端點不提醒；身高 220→XXL | 一致 |

15 筆案例：9 筆字面核心案例、3 筆字面錯誤案例（`inseam-below-min` RANGE、`height-two-decimals` DECIMAL_FORMAT、`bike-type-gravel` ENUM）、3 筆 controller 案例。`road-typical` 核對點為「典型公路車：80 公分跨高 → 53.6 公分，範圍 52.6–54.6 公分」。

## 未完成事項（需家長／使用者確認後補做）

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
- 本次執行中，執行環境對 git clone 輸出跳出執行風險提示，禁止在該 checkout 內再執行 git 操作或編輯。已完成的四份文件現存於 repo 外的草稿目錄 `~/workspace/glossquote-factory/build6/specs/bike-frame-size-calculator-draft/`（BRIEF.md、SPEC.md、fixtures.json、AUTHOR-CHECK.md），尚未放入 `docs/specs/bike-frame-size-calculator/`、尚未 commit、尚未推送、尚未開 DRAFT PR。請家長確認是否繼續後，由家長或有權限的執行者將四檔移入分支 `muse/spec-bike-frame-size-calculator-20261121`（已由 FETCH_HEAD `cac5bf0d` 開好，位於 `~/workspace/glossquote-factory/build6/specs/bike-frame-size-calculator/`）並完成提交與開 PR；本任務未跑任何 registry／coordination 指令。
