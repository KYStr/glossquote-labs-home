# 搬家裝箱與物品定位 M1B 離線發布候選

任務 B20-RP-55，2026-10-23（Asia/Taipei）。這是 **M1B release-candidate，尚未上線**；不是 M2 公開發布放行，也不是必要 browser gate 通過。配置請求 gpt-6.1-sol / max，實際 backend 未獨立確認。

## 重現與驗證

使用 Node 24+，零依賴，無需安裝任何套件：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

新增兩命令分別等同 `node scripts/release.mjs build` / `node scripts/release.mjs check`。
不帶參數、錯誤 mode、多餘參數均拒絕；不接受環境或 CLI origin 覆寫。沒有上傳、Cloudflare、認證或部署命令。
`node scripts/m1b-gates.mjs` 是本次 owner 的證據 runner，依賴已捕獲的 `evidence/m1b/protected-before.json`，會記錄實際 npm argv、exit、log、來源及受保護檔案前後 hash，不用於一般部署。

## 驗收者應使用的目錄

正式候選靜態根目錄是 **`release-artifacts/site/`**，審核清單位於 sibling **`release-artifacts/manifest.json`**，manifest 不屬於網站資產。
預定 origin 為 **`https://moving-boxes.glossquote.com`**，這不是可用／已部署的聲明。
必要 browser 驗收者在主代理確認真正隔離的機制後，應檢查這個 site；本輪未啟動伺服器、瀏覽器、CDP、IAB、CUA 或 native app。

原 `public/` 和 M1 `dist/` 保留原有 noindex 預覽；M1B 沒有重跑 preview build 或重寫這兩個目錄。

## 產物契約

- 完整 public 來源14檔以 M1 bytes/SHA-256 固定在 `scripts/release.mjs`，任何來源變化都會先拒絕。未來改產品時，需有界審核後更新 pins；建置不會自動接受新來源。
- site是去重的 public allowlist 加 sitemap，共15檔。只在兩語 HTML 的 head 改 robots 並新增唯一 canonical、zh-Hant／en／x-default 互返，中文為 fallback。
- 所有 runtime JS／CSS 及404逐byte相同，原 html lang、可見預覽／待驗說明和其他內容均保留。沒有新增 structured data、評論、星等或外部資源。
- 正式 robots、兩頁 sitemap 均使用固定 origin，無 lastmod。`_headers` 只改 X-Robots-Tag；原 CSP、connect-src none、權限、no-referrer、nosniff 和 no-store 逐byte保留。這是靜態配置，未驗實際 hosting response。
- manifest精確 schemaVersion=1、mode=release-candidate、origin、toolSlug、排序且不重複的 files/sourceFiles，只有相對檔名、bytes及SHA；不含時間、亂數或本機絕對路徑。
- check從已固定的 public 重新生成預期bytes，再核對整個site和manifest。一起修改asset與manifest仍拒絕；manifest不被當成可信預期。驗證器程式本身必須是經審查來源，這不是簽章或任意本機攻擊的防護聲明。

## 既有輸出與失敗處理

完整檢查來源與既有輸出後才建立目錄。所有新檔以 exclusive `wx` 建立，不覆寫任何既有檔案、不遞迴刪除。
同一來源重建已完整驗證的相同候選時直接回傳不變；缺檔、未知檔／目錄、symlink／junction／hard link、未管理檔、不同manifest或被修改輸出均拒絕並保留原物。
若磁碟／權限問題使首次建立中斷，保留部分產物供主代理判讀；不自動清理或修復。必要範圍外變更、來源或持久環境 drift 需停止。

## 證據與尚缺 gate

最終命令結果、原始 log、source/artifact hash 及89份受保護檔案（public、dist、原M1 evidence、原契約／docs）的前後比對存於 `evidence/m1b/`；實際結果另追加到[HANDOFF](HANDOFF.md)，不覆蓋 M1。

真瀏覽器／視覺／原生／真機／keyboard／讀屏／真實 Network與Storage／實際 hosting headers和404仍為 **NOT_RUN_USER_FOCUS_INCIDENT**。GitHub **NOT_PUBLISHED**，hosting **NOT_DEPLOYED**，外部驗收 **NOT_RUN**。
主代理還需獨立讀diff、解析候選、完成必要browser gate，才可另行M2放行；M3部署及首頁整合仍由主代理處理。此候選沒有自動續行、另開chat、委派或多ZIP交付。

## 本輪固定結果

`npm test` 71/71（52項既有＋19項release專項）、`npm run check`、`npm run build:release`、`npm run check:release` 均exit0；完整suite執行一次，沒有重跑preview build。環境與89份受保護內容前後相同。

M1B實作來源30檔／176557 bytes，source-files manifest SHA-256為 `a354e5176082fe4735a0b78abd3055951a0ec51bdbe1ecf10902225eaa28dc9b`。
site15檔／86604 bytes；sibling manifest4498 bytes，SHA-256為 `97fda44631ffa957b09811dd4823c5281d34665ae348d18ba2dab39b41378b86`。

見[命令結果](evidence/m1b/final-gates.json)、[來源](evidence/m1b/source-identity.json)、[產物](evidence/m1b/artifact-identity.json)、[受保護比對](evidence/m1b/protected-comparison.json)、[環境](evidence/m1b/environment-comparison.json)。目前無需新增產品決策，後續由主代理獨立驗證。

## 後續版本註記（2026-10-27）

以上是保留的M1B歷史結果。現行M2A增加固定assets-only配置、release-only `_redirects` 與manifest configFiles，site由15變16檔；原15份資產相同，完整舊release與原證據已封存。現行81/81測試、主控browser合併48PASS／12NOT_RUN、精確SHA與未驗項，見[M2A-RELEASE](M2A-RELEASE.md)。本次仍未公開來源或部署。
