# 密碼產生與強度檢查 · Password Generator and Strength Checker

完全在本機瀏覽器運算的密碼工具：以 `crypto.getRandomValues` 加拒絕取樣產生隨機密碼，
或從內附的 7,776 字 EFF 大型詞表產生口令片語；強度檢查用公開、可重算的模型
（基礎熵減去逐項列出的扣分），並把每個數字怎麼來的都寫清楚。零 runtime 依賴、
不連網、不儲存，關閉分頁後不留任何東西。

A password tool that runs entirely in the browser. Random passwords are drawn with
`crypto.getRandomValues` and rejection sampling; passphrases come from the bundled
7,776-word EFF Large Wordlist. The strength checker uses a published, recomputable
model — base entropy minus itemised penalties — so every figure can be traced.
Zero runtime dependencies, no network, no storage; closing the tab leaves nothing.

## 功能 · Features

- 隨機密碼：長度 8–128、四個字元集開關、排除易混淆字元（l、I、1、O、0）、每組 1–10 個、
  每個啟用的字元集保證至少出現一次（靠整組重抽，不做插入修補）、逐項顯示熵
  Random passwords: length 8–128, four set toggles, ambiguous-character exclusion,
  batches of 1–10, a per-set guarantee by whole-candidate redraw (never patching),
  entropy shown per item
- 口令片語：3–10 個單字、五種分隔方式、可選一個單字大寫與結尾隨機數字，熵逐項加總
  Passphrases: 3–10 words, five separators, optional one capitalised word and one
  trailing digit, entropy accounted option by option
- 強度檢查：基礎熵、字典單字／重複／序列／鍵盤連打／年份／太短六種扣分逐項列出，
  結果不引用被檢查的密碼本身
  Strength check: base entropy plus six itemised penalties (dictionary, repeats,
  sequences, keyboard walks, years, too short); the result never quotes the input
- 一鍵清除三個模式的所有內容
  One wipe control clears all three modes

## 本機開發 · Local development

```sh
npm run dev    # serve the preview at http://127.0.0.1:4173
npm test       # node:test suites (core fixtures, wordlist, controller via DOM shim)
npm run check  # project check (structure, CSP, forbidden APIs, normative fixtures)
npm run build  # copy public/ to dist/ byte-identically (preview only; production is refused)
```

## 隱私與安全 · Privacy and security

產生的密碼只存在於頁面記憶體與你主動複製後的剪貼簿；不寫入 URL、標題、日誌或
任何儲存。強度數字是模型估計、不是保證——頁面上也會這樣寫。產生的密碼請存進
可靠的密碼管理器；螢幕上的密碼仍可能被截圖或旁人看到，這點頁面也有提醒。

Generated secrets live only in page memory and, after an explicit copy click, in
your clipboard — never in the URL, title, logs, or any storage. Strength figures
are model estimates, not guarantees, and the page says so. Keep generated
passwords in a reputable password manager; a password on screen can still be
captured by a screenshot or a shoulder-surfer.

## 詞表出處 · Wordlist provenance

口令片語詞表是 EFF（Electronic Frontier Foundation）的大型詞表，來源、SHA-256
與授權（CC BY 3.0 US）記錄在 `WORDLIST-SOURCE.md`；測試會驗證 7,776 個詞不重複。

The passphrase list is the Electronic Frontier Foundation's Large Wordlist;
source, SHA-256 and licence (CC BY 3.0 US) are recorded in `WORDLIST-SOURCE.md`,
and the test suite verifies all 7,776 entries are unique.

## 狀態 · Status

本 repo 為作品集候選版本（依 2026-11-02 build-first 指示先行建置，registry 登錄與審查
於後續批次階段處理），未部署、未上架。見 `PRODUCTION-STATUS.md` 與 `VERIFICATION.md`。

This repository is a portfolio candidate built ahead under the owner's
2026-11-02 build-first directive; registry registration and review follow in
the bulk phase. It is not deployed or published. See `PRODUCTION-STATUS.md`
and `VERIFICATION.md`.
