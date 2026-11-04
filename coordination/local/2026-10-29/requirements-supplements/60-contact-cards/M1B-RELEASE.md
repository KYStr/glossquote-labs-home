# M1B 離線發布候選

2026-10-23，B20-RP-60；這是必要 browser gate 前的發布準備，不是 M2 放行或正式上線。預定 origin `https://contacts.glossquote.com`、toolSlug `contact-cards` 固定在 `scripts/release.mjs`，不接受環境或 CLI 網址覆寫。Requested gpt-6.1-sol/max，backend 未獨立確認。

## 重現與檢查

既有 Node24+、零依賴，不執行 install。由本工具根目錄依序執行：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

需要保留新一輪證據時，用既有 Node 執行 `node scripts/verify-m1b.mjs`，其 npm child 使用 `--offline --no-audit --no-fund --update-notifier=false`，`shell:false/windowsHide:true`。本輪固定命令與結果存於 [evidence/m1b/commands.json](evidence/m1b/commands.json)。不必重跑未變 preview build；不要重跑會寫舊 evidence 的 M1 verify/freeze scripts。

`node scripts/release.mjs build` 與 `node scripts/release.mjs check` 是唯一允許的模式；無參數、未知模式、多餘參數或 origin 參數一律失敗。腳本完全沒有 deploy/upload/auth/Cloudflare 命令，不啟動 listener/browser。

## 審查者使用哪個目錄

未來安全隔離 browser review 應使用 **`release-artifacts/site/`**，包含兩語 `index.html`／`en/index.html`。`release-artifacts/manifest.json` 是 sibling 審核清單，不在 site。整個目錄只是本機靜態候選，預定網址目前未在本任務上線；不可把檔案內的 index/follow 或 security 配置當成實際 hosting 證據。

`public/` 和 `dist/` 維持 M1 noindex。JS/CSS 逐 byte 相同；HTML 僅改 head 的 robots 並加入 canonical 與 zh-Hant/en/x-default。原 title/description/H1、lang、body 和可見候選／未驗證文案保留。robots 允許抓取並指向預定 sitemap；sitemap 只列兩個 canonical，無 lastmod。

`_headers` 直接沿用本工具 M1 `public/_headers`，只替換 X-Robots-Tag 為 `index, follow`；原 CSP、Referrer-Policy、X-Content-Type-Options、Permissions-Policy 完整保留，沒有放寬 connect/script/blob/data 規則。因已有 _headers，本輪不需從 serve 常數另生替代，沒有啟動 serve。

## 確定性與拒絕條件

輸入只准完整的 9 個 M1 public allowlist 檔案，逐檔 bytes/SHA-256 固定在 release script 的 SOURCE_LOCK。site 為去重清單加 sitemap，共 10 檔。manifest 固定 schemaVersion=1、mode=release-candidate、origin/toolSlug、排序且完整的 files/sourceFiles，不含隨機值、時間或本機絕對路徑。

Check 從受信任的 generator 與 pinned source 重建預期 bytes，再比對完整產物及 manifest，不將可編輯 manifest 當信任根。同時改 manifest+產物，或連 public 一起改，也會失敗。這是本機可重現性檢查，不是數位簽章；修改受信任 checker 本身不在其防護能力內。後續已核准產品改動需要新有界任務審核/更新 source lock，不會默默接納來源漂移。

Build 在首個寫入前檢查全部 inputs 與任何既有 outputs；只在 output 不存在時以 exclusive create 建立。合法既有候選以 no-op 返回，bytes/mtime 不改。未知、缺少、部分、被修改、symlink/junction 或 hardlink 輸出一律拒絕；不遞迴刪除，也不覆蓋。意外 filesystem I/O 錯誤可能留新建的部分目錄，後續 build 仍拒絕，不自行清理或修復它，應交主代理判定。

## 尚缺 gate

- Browser workflow、320px／200%／keyboard／focus、實際 Network/Storage、原生 chooser/下載與手機通訊錄匯入：`NOT_RUN_USER_FOCUS_INCIDENT`。
- 真實 HTTP listener/hosting headers：`NOT_RUN_TASK_NO_SERVER`／未部署。
- 主代理獨立驗收、M2 發布放行、公開 GitHub、免費 Cloudflare release、雙語首頁整合與外部覆核：尚未取得。

本輪未安裝、未讀憑證、未改持久 Windows/Git/auth、未啟動 browser/server、未觸發 OS dialog。舊 M1 evidence 保留；新 source/artifact hashes 和環境比對見 [freeze-result.json](evidence/m1b/freeze-result.json) 與 [HANDOFF](HANDOFF.md)。主代理負責單一整合交付 ZIP，本對話不另建立使用者 ZIP。
