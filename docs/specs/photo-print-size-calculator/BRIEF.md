# 照片沖印尺寸計算 / Photo Print Size Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-photo-print-size-calculator-20261109`

要把手機或相機裡的照片拿去沖印店印出來的人，手上有檔案資訊裡的像素寬高，卻不知道這張照片最大能印到多大還夠銳利、想印的尺寸到底需要多少像素、或硬印某個尺寸實際只剩多少 DPI。現在只能靠店員口頭判斷或網路上口徑不一的對照表。

MVP 範圍。三種模式共用同一份釘版標準尺寸表（3×5、4×6、5×7、6×8、8×10、10×12、A5、A4、A3，方向無關、長邊對長邊）：(a) 最大可印尺寸——像素＋目標 DPI（預設 300，另有 150/240 預設鈕與自訂）→ 每邊最大英寸／公分與面積最大的符合標準尺寸，並逐一列出每個標準尺寸的兩邊實際 DPI、有效 DPI、品質帶與符合判定；(b) 反推需求——選定標準尺寸＋目標 DPI → 每邊需求像素（無條件進位）與總百萬像素；(c) 實際 DPI——像素＋選定標準尺寸 → 兩邊 DPI 與取小邊的有效 DPI 及品質帶。非目標為上傳或讀取照片檔／EXIF、裁切或補白邊計算、出血與無邊滿版公差、印表機原生插值、保存結果。

首個可觀察案例。2400 萬像素（6000×4000）在 300 DPI 下九個標準尺寸全數符合、建議最大為 A3（`max-24mp-300`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/photo-print-size-calculator/`，固定分支與 PR 交驗。[本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
