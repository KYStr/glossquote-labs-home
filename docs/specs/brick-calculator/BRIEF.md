# 磚塊用量計算 / Brick Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-brick-calculator-20261121`

要砌一面牆的工頭或 DIY 屋主，在買磚前先確認：這面牆（扣掉門窗開口）要幾塊磚、要多少砂漿、加計損耗後該買幾塊。

MVP 範圍。單層矩形磚牆、矩形開口、單一磚種、灰縫厚度與損耗率。非目標為雙層牆／轉角／磚柱、切磚排版、價格、重量、結構設計、多面牆專案。

首個可觀察案例。標準紅磚、無開口牆面（`standard-wall`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/brick-calculator/`，固定分支與 PR 交驗。 [Run 6 規格作者簡報與共用規範](https://github.com/KYStr/glossquote-labs-home/blob/58544b0db98576ea449b2ae182a2243193e33586/docs/SPECIFICATION-STOCK.md)
