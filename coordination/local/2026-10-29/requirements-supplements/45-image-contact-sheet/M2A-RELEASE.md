# B20-45-M2A — 正式靜態發布準備

本輪只準備正式來源與產物；不 push、不部署、不使用憑證，不操作 browser/native/桌面，也不代表外部驗收通過。主聊驗收後仍由原對話進入 M2B。舊 M1、M1B、F1、F1R1、browser harness 與既有產物均保留。

## 固定基線與主聊回報

基線為 B20-45-F1R1，release manifest SHA-256 `e52c0054578d01283d2db22201b74f8a7d910a03b69a09a09688b8d3a270a7ae`，candidate manifest SHA-256 `4cd4d2c9548104be90027c8408d53bcd3b5990ff710aafb98a23e845300a295a`。主聊本次派送回報：ZIP 乾淨 copy 的原 4 fixtures、73 tests 與 5 命令 PASS；真 browser `b20-45-f1r1` 為 44 PASS／8 NOT_RUN／0 FAIL、prohibited 空、parent cleanup PASS。這是主聊的證據，本對話沒有重新操作 browser，也不把 8 項 NOT_RUN 宣告通過。

## 正式設定與轉換

`wrangler.jsonc` 是沒有 comments 的固定 JSON bytes：name `glossquote-image-contact-sheet`，date `2026-10-24`，唯一 custom domain `contact-sheet.glossquote.com`。workers_dev、preview_urls、send_metrics、observability.enabled、logs.enabled、logs.invocation_logs、traces.enabled 均 false。assets.directory 固定 `./release-artifacts/site`，run_worker_first false，html_handling／not_found_handling 均 none；沒有 Worker main、vars、bindings、環境覆寫或 dependency。

專案明確要求上述固定日期及關閉觀測，優先於 Cloudflare 技能預設啟用 logs/traces 或更新日期的建議。使用官方 configuration、static-assets、redirects、Workers Logs 文件核對欄位，沒有因此新增 CLI、安裝依賴、啟用 telemetry 或登入。這輪只做固定設定的離線檢查，未執行 Cloudflare CLI dry-run 或遠端 hosting 驗證。

public 13 檔、preview 與 F1R1 bytes 完全相同。正式 HTML 延用已驗 SEO，只精確移除頁尾 `<span>` 內的 ` · 本地候選預覽` 與 ` · Local candidate preview`，不變動其他可見文字、CSP、JS/CSS、核心、PNG/TXT 生成或下載。移除前固定標籤必須恰好出現一次；沒有廣泛 replace preview 等字串。

正式 site 為 15 檔，新增 `_redirects` 的完整 bytes 如下，最後一列也有 LF，沒有 CRLF、空列、額外規則：

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

manifest 保留在 site 外，改為 schemaVersion 2、mode production，files 15、sourceFiles 13，新增 deploymentFiles 記錄 root wrangler.jsonc 的 path／bytes／SHA-256。部署設定不在 public 或 site。release build/check 先以固定 literal 核對設定 bytes，拒絕缺失、異常型別、link、另一種 deployment config 及任何欄位／格式漂移，再由原 public pins 建立預期產物；manifest 不作為讀取路徑或正確性的信任根。

## 重現與不覆寫契約

在新的審核 copy、Node 24、零依賴下依序執行：

```text
npm run check
npm run build
npm test
npm run build:release
npm run check:release
```

使用新的空輸出目錄；本工具根目錄的 dist／release-artifacts 保留歷史 M1B。build 仍拒絕有污染、缺失、額外檔／目錄、partial output 或 manifest 漂移的既有產物，不刪除或修補它們；O01 原本允許完全空的 release-artifacts 維持不變。合法且完全相符的重建仍是 byte-preserving no-op。

原 73 tests 保留，release assertions 依正式 schema／site count／頁尾轉換更新，另補 6 項設定／redirect／manifest 負例測試群。負例以合法 JSON 同時修改 manifest hash，並核對拒絕前後 bytes／目錄不變。測試只在任務 copy 的 evidence/m1b 下建立合成資料，清理只針對已確認的本任務路徑，沒有 process kill 或外部網路。

## 交接

本輪證據及正式 copy 在 workspace `.runs/batch20-completion-2026-10-27/owner-45-release/`。prepare.mjs 的 capture/create/sync-handoff/freeze 各自有固定用途，不能重跑 capture/create/freeze 覆蓋紀錄；freeze 對全部舊 evidence／root dist／root release 逐檔核對。最終 source/artifact diff、逐檔 bytes/SHA、實際命令／exit 與環境前後完整 Snapshots 由 HANDOFF 追加段及 owner 目錄的新證據記錄。

M2A 狀態為 prepared，source publication、hosting、homepage integration、production HTTP/native browser 均沒有在本輪執行；維持逐項 NOT_RUN。不得標示外驗通過。

## B20-45-M2A-F1 修正（2026-10-27）

主聊指出共同發布gate要求固定build command，原M2A設定缺少該欄位。本輪只在wrangler.jsonc與DEPLOYMENT_CONFIG同位置加入 `build: { command: 'node scripts/release.mjs build' }`，更新獨立literal oracle與10種build缺失／異型／命令替換／額外shell／cwd／watch_dir負例；協同修改manifest config digest仍必須拒絕且保留原物。

全部15個site檔、13個public、CSP、preview、核心與輸出維持原M2A。schema 2／production維持原樣；release manifest只刷新deploymentFiles內config的bytes/hash。舊owner-45-release全部文件、候選與結果保留；新候選及source/artifact diff、完整命令與環境前後在workspace `.runs/batch20-completion-2026-10-27/owner-45-release-r1/`。

本輪執行受影響的完整release測試檔，以及check、build、build:release、check:release。原M2A完整79項結果保留作未變範圍的歷史證據；不將本輪targeted結果改稱完整suite重跑。固定build欄位參考官方Wrangler Custom builds文件，但本輪不執行Wrangler、GitHub建庫／push、deploy、UI、憑證或遞迴委派。主聊最新限制：後續M2B只做local copy，仍禁止create/push/deploy；不是部署放行或外驗通過。
