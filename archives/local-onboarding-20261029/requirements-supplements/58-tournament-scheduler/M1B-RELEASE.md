# 循環賽賽程表：M1B 離線發布候選

2026-10-23（Asia/Taipei），B20-RP-58。**已完成離線發布準備，尚未 browser 驗收、公開或部署。** 產品維持 `0.1.0-m1`；本輪只新增發布工具鏈與證據，沒有修改 runtime、public 或原 preview。

預定 origin 為 `https://round-robin.glossquote.com`，toolSlug 為 `tournament-scheduler`。這是程式固定的候選位址，沒有實際上線證據；CLI 和環境不能改 origin，也沒有部署／憑證／Cloudflare 命令。

## 產物位置與重現

在本工具根目錄使用既有 Node24+，不需安裝套件：

```text
npm run build:release
npm run check:release
```

入口精確為 `node scripts/release.mjs build` 和 `node scripts/release.mjs check`。無參數、未知 mode 或額外參數均 exit 1，不會自動部署。原 `test/check/build/dev` 的命令字串保留；原 preview 未重新 build。

- 候選 site：`release-artifacts/site/`，共 11 個檔案、63,283 bytes。
- 機器審核清單：[release-artifacts/manifest.json](release-artifacts/manifest.json)，不在 site 內。schemaVersion=1、mode=release-candidate，files 路徑相對 site，sourceFiles 路徑相對 public。
- 完整 M1B source/artifact bytes/SHA-256：[candidate manifest](evidence/m1b/candidate-manifest.json)。
- 實際前後檔案差異：[changes.patch](evidence/m1b/changes.patch)，範圍核對：[scope-audit.json](evidence/m1b/scope-audit.json)。

相同合法輸入重建只讀既有合法產物，結果逐 byte 一致。任何未知／缺漏／被修改的輸出、額外目錄、symlink/junction 都會停止，不覆蓋、不遞迴刪除。建置中若發生作業系統寫入失敗，可能留下未完成新目錄；不自行清理或將其視為候選，交主代理審核。

## 與 M1 的精確關係

來源只接受 M1 的 8 個固定 public 檔案；每檔 bytes/SHA-256 固定在 `scripts/release.mjs`，來自原 M1 manifest。來源內容改變即拒絕，不能靠重寫 release manifest 授權新 runtime。6 個 JS/CSS 資產逐 byte 複製。

兩語 HTML 僅改 head 的 robots 並新增 SEO links：

|頁面|唯一 canonical|
|---|---|
|繁中|`https://round-robin.glossquote.com/index.html`|
|English|`https://round-robin.glossquote.com/en/index.html`|

每頁都包含互返的 zh-Hant／en／x-default，x-default 指向繁中；robots 為 index,follow。原 title、description、html lang、H1、CSP、body 與可見「預覽候選／Preview candidate」全部保留。沒有評論、星等、假 structured data 或已上線聲明。`public/`、`dist/` 仍是 noindex,nofollow、沒有 canonical／alternate／sitemap。

新增 robots.txt 僅 Allow 與固定 sitemap 位址；sitemap.xml 僅兩個 canonical，沒有 lastmod。原 public 沒有 `_headers`，因此從原 `scripts/serve.mjs` 的 `SECURITY_HEADERS` 常數生成：CSP、nosniff、no-referrer、no-store、same-origin、Permissions-Policy 均保留，只把 X-Robots-Tag 改為 index, follow。原 serve 檔 SHA-256 固定為 `e0247af5969edc1c9d9397c3d2b051b1b7e8ffc3da4c7fe7ed843de34fefceac`，並核對原安全常數值。只 import 常數，未啟動 serve；`_headers` 是配置，不能當成實際 hosting headers 證據。

check 不只信任 manifest：先核對固定 M1 來源與安全 header 來源，再獨立重建全部 expected bytes，逐檔比對內容與 hash。資產和 manifest 一起竄改、錯 origin／SEO、來源變動仍會拒絕。

## 本輪實測

|命令|Exit|實際結果|
|---|---:|---|
|`node --test test/release.test.mjs`|0|13/13 針對性發布測試|
|`node scripts/verify-release.mjs`|0|一次完整執行下列四條命令，原始輸出另存 m1b|
|`npm test`|0|55 tests／55 pass，0 fail/cancel/skip/todo；3232.7964 ms|
|`npm run check`|0|原 8 檔 preview 檢查、新命令與 ESM syntax|
|`npm run build:release`|0|11 檔獨立候選，沒有改 preview|
|`npm run check:release`|0|固定 origin、完整 expected bytes 與 manifest 通過|

新增 13 個 release tests 覆蓋兩語互返 SEO、正確域名、preview 不變、runtime 不變、確定性、tampered/extra/missing、資產+manifest 聯合竄改、來源變動、CLI 拒絕參數與 junction／未管理輸出。負例只操作 `evidence/m1b/` 下 mkdtemp 所有的合成 copy。

原 42 項核心／CLI 測試只在本輪要求的最終完整 suite 執行一次，沒有另跑產品核心來冒充 browser。原 toolchain test 的 scratch 路徑改到 m1b，避免重驗時碰舊 M1 證據。Windows guard 的 [before](evidence/m1b/environment-before.json)／[after](evidence/m1b/environment-after.json) 全部 Snapshots 相同，見 [comparison](evidence/m1b/environment-comparison.json)。npm 透過既有 npm-cli.js、task-owned 空 npm configs、非憑證環境 allowlist 與 offline mode 執行，直接 child shell:false/windowsHide:true。

最後的證據稽核第一輪 exit 1：先檢查了尚未寫出的 scope-audit.json 自身連結。保留 [失敗紀錄與部分證據 hashes](evidence/m1b/audit-attempt-1-failure.json)；修正為先寫 PENDING audit、全部連結驗證後才定稿 PASS。沒有改產品／release 產物或重跑未變測試。

## 下一位驗收者

瀏覽器驗收應針對 **`release-artifacts/site/`** 的兩語頁面與完整工作流。`npm run dev` 仍只服務原 public preview，不能把它當正式候選。此對話未啟動 browser/server；由主代理先確認不干擾使用者焦點、輸入、IME 或剪貼簿的隔離方式，再安排 browser gate。

B01–B04、視覺、320px、200% zoom、keyboard/focus、真下載、Network/Storage、實際 hosting headers 仍 **NOT_RUN_USER_FOCUS_INCIDENT**。M1B 靜態／Node PASS 不等於 browser 或上線 PASS。尚缺主代理獨立複核、安全隔離 browser gate、M2 公開發布放行、M3 hosting／首頁與外部驗收。本輪沒有新技術決策待批；維持既有 gate 等待流程。

舊 M1 證據與其 hashes 不覆寫；原 M1 manifest 的完整來源集合含這次獲准變動的 package／工具鏈／交接，因此不能再拿舊 `freeze.mjs --verify` 當整個 M1B 原始碼不變證明。產品 runtime、public、dist 和全部舊 evidence/m1 的逐 byte 不變另由本輪 baseline/scope audit 證明。沒有 GitHub、部署、首頁整合、帳戶讀取或新 ZIP；主代理負責單一整合交付。
