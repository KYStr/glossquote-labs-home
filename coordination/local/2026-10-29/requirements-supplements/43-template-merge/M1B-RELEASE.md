# 批次文字套版 — M1B 離線發布候選

2026-10-23（Asia/Taipei），任務 B20-RP-43。**離線發布準備已產出，待主代理獨立驗證；不是 M2 發布或上線放行。** 原對話要求 gpt-6.1-sol/max，backend 身分未獨立確認。

預定 origin 固定為 `https://templates.glossquote.com`，toolSlug=`template-merge`。沒有檢查 DNS／連線／託管，不能把這個預定網址當已上線網站。

## 候選與重現方式

瀏覽器驗收者未來應使用 **`release-artifacts/site/`** 作為網站根目錄。中文入口是 [site/index.html](release-artifacts/site/index.html)，英文入口是 [site/en/index.html](release-artifacts/site/en/index.html)。**不要改用 public 或 dist，也不要把 sibling manifest 放進網站。** 本輪沒有啟動伺服器或開啟這些頁面。

使用既有 Node.js 24+ 與 npm，零安裝、零依賴：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

本機為了符合所有 CLI 子程序的隱藏視窗要求，實際透過 [run-gates.mjs](evidence/m1b/run-gates.mjs) 順序執行上述四個真 npm 命令：

```text
node evidence/m1b/run-gates.mjs
```

它呼叫已安裝的官方 npm-cli.js，沒有修改 npm 安裝。審核過的 [npm-safe.cjs](evidence/m1b/npm-safe.cjs) 僅在該 child process 內強制 `spawn/spawnSync` 的 `shell:false, windowsHide:true`，拒絕未審核的其他啟動 API。npm 的既有 promise-spawn 會先把 lifecycle command 轉為明確 cmd.exe 引數，再以 shell:false 呼叫 spawn；wrapper 對這個實際 spawn 套用 windowsHide。沒有用使用者目前的輸入工作階段試隔離，也不宣稱這是通用 OS sandbox。

npm 使用明確、非憑證的最小 process-local environment；cache、TEMP/TMP 與空白 user/global npm config 都在 evidence/m1b，offline=true、update notifier/audit/fund 停用，沒有繼承帳戶的 secret environment 或讀取既有 npm config。PATH 只在 child process 包含既有 Node 與 Windows System32，沒有修改持久設定。原有 `.npmrc` 若存在會先拒絕，不讀取它。沒有 npm install。

`node scripts/release.mjs build`／`check` 是 package scripts 的實際內容。無參數、錯 mode 或額外參數都拒絕；不接受 origin、輸出路徑或環境 override。既有 test/check/build/dev 命令保留；本輪沒有重跑根目錄 preview build，原 preview 的 bytes 保持不變。

## 正式格式與保護

- 來源僅既有 public allowlist 的 **13 檔**。以 M1/R01 public tree hash `faa77fd2ec6893118a60b4ea23ae0ed34e0971776081b94c72f56aafdede74ee` 固定；來源改動即拒絕，即使一起修改 manifest 與產物也不接受。合法產品修正需要另一個有界任務審核 baseline。
- site 的封閉集合為上述清單加 sitemap.xml，共 **14 檔**。robots.txt／_headers 由來源的既有同名檔轉換，不重複。manifest 位於 [release-artifacts/manifest.json](release-artifacts/manifest.json)，不在 site。
- 兩語 HTML 只改 head 的 robots=`index,follow`，並加入各自唯一 canonical 與 zh-Hant/en/x-default 的完整互返；x-default 指中文。原 html lang、title、description、H1、可見「本地預覽候選／Local preview candidate」、body、微資料、runtime links 全保留。沒有新 structured data、評價或已上線宣稱。
- 全部 8 個 JS 模組及 CSS 都與 M1 public 逐 bytes 相同。原 public/dist 仍 noindex/nofollow，沒有新增 canonical／sitemap。
- robots 固定 Allow `/` 並指預定 origin 的 sitemap；sitemap 只列 `/index.html` 與 `/en/index.html`，不放 lastmod。
- 原 public 有 _headers，直接保留其完整 bytes，僅把 X-Robots-Tag 值從 `noindex, nofollow` 改為 `index, follow`。CSP、connect-src、script-src、no-referrer、nosniff、frame／permissions 等均未放寬；不需要 serve 常數 fallback，也沒有啟動 serve。這是託管配置檔，不是真 HTTP header 證據。
- manifest 的固定欄位是 schemaVersion=1、mode=`release-candidate`、origin、toolSlug、files、sourceFiles。兩個清單各自按相對 path 排序、不重複，元素只有 path/bytes/sha256；files 相對 site，sourceFiles 相對 public。無時間、隨機值、本機絕對路徑，manifest 本身不列入 files。
- check 從固定來源重建每個預期 byte，再比較 manifest 及完整 site。拒絕未知檔／空目錄、缺檔、被改產物、錯 SEO／origin、manifest 與資產協同竄改、來源改動、symlink/junction。
- build 在寫入前檢查全部來源與既有輸出。合法完整候選重建是唯讀 no-op；既有不完整、未管理或被修改輸出都保留並拒絕。首次輸出只以 mkdir 與 `flag:wx` 新建，沒有遞迴刪除或覆寫。若第一次建置遇 I/O 中斷，可能保留不完整的新目錄；check 會拒絕，需主代理評估，不自動清除或修復。

## 已執行與固定 hashes

|命令|exit / 結果|
|---|---|
|node --test test/release.test.mjs|0，19/19 針對性測試|
|npm test|0，93/93，fail 0 / skipped 0|
|npm run check|0，13 public assets / 8 browser modules / 7 scripts|
|npm run build:release|0，14 site files + sibling manifest|
|npm run check:release|0，完整候選一致|

[原始 logs 與命令總表](evidence/m1b/final-gates.json)、[來源清單](evidence/m1b/source-manifest.json)、[唯讀範圍比對](evidence/m1b/protected-inputs.json)、[環境前後比對](evidence/m1b/environment-comparison.json)。19 個新測試全部在 evidence/m1b/.scratch 的自有 copy 做負例；既有 toolchain test 的暫存路徑也只移到此處，沒有改核心測試 oracle 或使用真正 root 做污染／刪除測試。

|固定內容|SHA-256|
|---|---|
|M1B 可執行來源 29 檔|`52b2b7335e52ff6c1ce2e7baf5407762d1135591eae6f9f7bd3064344596f4ca`|
|M1 public 13 檔（未變）|`faa77fd2ec6893118a60b4ea23ae0ed34e0971776081b94c72f56aafdede74ee`|
|site 14 檔|`51c54ae8f632976bd26d95e170effeb9a524f84d772f736ecb2cbaa8a9b36fa8`|
|manifest.json 本身|`347cc3fc0e83f40a761b250dc12e6aa954d288981b440c92f28af4ce59059711`|

tree hash 演算法：按相對 path 排序，串接 `path + NUL + decimal bytes + NUL + file-sha256 + LF`，再 SHA-256。source hash 包含 package/.gitignore/public/scripts/test，不含可變文件與 evidence；完整交接檔案與文件 hashes 見 [delivery-manifest.json](evidence/m1b/delivery-manifest.json)。

## 尚缺 gates

真 browser、視覺、鍵盤／讀屏／zoom／reflow、原生／真機、真 clipboard／下載、真 Network／Storage／HTTP headers 均 **NOT_RUN_USER_FOCUS_INCIDENT**。Node 或 mock 不是這些 gates 的替代品。M1B 對照的是檔案 bytes 與離線工具鏈，不是新增產品驗收。

沒有 GitHub、部署、Cloudflare 操作或共用首頁變更。需主代理獨立讀 diff 與產物、完成必要隔離瀏覽器驗收，才可另發下一階段放行。沒有需要現在補的憑證／權限／產品選擇。主代理統一包入單一交付 ZIP，本對話沒有另建 ZIP。
