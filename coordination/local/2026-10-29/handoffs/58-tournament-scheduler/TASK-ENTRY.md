# B20-58-M1 — 循環賽賽程表

2026-10-23（Asia/Taipei）。範圍：T00–T08，M1 雙語離線靜態候選；不發布或部署。

已讀本工具 14 份規格（含初始 HANDOFF）、根 AGENTS、SECURITY-BASELINE、PRODUCT-THESIS、完整 GLOSS-TOOLS-DESIGN-SYSTEM。工具 docs/DESIGN-SYSTEM 與家族版本 SHA-256 完全相同：`935d4cca13c22b8a66688c8b83fdf412b448a0ff5c62d816728f510aeee05ada`。frontend-design skill 僅作實作方法，產品契約優先。

## 完成條件

完整雙語設定 → circle 單/雙循環 → 場地/slot/輪空 → 選配民用時間 → 完整預覽/每隊對手 → 手動 TXT/JSON。離線 oracle、不變式、生命週期、工具鏈驗證及固定來源清單可由主代理重驗。瀏覽器驗收保留未執行。

## 介面決策

Product App 模式；主辦人在桌機整理名單、活動現場手機查賽程。最重要物件為完整逐輪賽程。常用隊名、循環、場地和產生固定可見；時間進一層 disclosure；每隊表和下載緊鄰結果。不做公平休息最佳化。

桌機：`[設定（約 1/3） | 完整輪次（約 2/3，可成長）]`；手機：`[輸入與設定 / 完整賽程] → 單欄實際場次`。暖紙/墨色/acid 主動作、系統字體、平面分隔；無外部資產。清除使用頁內明確確認，避免原生 dialog。

## 執行邊界

只改本工具 package/.gitignore/public/scripts/test/dist/HANDOFF/TASK-ENTRY/evidence/m1。原始 14 文件除 HANDOFF 不修改。不開子代理/chat、不切模型；requested gpt-6.1-sol/max，backend 未獨立確認。

不使用 browser/CUA/IAB/CDP/OS 輸入、dialog、剪貼簿，不啟動 server。離線 request-handler 測試不稱真 HTTP/browser。同步短工作不設假取消。保留一切既有程序/使用者檔案。

時間、ID 例行決策：round 全賽事連續編號；ID 的 R 使用此全域 round，M 為該輪實際比賽次序；slot 在每輪由 1 開始。對手 JSON entries 保持規定精確欄位，介面/TXT 的場地、時間、主客資訊由該輪 match 對應。

## 初始狀態

本資料夾原為 14 份規格，無實作。根 git status 僅顯示本工具整個目錄 untracked；不 stage/commit/push。已確認 Node `v24.14.0`，執行檔 `C:/Program Files/nodejs/node.exe`。

## M1 結果

T00–T08 完成於 M1 授權範圍：最終 npm test 42/42、check 8 檔、build 8 檔，各 exit 0；5 份合成賽程/10 實際輸出完成獨立內容重讀。完整 Windows Snapshots 前後相同。source/preview bytes/SHA-256 交 [candidate-manifest.json](evidence/m1/candidate-manifest.json)；狀態和 command logs 見 [HANDOFF](HANDOFF.md)。

證據腳本曾有一次 Buffer/Uint8Array 型別斷言失敗，已改為 bytes 比較；失敗及部分輸出保留，新 verified 目錄完成。沒有以離線 harness 代替 browser；B01–B04 仍 NOT_RUN_USER_FOCUS_INCIDENT，真 listener/HTTP 未啟動。未 M2/M3、未 GitHub/部署、未做整合 ZIP；交主代理獨立複核。

## B20-RP-58 / M1B 追加（2026-10-23）

已完整讀本輪 `.runs/batch20-release-prep-2026-10-23/TASK.md`，只做離線發布準備。預定 origin `https://round-robin.glossquote.com`，slug `tournament-scheduler`，不是已上線位址。允許路徑收斂至 package/.gitignore/scripts/test/HANDOFF/TASK-ENTRY/M1B-RELEASE/evidence/m1b/release-artifacts；public/dist/舊 M1 evidence/其他產品不可改。

完成固定輸入 pin、正式 head SEO 轉換、robots/sitemap/header 配置、manifest、獨立 expected bytes/tamper 檢查與 release tests。只新增兩個 npm release 入口；原 test/check/build/dev 保留。原 toolchain scratch 改到 m1b，避免舊證據寫入。

針對性測試 13/13；唯一完整 npm suite 55/55，check/build:release/check:release 全 exit 0；未重跑 preview build。所有環境 Snapshots 前後相同。11 檔 site 在 `release-artifacts/site/`，完整 hashes、diff 與保護範圍在 [M1B 交接](M1B-RELEASE.md)。舊 M1 記錄不覆寫；本輪沒有 browser/server、GitHub、hosting、首頁或額外 ZIP。仍待主代理獨立驗證與既有 browser gates。

## B20-58-M2A（2026-10-27）

Root通報並由只讀result引用核對：b20-58-r1為28PASS/6NOT_RUN/0FAIL，v7隔離及parent cleanup PASS由root確認。本輪只在本工具與指定owner-58-release目錄做assets-only Cloudflare離線準備；不得push/deploy、改首頁／runtime／CSP、啟動UI／server、讀憑證或改持久設定，不再委派。

新增固定wrangler.jsonc與獨立deployment-config驗證；release新增三條精確301 `_redirects`，12檔site，僅去除正式HTML精確footer候選span。public/dist/JS/CSS/舊M1/M1B證據不變；舊11檔產物先驗hash後封存指定owner/before。Node全離線fake-data。

第一輪59測試通過但check因TLA module cycle exit13，保留失敗。拆獨立模組並加CLI回歸後，最終60/60與check/build/build:release/check:release全exit0；完整persistent environment Snapshots不變。詳 [M2A-RELEASE](M2A-RELEASE.md) 與HANDOFF最新節；root owner目錄保存diff、source/artifact hashes及原始命令結果。保留6NR，沒有把本輪配置當正式hosting或新增browser PASS。
