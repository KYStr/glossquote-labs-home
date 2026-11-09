# 文字偏移位置互查 / Text Offset Map — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-text-offset-map-20261109`

工程師讀到編譯器、索引檔或瀏覽器回傳的偏移值時，找出同一位置在 UTF-8、UTF-16 及 Unicode scalar 的對應座標。成功是能解釋該偏移是否落在字元邊界，並定位到來源行。

MVP 範圍。一份 LF 文字與一次偏移查詢。支援結尾游標，不把合成字或 emoji ZWJ 當單一 grapheme，不量畫面欄寬、原始 CRLF 檔、原始碼解析或批次標註。

首個可觀察案例。A 一 byte、笑臉四 bytes 之後（`after-emoji`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/text-offset-map/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
