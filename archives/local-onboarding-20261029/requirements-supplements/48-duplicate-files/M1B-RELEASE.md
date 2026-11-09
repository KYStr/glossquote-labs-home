# B20-RP-48 — 離線正式發布候選

2026-10-23（Asia/Taipei）。此輪是 M1B 發布準備，尚未獲 M2 公開或部署放行。預定 origin 為 `https://duplicates.glossquote.com`，toolSlug 為 `duplicate-files`；這是程式內固定的預定網址，不是已驗證可用的網站。requested gpt-6.1-sol/max，backend 身分未獨立確認。

## 重現與驗收位置

在本工具目錄、現有 Node24 環境執行，沒有 npm install：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

兩個新 scripts 分別是 `node scripts/release.mjs build`、`node scripts/release.mjs check`。無參數、未知 mode、任何額外參數均失敗，不接受任意 origin／路徑／環境設定，也不會部署或啟動 server。原 dev/test/check/build 維持原定義。本輪不重建未變更的 preview。

給主代理／後續 browser 驗收者的目錄是 **[release-artifacts/site](release-artifacts/site/index.html)**，中文入口 `index.html`、英文入口 `en/index.html`；原 `public/`、`dist/` 是 noindex 的 M1 預覽，不是這份 SEO 候選。驗收方式仍須由主代理核准隔離機制，不能在使用者桌面啟動 browser。只可準備該 site；本文件沒有授權部署。審核 [manifest](release-artifacts/manifest.json) 放在 sibling，不進 site。

## 可重現與防竄改規則

- `scripts/release-policy.mjs` 鎖定 M1 已驗收 11 份 public 的逐檔大小／SHA-256、預定 origin、slug、兩語 metadata 和原 serve 來源雜湊。新核准產品來源需另設有界任務；不會把任意新 public bytes 自動納入 release。
- site 僅含既有 11 份 allowlist 加 `_headers`、`robots.txt`、`sitemap.xml`，共 14 檔。所有九份非 HTML 資產逐 byte 保持 M1。HTML 只在 head 將 robots 改為 index,follow 並加入唯一 self canonical、互返 zh-Hant/en/x-default；x-default 指中文。head 其餘內容與所有可見 body 保留，包含候選／尚未部署提示與原 microdata。
- robots 僅 Allow 與 sitemap 預定網址。sitemap 只列兩個 canonical，沒有虛構 lastmod。沒有新增字型、追蹤、外部載入或帳戶／認證配置。
- 原 public 沒有 `_headers`／robots。`_headers` 由既有 `scripts/serve.mjs` 的 `HEADERS` 常數產生；import 的 main guard 不會啟動 listener。原 serve 的 SHA-256 為 `a810dd96c8e90f9f44518061f93dc331dacfa65aef85e53d37a15d8fe2e3ad5b`。完整保留 Content-Security-Policy、X-Content-Type-Options、Cache-Control、Referrer-Policy，只改 X-Robots-Tag=index, follow。CSP 仍為 `connect-src 'none'`、`script-src 'self'`、`worker-src 'self'`，沒有放寬 data/blob 規則。配置檔不是實際 hosting header 證據。
- manifest exact keys：schemaVersion=1、mode=release-candidate、origin、toolSlug、files、sourceFiles；records 只有 path/bytes/sha256。files path 相對於 site；sourceFiles path 相對於 public。兩者按 path 字典序，無重複、timestamp、隨機值或本機絕對路徑。manifest 不列自己。
- check 重新讀取／比對 M1 鎖定來源、重建 expected release bytes，逐檔比較並檢查完整兩語 HTML metadata／head SEO 位置與互返語義；不採信可一起修改的 manifest。來源、source+manifest、asset+manifest 一起變更仍拒絕。
- 建立前完整檢查輸入與既有輸出；拒絕未知／缺漏檔案、未知空目錄、symlink/junction、未管理輸出或被修改的產物。合法既有產物重用且逐 byte 確定；不修補、不覆寫有疑義的既有輸出、不遞迴刪除。初次建立使用 exclusive write；失敗清理只限此 build 建立且仍符合預期 bytes 的項目，保留未管理資料。

## 證據與缺少的 gate

新增 14 項發布測試已先針對性通過，涵蓋雙語 SEO、原 preview/body/runtime、robots/headers/sitemap、確定重建、tamper/extra/missing、來源變動、junction、CLI 拒絕邊界；負例全在本工具 test 內臨時 copy，不改真 public/dist。完整最終命令、來源／產物 SHA-256、差異和環境前後快照均寫 [evidence/m1b](evidence/m1b/final-1-commands.json)，不覆蓋原 M1 evidence。

真 browser、視覺、原生、真機、正式 Network/Storage、實際 hosting headers：**NOT_RUN_USER_FOCUS_INCIDENT**。主代理獨立發布準備驗證尚待回收。沒有 GitHub、部署、正式首頁整合；未稱已上線／外部驗收完成。M1 歷史規格「尚未實作」開頭維持唯讀；最新狀態以 HANDOFF 的追加紀錄與本檔為準。

最終實際結果：Node v24.14.0；完整 npm test **52/52 pass、0 fail、0 skipped**，check/build:release/check:release 皆 exit0。14 site 檔 59,422 bytes，加上 sibling manifest 3,900 bytes；manifest SHA-256 為 `6791701d99d3408eeb730c3b14e8f26d1c23c7e7ea7082ffcf66654e60402460`。envguard 完整 Snapshots 前後相同。逐檔 sources/artifacts 見 [固定候選](evidence/m1b/candidate-manifest.json)，實際改動見 [patch](evidence/m1b/source-changes.patch)，詳細命令與限制見 [追加交接](HANDOFF.md)。
