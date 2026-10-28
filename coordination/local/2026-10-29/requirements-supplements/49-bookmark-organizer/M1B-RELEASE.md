# B20-RP-49 — 離線發布準備候選

2026-10-23（Asia/Taipei）。此輪是 **M1B**，不是 M2／上線放行。預定 origin 固定為 `https://bookmarks.glossquote.com`，toolSlug 固定為 `bookmark-organizer`；該網址不代表已部署。

## 重現方式

現有 Node 24、ESM builtins、零新依賴，不執行 npm install：

```text
npm run build:release
npm run check:release
```

兩個 scripts 各對應 `node scripts/release.mjs build` 與 `node scripts/release.mjs check`。省略 mode、未知 mode、多餘參數或 origin 參數都會非零退出。origin 不讀環境或 CLI，沒有發佈、認證或上傳入口。

`release-artifacts/site/` 是未上線的正式靜態候選 document root；兩個入口是 `index.html` 與 `en/index.html`。後續有權執行且符合隔離條件的 browser 驗收者應使用這個 **site 目錄**，不要用仍為 noindex 的 public／dist。既有 dev 僅 serve public，不用它冒充正式候選驗收。本輪沒有啟動任何 server 或 browser。

審核檔 [manifest.json](release-artifacts/manifest.json) 位於 site 旁邊，不包含在站點可發布清單內。site 精確包含 17 個原資產與 `_headers`、`robots.txt`、`sitemap.xml`，共 20 個檔案；manifest 另外一個。沒有 Cloudflare、token 或上傳配置。

## 與 M1 的隔離

- M1 public／dist／整個 evidence/m1 的 78 個檔案以完整 paths／bytes／SHA-256 在本輪前後比對；原 M1 manifest 與歷史證據不改寫。
- 15 個 JS／CSS 非 HTML 資產逐 byte 相同。兩語 HTML 僅在 head 將 meta robots 改為 index,follow，並新增各自唯一 canonical 及 zh-Hant／en／x-default 互返；x-default 指向中文 `/index.html`。
- HTML lang、title、description、H1、可見候選／尚未部署文字、內文、JSON/HTML 產品輸出、表單與 Runtime 均保持原樣。沒有新增結構化評價或已驗證聲明。
- 正式 robots 為 Allow: / 並指向唯一 sitemap；sitemap 只列兩個 canonical，沒有 lastmod。public／dist 不增加 canonical、sitemap 或正式 robots。

## 安全 headers 的來源

public 原本沒有 `_headers` 或 robots.txt。產生器安全匯入既有 `scripts/serve.mjs` 的 `makeHandler`，以記憶體 HEAD request/response callback 讀取既有常數；不呼叫 createServer/listen，不建立 socket。實得 headers 必須與 M1 固定 baseline 完全相等才可繼續。

保留 `X-Content-Type-Options: nosniff`、`Cache-Control: no-store`、`Referrer-Policy: no-referrer` 與完整 CSP：

```text
default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'
```

只有 X-Robots-Tag 改為 `index, follow`。handler 的 Content-Type 是逐資產 MIME，故不把 `text/html` 強加到全站 JS/CSS；其他安全／隱私 header 不放寬。`_headers` 是待 hosting 套用的配置，**不是實際 HTTP headers 證明**。

## 重建、檢查與失敗處理

原 M1 的 17 個 public bytes/SHA-256 固定在 `scripts/release-baseline.mjs`，來自歷史 manifest `0964cc92266f8171a70879fdab953ce02d1850d3ebea914a8e7b1d7bae38e522`。來源變動須另經產品審核，不能只更新 release manifest 放行。

build 在第一次寫入前完整檢查來源、產生的預期 HTML 語義與任何既有輸出。只允許精確檔案與所需目錄；拒絕未知檔案／空目錄、symlink／junction、缺漏或污染。首次建立使用 exclusive mkdir／wx，沒有覆寫或遞迴刪除。合法已存在的候選只重驗、不寫入，逐 byte 確定。

check 由固定 M1 來源獨立重建 expected bytes，再重新掃描／雜湊實際 site 與 manifest，並讀取完整 head tokens 檢查 robots／canonical／alternate／語言、非 SEO head 與 head 外的 bytes。產物及 manifest 同時竄改仍會失敗；不採信 manifest 自證。

既有輸出若受損、不完整或未管理，build／check 一律拒絕，保留原 bytes，不自動修復。若初次寫入因 I/O／磁碟／中斷失敗而留不完整新目錄，停止交主代理判斷；不要自行刪除或覆寫。沒有任意輸出路徑參數。

## 證據與未驗範圍

完整 suite、check、build:release、check:release 的實際 exit／test 數追加於 [HANDOFF](HANDOFF.md)。[M1B 固定清單](evidence/m1b/M1B-CANDIDATE.json) 記錄改動來源與產物逐檔 bytes／SHA-256；[清單 checksum](evidence/m1b/M1B-CANDIDATE.sha256)。`node scripts/release-evidence.mjs verify` 可再次比對固定 bytes 與 78 個 M1 保護檔。

負例僅使用 `evidence/m1b/test-workspaces/` 的任務副本；其中故意存在錯誤產物，**不是候選，不應部署或納入發布清單**。測試建立的 junction 只 unlink 已識別連結，保留目標；沒有遞迴清除。候選 inventory 排除此目錄。

以下維持 **NOT_RUN_USER_FOCUS_INCIDENT**：真 browser／file picker／worker／下載／跨頁導覽／Network／Storage／鍵盤／焦點／螢幕閱讀器／320px／200%／觸控／視覺。本輪測試是發布工具鏈與離線純程式驗證，沒有解除 M1 browser gates。

GitHub、hosting、實際 HTTP headers、正式網址可用性、共享首頁、外部驗收均 **NOT_RUN_M1B_ONLY**。M1B 不授權 M2，不自行推送或部署。沒有需新增的依賴、權限、credential 或付費服務。Requested gpt-6.1-sol/max；backend 身分未獨立確認。
