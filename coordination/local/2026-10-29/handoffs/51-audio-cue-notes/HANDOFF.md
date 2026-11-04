# 錄音時間戳筆記 — M1 交接

2026-10-23，任務 B20-51-M1／B20-51-R01。狀態：**M1 R01 本地候選已實作並凍結，待主代理獨立審閱；未完成產品發布驗收。**

| 範圍 | 實際結果 |
| --- | --- |
| T00–T40 實作、Node 核心／狀態／離線 UI adapter | PASS（限 CLI 與合成資料） |
| Node 24 / test / check / build | 四個命令 exit 0；64 tests、64 pass、0 fail |
| 真瀏覽器、codec、file input、native、真機 | NOT_RUN_USER_FOCUS_INCIDENT |
| 桌面／320px 實際 layout、鍵盤、焦點、讀屏、下載能力 | NOT_RUN_USER_FOCUS_INCIDENT |
| GitHub / 正式 hosting / 首頁 | NOT_PUBLISHED；未獲 M2／M3 指令，不推送、不部署 |
| 主代理獨立驗收／使用者外部覆核 | NOT_RUN |

起點為 14 份文件，沒有既有產品實作。本輪新增雙語靜態候選、純函式核心、媒體生命週期控制、工作區狀態、完整下載流程、零依賴工具鏈與測試；未改兄弟工具、共享首頁／看板或 GlossGate。完整變更記錄見 [TASK-ENTRY](TASK-ENTRY.md)。

可審閱的候選入口為 [繁中](dist/index.html)／[English](dist/en/index.html)，兩頁均 noindex、nofollow、noarchive。這是靜態產物；ES modules 需由合適的靜態 HTTP 環境提供，直接 file:// 開啟不保證可用。本次未啟動 dev server、瀏覽器、CDP、CUA、IAB、native UI 或背景服務。dev 腳本已建立但未執行，固定 127.0.0.1:4231。

## 實作行為

- 單一本機音訊、原生 audio controls、metadata 長度驗證；沒有自動播放。超過 64 MiB 在建立 URL 前拒絕。
- 實際音訊長度與可編輯來源時間軸分開；時間戳捕捉／儲存、編輯／刪除、穩定時間排序、只 seek 不 play。草稿固定毫秒、不計配額、不匯出。
- canonical noteId 6–12 位、1..999,999,999,999；匯入取最大 ID+1，刪除不回收；耗盡明確 NOTE_ID_EXHAUSTED。
- JSON 嚴格 schema 1、fatal UTF-8、單一 optional BOM、完整大小／型別／時間／文字配額驗證；先預覽再確認，長度不同列出精確兩個毫秒值。
- 換檔、清除與匯入的頁內確認；取消保留原工作區。匯入筆記可先獨立存在，再選音訊明確附加保留或清除重建。
- Markdown／JSON 真實 UTF-8 bytes 輸出，單檔最多 4 MiB、兩者合計不超過 8 MiB；先檢查完整 bytes 才建立 Blob／URL。超限不截斷、不刪除、不下載部分內容。
- 工作區變動使舊下載 URL 失效；取消／reset／來源替換／pagehide 及載入錯誤的 generation 與資源清理。JSON 匯入保留已附加音訊與播放位置；failed attach 保留匯入筆記。
- R01：metadata 已建立的工作區遇播放 error／abort／emptied，只釋放壞媒體，保留筆記、metadata、ID counter 以供匯出或重新附加。首次載入失敗仍清除未成功建立的暫存工作區。MIME／canPlayType 不再作拒絕關卡，實際嘗試 metadata，真實 media error 才安全結束。
- 純文字 DOM、雙語錯誤／確認／FAQ／SEO、語言切換遺失提醒；無上傳、Storage、帳號、ASR、遠端字型或分析。

## 最終命令與來源凍結

Node 實際位置 C:/Program Files/nodejs/node.exe，實際版本 **v24.14.0**。子程序使用 shell:false、windowsHide:true。最終時間為臺北 2026-10-23 15:34（原始日志保留 UTC）。

| 命令 | exit | 實際範圍 |
| --- | --- | --- |
| node --version | 0 | v24.14.0 |
| node --test | 0 | 64 pass、0 fail；含一個 fixtures.mjs 被 Node 計入的支援模組項，63 個具名測試 |
| node scripts/check.mjs | 0 | 13 個閉合靜態檔、ESM、兩語 noindex／連結／labels／能力靜態掃描 |
| node scripts/build.mjs | 0 | 13 個 dist preview 檔，逐檔與 public bytes 相同 |

原始 stdout／stderr 與退出碼： [commands.json](evidence/m1/validation-r01/commands.json)。先前兩個失敗與修正保留於 [initial-validation.json](evidence/m1/initial-validation.json)，未將歷史失敗抹除。

主代理 R01 覆核的兩項修正及 5 檔差異見 [R01 revision](evidence/m1/REVISION-R01.md)。首輪 [60-test 候選紀錄](evidence/m1/validation-final/commands.json) 原樣保留，僅為歷史結果，已由 R01 取代，不代表目前來源。

固定實作來源共 **28 files**，每檔 bytes／SHA-256 見 [sources.sha256.json](evidence/m1/validation-r01/sources.sha256.json)。該清單中 files 陣列 JSON 的 SHA-256 digest：

`c1948af8c34dc2af3a2e027a40f7cd7ef1fcc3680bfacc7eb747c2509e200b9e`

[dist 清單](evidence/m1/validation-r01/dist.sha256.json) 另列 13 檔。[規格快照](evidence/m1/validation-r01/specifications.sha256.json) 與實作 hash 分開，主代理的規格修訂不偽裝為原實作者改動。凍結後另用 PowerShell Get-FileHash 重驗 28 sources、13 dist 與 4 outputs，全部相符。

## 實際產物與精確邊界

全部是假資料產物，沒有讀取或播放使用者錄音。各產物 SHA-256 見 [outputs.sha256.json](evidence/m1/validation-r01/outputs.sha256.json)。

| 產物 | bytes | 驗證 |
| --- | ---: | --- |
| [notes.md](evidence/m1/validation-r01/outputs/notes.md) | 177 | 手寫期望：12.345s → 12345ms → [00:12.345]；含同時刻穩定排序、CR/LF 縮排與小時標記 |
| [notes.json](evidence/m1/validation-r01/outputs/notes.json) | 486 | 精確 keys、建立順序、不含音訊；重新匯入相符 |
| [exact-4mib.notes.json](evidence/m1/validation-r01/outputs/exact-4mib.notes.json) | 4,194,304 | 有效 ResultV1、escaping 後恰 cap，重新匯入成功；再加一個 ASCII byte 回 EXPORT_TOO_LARGE |
| [multiline-expansion.notes.json](evidence/m1/validation-r01/outputs/multiline-expansion.notes.json) | 2,138,768 | 525 notes、原文合計恰 1,048,576 UTF-8 bytes，JSON 輸出與重新匯入成功 |

大量換行案例的 Markdown 正確序列化長度是 **5,247,651 bytes**：46 bytes 標頭 + 1,048,576 bytes 原文 + 4 × 1,048,051 續行 + 13 × 525 筆記行開銷。完整超限拒絕；離線 Downloads 路徑驗證 **0 Blob / 0 ObjectURL / 0 download**。見 [multiline-expansion.json](evidence/m1/validation-r01/multiline-expansion.json)。此不是瀏覽器下載能力 PASS。

主代理本輪明確修正 A33 的「最大有效 Markdown 必須低於 cap」錯誤假設：合法內容可能因縮排超限，應完整拒絕且保留原筆記。實作維持每檔 4 MiB／合計 8 MiB；只有目前 JSON 也確實能序列化時，Markdown 超限提示才建議「下載 JSON」。其他情況僅建議減少或分批整理內容，不新增自動拆分功能。TECHNICAL 的舊「同步 2 MiB」文字依主代理同輪指令，以 4 MiB import cap 為準，不新增 Worker 或依賴。

## 環境、限制與下一階段

完整 [最初 before](evidence/m1/environment-before.json)、[R01 before](evidence/m1/environment-before-r01.json)、[R01 after](evidence/m1/environment-after-r01.json) Snapshots 相同，guard PASS；首輪 pre-freeze／after 也保留。HKCU PATH：ExpandString、834 字元、16 entries、0 ephemeral，hash `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`；HKLM PATH：String、1227 字元、30 entries、0 ephemeral，hash `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`。完整 Environment fingerprints、TEMP/TMP 型別／長度／hash 也相同，沒有持久環境變更。未呼叫套件安裝、認證讀取或 Git/global/system auth 設定操作。

Node fake media 與資料型 UI adapter 只驗證控制邏輯及事件接線，不能證明實際 codec、HTMLAudioElement 事件時序、file input、Blob 下載、行動版 layout、焦點、鍵盤／IME／剪貼簿或輔助科技能力。沒有試驗隔離、沒有 screenshots；沒有用這些測試取代瀏覽器 gate。完整 [驗收範圍表](evidence/m1/ACCEPTANCE-MATRIX.md) 保留未驗項。

source commit／reviewed commit／released commit：均 NOT_CREATED。GitHub URL：NOT_PUBLISHED；hosting：NOT_DEPLOYED；首頁：NOT_UPDATED。requested gpt-6.1-sol/max 僅記為對話配置要求，實際 backend 未獨立確認。

由主代理審閱固定候選，補足必要隔離瀏覽器驗收並另行決定 M2。整合 ZIP 由主代理製作；本功能沒有新增獨立使用者交付 ZIP，也沒有變動歷史包或其 hash。

## 2026-10-23 追加：B20-RP-51／M1B 離線發布準備

M1B 已完成，獨立候選在 **release-artifacts/site/**，不是 public／dist。預定 origin 固定 https://audio-notes.glossquote.com，toolSlug audio-cue-notes，仍未發布、未部署、未獲 M2 放行。完整重現、資產規格、失敗歷史與未驗範圍見 [M1B-RELEASE](M1B-RELEASE.md)；未改寫以上 M1／R01 歷史結果。

實際差異：修改 package.json 加 build:release／check:release，.gitignore 加 release-artifacts；新增 scripts/release.mjs、release-contract.mjs、capture-m1b.mjs、hidden-process.mjs 與 test/release.test.mjs；原 test/toolchain.test.mjs 只把暫存路徑由 evidence/m1 改至 evidence/m1b。沒有修改 public、dist、M1 evidence、AGENTS／六份規格／docs 或兄弟工具。另追加本 HANDOFF、TASK-ENTRY、新 M1B-RELEASE.md、evidence/m1b 與 release-artifacts。

release 來源僅原 13-file allowlist；固定 R01 public hashes 與 serve 安全來源 hash，check 每次獨立重算 expected manifest／bytes，拒絕來源變更與 manifest+asset 同時竄改。site 16 檔／76,974 bytes，11 個 JS/CSS 完全不變，兩語 HTML 僅 head robots／canonical／三個 alternate links 變更；候選與未驗證文案保留。新增精確 robots、兩 URL sitemap、由原 serve.mjs 常數導出的完整安全 _headers，只有 X-Robots-Tag 改成 index, follow。headers 配置不當作實際 hosting 回應證明。

最終臺北 18:12，Node v24.14.0／npm 11.9.0；[實際 commands](evidence/m1b/final-02/commands.json) 的 npm test（80 pass／0 fail）、npm run check、npm run build:release、npm run check:release 全部 exit 0。初次完整驗證有一個 Windows --import 探針參數錯誤，80 tests 中 79 pass／1 fail，修正 file: URL 後才執行最終版本；[歷史紀錄](evidence/m1b/initial-validation.md) 原樣保留。未重建真 preview dist，沒有用離線測試冒充 browser。

固定 **33 檔 source** 的完整 [bytes／SHA 清單](evidence/m1b/final-02/sources.sha256.json)，files 陣列 digest `6078463d2f00cf3c90331c94c7646dedb5584acc05f4b9cdf4df2afb777fac76`。正式候選 [manifest](release-artifacts/manifest.json) 4,533 bytes，SHA-256 `dc7ad94d835be59f78909505be98cbcbb600612159aee33bafbb82e670959747`；16 site／13 public 每檔 hashes 見 [artifact receipt](evidence/m1b/final-02/artifact.sha256.json)。

原 public／dist／M1 evidence **72 檔**逐 path／bytes／SHA 完全相同，無增加或缺失；完整 [preserved before](evidence/m1b/preserved-before.json)／[after](evidence/m1b/preserved-after.json) 與 [獨立核對](evidence/m1b/verification.json) 保留。環境 [before](evidence/m1b/environment-before.json)／[pre-final](evidence/m1b/environment-pre-final.json)／[after](evidence/m1b/environment-after.json) Full Snapshots 一致：HKCU PATH ExpandString／834／16 entries／0 ephemeral，HKLM String／1227／30 entries／0 ephemeral，全 Environment fingerprint 與 TEMP/TMP 也未變。

真 browser／codec／native／真機／Network／Storage／hosting headers 仍 NOT_RUN_USER_FOCUS_INCIDENT。沒有 server／browser／桌面輸入或剪貼簿操作、套件／服務安裝、憑證讀取、持久環境或 Git/auth 改動、GitHub／部署／首頁操作。未建立新的 ZIP，由主代理併入單一交付。需主代理獨立回收驗證並安排剩餘 gate；本輪無新增產品決策待答。

## 2026-10-27 追加：B20-51-F01 目錄根連結修正

外驗 F01 已核對並修正，待主代理獨立驗證；未 push／部署。只修改 scripts/files.mjs、scripts/release.mjs，新增 test/f01-root-links.test.mjs；另追加本 HANDOFF／TASK-ENTRY 與 evidence/f01。public、瀏覽器程式、原 dist／release-artifacts 與歷史證據均保持原樣。完整 [F01 記錄](evidence/f01/README.md) 與 [實際 files diff](evidence/f01/files.mjs.diff)／[release diff](evidence/f01/release.mjs.diff)／[回歸 diff](evidence/f01/f01-root-links.test.mjs.diff) 已審閱。

根因是 POSIX 尾斜線目錄 URL 的 lstat 可能看見 target。現在先 fileURLToPath → 原生 resolve 成無非根尾分隔符的絕對 path，再 lstat／isSymbolicLink 拒絕；沒有改 stat／realpath，沒有放寬 allowlist、pins 或錯誤碼，也沒有執行附件腳本或套用附件的其他產品修改。

Windows 真 junction 四項回歸 **4/4 PASS**：空 dist target → buildStatic 拒絕且 0→0 檔；合法 public target → preview build 拒絕且 13→13；合法 release-artifacts target → checkRelease 拒絕且 17→17；合法 public target → release build 拒絕且 13→13。每項都有拒絕後 target 全部 bytes／SHA 相同的實際診斷，[原始輸出](evidence/f01/targeted-01/1-stdout.txt) 可核對；不再只靠含未知 keep.txt 的 target 使驗收通過。

完整驗證在 evidence/f01 的審閱副本，避免覆寫原產物或歷史資料。Node v24.14.0／npm 11.9.0；npm test **84/84 PASS、0 fail／skip**（包含上述四項），npm run check／build／build:release／check:release 全部 exit 0，詳 [commands](evidence/f01/validation-01/commands.json)。副本重建的 13 preview／16 site 檔及 release manifest，與歷史產物逐 byte 相同。

新固定 [34 檔 source bytes／SHA](evidence/f01/validation-01/sources.sha256.json)，files-array digest `9f73b708f43ce5eedaa7b3d78d3cb8feb76388e89dfee6e1481a83661e25ea71`。release manifest 仍 4,533 bytes、SHA-256 `dc7ad94d835be59f78909505be98cbcbb600612159aee33bafbb82e670959747`，完整 [artifact hashes](evidence/f01/validation-01/artifacts.sha256.json)。原 public／dist／release／M1／M1B 證據共 132 檔在 [before](evidence/f01/preserved-before.json)／[after](evidence/f01/preserved-after.json) 相同；[環境 before](evidence/f01/environment-before.json)／[after](evidence/f01/environment-after.json) 完整 Snapshots 一致，guard PASS。沒有依賴安裝、server、桌面輸入或持久 Windows／Git／auth 變更。

**Linux 新版本驗證 NOT_RUN**；本輪只實跑 Windows。外部 2026-10-27 報告的 Linux 修補副本 80/80 與四個重現結果保留其原範圍，不改稱此整合版 84 項 Linux 通過。沒有重新執行 browser／native／真機，也不擴大成 TOCTOU 保證。F02／F03、其他工具及共享封裝器均未改，等待主代理回收驗證。
