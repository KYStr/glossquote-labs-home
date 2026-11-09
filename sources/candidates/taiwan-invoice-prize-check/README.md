# 統一發票對獎 · Taiwan Uniform Invoice Prize Check

完全在本機瀏覽器運算的統一發票對獎工具：先抄入本期開獎號碼，再逐張完整對獎
（確切獎項、標準金額與中獎規則）、用末 3 碼快速篩選（只說可能或不可能，絕不
假裝給出獎項），或整批貼上最多 500 行一次檢查。號碼全程以字串處理，前導零
不遺失；全寬數字自動轉半寬。零 runtime 依賴、不連網、不儲存。

An offline Taiwan uniform-invoice prize checker that runs entirely in the
browser. Enter the period's winning numbers once, then check invoices one by
one (exact tier, standard amount, and the matching rule), screen by the last
3 digits (honest “possible / cannot win” answers only — never a fake
verdict), or paste a batch of up to 500 lines. Numbers are strings
throughout, so leading zeros survive; full-width digits are converted
automatically. Zero runtime dependencies, no network, no storage.

## 本機開發 · Local development

```sh
npm run dev    # serve the preview at http://127.0.0.1:4173
npm test       # node:test suites (core fixtures + controller via DOM shim)
npm run check  # project check (structure, CSP, forbidden APIs, SPEC fixtures)
npm run build  # copy public/ to dist/ byte-identically (preview only; production is refused)
```

## 已知規格差異 · Known specification discrepancy

SPEC §4 的 worked fixture 將 99994444 標為六獎（k=3)，但它與頭獎第 2 組
33334444 的最長共同後綴是 4 碼（"4444")，依同節規則應為五獎；同組其他
fixture（00002222 → k=4 五獎）也支持此讀法。本實作以規則為準，差異記錄於
`VERIFICATION.md`，待規格批次審查裁決。

The SPEC section 4 fixture labels 99994444 as Sixth Prize (k=3), but its
longest common suffix with First Prize set 2 (33334444) is 4 digits
("4444"), which the section's own rule maps to Fifth Prize — consistent
with the neighbouring fixture 00002222 → k=4, Fifth. This implementation
follows the rule; the discrepancy is documented in `VERIFICATION.md`.

## 狀態 · Status

本 repo 為作品集候選版本（依 2026-11-02 build-first 指示先行建置，registry 登錄與審查
於後續批次階段處理），未部署、未上架。見 `PRODUCTION-STATUS.md` 與 `VERIFICATION.md`。

This repository is a portfolio candidate built under the owner's 2026-11-02
build-first directive; registry registration and review are held for the
later bulk phase. It is not deployed or published. See
`PRODUCTION-STATUS.md` and `VERIFICATION.md`.
