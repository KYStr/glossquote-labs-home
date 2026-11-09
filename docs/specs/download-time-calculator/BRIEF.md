# 下載時間計算機 / Download Time Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-download-time-calculator-20261109`

使用者在電腦前準備下載一個 50 GB 的遊戲更新，家裡網路標稱 100 Mbps。他手上有檔案大小和方案速度，想先知道大概要下多久、今晚幾點開始下、明早起床前能不能完成，而不是下載到一半才發現來不及。

MVP 範圍。單一檔案、固定速度、固定效率折減的傳輸時間估算：檔案大小（十進位 SI 與二進位 IEC 單位分開選）、速度（Mbps 或 MB/s）、效率 %、開始時間。非目標為實際測速、即時進度、多檔案排程、尖峰塞車模型、從 URL 抓取檔案大小。

首個可觀察案例。4.7 GB 以 100 Mbps 下載需 6 分 16 秒（`basic-gb`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/download-time-calculator/`，固定分支與 PR 交驗。
