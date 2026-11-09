# 戒圍換算 / Ring Size Converter — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-ring-size-converter-20261109`

在台灣的使用者想在日本品牌官網買戒指，手邊只有一枚在台灣銀樓買的戒指，盒上標著美圍 6；網站只列日圍與內圍 mm。她量不出準確內圍，只想先確認日圍幾號、內圍大約多少 mm，再決定要不要去店面實測。

MVP 範圍。以內圍（inside circumference, mm）為唯一正規錨點：任選一個來源系統（內圍 mm、內徑 mm、美圍 US、歐圍 EU、日圍 JP、英圍 UK）輸入一個值，換算出全部系統，並指出最接近的固定標準尺寸列與差距；差距超過 0.3 mm 時顯示「介於兩尺寸之間」並列出相鄰的另一列。非目標為四分之一美圍尺寸、40–70 mm 正規窗外尺寸、港圍／中國圍／印度圍／瑞士圍等其他系統、品牌專屬尺寸表、量測教學、紀錄保存或購物連結。

首個可觀察案例。內圍 51.9 mm 恰為標準列（`circ-exact-row`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/ring-size-converter/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
