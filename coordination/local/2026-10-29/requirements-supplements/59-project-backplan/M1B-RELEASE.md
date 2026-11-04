# B20-RP-59 — M1B 離線發布候選

日期：2026-10-23。依 `.runs/batch20-release-prep-2026-10-23/TASK.md` 完成有界的發布工具鏈。這是必要 browser gate 前的**未上線候選**，不是 M2 GitHub 放行或 M3 hosting 放行。派送 requested gpt-6.1-sol/max；backend 身分沒有獨立驗證，未切換模型。

## 重現

既有 Node.js 24+，ESM/builtins，零新依賴，不需 npm install。於本工具目錄執行：

```text
npm run build:release
npm run check:release
```

命令分別是 `node scripts/release.mjs build` 與 `node scripts/release.mjs check`。只有一個 mode 參數合法；無參數、錯 mode、多參數或 origin override 都拒絕。原 test/check/build/dev 保留；這輪不執行 dev 或重新生成 M1 preview。

- 預定 origin 固定為 `https://backplan.glossquote.com`，toolSlug 固定 `project-backplan`。不由 CLI、環境變數或檔案任意指定；此網址不是已部署證據。
- browser 驗收者應使用 **[release-artifacts/site/](release-artifacts/site/index.html)** 作候選 site 根目錄，測中英兩頁；不是 public、dist 或 release-artifacts 的父層。此輪沒有啟動 server/browser；主代理須先提供符合焦點限制的執行方式。
- **[release-artifacts/manifest.json](release-artifacts/manifest.json)** 位於 site 的 sibling，不屬於部署資產。schemaVersion=1、mode=release-candidate、origin、toolSlug、files、sourceFiles；每列 path/bytes/sha256 依 path 排序。files 相對 site，sourceFiles 相對 public。manifest 無時間、隨機值或本機絕對路徑。

## 內容與信任基準

`scripts/release.mjs` 釘住 M1 的 10 份 public bytes/SHA-256。基準取自未改寫的 `evidence/m1/candidate-manifest.json`（歷史 manifest SHA-256 `cfaac5fcf537edf7db320ffe1f5ef64a39f712d1e1b24c894ba222c9687bbfe3`）。來源改變即拒絕，包括變更同長度內容並同步改 manifest 的情形；下一個產品版本需另行審核與更新釘住的基準。

site 只有 10 份既有 public allowlist 資產，加上 `_headers`、`robots.txt`、`sitemap.xml`，共 13 檔。JS/CSS 8 檔完整複製。兩份 HTML 僅在 head 替換 robots 為 index,follow，加入唯一 canonical 與 zh-Hant/en/x-default alternate。canonical 是 `/index.html` 和 `/en/index.html`，x-default 指向中文。title、description、html lang、H1、可見候選提示、內容及 runtime 全部保留。

robots 精確允許 `/` 並指出候選 origin 的 sitemap。sitemap 只列兩個 canonical，不含 lastmod。這些檔案只在 release site 內；public/dist 繼續 noindex。

原 public 沒有 `_headers`；產生器 import 既有 **`scripts/serve.mjs` 的 `SECURITY_HEADERS` 常數**（不呼叫 makeServer/listen），並驗證該來源檔 2,903 bytes / SHA-256 `b5c5e7b1e85b77fe2943b28863234afe68da3260edcaf73cfa91371d2316b49a`。全部 security/privacy headers 保留，僅將 X-Robots-Tag 從 noindex, nofollow 換為 index, follow；CSP 的 connect-src/script-src/worker-src/data/blob 等沒有放寬。這是靜態 hosting 配置，並非實際 hosting headers 證據。

## 檢查與保留原物

build 和 check 都先驗來源、完整允許路徑及來源 hash，再從釘住的來源重建完整 expected bytes 與 manifest；不是只核對 manifest 自述。check 逐一重算檔案 bytes/SHA 並比對 expected bytes，另解析 HTML head 做 semantic robots/canonical/hreflang 檢查。

既有 release-artifacts 必須只有完整合法的 site 與 manifest，所有檔案必須是本版本的精確 expected bytes。合法重建是無寫入的核對；未知、缺失、改動、錯 origin/SEO、symlink/junction、額外目錄或未管理的輸出都拒絕，沒有自動修復、覆寫或遞迴刪除。第一次建立使用 exclusive writes，manifest 最後寫入；若檔案系統中斷留下不完整新目錄，會保留並停止，交主代理判斷，不自動清除重試。

針對性測試只對 evidence/m1b 下的合成暫時 copy 做負例；實際 root 不做刪除/改動負例。舊 toolchain 測試的 scratch 位置改到 evidence/m1b，避免本輪完整 npm test 觸及歷史 evidence/m1。runtime 與原 preview 不變；其 50 個保護檔案有前後完整 hash 清單。

## 尚缺 gates

真 browser module Worker、取消/過期 generation、Blob/download/pagehide、DOM、320px、200% zoom、全鍵盤/多選/焦點、Network/Storage、CSP 實際套用、原生/真機：**NOT_RUN_USER_FOCUS_INCIDENT**。真 server/socket HTTP：**NOT_RUN_TASK_NO_SERVER**。沒有安裝服務、讀憑證、修改持久 Windows/Git/auth、GitHub、部署、首頁更新或對外聯絡。

主代理尚須獨立檢查本輪 source/artifact、補完必要 gate 並另行決定 M2/M3；目前沒有需要新增產品決策或權限才能完成 M1B 的事項。實際命令、count、hash、envguard 與歷史差異已追加在 [HANDOFF](HANDOFF.md)，新證據只放 [evidence/m1b](evidence/m1b/CHECKS.json)。

本輪最終 64/64 Node tests、check（10 public / 23 syntax）、build:release、check:release 均 exit 0。實際 site 13 檔 / 72,036 bytes，manifest SHA-256 `98382808e41ec28e52d5dfb1b898bc1189e93489f7e765f3965d755fe6b1575a`。50 個保護檔案與完整環境快照前後不變；這些離線結果不代表上述 browser/hosting gates 通過。
