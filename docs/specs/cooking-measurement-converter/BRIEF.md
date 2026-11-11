# 料理單位換算 / Cooking Measurement Converter — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-cooking-measurement-converter-20261109`

家庭料理者照美式食譜備料，手邊只有廚房秤（或反過來只有量杯量匙），需要把杯／湯匙／茶匙／毫升與公克互相換算；重量與體積的換算只經一份固定的食材密度表，不用約略的萬用係數。

MVP 範圍。單位 ml、tsp、tbsp、cup、g；12 種食材的公克／杯密度表（主要採 King Arthur Baking 食材重量表，奶油採同出版社教材的每杯值）；目標單位為 cup 時附最接近的八分之一杯分數表示；固定報告下載。非目標為盎司／磅、250 ml 公制杯與英制量匙、溫度換算、食譜倍量縮放、表外食材、自訂密度、熟食狀態換算。

首個可觀察案例。1 杯中筋麵粉換算為 120 公克（`example-cup-flour-to-grams`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/cooking-measurement-converter/`，固定分支與 PR 交驗。本批共享作者簡報（run 5）為撰寫依據；體積基準與密度表來源的查證紀錄見 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)。
