# 小數欄位清洗 / Decimal Column Parser — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-decimal-column-parser-20261109`

資料匯入人員收到小數點和群組符號慣例不同的數字欄，要明確指定來源規則，逐列找出解析問題，拿到標準 ASCII 小數。

MVP 範圍。單欄逐列解析、兩種標點慣例與可選固定小數位的精確量化。不偵測地區、不做 CSV 引號、數值計算、貨幣轉換、計算表公式、百分比、計量單位、會計認證。

首個可觀察案例。兩個中間值、補零與前導零（`dot-round`）。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/decimal-column-parser/`，固定分支與 PR 交驗。 [本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md)
