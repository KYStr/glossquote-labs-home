# 景深計算 / Depth of Field Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-depth-of-field-calculator-20261121`

攝影者在按下快門前，先確認這顆鏡頭、這級光圈、這個對焦距離下，畫面中哪一段前後範圍看起來是清晰的，以及把焦點放在超焦距時能從多近一路清晰到無限遠。

MVP 範圍。薄透鏡幾何光學模型：焦距、光圈值、對焦距離與感光元件 CoC（表定或自訂）→ 近限、遠限、景深總長與超焦距。非目標為讀取 EXIF、鏡頭資料庫、繞射極限、對焦堆疊、景深預覽影像、曝光計算、等效焦距換算。

首個可觀察案例。全片幅 50mm f/8 對焦 3 m 的標準景深（`full-frame-50mm-f8-3m`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/depth-of-field-calculator/`，固定分支與 PR 交驗。 [本輪規格作者簡報](https://github.com/KYStr/glossquote-labs-home/blob/92b5743e93c282c068b3b8cca2ef2453e354e9fb/docs/SPECIFICATION-STOCK.md)
