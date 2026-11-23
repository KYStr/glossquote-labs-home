# 太陽能回本試算 / Solar Payback Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-solar-payback-calculator-20261121`

屋主在自家屋頂裝太陽能之前，先用裝置容量、屋頂面積、年日照時數、建置成本、台灣躉購費率與自用比例，算出一年發多少電、一年拿回多少錢、幾年回本。

MVP 範圍。靜態試算模型：年發電量＝裝置容量 × 年等效日照時數；售電收入用 2026 年（115 年度）經濟部公告屋頂型躉購費率（按容量級距查表）；自用部分按使用者填的零售電價折算節省；回本年數＝建置成本 ÷ 年收益，不計折舊、維運、折現與補助。非目標為即時費率查詢、實際發電保證、補助申請、結構安全評估、併網申辦。

首個可觀察案例。9 kWp 屋頂、年日照 1,250 小時、自用 30%（`typical-rooftop-9kw`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/solar-payback-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/SPEC-AUTHOR-BRIEF.md)
