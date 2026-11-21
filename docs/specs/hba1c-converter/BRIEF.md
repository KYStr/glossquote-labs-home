# 糖化血色素換算 / HbA1c Converter — BRIEF

**文件草案，產品檢查 NOT_RUN** · `spec-hba1c-converter-20261121`

拿到一份 HbA1c 檢驗報告（% 或 mmol/mol），或一個平均血糖數字（mg/dL 或 mmol/L），想知道它在另外三種單位下是多少、落在 ADA 的哪個分級帶。輸入一個數值與它的單位，一次得到四種表示法與分級說明。

MVP 範圍。單一數值、四種單位雙向換算：HbA1c %（NGSP/DCCT）、HbA1c mmol/mol（IFCC）、eAG mg/dL、eAG mmol/L。公式釘版：eAG（mg/dL）= 28.7 × A1c − 46.7（ADAG／ADA），eAG（mmol/L）= 1.5944 × A1c − 2.594（ADAG 論文 mmol/L 迴歸式），IFCC（mmol/mol）= (A1c% − 2.15) × 10.929（NGSP/IFCC 主方程式）。非目標為診斷、治療建議、追蹤記錄、血糖機數據匯入、把估算值當成實測平均血糖。

首個可觀察案例。A1c 7% → 53 mmol/mol、eAG 154 mg/dL（8.6 mmol/L），糖尿病範圍。字面資料與預期見 [fixtures.json](fixtures.json)，契約以 [SPEC.md](SPEC.md) 為準。

先完成核心／狀態測試，再交雙語靜態頁、匯出、build/check、同一候選的九面向證據。目標 `tools/hba1c-converter/`，固定分支與 PR 交驗。[本批原始說明](https://github.com/KYStr/glossquote-labs-home/blob/c8ca5fd/docs/SPECIFICATION-STOCK.md)
