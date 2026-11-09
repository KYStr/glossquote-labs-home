# 批次文字套版 / Personalized text batch

Turn a CSV list and a literal `{{column}}` template into per-row text for review and local TXT/JSON export. Missing or unknown values are diagnosed before generation. Nothing is sent or uploaded.

將 CSV 名單套入 `{{欄名}}` 靜態範本，逐筆檢查並在本機匯出 TXT／JSON。沒有帳戶、資料儲存、telemetry 或遠端資源。

This is the reviewed source candidate for https://github.com/KYStr/glossquote-labs-template-merge. Hosting and external review are pending; a public repository does not establish a live website.

## Run and verify

Requires Node.js 24 or later. There are no npm dependencies and no installation step. From a fresh clone, build the preview assets **before running tests**, because release tests use the generated dist tree as a fixture.

```sh
node scripts/build.mjs
node --test test/*.test.mjs
node scripts/check.mjs
node scripts/release.mjs build
node scripts/release.mjs check
```

Equivalent package scripts are `npm run build`, `npm test`, `npm run check`, `npm run build:release`, and `npm run check:release`. Tests use synthetic data and offline Node seams. They do not access the OS clipboard or native dialogs.

`dist/` is a noindex preview. The separately built formal candidate is `release-artifacts/site/`; its manifest is `release-artifacts/manifest.json`. These generated folders are ignored by Git. The builder refuses changed, unmanaged or incomplete output instead of overwriting it. The release contains exactly three redirects to the explicit Chinese/English index.html paths.

For local manual preview, `npm run dev` binds only to `127.0.0.1:4223`. Do not expose that development listener. No server was started during source publication.

## Evidence and boundaries

See [HANDOFF](HANDOFF.md) and [acceptance record](evidence/review/acceptance.json). The primary isolated browser run recorded 37 PASS / 5 NOT_RUN / 0 FAIL. Native/physical checks and true 200% zoom remain manual NOT_RUN. Live hosting/HTTP behavior and external review remain pending.

The original [product](PRODUCT.md), [technical](TECHNICAL.md), [UX/SEO](UX-SEO.md), and [acceptance](ACCEPTANCE.md) documents are retained as historical requirements; their original stage labels do not describe the current implementation status.
