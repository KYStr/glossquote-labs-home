# B20-RP-53：M1B 離線發布候選

這是瀏覽器驗收前的靜態發布準備，不是 M2 公開或上線放行。預定 origin 固定為 `https://image-proof.glossquote.com`，toolSlug 為 `image-overlay`；沒有聲稱該網址已部署。配置請求 gpt-6.1-sol/max，實際 backend 未獨立確認。

## 重現與驗收目錄

使用既有 Node24+、零依賴，不需要 install。從本工具目錄執行：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

兩個新增指令分別呼叫 `node scripts/release.mjs build`／`check`。無參數、錯 mode 或額外參數都會拒絕；origin 不能由 CLI 或環境改寫。既有 test/check/build/dev 定義保留，本階段不啟動 dev 或重建未變的 preview。

主代理後續 browser 驗收應使用 **`release-artifacts/site/`**。旁邊的 **`release-artifacts/manifest.json`** 是審核清單，不得作為網站資產送出。`public/`、`dist/` 仍是原 M1 preview，維持 noindex；本輪不寫入兩者或舊 `evidence/m1/`。

## 產物契約

- `site/` 固定 15 檔：原 public 的 13 檔，加 `robots.txt`、`sitemap.xml`；原 `_headers` 去重保留。
- 兩語 HTML 只改 head：meta robots 為 `index,follow`；唯一自指 canonical 為 `/index.html`／`/en/index.html`；`zh-Hant`、`en`、`x-default` 互返，x-default 為中文。
- HTML body、title、description、現有微資料及使用者可見文案保持原樣。沒有加入已上線／已驗收、評分、評論或 structured data 聲明。
- JS、CSS、404 和其他非 SEO 資產與 M1 逐 byte 相同。404 保留原 noindex meta，不在 sitemap。
- `_headers` 直接使用原 `public/_headers`，只把 `X-Robots-Tag: noindex, nofollow` 換成 `index, follow`。原 CSP、connect-src、script-src、img blob 規則及其他隱私／安全 headers 完整保持；沒有新增 hosting／認證設定。
- robots 精確 Allow `/` 與此 origin 的 sitemap；sitemap 只列兩個 canonical，沒有 lastmod。
- manifest 固定 schemaVersion 1、mode `release-candidate`、origin、toolSlug、排序且不重複的 files／sourceFiles。每筆只有 path、bytes、sha256；不含時間、隨機值或本機絕對路徑。

## 來源與防竄改界線

`scripts/release-source.mjs` 是主代理已核對之 M1 lease 修正版的 13 檔 public bytes/SHA pin。產生器先驗封閉來源清單與此 pin，再重建所有預期 bytes；`check` 每次獨立重算，並逐檔比對產物與完整 canonical manifest。只改產物、只改 manifest，或一起改產物與其 manifest hash 都會拒絕；變更來源並偽造 sourceFiles hash 也不能通過。合法的產品更新需要另行審核來源與 pin，不能用 build 自動接受。

既有 `release-artifacts/` 若完全符合預期，build 是驗證後的 no-op；跨不同任務 copy 也會產生相同 bytes。已被改動、缺檔、多檔、未知空目錄、symlink／junction 或未管理的輸出容器都在寫入前拒絕。不遞迴刪除、不覆蓋或自動修復輸出。首次建立用 exclusive write；若檔案系統中途失敗留下部分新候選，保留現場並交主代理處理，不由工具刪掉重做。

這是離線封閉清單與固定 bytes 的核對，不是簽章、OS 層防護或實際 HTTP header 證明。manifest 不可取代原程式與 pin 的審碼。

## 證據與尚缺 gate

最終命令、完整 test 數與 exit 見 [M1B commands](evidence/m1b/commands.json)；固定來源見 [source-before](evidence/m1b/source-before.json)／[source-after](evidence/m1b/source-after.json)，產物逐檔與 aggregate 見 [artifact-manifest](evidence/m1b/artifact-manifest.json)。[Protected 前](evidence/m1b/protected-before.json)／[後](evidence/m1b/protected-after.json)覆蓋 public、dist、全部舊 M1 evidence。環境前後與總結見 [summary](evidence/m1b/summary.json)。

所有真 browser／視覺／鍵盤／縮放／原生／真機／Network／Storage／實際 hosting headers、HTTP 404 仍為 `NOT_RUN_USER_FOCUS_INCIDENT`。本輪沒有啟動 server 或 browser，沒有 GitHub、部署、正式首頁整合或外部驗收。主代理需完成獨立審核及必要 browser gates，才另行判斷 M2 放行；不能直接把本候選當作已發布網站。
