# 圖片敏感資訊遮蔽 M1 交接

2026-10-22（Asia/Taipei），目前候選 **`NEW22-39-M1-r2`**／package `0.1.0-m1`。T00–T05 及主審指定的拖曳預覽修正已完成離線 CLI gate，交主代理獨立驗收。**這是本地候選；尚未通過完整產品驗收，未公開來源、未部署、未交外部覆核。**

| 範圍 | 實際狀態 |
|---|---|
| M1 實作、Node 核心與模擬資源測試、check、preview build | PASS（限定下述離線範圍） |
| 主代理整合 review／獨立驗收 | AWAITING_PRIMARY_REVIEW |
| 真瀏覽器 B01–B20、原生像素／解碼／下載、真機與輔助技術 | NOT_RUN_USER_FOCUS_INCIDENT |
| GitHub、正式網站、首頁 | NOT_PUBLISHED |
| 外部驗收與產品完成 | NOT_RUN／未完成 |

原始規格交接狀態保留於 [initial-handoff.md](evidence/m1/initial-handoff.md)。六份標示 SPEC_ONLY 的文件是**歷史規格快照**，原文為唯讀；目前實作狀態看本輪 r2 證據，不以快照中的 SPEC_ONLY 當作仍未實作。主代理同輪 FR-01 勘誤（目前有遮罩即需來源替換確認）已納入基線與實作。

## 本輪 r2：拖曳顯示層修正

主審讀碼指出 r1 的 `showDraft` 每次 pointermove 都呼叫 `paintComposite`，重設原圖尺寸 backing store 並重畫 Bitmap。這是可消除的昂貴呼叫路徑；沒有實測瀏覽器卡頓或效能數字。

r2 只修改 `public/js/controller.mjs`、`public/js/app.mjs`、`public/styles/app.css`、兩語 HTML 與 `test/ui-contract.test.mjs`，另更新交接紀錄及生成 dist／r2 evidence。拖曳中的黑矩形改用單一 DOM overlay，以既有 core 產生的 visual-pixel 整數 rect 投影到圖片的顯示尺寸。pointermove 只更新 display；pointerup 才加入 committed mask 並重畫原尺寸 Canvas。overlay 為不透明純黑、無 pointer events／focus，不進遮罩資料或匯出 Canvas。pointer cancel、lost capture、resize、換圖／清除、生成與 pagehide 皆清 draft，鍵盤欄位路徑不變。未改規格、parser、geometry、reducer、依賴或視覺風格。

| r2 最終命令（完整 executable 見 commands） | 實際結果 | 證據 |
|---|---|---|
| `node --version` | exit 0，v24.14.0 | [version](evidence/m1/r2/node-version.log) |
| `npm test` | exit 0，58／58 pass，0 fail／skip | [test](evidence/m1/r2/test.log) |
| `npm run check` | exit 0，12 allowlisted assets | [check](evidence/m1/r2/check.log) |
| `npm run build` | exit 0，12 noindex assets | [build](evidence/m1/r2/build.log) |

[commands.json](evidence/m1/r2/commands.json) 記錄精確命令與 exit；[candidate-manifest.json](evidence/m1/r2/candidate-manifest.json) 固定 24 個實作檔 bytes／SHA-256，gate 前後 [比對通過](evidence/m1/r2/candidate-verify.json)，自身 SHA-256 `1598dfa27b36ab35b1764ca7953994cfd0fa0d5546d97f9b9eac8ce4af5a6141`。本輪完整來源與差異見 [source-manifest](evidence/m1/r2/source-manifest.json)、[scope-verification](evidence/m1/r2/scope-verification.json) 和 [changes.patch](evidence/m1/r2/changes.patch)。

新增四項 Node regression：25 次 4000×4000 **假資源尺寸**的 draft 更新造成原圖 resize 0 次、draw 0 次；提交才 width／height 各設 1 次及 draw 1 次；floor／ceil／reverse／clamp 和零 span 沿用原幾何；匯出只畫 committed masks；清理與非互動 overlay 的靜態 wiring。結果見 [call-count-regression.json](evidence/m1/r2/call-count-regression.json)。這些沒有配置真實 16M 像素緩衝，也沒有測真瀏覽器 FPS／latency／memory，**不可稱為 browser performance PASS**。全部 B01–B20 和原生 gate 仍保持下表 NOT_RUN。

r1 的 manifest、41 個已索引 evidence 檔與 evidence-index 原 bytes／hash 保留，並先驗證後複製 39 個 r1 來源及其 evidence 副本到 [baseline-source](evidence/m1/r2/baseline-source/HANDOFF.md)，保留原交接的相對連結；見 [baseline-verification](evidence/m1/r2/baseline-verification.json)。下方 R1 manifests 是歷史快照，對照此 baseline-source，而非目前 r2 來源。沒有覆蓋舊 evidence 或另建交付 ZIP。

r2 [環境前](evidence/m1/r2/environment-before.json)／[環境後](evidence/m1/r2/environment-after.json) 的完整 snapshots [相同](evidence/m1/r2/environment-verify.json)。前置 wrapper 曾因 PowerShell `LASTEXITCODE` 為 null 被誤判 exit 1；實際 guard JSON 是 PASS、與 r1 相同，沒有持久環境漂移。已改依 guard JSON 驗證，保留 [該次 wrapper 紀錄](evidence/m1/r2/guard-wrapper-attempt1.json)。

## 實際變更與入口

- 新增 `package.json`、`.gitignore`、3 支 scripts、12 個 public 靜態資產與 7 個 test 檔，共 24 個實作檔案；另新增 TASK-ENTRY、更新本交接、產生 evidence/m1 與 noindex dist。所有寫入都在本工具 M1 允許路徑；未改共享首頁、看板、父專案、兄弟工具或規格。
- [繁中頁](public/index.html)、[英文頁](public/en/index.html)：原生 HTML/CSS/ESM 工作區，原生單檔 input、原圖 Canvas、可見數字座標、50 個黑色矩形清單、選取／更新／刪除／最後新增復原、頁內非模態確認、取消與實際 PNG 預覽／下載控制、雙語說明及 FAQ。M1 `noindex,nofollow`，沒有 production canonical、sitemap 或部署設定。
- [檔頭 parser](public/js/core/format-headers.mjs)：內容簽名、8 MiB、PNG chunk 邊界／CRC／必要順序與動畫拒絕、JPEG SOF0/SOF2、APP1 Exif、Orientation 1–8 與尺寸上限。File.type／副檔名不作接受依據。JPEG entropy 與 PNG IDAT 解壓由預檢後的 native decoder 負責。
- [幾何](public/js/core/geometry.mjs)：精確 plain-record schema、整數半開矩形、50 個上限、CSS pointer→原圖連續座標、floor／ceil／clamp、反向等價與 raw 零面積拒絕。ID 由 controller 產生 `mask-N`，不取自檔名或內容。
- [純狀態機](public/js/core/session.mjs)：只含 JSON metadata；來源／遮罩 revision 和 job token、輸出失效、取消與 stale action 防護，不持有 File／Bitmap／Canvas／Blob／URL。
- [controller](public/js/controller.mjs)：唯一持有原生影像與輸出資源。先預檢，再明確 `imageOrientation: from-image` 解碼與核對 visual dimensions；白底→來源→alpha=1／純黑整數遮罩→原生 PNG。預覽和明確下載只共用同一 Blob 的同一 URL；預覽載入尺寸符合才可下載。編輯、取消、換圖、清除及 pagehide 使舊結果失效，close Bitmap、Canvas 1×1、revoke URL，過期工作不能覆寫或清理新工作。
- [工具鏈](scripts/check.mjs)：零 runtime/dev 套件；閉合 public allowlist、ESM syntax、禁用 API 與同源資產靜態掃描、CSP 與雙語 metadata；build 逐檔複製，拒絕 link／junction／未知資產與未知既有 dist 檔，不刪未知檔來湊成功。掃描不是完整安全審計。

## R1 基線命令與歷史固定輸入

工作目錄為本工具。Node 為 `C:/Program Files/nodejs/node.exe`，npm 為同目錄 `npm.cmd`，沒有 npm install、依賴新增或 server 啟動。

| R1 最終命令 | 結果 | 歷史證據 |
|---|---|---|
| `node --version` | exit 0，v24.14.0 | [version](evidence/m1/t05-node-version.log) |
| `npm test` | exit 0，54 tests／54 pass／0 fail／0 skip | [test](evidence/m1/t05-test.log) |
| `npm run check` | exit 0，12 allowlisted assets | [check](evidence/m1/t05-check.log) |
| `npm run build` | exit 0，12 noindex preview assets | [build](evidence/m1/t05-build.log) |
| `git diff --check -- tool-projects/39-image-redactor`（父 repo） | exit 0；此工具於本次入口即未追蹤，不能將空 tracked diff 當作完整 review | [diff-check](evidence/m1/git-diff-check.log) |

精確 executable 與 exit 亦在 [t05-commands.json](evidence/m1/t05-commands.json)。

- [candidate-v1-manifest.json](evidence/m1/candidate-v1-manifest.json) 固定 **24 個實作檔案**逐檔 bytes／SHA-256；在最終 gate 前建立、gate 後逐檔重比對 [PASS](evidence/m1/candidate-v1-verify.json)。manifest 自身 SHA-256 為 `a6966684016e98f90803fe0400f70eefc5dce7c6d30ca2ab4b132c792f011acc`。
- [dist-manifest.json](evidence/m1/dist-manifest.json) 固定 **12 個產物** bytes／SHA-256，均與 public 對應 bytes 相同。dist 由 build 生成並忽略於 source control。
- [contracts-baseline.json](evidence/m1/contracts-baseline.json) 與 [contracts-verify.json](evidence/m1/contracts-verify.json)：13 份既有規格／契約 bytes 和 hash 未變。
- [source-manifest.json](evidence/m1/source-manifest.json) 與 [scope-verification.json](evidence/m1/scope-verification.json) 涵蓋實作、契約和交接文件，供主代理製作單一整合 ZIP。本對話沒有另製使用者交付 ZIP。

## Node 通過範圍與歷史

H01–H14、J01–J13 的 header／尺寸與拒絕分支、G01–G08 幾何、S01–S05 reducer 及 controller 假資源測試已涵蓋。J03–J09 **只證明 parser 的方向值與 visual dimensions**，沒有證明 native 解碼色塊方向。N01 證明控制字正規化與 textContent 使用契約；真 DOM／網路觀察仍需瀏覽器。P01 只有靜態來源掃描。

另有兩語 ID／label／錯誤字典對稱、inline confirmation、固定檔名、預檢前 zero reader/decode、late Bitmap.close、late Blob 丟棄、A/B Canvas 歸屬、preview-loaded gate、無效輸出拒絕、pagehide／BFCache 清理，以及工具鏈的未知資產／junction／CSP／metadata 反例。合成 JPEG 與 PNG fixtures 全由測試記憶體建立，不讀使用者圖片。

T00：4 tests，test/check/build exit 0；T01：18 tests，test/check exit 0；T02：32 tests，test/check exit 0；T03：38 tests，test/check exit 0；T04：48 tests/check exit 0；收尾依 review 修正 JPEG mode→Exif 錯誤優先序、51 個遮罩的數量優先序、穩定清單節點及欄位未提交即撤銷輸出，再跑 50 tests/check exit 0；T05：54 tests/check/build exit 0。各輪原始 log 和 commands JSON 均保留。沒有失敗的 CLI gate 被改寫為 PASS；第一次組合 apply_patch 曾因同一路徑刪除／新增格式被工具拒絕，未寫檔，已改為 update patch。

證據收尾的第一次文件連結驗證曾 exit 1：`git diff --check` 無輸出時 Tee-Object 沒有建立空 log，故該 Markdown 連結缺檔。已補正空 log 並保留 [該次紀錄](evidence/m1/finalization-attempt1.json)，重新驗證相對連結；沒有改動固定實作或重寫 CLI 通過結果。

PNG chunk 順序與 JPEG SOS 欄位依原規格及官方 [PNG-3 Table 7](https://www.w3.org/TR/png-3/#5ChunkOrdering)、[ITU-T T.81 B.2.3](https://www.w3.org/Graphics/JPEG/itu-t81.pdf) 核對，這些參考與 Node stub 都不是 native pixel 證據。

## 真瀏覽器與原生必要 gate

本輪沒有開 browser、hidden/IAB、CUA、native UI、選檔／儲存對話框或 screenshots，也未用使用者桌面測試隔離。沒有受測 Chrome／Edge 版本可回報。以下全為 **NOT_RUN_USER_FOCUS_INCIDENT**，不可用 Node 結果轉為 PASS。

| ID | 未執行範圍 | 狀態 |
|---|---|---|
| B01 | 真 Canvas 4×3 PNG、遮罩 RGBA exact black/255 | NOT_RUN_USER_FOCUS_INCIDENT |
| B02 | 完全透明→白、半透明紅約 [255,127,127,255]、mask exact 黑 | NOT_RUN_USER_FOCUS_INCIDENT |
| B03 | 真 96×64 JPEG Orientation 1–8、四色塊 mapping／mask pixels | NOT_RUN_USER_FOCUS_INCIDENT |
| B04 | 真 CSS pointer 比例與匯出位置 | NOT_RUN_USER_FOCUS_INCIDENT |
| B05 | 反向拖曳與零 span UI | NOT_RUN_USER_FOCUS_INCIDENT |
| B06 | 真鍵盤欄位新增／超界、清單與 Canvas 一致 | NOT_RUN_USER_FOCUS_INCIDENT |
| B07 | 50/51、undo/delete/clear 取消與焦點 | NOT_RUN_USER_FOCUS_INCIDENT |
| B08 | Chrome／Edge 真 EXIF decoder 的尺寸與四色塊方向 | NOT_RUN_USER_FOCUS_INCIDENT |
| B09 | 真 Blob preview/download 的立即失效 | NOT_RUN_USER_FOCUS_INCIDENT |
| B10 | 真 native encoder callback 延遲取消 | NOT_RUN_USER_FOCUS_INCIDENT |
| B11 | 真 native A/B encoder 晚回隔離 | NOT_RUN_USER_FOCUS_INCIDENT |
| B12 | 真 decoder-invalid 合成影像拒絕與復原 | NOT_RUN_USER_FOCUS_INCIDENT |
| B13 | 真 browser 預檢先拒絕 APNG | NOT_RUN_USER_FOCUS_INCIDENT |
| B14 | 實際下載檔案 bytes、pixels、無來源 bytes／可還原 metadata | NOT_RUN_USER_FOCUS_INCIDENT |
| B15 | 全部兩語實際畫面與 runtime log | NOT_RUN_USER_FOCUS_INCIDENT |
| B16 | 真 Tab/Shift+Tab/Enter 核心流程與可見 focus | NOT_RUN_USER_FOCUS_INCIDENT |
| B17 | 真 320 CSS px／200% 縮放與兩語重排 | NOT_RUN_USER_FOCUS_INCIDENT |
| B18 | 觸控、手機與記憶體失敗退出 | NOT_RUN_USER_FOCUS_INCIDENT |
| B19 | 真 pagehide／BFCache／clear 的 DOM/native reference 清理 | NOT_RUN_USER_FOCUS_INCIDENT |
| B20 | 真來源替換／全清確認與取消，無搶焦點／modal | NOT_RUN_USER_FOCUS_INCIDENT |

正式 Network／Storage／Offline 面板、screen reader／輔助技術、真機記憶體、native GC、安全記憶體抹除、原生 file chooser 和 OS 下載流程亦未驗證。預覽 routing 只跑純函式測試；本輪沒有啟動 HTTP server，不聲稱實際 response headers 通過。

## 環境與限制

[environment-before.json](evidence/m1/environment-before.json)、[environment-after.json](evidence/m1/environment-after.json)、[environment-verify.json](evidence/m1/environment-verify.json) 為既有 guard 實際輸出與比對。User/Machine PATH 的 hash、registry type、length、ephemeral entries，完整 Environment-key fingerprint 與 TEMP/TMP hash 全部相同。User PATH ExpandString／834 字元／0 ephemeral；Machine PATH String／1227 字元／0 ephemeral。既存重複項沒有被更動；沒有持久 env／PATH／registry／system／auth 修改。

產品限制：一次單張、來源最多 8 MiB、每邊 8192、總像素 16M、最多 50 個黑矩形，無 OCR／自動敏感資訊偵測／blur／可還原圖層或安全匿名化保證。輸出 native serializer 可能產生標準色彩／解析度資訊，不宣稱完全無 metadata。輸出可大於輸入 8 MiB 上限；只讀輸出 IHDR 及核對實際預覽尺寸，不把輸入 byte cap 套在 native PNG 產物。裝置記憶體不足可能失敗，手機僅 best effort；native 清理不能保證物理記憶體抹除。這些限制不豁免必要 browser gate。

requested configuration 為 gpt-6.1-sol/max；未獨立驗證實際 backend 身份。

## 發布與下一階段

| 欄位 | 本輪狀態 |
|---|---|
| source commit | NOT_COMMITTED（M1 未執行 Git 寫入） |
| reviewed commit | NOT_REVIEWED |
| released commit | NOT_RELEASED |
| GitHub repository | NOT_CREATED／NOT_PUBLISHED；未來核准目標 KYStr/glossquote-labs-image-redactor |
| 網址候選 | image-redact.glossquote.com；未部署或驗證 |
| Cloudflare／DNS／production SEO／雙語首頁 | NOT_PUBLISHED，主代理擁有 |

請主代理對固定候選讀來源／獨立重驗，安排經核實隔離機制的 B01–B20 與必要原生 gate。M2 必須另行明確放行，此原對話才處理獨立 public GitHub source；hosting、首頁、整合 ZIP 和 live verification 由主代理處理。沒有自行跳階段或輪詢等待。完成外部覆核前不得將本版本標為產品完成。
