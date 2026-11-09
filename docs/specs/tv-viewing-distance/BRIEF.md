# 電視尺寸與觀賞距離 / TV Viewing Distance Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-tv-viewing-distance-20261109`

準備買電視的議翔在賣場看上一台 55 吋電視，手上只有賣場標示的對角線吋數，不知道螢幕實際寬 × 高（cm）放不放得下家裡的電視櫃，也不知道客廳沙發坐多遠才合適；另一種情況是沙發位置已經固定、先量好了到電視牆的距離（例如 300 cm），卻不知道該買幾吋。在手機上輸入吋數（或距離），立刻得到 16:9 螢幕寬高與最近／理想／最遠觀賞距離（或反推的建議吋數範圍），賣場當場就能對照。

MVP 範圍。固定 16:9；正向模式（吋數→寬高＋四個距離，可加房間距離做 fit 判定）與反推模式（距離→建議吋數範圍）二選一由已填欄位決定；解析度 FHD／UHD 4K 只影響最近距離倍率（1.2／1.0）。倍率固定為經驗法則：最近 ×1.2（4K ×1.0）、理想 ×1.5–×2.0、最遠 ×2.5，源自 THX 約 36–40° 與 SMPTE 約 30° 視角建議的一般性標示，不是精確角度換算。非目標為其他長寬比、視角度數直接換算、VESA 孔距與承重、投影機、多螢幕、依型號查規格。

首個可觀察案例。55 吋 FHD 的寬高與四個距離（`forward-55-fhd`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/tv-viewing-distance/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
