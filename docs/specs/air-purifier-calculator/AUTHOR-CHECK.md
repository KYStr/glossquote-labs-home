# 空氣清淨機選型試算 — 作者檢查

作者 `muse:spec-air-purifier-calculator-20261121`，run 6 規格作者。作者文件核對，待非作者 readiness。本文件不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 checkout 的預案與工具：最相近為既有工具 `tools/ac-capacity-calculator/`（冷氣選型，熱負荷）與 run 6 概念第 14 條 room-heater-calculator（暖氣功率）、第 27 條 aqi-interpreter（AQI 分級）；實質差異見 SPEC scope 節。本工具是清淨機的換氣率／CADR 選型，與三者皆不重複。
- 15 筆字面核心案例、2 筆 controller 案例，共 17 筆。`standard-bedroom` 核對點為「標準臥室 15 m²、預設 ACH 5.0」。

## 概念筆記更正（依來源，作者主動修正）

概念筆記第 17 條寫「CADR ≥ 面積 × 1.55」。經 2026-11-21 查核多個獨立來源（見下），該寫法把倍率方向寫反了，正確為：

- 所需煙霧 CADR（CFM）≥ 房間面積（sq ft）× 2/3（AHAM 消費者規則，8 呎天花板；恰為 5.0 ACH）；
- 建議適用面積（sq ft）= 煙霧 CADR × 1.55（AHAM Verifide 目錄數字，4.8 ACH @ 8 呎）。

1.55 是「CADR → 面積」的方向，不是「面積 → CADR」的方向。SPEC 已按來源釘版，並在 inputsOutputs 與 FAQ 寫明兩者相差約 3%（1/1.55 = 0.645 對 2/3 = 0.667），以較嚴格的 5.0 ACH 為預設。野火煙霧建議（煙霧 CADR = 面積平方呎數，即 7.5 ACH @ 8 呎）亦已釘版為 ACH 參考點。

## 來源查核（2026-11-21，公開網頁搜尋）

以下來源說法一致，互相印證；作者以 subagent 身分只能做文字搜尋與頁面文字讀取，未直接開啟 AHAM Verifide 目錄（ahamdir.com）逐條核對——獨立 reviewer 宜對 ahamdir.com 再核一次：

- AHAM 2/3 規則：煙霧 CADR 至少為房間面積（平方呎）的 2/3，8 呎天花板；例 300 sq ft → 200 CFM；天花板高於 8 呎按比例提高。
- AHAM Verifide 建議適用面積 = 煙霧 CADR × 1.55，約 4.8 ACH @ 8 呎；ENERGY STAR 以同一公式描述。
- 2/3 規則在 8 呎天花板恰為 5.0 ACH（2/3 × 60 ÷ 8 = 5）；EPA 選型表與兩者相差約 3% 以內。
- 野火煙霧：AHAM 建議煙霧 CADR 等於房間面積平方呎數（7.5 ACH @ 8 呎）。
- 單位常數由定義導出：1 ft = 0.3048 m（精確）→ 1 m² = 10.7639104… sq ft、1 m = 3.2808399… ft；1 CFM = 1.6990108… m³/h；1 坪 = 3.3057851… m²。SPEC 釘版值皆為 4 位小數截斷，誤差 < 0.001%。

## 雙重推導：手算（方法一）與腳本重算（方法二）

釘版常數：10.7639 sq ft/m²、3.3058 m²/坪、3.2808 ft/m、1.6990 m³/h/CFM、1.55 sq ft/CFM。公式：areaSqft = areaM2 × 10.7639；ceilingFt = ceilingM × 3.2808；volume = areaSqft × ceilingFt；requiredCadrCfm = ceil(volume × ACH / 60)；requiredCadrM3h = halfUp(CADR × 1.6990)；AHAM 面積 = halfUp1(CADR × 1.55)，m² 版再 ÷10.7639 取 1 位。手算中間值如下（小數略有捨入，最終整數／1 位小數以腳本重算為準，兩者一致）：

- `standard-bedroom`：15 m² → 161.4585 sq ft；2.8 m → 9.18624 ft；體積 1483.20 ft³；× 5 / 60 = 123.60 → ceil 124 CFM；124 × 1.6990 = 210.68 → 211 m³/h；124 × 1.55 = 192.2 sq ft → 17.9 m²。
- `small-room-ping`：5 坪 → 16.529 m² → 177.92 sq ft；體積 1634.4 ft³；× 5 / 60 = 136.20 → 137 CFM；137 × 1.6990 = 232.76 → 233；137 × 1.55 = 212.35 → 212.4 sq ft → 19.7 m²。
- `large-living-room`：30 m² → 322.917 sq ft；3.0 m → 9.8424 ft；體積 3178.3 ft³；× 5 / 60 = 264.86 → 265 CFM；265 × 1.6990 = 450.24 → 450；265 × 1.55 = 410.75 → 410.8 sq ft → 38.2 m²。
- `high-ceiling`：20 m² → 215.278 sq ft；3.6 m → 11.81088 ft；體積 2542.6 ft³；× 5 / 60 = 211.88 → 212 CFM；212 × 1.6990 = 360.19 → 360；212 × 1.55 = 328.6 sq ft → 30.5 m²。
- `wildfire-ach-7p5`：同 standard-bedroom 體積 1483.20 ft³；× 7.5 / 60 = 185.40 → 186 CFM；186 × 1.6990 = 316.01 → 316；186 × 1.55 = 288.3 sq ft → 26.8 m²。
- `low-ach-2`：12 m² → 129.167 sq ft；2.6 m → 8.53008 ft；體積 1101.8 ft³；× 2 / 60 = 36.73 → 37 CFM；37 × 1.6990 = 62.86 → 63；37 × 1.55 = 57.35 → 十進位半入 57.4 sq ft（反例：二進位浮點會得 57.3）→ 5.3 m²。
- `owned-adequate`：同 standard-bedroom，需 124 CFM；自有 200 CFM：200 × 1.55 = 310.0 sq ft → 28.8 m²；ACH = 200 × 60 / 1483.20 = 8.09 → 8.1；adequate true；shortfall 0。
- `owned-short`：同 large-living-room，需 265 CFM；自有 150 CFM：150 × 1.55 = 232.5 sq ft → 21.6 m²；ACH = 150 × 60 / 3178.3 = 2.83 → 2.8；adequate false；shortfall 265 − 150 = 115。
- `min-area`：1 m² → 10.7639 sq ft；2.0 m → 6.5616 ft；體積 70.63 ft³；× 5 / 60 = 5.89 → 6 CFM；6 × 1.6990 = 10.19 → 10；6 × 1.55 = 9.3 sq ft → 0.9 m²。
- `max-area`：200 m² → 2152.78 sq ft；4.0 m → 13.1232 ft；體積 28251.4 ft³；× 10 / 60 = 4708.57 → 4709 CFM；4709 × 1.6990 = 8000.59 → 8001；4709 × 1.55 = 7298.95 → 7299.0 sq ft → 678.1 m²。
- `aham-eight-foot`：15 m² → 161.4585 sq ft；2.4384 m → 8.00 ft；體積 1291.67 ft³；× 5 / 60 = 107.64 → 108 CFM；驗證：161.4585 × 2/3 = 107.64 → ceil 108，與 2/3 規則一致；108 × 1.6990 = 183.49 → 183；108 × 1.55 = 167.4 sq ft → 15.6 m²。
- `verifide-ach-4p8`：25 m² → 269.098 sq ft；2.8 m → 9.18624 ft；體積 2472.0 ft³；× 4.8 / 60 = 197.76 → 198 CFM；198 × 1.6990 = 336.40 → 336；198 × 1.55 = 306.9 sq ft → 28.5 m²。
- 錯誤案例：`area-zero`（面積 0 → RANGE areaValue）、`ach-too-high`（ACH 12 → RANGE targetAch）、`area-too-many-decimals`（12.34567 小數 5 位 → DECIMAL_FORMAT areaValue）。
- Controller 案例 `state-dirty-error`、`state-cancel-late` 為狀態流程字面案例，無數值推導；lateResult 與 `standard-bedroom` 的 result 相同。

方法二：獨立 Python 腳本（Decimal 十進位運算，/tmp/apc_verify.py 手算核對用、/tmp/apc_check.py 讀檔重算）重算全部 12 筆成功核心案例，逐欄比對 fixtures.json 的 expected，12/12 一致、0 不符；3 筆錯誤案例形狀正確；fixtures.json 為合法 JSON，共 17 筆（15 core + 2 controller）。

## 其他檢查

- 捨入釘版：requiredCadrCfm 無條件進位（下限不向下捨入）；其餘輸出十進位 half-up、只在輸出步驟套用一次；`low-ach-2` 的 57.35 → 57.4 為二進位浮點反例，已寫進 SPEC。
- 預設值：ceilingHeightM 2.8、targetAch 5.0、areaUnit m2；areaValue 無預設。驗證順序 areaValue → areaUnit → ceilingHeightM → targetAch → purifierCadrCfm；錯誤碼 SCHEMA／INPUT_LIMIT／EMPTY／DECIMAL_FORMAT／INTEGER_FORMAT／ENUM／RANGE 已釘版。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
