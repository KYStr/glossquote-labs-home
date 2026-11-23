# 圖片檔案大小估算 / Image File Size Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-image-file-size-calculator-20261121`

使用者在上傳、寄送或排版前，先以圖片寬×高像素、色彩深度與格式，估算一張靜態圖片的檔案大小（KB／MB），判斷是否超過上傳或附件上限。

MVP 範圍。單張靜態圖片、像素尺寸、色彩深度、七種格式的釘版典型壓縮係數（皆明示為估算值）、未壓縮大小公式與 KB／MB 顯示。非目標為影片（影格率／時長不適用）、讀取真實檔案、依內容實測壓縮、品質滑桿、DPI／列印尺寸換算、批次比較與格式推薦。

首個可觀察案例。1200 萬像素照片存為 JPEG 的估算大小（`jpeg-photo-12mp`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/image-file-size-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/6f420042/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
