# 紅包金額指南 / Red Envelope Guide — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-red-envelope-guide-20261109`

在台中上班的阿哲（28 歲）週末要去飯店參加同事婚禮，還要帶女友同行。他在手機上臨時查「同事婚禮 飯店 包多少」，只看到一堆文章各自說法不同，又怕包到單數或有 4 的金額失禮。他手上有的是：場合（婚禮）、關係（同事）、場地（飯店）、同行 2 人。這個工具讓他直接選完四個條件，拿到一個已避開 4、百位合規的建議區間和一個推薦金額，照著包就好；過年前包給長輩、包給小孩也用同一支工具查。

An office worker in Taichung is attending a colleague's hotel wedding banquet with his partner and needs one defensible envelope amount, not a pile of conflicting articles. He picks occasion, relationship, venue tier and party size, and gets an etiquette-valid range plus one recommended amount.

MVP 範圍。五種場合的固定行情查表：婚禮（關係 × 場地等級矩陣）、彌月、春節包給長輩（依包的人的身分階段）、春節包給晚輩（依小孩年齡帶）、喬遷。金額有效性以固定謂詞判定（100 的倍數、十進位字串不含 4、百位／千位尾數 ∈ {0,2,6,8}），區間端點與中點一律對齊到有效金額（詳 SPEC 第 4 節）。婚禮可加計同行人數（每多 1 人依場地等級加固定額），未出席婚禮以行情六成計算後再對齊。非目標：喪禮白包（金額規則相反，屬另一套習俗）、入學／其他祝賀場合、依收入或地區微調、紀錄已包過的紅包、任何真實金流。

首個可觀察案例。同事、一般餐廳、1 人出席，建議 1,200–2,000、推薦 1,600（`wedding-basic`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/red-envelope-guide/`，固定分支與 PR 交驗。 [預案品質與補庫說明](../../SPECIFICATION-STOCK.md)
