# 網址 slug 產生器 / URL Slug Generator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-url-slug-generator-20261121`

部落客或小編寫好文章標題後，要一個可直接放進網址路徑的 slug：全部小寫、ASCII、連字號分隔，貼進 CMS 不用再手修。

MVP 範圍。輸入標題文字（必填）與長度上限（選填，預設 50），輸出單一 slug；去重音／轉寫規則、分隔合併、前後連字號去除與截斷皆釘版；中文不做拼音轉寫，視為分隔字元捨棄。非目標為檢查 slug 是否已被使用、自動加 -2 / -3 去重後綴、拼音轉寫、保留非 ASCII 原字、產生完整網址、附加 UTM 參數、網址縮短、QR 碼。

首個可觀察案例。基本標題轉 slug（`basic-title`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/url-slug-generator/`，固定分支與 PR 交驗。run 6 概念筆記第 34 條。
