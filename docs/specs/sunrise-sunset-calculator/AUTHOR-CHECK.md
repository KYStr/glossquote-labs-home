# 日出日落時間計算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格任務 `labs-sunrise-sunset-calculator-spec-20261109`（由主代理登記）。這是作者本人對文件的檢查，**不是獨立審查**；非作者 reviewer 仍須對同一固定 head 重算案例、核對八節後才可 mark-spec-ready。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重。已比對 base commit 的 `docs/specs/` 全部預案、`tools/` 與 `sources/`：無任何日出／日落或太陽出沒計算的既有規格或工具。最相近者與差異已寫入 SPEC scope：月相計算機（月球朔望模型，輸出月相而非太陽出沒時刻）、時區換算（只換算已知時刻，無天文計算）、睡眠週期（無天文成分）。`pickup-window-route` 僅在配送情境文案出現「日出」字樣，非太陽計算。

- 案例推導（獨立實作，未用任何產品程式）。作者依 NOAA 公布的 fractional-year 公式原文，在 scratch 環境寫了兩份結構不同的實作交叉驗證：第一份以年內日序計 doy、cosHa 用 `cos(90.833°)/(cosφ·cosδ) − tanφ·tanδ` 式；第二份以 Julian day number 計 doy、cosHa 改用等價式 `(cos(90.833°) − sinφ·sinδ)/(cosφ·cosδ)`。兩份對 7 個成功案例的全部輸出（日出／正午／日落／dayOffset／日長）逐值相同，fixtures 即採此推導值。特羅姆瑟兩案的 cosHa 分別約 1.122 與 −1.215，與 POLAR_NIGHT／POLAR_DAY 判定一致。

- 與公布值對照（僅作者檢查用容差 ±2 分鐘；fixtures 本身是固定算法的精確輸出，不因此調整）。台北 2026-06-21：推導日出 05:04、 日落 18:46；公布參考值約 05:04／18:47，日出差 0 分、日落差 1 分，在容差內。台北 2026-11-09：推導 06:06／17:09，與台北 11 月上旬公布日出日落量級一致。赤道春分案日長 12:07 > 12:00，符合天頂角 90.833° 的預期。

- 捨入穩定性。7 個成功案例中，離 floor(x+0.5) 進位邊界最近的是台北 2026-11-09 日落，未捨入值小數部分距 0.5 邊界約 0.0049 分（約 0.3 秒）；其餘皆 ≥0.0077 分。此量級遠大於 IEEE-754 雙精度跨引擎（JS/Python libm）的誤差（約 1e-9 分），故 fixtures 在任何合規實作下穩定。

- 概念筆記未固定、由作者裁決並寫入 SPEC 的事項：
  1. γ 固定以當地正午（hour=12）取值，工作表的 (hour−12)/24 項為 0；SPEC 明文記載，避免實作者自行引入時刻輸入。
  2. 緯度範圍固定 ±89.9 而非概念筆記候選的 ±90：極點上 cosφ=0、tanφ 發散使公式退化；極晝／極夜改由 cosHa 定義域判定，±89.9 已足以涵蓋一切可觀測的極晝極夜。
  3. UTC 偏移固定為 15 分鐘步階、−12:00 至 +14:00：文法（含 :45）歸 OFFSET_FORMAT、總分鐘越界歸 RANGE，兩層分開；歷史上非 15 分鐘步階的偏移（如早期 LMT）列為非目標。
  4. 跨日處理固定為每個時刻各自帶 dayOffset ∈ {−1,0,1}（以已捨入分鐘計），顯示一律 mod 1440 的 HH:MM；日長由未捨入值相減後一次捨入，不由顯示時刻相減。
  5. 極晝／極夜時太陽正午亦回 null：固定偏移下「正午」在極夜無觀測意義，且 NOAA 工作表不定義此二狀態的任何時刻，避免實作者自行補值。
  6. 城市預設固定 8 個（台北、台中、高雄、東京、雪梨、倫敦、紐約、雷克雅維克），座標 4 位小數；雪梨預設偏移 +10:00 為標準時間，夏令由使用者改 +11:00（fixtures 的雪梨案即如此）。
  7. 太陽正午納入輸出（概念筆記 §31 明列），太陽正午不等於 12:00 一點已寫入 FAQ。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
