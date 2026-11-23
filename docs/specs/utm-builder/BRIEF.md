# UTM 連結產生器 / UTM Builder — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-utm-builder-20261121`

行銷人員在貼文、廣告或電子報放連結前，先把目標網址加上 UTM 追蹤參數，拿到一條可直接貼上的完整連結，讓分析工具能分辨流量來源。

MVP 範圍。輸入目標網址與 UTM 參數（source、medium、campaign 必填，term、content 選填），輸出帶 UTM 的完整連結；參數命名、URL 編碼（空格一律 `%20`）、既有查詢參數合併方式皆釘版；附三組常用範本（社群、電子報、廣告）。非目標為網址縮短、QR 碼、抓取頁面標題、造訪或驗證目標網址、儲存或管理多組活動、把結果當成分析報表。

首個可觀察案例。基本社群連結（`basic-social`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/utm-builder/`，固定分支與 PR 交驗。run 6 概念筆記第 33 條。
