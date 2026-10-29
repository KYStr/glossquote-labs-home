# 問答卡製作與練習：M1B 離線發布候選

2026-10-23（Asia/Taipei），B20-RP-56。產品仍是主代理已驗收核心／CLI 的 M1-r3；本輪只新增離線發布工具鏈。**尚未上線，也沒有 M2 放行。** requested gpt-6.1-sol/max；backend 身分未獨立確認。

## 重現與產物

Node 24+，零新增 runtime/dev 依賴，不需要 npm install。從本工具目錄執行：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

`build:release` 是 `node scripts/release.mjs build`；`check:release` 是 `node scripts/release.mjs check`。沒有參數、未知 mode、額外參數或 origin 參數均拒絕，不會部署。既有 test/check/build/dev 命令保留；本輪沒有重建原 preview。

- 唯一預定 origin：`https://flashcards.glossquote.com`，固定於 scripts/release.mjs，不讀環境或 CLI 網址。
- 網站根目錄：[release-artifacts/site/](release-artifacts/site/index.html)，15 檔。
- 審核清單：[release-artifacts/manifest.json](release-artifacts/manifest.json)，在 site 外。manifest 自身不列入 site files。
- 原 `public/`、`dist/` 與 `evidence/m1/` 都維持原 bytes；preview 保留 noindex，沒有 production canonical 或 sitemap。

未來 browser 驗收者應在主代理確認的真正隔離機制中，以 **本工具的 release-artifacts/site/ 作為網站根目錄**，分別驗證 `/index.html`、`/en/index.html` 與真 404。不要以 public／dist 代替正式候選，不要把 release-artifacts 父目錄或 manifest 當網站公開。既有 serve.mjs 仍只提供原 dist preview；本輪沒有啟動它，也沒有建立另一個 server 或服務。

## 正式候選內容與信任界線

兩語 HTML 僅改 head robots 為 index,follow，加入唯一 self canonical 與 zh-Hant/en/x-default；x-default 指中文。title、description、html lang、body、可見「候選／未發布」文案全部保留。沒有加入 structured data、評論、星等或上線宣稱。

robots 明列 Allow 與預定 sitemap；sitemap 只有兩個 canonical，沒有 lastmod。`_headers` 直接來自原 public/_headers（SHA da294eba83d68e499ccc914790e300683ce78574014d887b6835f4bd3a6be514），唯一變更是 X-Robots-Tag 改為 index, follow；CSP、connect-src、script-src、font-src 與其他隱私／安全 headers 完全保留。這是配置比對，**不是實際 HTTP headers 證據**。

scripts/release-source.mjs 固定主代理已審查 M1-r3 的完整 14 檔 public bytes/SHA。build/check 都從這份來源重新推導預期 artifact bytes 與完整 manifest；check 不信任可被一起修改的 manifest。manifest 或 artifact、兩者同改、來源改動、缺檔／多檔／未知目錄／symlink／junction 都拒絕。

輸出不存在時才以 exclusive create 建立；既有輸出必須完整且與重新推導的候選逐 byte 相同，合法重建採不寫入的驗證。既有輸出若不完整、未管理或被修改，一律停止並保留，不刪除或覆蓋。首次建立遇到 I/O 失敗可能留下本次新建的部分目錄，後續會拒絕接管，應交主代理處理；沒有自動清除機制。

信任根是經審查的 release 程式與固定來源 pins，不是數位簽章或 OS 鎖定；若連 checker／pins 一起被修改，仍需主代理獨立審核新來源。新產品版本也不能默默沿用此固定來源，必須另行審核。

## 實際驗證與固定雜湊

[完整命令紀錄](evidence/m1b/commands.json)：一次最終完整 suite **97/97 pass**（含新增 release 26 項），npm test／check／build:release／check:release 皆 exit 0，0 fail/skip/todo。新增／修改的 5 個 ESM 檔語法通過。所有反例只動本工具 evidence/m1b/fixtures 內的暫存 copy；原 M1 證據沒有被測試寫入。

|範圍|檔數／bytes|聚合 SHA-256|
|---|---|---|
|完整執行來源（含腳本／測試／鎖定契約，排除交接文字）|46／248455|331068c4f83660d61f959c7ae3641e6fb9256f622ff750475f1c93a8a5b69e0c|
|固定 public 來源|14／88761|316ad7abd6453a50151fbddfc027640a7cd22485981d25e1da4a709988af9542|
|site 網站檔案|15／89771|d46fb5bcf93651637e62151ed15f9079c3103a171fd613e6094a5624e0772f70|
|site＋manifest 整個 release-artifacts|16／94263|146d1e29d2bbba060bc9239a0f3349a697a89ffc947ed165e1741aef09ab1e0d|

manifest.json 本身 SHA-256：`e7c188b032d2cd61ab3f0b0d00c7ab874d119f17a622b760053487e4f8031d19`。集合 hash 是對 path 排序的 `{path,bytes,sha256}` 陣列以 JSON.stringify 加 LF 後取 SHA-256；[逐檔來源](evidence/m1b/source-after.json)／[逐檔 artifact](evidence/m1b/artifact-files.json) 有完整 bytes 與 SHA。

[source-before](evidence/m1b/source-before.json)／[source-after](evidence/m1b/source-after.json) 完全相同；[受保護來源前後](evidence/m1b/protected-after.json) 107 檔與 baseline 一致。User/Machine PATH、registry type/length/hash、ephemeral entries 與完整 Environment／TEMP/TMP 指紋均 [PASS_UNCHANGED](evidence/m1b/environment-comparison.json)。

## 尚缺的 gate

真 browser／視覺／鍵盤焦點／讀屏／320px／200%／真機／下載與列印原生行為／Network／Storage 仍 `NOT_RUN_USER_FOCUS_INCIDENT`。實際 hosting HTTP headers、真 404、DNS、GitHub remote commit／visibility、Cloudflare、雙語首頁及外部覆核仍未驗或未發布。本輪沒有啟動 browser/CUA/IAB/CDP/native/server、讀憑證、安裝依賴、修改持久環境/Git/auth、推送或部署。

主代理先回收 [10 項驗收對照](evidence/m1b/ACCEPTANCE.md)、[本輪差異](evidence/m1b/changes.patch) 與產物獨立驗證，再安排必要隔離 browser gate 及後續 M2/M3。本輪沒有需要新增權限或產品選擇的阻塞；不代表後續 gate 已放行。
