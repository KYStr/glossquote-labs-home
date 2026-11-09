# 點按節拍 BPM 偵測 / Tap Tempo — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-tap-tempo-20261109`

學鋼琴的使用者在串流上聽到一首想練的歌，手邊只有手機和瀏覽器，想先量出這首歌到底多快，才知道節拍器要設多少。現在他只能憑感覺猜 BPM，猜錯就整段練錯速度。本工具讓他跟著音樂在畫面上敲幾下，立刻得到以中位數算出的穩定 BPM、每拍毫秒與平均 BPM 對照；中途停太久會自動重新起算，不必手動清除。量完把 BPM 抄去節拍器即可，本工具不發聲、不播放。

MVP 範圍。即時敲擊測速（最近至多 8 個間隔的中位數）、2000 ms 間隔重置段落、匯入字面時間戳陣列重算、固定格式報告下載。非目標為播放節拍聲（那是節拍器的事）、錄音或麥克風輸入、音訊分析、速度曲線／漸快漸慢、帳號、儲存或分享。

首個可觀察案例。等距敲擊 500 ms 得 BPM 120.0（`steady-120`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/tap-tempo/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
