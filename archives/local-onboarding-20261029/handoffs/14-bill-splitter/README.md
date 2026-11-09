# 分帳與墊款結算 / Bill Splitter

Gloss Tools by GlossQuote 的共同費用結算表。預設快速：填每人姓名與已付，沒付填0，自動加總並平均分攤。進階使用同一份付款資料，可選平均或份數；沒有重填總額或墊款開關。兩者都先列誰付給誰。由一人在本頁整理大家的付款，不是多人同步／逐筆帳本。只計算建議，不轉帳、催款或連結帳號。

A bilingual settlement worksheet. Enter each person's name and payments, including 0. Both modes total payments automatically: quick splits equally; advanced offers equal splitting or shares. Transfers appear first. There is no separate total input or payment toggle. One person collects the shared costs on this page; this is not a per-expense ledger or live collaboration. Details stay in page memory; copy or download when you choose.

## Run locally

Requires Node.js 24 or later. There are no runtime or development package dependencies; no install step is needed.

```sh
npm run dev
npm test
npm run check
npm run build
npm run build:production
npm run check:production
```

The development server binds only to `127.0.0.1:4194`. If occupied, it chooses an available loopback port and prints it. Chinese: `/index.html`; English: `/en/index.html`. The default build is a noindex preview. Production builds use the fixed origin `https://split.glossquote.com`; deploying is a separate release step.

## Calculation and limits

- 2–50 people, names up to 40 Unicode code points; duplicate names retain stable numbers.
- 0 or 2 decimal places. Maximum total: 99,999,999 or 99,999,999.99 respectively.
- Integer shares from 0 to 1000; zero-share participants may still pay upfront.
- BigInt smallest-unit arithmetic and largest remainders, with ties in creation order.
- Each payment and the automatic sum obey the amount cap. Zero total is valid; shares cannot all be zero in share mode. Zero-share payers can still receive settlement.
- Settlement always runs in both modes, in a fixed reproducible order. It does not claim minimum transfer count. Advanced English reports use Share, not Equal share.
- Editing any input invalidates the old result and disables exports. Switching language clears the current worksheet.

## Verification and release status

U14 v2 (package 1.1.0) is a local candidate. The primary independently verified fixed code: 31/31 tests and check/preview/production gates, 10,000 core property/comparison cases plus boundaries, bilingual Chrome flows, 320px, and scoped clipboard/TXT checks. See [test results](docs/TEST-RESULTS.md). Real 200% zoom, AT/readers, devices, full Network/Storage, clipboard denial/late promise and the full browser matrix remain NOT_RUN. Passing local or source checks does not establish live hosting or external acceptance.

Source repository: [KYStr/glossquote-labs-bill-splitter](https://github.com/KYStr/glossquote-labs-bill-splitter). Deployment URLs remain `https://split.glossquote.com/index.html` and `/en/index.html`. The earlier deployed 88f2036 version was externally accepted; that approval does not apply to U14. New source publication, primary release integration and new external review are separate stages. Hosting and homepage integration belong to the primary release owner.

See [product](PRODUCT.md), [technical contract](TECHNICAL.md), [UX and SEO](UX-SEO.md), [acceptance cases](ACCEPTANCE.md), [privacy](docs/PRIVACY-SECURITY.md) and [release procedure](docs/RELEASE.md). `source-manifest.json` records exact source bytes and production asset hashes; it excludes its own bytes to avoid a circular hash. No open-source license is assigned by this publication.
