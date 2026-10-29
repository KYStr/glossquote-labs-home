# 固定候選

## 最新：M2 0.1.0-rc1（2026-10-16）

M1 主代理獨立驗收 PASS 並給 M2 GO。本對話已完成 M2 source/production candidate，等待主代理 M2 獨立驗收；hosting、首頁、外部驗收未執行，未標產品 complete。

- PUBLIC repo：https://github.com/KYStr/glossquote-labs-reading-plan。
- verified default branch：codex/reading-plan-release；local / GitHub API / remote HEAD commit 均為 `c529476f034b2b115968edc0ec14cbccbbc53bd5`。
- root evidence：`.runs/reading-plan-m2/W16-26-M2-01a141fc/`；發布副本 `.runs/github-publish/glossquote-labs-reading-plan/W16-26-M2-01a141fc/source/`。
- fixed ZIP：`glossquote-labs-reading-plan-source.zip`，123838 bytes，44 source files、10 directory entries；SHA-256 `49a93dd78581837881a9586c623ddd1b7912c6c55b3a86edb9191fbe3002eec6`；同名 .sha256 sidecar。每檔和該固定 commit 的 Git blob 一致。
- `release-manifest.json`：11315 bytes；SHA-256 `1e4284f60df775049886ef3e777ee980b1f2cbfd17769e498d84fe0bf78e8905`。包含 44 source files/279218 bytes、9 個未改的 M1 public/60267 bytes、12 production assets/65324 bytes、兩個 CSP JSON-LD hashes、source commit/ZIP。
- source content digest：`990bd092aa0262c6b13cbff190844e5a8a14a9383cff12ce3feab000b5026c3c`。
- 根與 clean publishing copy 的 npm test（87/87）、check、build、build:production、check:production、release:check 全 exit 0；兩地 production manifest 相同。
- 5206 真瀏覽器兩語 P5/CSP/metadata、zh infeasible、en flex PASS，browser error/warning logs 空；實際 HTTP 9 routes 的 headers/MIME/404/noindex PASS。
- Git settings capture/verify PASS；M2 全 User/Machine PATH/type/length/Environment snapshots 前後完全一致。

CSP 全站允許 self scripts 加兩個 JSON-LD 精確 script-text SHA-256 base64（主審指定架構）：zh-Hant `s0hdXHva5KM+gOmK5HM5NuPdRCjG2flTRx1sud3p+mE=`；en `UoQMgb0Qqx7nyIBIdc+3CBS7PDNJ6A9lCe0hG1SJ6o0=`。沒有 unsafe-inline、外部來源或新增連線。正式 canonical 路徑 detach 全域 X-Robots-Tag，以 HTML index,follow 索引；未知 404 保留 noindex。

原生/真機/完整 DevTools 等受限 NOT_RUN 沿用已接受的 M1 紀錄；Cloudflare CLI/runtime/live、homepage 與外部驗收是 M3/後續工作，未執行。M2 沒有呼叫 Cloudflare、讀 token、改任何 persistent/Git auth 設定。

## 歷史：M1 凍結紀錄

2026-10-16，M1-local 固定候選 **0.1.0-m1-rc1**。本機驗收通過，主代理最後獨立命令待執行；未獲 M2 GO。沒有 source commit、公開 repository、production 產物、部署或外部驗收。

固定證據位於根 `.runs/reading-plan/W16-26-M1-01a141fc/`：

- `candidate-manifest.json`：5382 bytes；SHA-256 `aae665490bc38b94217332c2864a306e841e77d8c4f1a5d09796da56490d64f2`。
- source content digest `08b3e29b134d45644827162c9423d99725eecff6cd05f0bf4257b649f12084fa`；23 個實作/測試/工具鏈檔案，126717 bytes。
- preview dist：9 個檔案，60267 bytes；每檔與 public 的 bytes/SHA-256 相同。
- `commands.json` 及三份 npm logs：Node 24.14.0；npm test 83/83；check/build PASS；四個必要命令 exit 0。
- `browser-results.json`、兩語桌面/320px JPEG、原生下載 `native-reading-plan-zh.txt`、`acceptance-matrix.json`。失敗的第一次 viewport 套用紀錄保留，已由正確 320px 紀錄取代；不是產品 PASS 證據。
- `environment-before.json` / `environment-after.json`：User/Machine 全部 fingerprints 相同，PATH 暫存項均 0。

manifest 排除自身、證據、可變交接/狀態文件、未改動的 M0 規格、test/.tmp，避免循環雜湊。沒有 commit；這是工作樹凍結，不是來源發布。

NOT_RUN：可驗證的真繁中 IME、原生 persisted BFCache、200% 瀏覽器縮放、真手機/虛擬鍵盤、低階/降速效能、完整 DevTools Network/Storage。必要 callback/Blob/lifecycle/URL timer 邏輯由離線實際 app handler harness 通過，沒有冒稱原生 API。原生 clipboard write 的 fulfilled UI 與實際 TXT bytes 已實測；未讀剪貼簿。

詳細檔案、案例與限制見 HANDOFF.md。M2 仍由本原功能對話接手，待主代理明確 GO；M3 hosting/首頁由主代理處理。
