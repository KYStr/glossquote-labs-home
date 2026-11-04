# 食材差額採買單 — M1B 離線 release 候選

此產物供主代理進行後續隔離瀏覽器與發布前驗收，**尚未上線，也未獲 M2 公開／部署放行**。M1 核心／CLI 已由主代理驗收，M1B 只新增離線發布工具鏈。兩語頁面原有「預覽／候選／尚未正式發布」可見文案保留，不以 SEO 產物表示實際發布。

預定 origin 固定為 `https://shopping-list.glossquote.com`；toolSlug 固定為 `pantry-plan`。程式不接受其他 origin、CLI 覆寫、environment 代入或部署命令。requested gpt-6.1-sol/max；不以自述確認實際 backend。

## 重現

使用既有 Node 24+／npm，零新增依賴，不執行 npm install：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

本輪驗證使用暫時的 `--offline --no-update-notifier --no-audit --no-fund` npm 參數。`build:release` 實際為 `node scripts/release.mjs build`；`check:release` 為 `node scripts/release.mjs check`。無參數、未知 mode、多參數、origin 參數均 exit 1。既有 `build` 仍只生成預覽 dist，本輪未重跑它；`dev` 仍是預覽 server，本輪未啟動。

## 驗收使用的資料夾

瀏覽器驗收者應使用本工具 **`release-artifacts/site/`**，不要誤用 `public/` 或 `dist/`。審核用 **`release-artifacts/manifest.json`** 位於 site 的 sibling，不能當網站資產提供。release-artifacts 在 .gitignore 中；主代理整合審核包時須明確納入產物與 manifest，不依賴 Git 預設追蹤清單。

固定 canonical 是：

- 繁中 `https://shopping-list.glossquote.com/index.html`
- English `https://shopping-list.glossquote.com/en/index.html`

每頁唯一 canonical 與 zh-Hant/en/x-default alternate，x-default 回繁中。兩語 HTML 只在 head 修改 robots 與插入 SEO links，title、description、html lang、微資料現況與完整可見 body 不變。不新增 JSON-LD、評論、評分或上線聲明。

## 範圍與防護

- `public/` 的既有 14 檔閉合 allowlist、內容與 records SHA-256 固定為 M1 版本。pin：`bd7f4bed29d52631cc9f24b3b93bcb226e441b3a7657eeb4c274f21dc7db4a56`。來源變更時 build/check 都拒絕，不能只修改 manifest 接受新來源；真正產品變更需另設有界任務與新驗收。
- site 為原 14 檔加 `sitemap.xml`，總共 15 檔。JS、CSS、404 與其他非 SEO 資產逐 byte 複製 M1；404 自身 noindex 保留。preview public/dist 維持 noindex，沒有 production canonical/sitemap。
- robots 使用 Allow 及固定 sitemap 網址；sitemap 精確列兩個 canonical，不含 lastmod。`_headers` 直接保留現有 public/_headers 的完整 CSP、Permissions-Policy、nosniff、no-referrer、no-store，只替換一條 X-Robots-Tag 為 index, follow。**這是靜態配置，並非實際 hosting HTTP header 證據。**
- manifest schemaVersion=1、mode=release-candidate、固定 origin/toolSlug，files/sourceFiles 均逐檔 path/bytes/sha256、排序、唯一；不含時間、亂數或本機絕對路徑。manifest 自身不列入 files。
- check 從固定來源重新建構完整 expected bytes 並獨立計算雜湊，不只相信 manifest。paired asset+manifest、甚至 public+asset+manifest 同改仍拒絕。這是本機驗證器對未改驗證程式的檢查，不是數位簽章或 OS sandbox。
- build 先完整檢查來源與現有輸出；既有合法候選只驗證，不改 bytes/mtime。缺檔、未知檔／目錄、junction/symlink、竄改或不完整候選均停止，保留原物；不修復、不遞迴刪除、不覆寫。全新目錄以獨占建立檔案；若 I/O 失敗留下部分新產物，下一次同樣拒絕，須交主代理審查現況。

## 證據與未驗

最終命令、完整測試數、來源／產物 bytes 與 SHA、保護檔案／環境比對見 [本輪交接](HANDOFF.md) 追加段落及 [M1B summary](evidence/m1b/summary.json)。M1 原始證據不變；新增測試只在本工具 evidence/m1b 的臨時 copy 作反例，不改真 public、dist、release 產物或使用者資料。

B01–B05、視覺、鍵盤／讀屏、320px／200%、真機、原生下載、正式 Network/Storage／HTTP／真 404 仍為 `NOT_RUN_USER_FOCUS_INCIDENT`。本輪未啟動任何 server/browser/CUA/IAB/CDP/native，也未測試隔離機制。主代理須在確認的隔離機制下驗收，再另行決定 M2；未推 GitHub、未部署、未改正式首頁、未做外部複驗。原有安全 gate 不因本輪 SEO 產物而免除。
