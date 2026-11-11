# 通膨計算機 / Inflation Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-inflation-calculator-20261109`

想知道「十年前的一百萬，放到現在值多少」的人——比較跨年薪資、房租或存款利率的人——手上有兩個數字：一筆金額，和某種通膨依據（一個假設的年通膨率，或兩期實際 CPI 指數）。現在卡在：名目成長和實質購買力是兩個方向不同的換算，逐年複利又不適合心算，最後常把「未來需要的名目金額」和「今天的錢還剩多少購買力」混為一談。

MVP 範圍。兩種模式都出貨：固定年通膨率模式（未來名目金額、實質購買力、累計通膨、逐年表）與 CPI 指數模式（以使用者輸入的兩期指數換算金額，可選相隔年數算等值年率）。非目標為內建任何 CPI 資料集（只接受使用者輸入的指數；若要附官方 CPI 表，需另以固定來源版次立約）、即時抓取外部數據、匯率換算、逐年不同利率的路徑、圖表。

首個可觀察案例。固定利率 2%、十年（`rate-basic`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/inflation-calculator/`，固定分支與 PR 交驗。[本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
