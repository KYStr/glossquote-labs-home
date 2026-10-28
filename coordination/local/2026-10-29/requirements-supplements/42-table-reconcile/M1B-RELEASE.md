# 兩份表格對帳 · M1B 離線發布候選

2026-10-23（Asia/Taipei）。本輪是 **離線發布準備**，不是 M2 公開或 M3 上線放行。派送要求 gpt-6.1-sol/max，backend 身分未獨立確認。主代理本輪通知 M1 核心／CLI 已驗；真瀏覽器閘門仍保留。

預定 origin 為 `https://reconcile.glossquote.com`，toolSlug 為 `table-reconcile`。這是程式固定常數，尚未上線；不接受環境或命令列覆寫。

## 重現與產物

Node.js 24+，ESM、零依賴，不需 install。從本工具目錄執行：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

`build:release` 對應 `node scripts/release.mjs build`，`check:release` 對應 `node scripts/release.mjs check`。無參數、未知 mode、多參數均 exit 1，不推測動作。原 test/check/build/dev 命令保留；本輪不啟動 dev，不重建未變的 M1 preview。

- 後續獲准的瀏覽器驗收應使用 [release-artifacts/site/](release-artifacts/site/)；中文入口 `index.html`、英文入口 `en/index.html`。由主代理提供經核准的隔離機制，不能直接用本機 browser/CUA/IAB/CDP 或使用者桌面做實驗。
- [release-artifacts/manifest.json](release-artifacts/manifest.json) 位於 site 的 sibling，不能當作網站內容發布。site 只有既有 public allowlist 加 robots/_headers/sitemap 的去重集合，共 13 份資產。
- 原 [public/](public/) 與 [dist/](dist/) 保持 M1 noindex，不含正式 canonical/sitemap；`npm run dev` 服務的是原 public，不是 release 候選。

## 正式 SEO 與原始內容

兩頁只在 head 更換 robots 為 `index,follow`，新增各自唯一 canonical `/index.html` 或 `/en/index.html`。每頁都有互返的 zh-Hant/en/x-default；x-default 指向中文。原 html lang、title/description/H1、FAQ、微資料及可見「候選／尚未瀏覽器驗收」文案保留。body 不改，所有 runtime JS/CSS 及其他非 SEO 資產逐 byte 保持 M1。

robots 為允許索引與唯一 sitemap 位置；sitemap 只含上述兩個 canonical，沒有虛構 lastmod。索引配置不表示候選已公開，也不是存取控制。

原 public 已有 `_headers`。release 直接保留該檔所有 bytes，僅將 `X-Robots-Tag: noindex, nofollow` 改為 `index, follow`；CSP／connect-src／script-src／Blob／字型／隱私規則均未放寬。沒有引入 serve fallback、Cloudflare 配置或認證／上傳命令；此檔僅配置，未驗實際 hosting response。

## 封閉輸入與輸出

`scripts/release.mjs` 固定 M1 public 12 檔的 path/bytes/SHA-256，對照既有 M1 source-manifest 取出的 public 記錄。build/check 都先重算實際來源，來源內容／檔案集合變動即拒絕；沒有默默接受新來源。未來若需要改產品，應由主代理另設有界修正任務並重新審查基準。

manifest 固定 schemaVersion=1、mode=release-candidate、origin、toolSlug、排序不重複的 files 和完整 public sourceFiles；每項只有 path/bytes/sha256，不含時間、隨機值或絕對路徑。manifest 不列入 files，site 不含文件、測試、證據或使用者資料。

check 會從固定 public 基準重新建立所有 expected bytes 及完整 manifest，再逐檔比對。它不拿待驗 manifest 提供的 path 讀檔，也不只驗 manifest 內的 hash；即使資產與其 manifest hash 一起改掉仍拒絕。靜態 head 語義檢查另外核對 canonical、互返、lang 與 robots；這不是瀏覽器引擎驗收。

拒絕 symlink/junction、未知檔案、未知空目錄、缺檔、額外 manifest 欄位與過大 manifest。fresh build 先驗所有 inputs；既有 output 必須全部符合重建 expected，才保留原 bytes 並回報已驗證。未管理、空的、不完整或遭修改的 output 都停止，絕不遞迴刪除或覆蓋。首次寫出採 exclusive creation；若 I/O 中斷留下部分候選，下次會拒絕，交主代理決定復原，不自動清場。

## 本輪驗證與證據

新增的 release 針對性測試為 16 項：雙語 SEO、domain、preview/runtime bytes、determinism、tamper／共同竄改／missing／extra／source change／junction／unsafe manifest／CLI 引數。負例只操作 `evidence/m1b/` 下的 task-owned copy，沒有改真 public/dist。既有 preview 工具鏈測試的暫存根移至 M1B，避免碰舊 evidence。

最終命令與全部測試數見 [HANDOFF](HANDOFF.md) 最新 M1B 追加、[final-commands.json](evidence/m1b/final-commands.json)；來源／產物固定值及檔案 diff 見 [verification.json](evidence/m1b/verification.json)、[changes.patch](evidence/m1b/changes.patch)、[source-manifest.json](evidence/m1b/source-manifest.json)。原 M1 evidence 保留，沒有更新其中的歷史 source-set。

## 尚未驗證及下一步

真 browser、鍵盤／讀屏／320px／zoom／原生下載、Network／Storage／headers／CSP／pagehide／BFCache 均維持 **NOT_RUN_USER_FOCUS_INCIDENT**。本輪 Node／靜態／替身結果不能取代這些 gate。

由主代理獨立審查實際 diff、來源保護與 release 候選，核准隔離機制後才能進行 browser gate。GitHub／Cloudflare／共用首頁都未執行；M1B 不是其放行。沒有需新增套件、權限、付費、憑證或持久系統變更的要求。主代理負責單一外層 ZIP，本輪不另建交付 ZIP。
