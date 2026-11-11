# 螢幕 PPI 計算 / Screen PPI Calculator — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-screen-ppi-calculator-20261109`

買螢幕、手機或電視時，手上有原廠規格表的對角線英寸與原生解析度，想在下單前先知道實際像素密度、畫面實體大小與點距，來判斷文字會不會太小、和手邊的螢幕比哪一台比較細緻。

MVP 範圍。單一模式：輸入對角線（英寸）＋水平／垂直像素，輸出 PPI、實體寬高（cm)、點距（mm)、總像素（百萬像素）與約分後的長寬比標籤。非目標為由長寬比反推缺少的邊（那是 aspect-ratio-calculator 的求解模式）、雙螢幕比較、DPI 沖印尺寸、單位輸入切換或保存結果。

與既有 aspect-ratio-calculator 的界線明確：該工具把比例約分並求解缺邊；本工具只把約分比例當作衍生標籤顯示，不提供任何求解、預設比例或反推功能。

首個可觀察案例。24 英寸 FHD 螢幕（`fhd-24`)。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/screen-ppi-calculator/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
