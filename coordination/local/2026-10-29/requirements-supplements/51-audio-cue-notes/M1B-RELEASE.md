# 錄音時間戳筆記 — M1B 離線發布候選

2026-10-23，B20-RP-51。狀態：**離線發布準備通過，尚未發布／部署，未獲 M2 放行。** 預定 origin 為 https://audio-notes.glossquote.com，這不是已上線聲明。toolSlug 固定為 audio-cue-notes。原 M1／R01 產品 runtime、public、dist 與 M1 證據不變。

瀏覽器驗收者之後應使用 **release-artifacts/site/**： [繁中入口](release-artifacts/site/index.html)、[English 入口](release-artifacts/site/en/index.html)。此目錄是正式 SEO 的獨立靜態候選；public／dist 仍是原 noindex preview。本輪沒有啟動任何 server、瀏覽器或 native UI。必要真實驗收必須由主代理依已驗證的隔離方式另行安排。

## 重現方式

使用既有 Node v24.14.0、npm 11.9.0；零依賴，無需 npm install。於本工具目錄執行：

```text
npm test
npm run check
npm run build:release
npm run check:release
```

原 test／check／build／dev scripts 保持；本輪不重建實際 preview dist，也不執行 dev。正式兩個 script 分別是 node scripts/release.mjs build 與 node scripts/release.mjs check。直接呼叫 release.mjs 沒有 mode、錯 mode 或多參數均 exit 2，不能傳任意 origin，也沒有部署 mode。

本輪 npm 經由現有 npm-cli.js 執行，使用 [capture-m1b.mjs](scripts/capture-m1b.mjs) 的獨立空白 user/global npmrc、任務目錄 cache、offline／停用 update notifier，以及最小子程序環境，不讀帳戶 npm 設定或繼承認證。主程序 shell:false／windowsHide:true；[hidden-process.mjs](scripts/hidden-process.mjs) 是本地、process-only 的驗證預載，令 npm 內部的實際 spawn／spawnSync 維持 shell:false／windowsHide:true，拒絕原生 shell expansion。沒有改寫 npm 或任何持久設定，也不是 OS sandbox／瀏覽器隔離證明。

## 產物與保護

- [manifest.json](release-artifacts/manifest.json) 在 site 旁，不在 site 裡。schemaVersion=1、mode=release-candidate、固定 origin／toolSlug，files 16 項、sourceFiles 13 項，各列排序的 path／bytes／SHA-256；沒有時間、亂數或本機絕對路徑。
- site 共 **16 檔、76,974 bytes**：既有 13 個 public allowlist 資產，加 robots.txt、_headers、sitemap.xml。11 個 JS／CSS runtime 資產逐 byte 等同 M1；兩個 HTML 只改 head robots 並加 canonical／zh-Hant／en／x-default。title／description／H1、語言、可見候選／未驗文案與 body 均保留。
- canonical 僅 https://audio-notes.glossquote.com/index.html 與 https://audio-notes.glossquote.com/en/index.html；x-default 指中文。robots 精確 Allow: / 並列預定 sitemap。sitemap 只有兩個 canonical，沒有 lastmod。
- [release-contract.mjs](scripts/release-contract.mjs) 固定已覆核 M1 R01 的 13 個來源 bytes／SHA，並固定原 serve.mjs 的安全來源 hash。check 每次從原來源重算預期 site 與 manifest，逐 byte 比對，另作雙語靜態語義檢查；不只相信可被竄改的 manifest。
- 建立前完整檢查 input 與既有 output。拒絕 symlink／junction、未知目錄／檔案、缺檔、來源變動、錯 origin／SEO、manifest 與資產共同竄改。沒有遞迴刪除，也不覆蓋既有候選；合法重建為 byte 相同的 no-op。損壞或未管理的目錄會 fail closed，需主代理審查復原；不自動清除來湊通過。
- 若首次建立遇到 I/O 中斷，可能留下尚未完成的 task-owned 輸出；下一次會拒絕該不完整目錄，需主代理處理。程式不冒險刪除或覆蓋原物。

### 安全 headers 來源

原 public 沒有 _headers／robots。新 [site/_headers](release-artifacts/site/_headers) 依既有 scripts/serve.mjs 建立，來源 SHA-256：`efac4d41206ea6ae3b9742dfb2f82e88c8a7c705a76142c148c71d28886c3164`。原檔只讀取並驗 hash，沒有 import 或啟動 listener。

完整保留 X-Content-Type-Options=nosniff、Referrer-Policy=no-referrer、Cache-Control=no-store、Permissions-Policy 的 microphone/camera/geolocation 拒絕，以及原 CSP 的 default/script/style/connect/object/base/form/frame-ancestors 和 media-src blob:。只有 X-Robots-Tag 改為 index, follow。route-specific Content-Type／Content-Length 由將來 hosting 依資產 MIME 提供，不設成全站固定型別；HEAD／405 路由行為屬原 dev server，未部署到此靜態配置。

HTML 原 CSP meta 也保留，沒有放寬任何 data/blob/connect/script 規則。_headers 是待主代理審閱的靜態配置，**不是實際 hosting response headers 已通過的證據**。

## 最終驗證與凍結

2026-10-23 臺北 18:12，最終 [commands.json](evidence/m1b/final-02/commands.json) 保存實際命令、參數、時間、exit 與全部 stdout／stderr。

| 命令 | exit | 實際結果 |
| --- | --- | --- |
| node --version | 0 | v24.14.0 |
| npm --version | 0 | 11.9.0 |
| npm test | 0 | 80 tests／80 pass／0 fail；63 個既有具名測試 + 17 個發布／驗證工具測試 |
| npm run check | 0 | 原 13-file preview 靜態檢查 |
| npm run build:release | 0 | 獨立 16-file release-candidate |
| npm run check:release | 0 | 從固定來源重建 expected bytes，完整逐檔／語義核對 |

新測試覆蓋 SEO 互返、精確 origin、preview／runtime 不變、重建確定、modified／extra／missing／unmanaged output、manifest+asset 共同竄改、source+manifest 變動、headers/robots/sitemap 污染、junction 與 CLI 拒絕。負例只在本任務 evidence/m1b/scratch 臨時 copy；刪除前驗證絕對路徑邊界，不碰真產品。原工具鏈測試也只將 scratch 從 evidence/m1 移到 m1b，避免改舊證據。

[33 檔 source bytes／SHA 清單](evidence/m1b/final-02/sources.sha256.json) files 陣列 JSON digest：`6078463d2f00cf3c90331c94c7646dedb5584acc05f4b9cdf4df2afb777fac76`。

[release manifest](release-artifacts/manifest.json) **4,533 bytes**，檔案 SHA-256：`dc7ad94d835be59f78909505be98cbcbb600612159aee33bafbb82e670959747`。逐檔 site hash 與 public 來源 hash 同列於 manifest／[artifact receipt](evidence/m1b/final-02/artifact.sha256.json)，不把 files-array digest、manifest hash 與 Git commit 混為一談。

[before](evidence/m1b/preserved-before.json)／[after](evidence/m1b/preserved-after.json) 逐 path／bytes／SHA 比對，原 public、dist、舊 evidence/m1 共 **72 檔完全相同，沒有新增／缺檔**。[環境 before](evidence/m1b/environment-before.json)／[pre-final](evidence/m1b/environment-pre-final.json)／[after](evidence/m1b/environment-after.json) 的完整 Snapshots 相同，包含 HKCU/HKLM PATH hash／type／length／ephemeral entries、全 Environment fingerprints、TEMP/TMP。獨立 Get-FileHash 驗證與結果見 [verification.json](evidence/m1b/verification.json)。

首輪 npm 驗證的 Windows --import 測試參數錯誤及修正保留於 [initial-validation](evidence/m1b/initial-validation.md)，沒有覆寫失敗紀錄。受保護檔案的第一個整體 JSON 字串比較曾因物件排序表示不同報不符；隨即逐檔核對 72 個 path／length／SHA，確認沒有任何檔案變更，並以逐檔比較保存正式 after 收據。

## 尚缺的 gate

真瀏覽器／codec／音訊 File input／下載／layout／鍵盤焦點／讀屏、正式 Network／Storage／hosting headers 均 **NOT_RUN_USER_FOCUS_INCIDENT**。Node／靜態檢查未取代它們。沒有啟動 server、native UI、CDP，沒有隔離實驗，沒有安裝依賴或新服務、讀憑證、改持久 Windows／Git／auth、GitHub 建立／push、部署或首頁修改。

主代理可回收本候選進行獨立驗證與單一 ZIP 整合；補齊必要瀏覽器 gate 後才另行決定 M2。此輪無額外產品／模型／權限決策待答，僅等待主代理驗收與既定 gate。requested gpt-6.1-sol/max 繼續按對話要求記錄，backend 身分未獨立確認。
