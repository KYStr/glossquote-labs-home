# 房貸攤還試算 · Mortgage Amortization Calculator

完全在本機瀏覽器運算的房貸逐月攤還試算：本息平均或本金平均攤還、可選寬限期、
兩段式利率與最多 12 筆提前還款（縮短期數或減少月付），並與無提前還款的基準情境
比較省下的利息。所有金額以整數分幣計算，利息逐月依精確整數運算四捨五入到分，
不用浮點數碰錢；攤還表可匯出為與畫面逐格一致的 CSV。零 runtime 依賴、不連網、不儲存。

An offline mortgage amortization calculator that runs entirely in the browser:
annuity or equal-principal repayment, an optional grace period, a second rate
tranche, and up to 12 prepayment events (reduce-term or reduce-payment),
compared against the no-prepayment baseline. All money is integer cents;
monthly interest is exact integer arithmetic rounded half-up to the cent —
no floating point ever touches money. The ledger exports to CSV matching the
displayed table cell for cell. Zero runtime dependencies, no network, no storage.

## 功能 · Features

- 寬限期上限為 min(60 個月， 年期一半），超過直接報錯、不默默截斷
  Grace is capped at min(60 months, half the term) — exceeding it is an error, never a silent clamp
- 兩段式利率：第二段利率自指定月份起生效；本息平均會在切換月以當時餘額與剩餘期數重算月付
  Two-tranche rates from a chosen month; the annuity payment is recomputed at the switch
- 提前還款落在寬限期內也有效；金額超過該月還款後餘額時，錯誤訊息會直接寫出上限
  Prepayments during grace work; an over-balance prepayment error names the maximum
- 結果是估算值而非銀行報價的聲明，在雙語頁面的結果區上方常駐顯示
  The planning-estimate disclaimer (not a bank quotation or financial advice) sits above the results in both languages

## 本機開發 · Local development

```sh
npm run dev    # serve the preview at http://127.0.0.1:4173
npm test       # node:test suites (core fixtures + controller via DOM shim)
npm run check  # project check (structure, CSP, forbidden APIs, SPEC formula anchors)
npm run build  # copy public/ to dist/ byte-identically (preview only; production is refused)
```

## 已知規格差異 · Known specification discrepancy

SPEC §4 的 worked fixture 印出的月付 40,803.45 與總利息 2,407.94，與同節自訂的年金
公式精確求值（40,802.65 與 2,407.96）不一致，差額為手算誤差等級。本實作以公式為準
（SPEC §1 要求帳表可由公式重導），差異細節記錄於 `VERIFICATION.md`，待規格批次審查裁決。

The SPEC section 4 worked fixture prints a payment of 40,803.45 and total interest
2,407.94, but exact evaluation of the section's own annuity formula gives 40,802.65
and 2,407.96. This implementation follows the formula (SPEC section 1 requires the
ledger to be re-derivable from the formulas); the discrepancy is documented in
`VERIFICATION.md` for the specification's bulk review.

## 狀態 · Status

本 repo 為作品集候選版本（依 2026-11-02 build-first 指示先行建置，registry 登錄與審查
於後續批次階段處理），未部署、未上架。見 `PRODUCTION-STATUS.md` 與 `VERIFICATION.md`。

This repository is a portfolio candidate built under the owner's 2026-11-02 build-first
directive; registry registration and review are held for the later bulk phase. It is not
deployed or published. See `PRODUCTION-STATUS.md` and `VERIFICATION.md`.
