# B20-49-M1 — 書籤匯出整理

日期：2026-10-23（Asia/Taipei）。範圍只到 M1 本機候選；M2、GitHub、部署、首頁整合由主代理另行放行。本對話沒有建立 chat、子代理、server 或 browser，也沒有安裝套件。

## 輸入與完成定義

已完整閱讀本工具 14 份原始文件：AGENTS、START-HERE、README、PRODUCT、TECHNICAL、UX-SEO、ACCEPTANCE、TASKS、HANDOFF 與 docs/ 下五份契約；亦閱讀根 AGENTS、SECURITY-BASELINE、PRODUCT-THESIS、完整家族設計契約。六份規格、AGENTS 與 docs 保持唯讀。HANDOFF 的初始「尚未實作」屬規格準備歷史。

可觀察的 M1 結果：繁中／英文獨立頁可接入受限書籤解析、完整路徑／網址預覽、精確群組、明確保留／排除、移動／更名子路徑，以及真正的 HTML／JSON 序列化與下載事件。Node 24 的 test/check/build 必須通過；真瀏覽器、鍵盤、file picker、下載、reflow 等另列未驗，不以 Node 呼叫探針冒充。

## 順序與例行決策

- T00 → T10 → T20 → T30，前序必要 CLI gates 通過後才進下一步。實際命令與輸出各存 evidence/m1/ 下對應資料夾。
- Node 24.14.0、ESM builtins、零 runtime/dev dependencies；沒有 npm install 或 lockfile。npm 由現有 Node 執行同安裝目錄的 npm-cli.js；所有程式建立的 child 都是 shell:false、windowsHide:true。
- Product App 模式。工作物件是目前書籤樹／列表。永遠可見：選檔、限制、狀態；相鄰：納入、保留、移動；漸進：整個資料夾更名。沿用規格既有桌面 15rem 樹＋清單、窄版單欄線框與共享 tokens，無外部字型／圖片。使用 frontend-design 技能作層級參考，專案契約為準。
- Exact URL groups 包括 singleton，符合 K49-12；畫面只把 member>1 的群組標為重複。建議保留絕不自動排除；排除先呈現數量、來源項目／網址，再確認。群組保留動作包含重新納入所選 keeper。
- 匯入時保存空資料夾供完整樹檢閱；HTML 依 included 書籤建立非空路徑，JSON exact keys 不增加 folders。此行為依產品指定的書籤／備份 schema 與 HTML 建樹規則，兩語支援說明均明示。
- 初次 parse-ready 的 exportHtml／backupJson 為 null。明確下載操作才建立兩個 Blob，符合 FR-09 與 K49-25；第一個下載後 ready job 才具有 Blob 產物。編輯會撤銷舊 URL 並清空 Blob 欄位，避免過期輸出。沒有計時自動失效。
- 網址完全依指定 WHATWG URL 安全規則驗證：不採 URL.href，不對 scheme/host/percent/query/fragment 做 canonical grouping。拒絕非 HTTP/HTTPS、帳密、C0/C1、首尾 ASCII 空白與非法 percent。
- worker 處理 bounded source；取消會發送 cancel 並立即 terminate。epoch + jobId + worker identity 阻止晚到結果復活。pagehide、重選、重設、取消會清理樹、來源引用、動態 DOM、表單及 object URLs。沒有安全抹除承諾。
- 預覽與狀態均使用 textContent 或安全表單 value。書籤網址不建立 anchor；唯一動態 anchor 是明確下載後產生的 Blob URL。

## 變更邊界

只新增或更新 package.json、.gitignore、public/**、scripts/**、test/**、dist/**、TASK-ENTRY.md、HANDOFF.md、evidence/m1/**。不碰共享首頁、看板、兄弟工具或 GlossGate。dist 是閉合 public 清單的 byte-equal 複本；未知／過期檔與 symlink/junction 會拒絕，建置不刪未知內容。

## 驗證解讀

test/app-unit.test.mjs 使用自建記憶體「呼叫探針」執行真 app handler；探針沒有 HTML parser、瀏覽器、版面或 OS 輸入能力。它檢查控制器接線與純文字元素呼叫，不可作真 DOM/XSS、焦點、鍵盤、下載或導頁驗收證據。test/toolchain 的 handler 呼叫不開 port，也不是 HTTP server smoke test。

所有資料均為合成 example.com / invalid.example；不讀真實匯出、browser profiles、憑證或 token。無發佈／部署命令；沒有改 Git 全域設定或持久 Windows 狀態。

## 必須保留的歷史

T00 環境 guard 的兩次外層命令因 `$LASTEXITCODE` 為空，判斷 `-ne 0` 時誤報 exit 1；guard 本身實際輸出 PASS。後續以 JSON Status 與完整 Snapshots 重新比較，exit 0 且前後一致。原始 JSON 已保留，外層失敗另記 guard-wrapper-history.json；不將那兩次外層命令改稱 exit 0。

Requested configuration 為 gpt-6.1-sol/max。未獨立確認 backend，不宣稱已驗證模型身分或自行切換模型。

最終命令、固定候選、產物與未驗限制見 HANDOFF.md 及 evidence/m1/。不另製作使用者 ZIP；主代理依單一外層 ZIP 規則整合。

## 2026-10-23 追加：B20-RP-49 / M1B

已完整閱讀 `.runs/batch20-release-prep-2026-10-23/TASK.md` 的十項發布準備契約。新任務明確允許本工具 package/.gitignore/scripts/test/HANDOFF/TASK-ENTRY/M1B-RELEASE、evidence/m1b 與 release-artifacts，並禁止 public/dist/舊 evidence 變更；這是本輪較新的範圍，不推進 M2。

實作只增加獨立 release 產生器、M1 public hash pin、針對性 release tests、M1B 證據固定器、兩個 npm scripts 與 release-artifacts ignore。沿用原 dev/test/check/build；未執行 preview build，因 public/dist 未變。

預定 origin 固定 https://bookmarks.glossquote.com；不讀環境或接受 CLI 自訂。正式 SEO 限 head robots 與 links，head 外／可見候選文案逐 byte 保留。manifest 與 site 分開；來源只讀 M1 17 檔閉合 allowlist。

安全 headers 以既有 serve.mjs 的 makeHandler 記憶體呼叫讀取，完整與固定 baseline 比對，沒有啟動 server。只有 X-Robots-Tag 改為 index, follow；逐資產 MIME 不變成全站 HTML Content-Type。

每次 build/check 皆拒絕來源 hash 改變、symlink/junction、未知目錄／檔案、缺漏、錯 SEO 或不匹配 manifest。合法重建不寫檔；既有異常只拒絕，不自動刪除或覆蓋。負例在本工具 evidence/m1b/test-workspaces 副本，不對真 public/dist 做破壞試驗。

原 M1 全樹 manifest 仍是歷史版本，不因本輪允許的 package/scripts/docs 新增而重凍結或改寫；本輪改以 protected-before 與後比對證明 78 個 public/dist/舊證據不變，另記 M1B sources/artifacts hashes。舊 M1 freeze 指令不是新整個工作目錄的 current manifest。

本輪不開 chat／子代理、不 browser/native/CUA/IAB/CDP、不桌面／焦點／IME／clipboard 操作、不 install／GitHub／部署／付費／憑證或持久環境變更。完整最終驗證與限制追加 HANDOFF，不把新增工具鏈測試數當 browser 證據。

## 2026-10-27 追加：B20-49-M2A 離線部署前準備

主代理已提供 r3 browser 的 44 PASS／10 NOT_RUN／0 FAIL、prohibited=[] 與 parent cleanup PASS，放行本輪 M2A。此項 supersedes 上方「所有 browser 未跑」的當時狀態；仍保留未驗內部 heap／BFCache、手動 late worker completion、真 200% zoom、真 20 分鐘壽命、native／AT 等限制。引用原始固定結果，不在本 chat 重跑 browser，也不推進 M2B。

完成定義：固定 assets-only wrangler.jsonc，預定 bookmarks.glossquote.com、compatibility_date=2026-10-24，workers.dev／preview／metrics／observability 全停用；只讀 release-artifacts/site，沒有 runtime/main/bindings/permissions。設定以 canonical strict-JSON subset 驗證所有欄位、型別、固定值與 bytes。這是離線任務契約檢查，沒有執行 provider CLI 或確認 provider schema／帳號權限。

保留 public、dist、M1／M1B 證據與 runtime bytes。先完整備份並核對原 manifest 94ee4bd3206130a3977c5b42f3e3704e4f25370c0a153fa500f22c11aab52d 與全部 21 檔；只有完全符合此歷史候選才可升級。兩個生成 HTML 只移除各語言完整且唯一的候選 span；SEO/head 沿用 M1B。新增 _redirects 的三條固定 301 規則，逐行 LF：/ → /index.html、/en → /en/index.html、/en/ → /en/index.html。其餘既有 18 個 site assets 不變。錯誤／未知內容仍拒絕，不成為通用修復器。

只編輯本工具 wrangler.jsonc、scripts/check.mjs、scripts/release-config.mjs、scripts/release.mjs、scripts/m2a-evidence.mjs、test/release.test.mjs、HANDOFF.md、TASK-ENTRY.md，另管理本輪 evidence/m2a 與 release-artifacts。負例只在 evidence/m2a/test-workspaces。針對性 release tests 已 24/24；完整 npm test/check/build:release/check:release 與實體差異的實際結果見最新 HANDOFF。

使用 Cloudflare workers-best-practices 技能的本機設定檢查方法；明確 M2A 指令的固定日期與全部 observability=false 優先。未新增依賴、不安裝／開 server／操作 UI／讀憑證／發佈 GitHub／部署／整合首頁／更改持久環境或 Git。必要環境 guard 在 automation 前後比較完整 Snapshots。舊 M1 freeze／M1B release-evidence 是歷史候選驗證器，不覆寫、不作目前整樹驗證；新增 M2A source-set 與候選固定器。

## 2026-10-27 追加：B20-49-M2B 公開來源發布

主代理已親審 M2A 並明確放行獨立公開來源發布，只限 KYStr/glossquote-labs-bookmark-organizer，不部署。可觀察完成結果：受審 copy 與完整 tracked inventory、clean-clone test/check/build/build:release/check:release 通過、PUBLIC 與 remote commit 經 API／ls-remote／實際遠端 clone 核對、Git 與完整 Windows environment guard 前後不變，回傳 publication-receipt。

採 M2A 固定來源精選 69 個公開檔；完整 fixtures 與原 M1 manifest/checksum 保留。只在 publishing-copy 覆蓋 README 為目前說明、.gitignore 加 scratch 排除，原 README 另存。少量合成 outputs、release manifest 與精選 NOT_RUN summary 隨來源發布；scratch/node_modules/環境紀錄/browser artifacts/secrets/private data/其他工具全排除。準備清單記錄兩個 overlay 的原 bytes/hash 與全部新 bytes/hash；staged blobs 另核對。

本機 clone 54/54 tests 與四個 npm run checks/builds 全 exit 0；22 個 release artifacts 逐 byte 同 M2A。使用既有官方 gh CLI 與每命令 Git -c，無 auth setup/login/refresh、global/system Git 寫、credential-value 存取／列印、Windows 持久設定變更或互動 UI。初始 repo lookup HTTP 404 是建立前的預期結果，不作產品 FAIL；其他命令全成功。

已公開 https://github.com/KYStr/glossquote-labs-bookmark-organizer ，main commit 34b554b4316de106576c3868f0748427c259a66b，PUBLIC/private=false。GitHub remote clone 全 69 tracked paths／bytes／SHA 相同，重用同輸入 clean-clone 測試；原 44 browser PASS／10 NOT_RUN／0 FAIL 全保留。完整交接、receipt／tracked inventory 與 guard 見最新 HANDOFF、evidence/m2b/。本機僅 HANDOFF／TASK-ENTRY 追加發布狀態，歷史 manifest 不改；部署／首頁／外部驗收交主代理。
