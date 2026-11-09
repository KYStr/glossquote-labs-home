# 服飾尺寸換算 / Clothing Size Converter — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-clothing-size-converter-20261109`

跨境網購男裝、女裝上衣時，手上有胸圍量測或某一制的尺寸標示，需要立刻對照 US、UK、EU、JP 四制的字母與數字尺寸。本工具用兩張釘死的固定對照表（女裝以胸圍 bust、男裝以胸圍 chest 為鍵，單位公分）做查表換算：輸入量測值或任一制尺寸，輸出同一列的全部尺寸。

MVP 範圍。成人男裝與女裝「上衣」對照、量測模式與尺寸模式、固定報告下載。非目標為鞋碼（已有 shoe-size-converter）、下身／褲裝、兒童尺寸、品牌專屬尺寸表、即時抓取外部尺寸資料、試穿建議或身材建議。

首個可觀察案例。女裝量測 88 cm 落入第 3 列（S）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/clothing-size-converter/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
