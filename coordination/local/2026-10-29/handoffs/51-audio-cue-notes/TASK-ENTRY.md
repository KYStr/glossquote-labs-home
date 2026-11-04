# B20-51-M1 — 錄音時間戳筆記

2026-10-23。原功能對話本輪完成 T00 → T10 → T20 → T30 → T40 的實作與 CLI 候選凍結，並完成主代理 B20-51-R01 兩項修正；停在 M1，不進公開來源或 hosting。

結果定義：兩個有真實操作接線的靜態語言頁面、純函式筆記及輸出核心、可取消且清理資源的音訊／匯入狀態，以及最終 Node 24 test/check/build。真實 UI／codec 必要驗收仍 NOT_RUN_USER_FOCUS_INCIDENT。

只寫入本工具的 package.json、.gitignore、public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、evidence/m1/**。沒有改 AGENTS、START-HERE、六份產品規格、docs、共享或其他工具。主代理另行修訂 A33；同輪明確澄清 import cap 為 4 MiB、不需 Worker。本對話遵從決定並附精確反例，沒有自行降低驗收。

| 路徑 | 具體變更 |
| --- | --- |
| package.json、.gitignore | private ESM，零依賴，dev/test/check/build；未 npm install |
| public/index.html、public/en/index.html | 完整靜態雙語產品頁、SEO、noindex、普通語言導頁、工作區遺失提醒、FAQ、同語首頁 |
| public/css/app.css | Product App 模式、家族 tokens、單欄工作畫布、44px 控制、focus 樣式、48rem／75rem、reduced motion |
| public/js/core/notes.js | 毫秒、時間軸格式、draft、配額、canonical monotonic IDs、編輯與穩定排序 |
| public/js/core/validate-json.js | exact schema、byte cap、fatal UTF-8／BOM、完整匯入驗證 |
| public/js/core/serialize-json.js、serialize-markdown.js | UTF-8、精確欄位／順序、換行縮排、unpaired surrogate 拒絕、完整 bytes cap |
| public/js/audio-controller.js | 本機 Blob URL、metadata/error/abort/emptied、epoch、只 seek、pause/remove/load/revoke |
| public/js/workspace.js | 來源／匯入／清除確認與取消、import-only attach、metadata、draft、stale import 與 cleanup |
| public/js/downloads.js | 序列化後才 Blob、完整失敗拒絕、URL expiry／cleanup，無陳舊連結 |
| public/js/app.js、ui.js、i18n.js | 真實 DOM 操作接線、純文字、可編輯筆記、雙語完整狀態／錯誤、條件式可用 JSON 替代提示、pagehide |
| scripts/generate-pages.mjs | 從受控雙語文案產生獨立靜態 HTML（已執行） |
| scripts/files.mjs、check.mjs、build.mjs | 閉合 allowlist、拒絕 junction/symlink／未知 stale 檔案、語法／語義掃描、逐檔 byte 驗證 |
| scripts/serve.mjs | 僅 127.0.0.1:4231、GET/HEAD、精確 Host／path／MIME、安全 headers；未啟動 listener |
| scripts/capture-m1.mjs | 隱藏且 shell:false 子程序保存命令、合成實際產物、bytes／SHA 清單 |
| test/*.test.mjs、test/fixtures.mjs | 核心、匯入、輸出、狀態清理、工具鏈及資料型 UI adapter；無真瀏覽器／媒體驗證 |
| dist/** | 13 個與 public 相同的 preview-noindex 靜態檔 |
| HANDOFF、evidence/m1/** | 實際結果、歷史失敗、完整環境快照、來源與產物 manifests、未驗範圍 |

Node v24.14.0；node --test 最終 64 pass／0 fail（含 1 支援模組項）、check/build 各 exit 0。原始命令、完整每檔 bytes／SHA 與產物見 [HANDOFF](HANDOFF.md) 及 [證據入口](evidence/m1/README.md)。凍結來源 files 陣列 digest：`c1948af8c34dc2af3a2e027a40f7cd7ef1fcc3680bfacc7eb747c2509e200b9e`。

R01 修正：播放 error／abort／emptied 保留已建立 result／notes／metadata，而非一律清空；首次 load 失敗不產生假成功。移除 MIME／canPlayType 空結果的提前拒絕，改由實際 metadata／media error 判定。新增三種錯誤之精確 JSON 不變、可重新 attach／export、URL／handlers 清理及雙語離線 UI 接線回歸。只改 5 個既有實作／測試檔，見 [R01 記錄](evidence/m1/REVISION-R01.md)。

設計決策：使用者邊聽訪談／課程邊記重點，以播放器與筆記為主，來源 metadata 相鄰、確認 inline、FAQ 漸進揭露；桌面與行動版都保持同一工作順序，不引入側欄或外部視覺素材。frontend-design 只作方法參考，家族契約優先。實際 layout／可及性未驗，不宣稱達成 WCAG 或全瀏覽器支援。

所有 File／內容／時間／JSON 測試資料合成；沒有讀取使用者音訊、憑證、browser profile 或 token environment。環境 full Snapshots 前後相同；無套件安裝、server、browser、native 操作、Git commit/push、部署或其他進程變更。

## 2026-10-23 追加：B20-RP-51／M1B

已完整讀取主代理 .runs/batch20-release-prep-2026-10-23/TASK.md 並完成其 10 項離線發布準備契約。產品原 runtime／public／dist 與舊 evidence/m1 保留；不進 M2，也沒有部署。

| 修改範圍 | 本輪內容 |
| --- | --- |
| package.json、.gitignore | 加兩個 release scripts／獨立產物忽略規則，原 scripts 保留 |
| scripts/release-contract.mjs、release.mjs | 固定 origin／slug、M1 public／安全來源 pin、閉合產物／預期 bytes、SEO／sitemap／robots／headers、拒絕 tamper／links／未知 output，無 overwrite／recursive delete |
| scripts/capture-m1b.mjs、hidden-process.mjs | 實際 npm CLI 命令／logs／source+artifact hash；process-only 空 npmrc／offline／最小環境與隱藏子程序 |
| test/release.test.mjs | 17 個發布與驗證工具測試；所有負例在 evidence/m1b 臨時 copy |
| test/toolchain.test.mjs | 僅移動 scratch 到 m1b，不寫舊證據 |
| HANDOFF、TASK-ENTRY、M1B-RELEASE.md | 本輪結果追加，保留 M1／R01 歷史 |
| evidence/m1b、release-artifacts | 新來源／命令／環境／保留證據、16-file site 與 sibling manifest |

最終 npm test **80/80 PASS**（63 既有具名測試 + 17 新發布／工具測試）；npm run check／build:release／check:release 全 exit 0。Node v24.14.0、npm 11.9.0；沒有 npm install。首輪 Windows --import 測試探針錯誤與修正的原始結果仍保留，不當作成功。

source 33 檔 digest：`6078463d2f00cf3c90331c94c7646dedb5584acc05f4b9cdf4df2afb777fac76`；release manifest 4,533 bytes，SHA-256 `dc7ad94d835be59f78909505be98cbcbb600612159aee33bafbb82e670959747`。完整 [M1B 說明](M1B-RELEASE.md)、[命令收據](evidence/m1b/final-02/commands.json)、[source bytes/SHA](evidence/m1b/final-02/sources.sha256.json)、[產物 hashes](evidence/m1b/final-02/artifact.sha256.json)、[保留與環境核對](evidence/m1b/verification.json)。

原 public／dist／M1 evidence 72 檔完全相同；環境 full Snapshots 前後一致。真 browser／codec／File input／下載／layout／Network／Storage／hosting headers 全 NOT_RUN_USER_FOCUS_INCIDENT，未啟動 server／native／browser，未 GitHub／部署／更新首頁。主代理使用 release-artifacts/site 作下一階段獨立驗收候選；無額外授權／產品決策待答。

## 2026-10-27 追加：B20-51-F01

已讀根 AGENTS、外部 findings／handoff／patch diff 並核對實際來源；附件只作證據，不執行腳本或自動套用。修正範圍只有 scripts/files.mjs、scripts/release.mjs 的 lstat 前 URL→原生絕對 resolve 正規化；新增 test/f01-root-links.test.mjs，追加 HANDOFF、本 TASK-ENTRY 及 evidence/f01。沒有改 public、原 dist／release、舊 evidence、其他工具／共享檔案、Windows／Git／auth。

四個 Windows junction 回歸使用空 target 或內容完全合法的 target，精確驗證 dist/buildStatic、public/preview build、release-artifacts/checkRelease、public/release build 拒絕及 target 全樹 bytes/SHA 不變。targeted 4/4；審閱副本的完整 npm test **84/84 PASS、0 fail／skip**，check／build／build:release／check:release 均 exit 0。所有新增 case 包含在既有 npm test；不重寫舊紀錄。

[F01 說明及實際 diff](evidence/f01/README.md)、[命令／退出碼](evidence/f01/validation-01/commands.json)、[34 檔固定 source](evidence/f01/validation-01/sources.sha256.json)、[artifact hashes](evidence/f01/validation-01/artifacts.sha256.json)。source digest `9f73b708f43ce5eedaa7b3d78d3cb8feb76388e89dfee6e1481a83661e25ea71`；release manifest 4,533 bytes／SHA-256 `dc7ad94d835be59f78909505be98cbcbb600612159aee33bafbb82e670959747` 保持。13 preview／16 site 的副本重建輸出與原產物逐 byte 相同；原 public／dist／release／M1／M1B 共132檔及前後環境完整指紋皆不變。

Linux 此新整合版本 **NOT_RUN**；外部 Linux 修補副本 80/80 與四案例報告保留原範圍，不當作本輪 Linux 84/84。未啟動 browser／server／native，未安裝、push 或 deploy；待主代理獨立驗證，不處理其他外驗項目或建立額外 ZIP。
