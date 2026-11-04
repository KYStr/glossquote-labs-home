# 照片聯絡表 — M1 交接

日期：2026-10-23（Asia/Taipei）。版本 `0.1.0-m1`。本地候選已實作，最終離線驗證通過。固定來源／建置清單與凍結核對紀錄見下文。尚未主驗／公開／部署／外驗。

| 範圍 | 狀態 |
| --- | --- |
| 雙語產品程式 | IMPLEMENTED_LOCAL_CANDIDATE |
| 最終 Node / check / build | PASS（45/45；靜態檢查／13資產閉合建置） |
| Windows 持久環境完整快照 | PASS，前後完全相同 |
| 真瀏覽器／原生／真機 | NOT_RUN_USER_FOCUS_INCIDENT |
| GitHub／正式網址／首頁 | NOT_PUBLISHED / NOT_DEPLOYED / NOT_INTEGRATED |
| 主代理驗收／外部驗收 | NOT_RUN / NOT_RUN |

## 實際檔案與行為

- `public/index.html`, `public/en/index.html`, `public/styles/app.css`, `public/js/app.js`, `public/js/copy.mjs`：雙語 Product App，照片清單完整名稱／大小／視覺像素／狀態、上移／下移／移除、1–6欄、選配 PNG 檔名、結果尺寸、預覽符合寬度／實際尺寸、進度／停止／重試、固定名稱 PNG/TXT 下載。M1 noindex，無 canonical/sitemap。
- `public/js/core/image-preflight.mjs`, `errors.mjs`：30張、每檔8MiB、合計64MiB，JPEG marker/SOF/EXIF 及 PNG signature/chunk/CRC/eXIf/APNG，16MP／8192邊界、先全部預檢、一次讀一個檔。EXIF IFD0 只取 orientation，不追 GPS／相機／縮圖內容。
- `layout.mjs`, `index-text.mjs`：精確 contain 與 544×512 oracle、編號隨排序、32 Unicode code points／兩行標籤、完整 JSON-quoted UTF-8 TXT。
- `generate.mjs`, `session.mjs`：原生 Canvas／ImageBitmap 實際產品路徑，單 bitmap decode→draw→close、白底、`toBlob('image/png')`；generation/cancel fencing、排隊新 selection、舊輸出失效、URL 明確下載才建立且最遲60秒 revoke、reset/pagehide 清理、返回快取空白恢復。
- `public/_headers`, `public/robots.txt`：preview 安全政策與 noindex。靜態資產共13個。
- `scripts/{files,build,check,serve,inventory}.mjs`：閉合 allowlist、拒 symlink/junction/未知檔與 stale output、逐檔 bytes/SHA、語法與靜態安全檢查、loopback4225預覽程式（**未啟動**）、凍結 inventory。
- `test/*.test.mjs` 與 `test/fixtures/*`：手寫 oracle、合成 header/PNG/小型 EXIF JPEG fixture generator、fake DOM／Canvas／decoder 生命週期測試；不含使用者媒體。
- `package.json`, `.gitignore`, `TASK-ENTRY.md`, 本文件與 `evidence/m1/**`。原規格／AGENTS／docs／共享路徑未修改。未建立使用者交付 ZIP，由主代理合併單一外層包。

## 命令紀錄

Runtime：`C:/Program Files/nodejs/node.exe` → `v24.14.0`。npm 使用相同 Node 直接執行 `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`，沒有安裝或變更持久環境。

| 命令 | Exit | 結果／範圍 |
| --- | --- | --- |
| 環境 guard before | 0 | PASS；完整 snapshot 存 `evidence/m1/environment-before.json` |
| `node --version` | 0 | v24.14.0 |
| `node --test test/image-preflight.test.mjs test/layout.test.mjs test/index-text.test.mjs` | 0 | 初輪23/23；A01–A15及A19純函式 |
| `npm test`（初輪） | 0 | 44/44；當時全部離線測試 |
| `npm run check`（初輪） | 0 | 語法、13資產、靜態安全與雙語 preview 資料 |
| `node --test test/app-wiring.test.mjs test/session.test.mjs test/generate.test.mjs` | 1 | 18/19；新增接線測試等待逾時，保留原始輸出 |
| `node --test test/app-wiring.test.mjs`（等待機制修正後） | 0 | 1/1，繁中/英文事件流程；fake DOM/Canvas |
| `npm test`（最終） | 0 | 45/45，無 skipped/cancelled；兩語接線及 A01–A20 的 Node 範圍 |
| `npm run check`（最終） | 0 | 所有 public/scripts/test ESM 語法、雙語 noindex、引用閉合與靜態安全 |
| `npm run build`（最終） | 0 | 13個 allowlisted 靜態檔逐檔 bytes 核對；產生 dist/manifest.json |
| 環境 guard after + 全 Snapshots 比對 | 0 | PASS；完整一致，含 TEMP/TMP 與所有 Environment-key fingerprints |
| `node scripts/inventory.mjs` | 見 freeze-verification.json | 固定全部來源 bytes/SHA-256；不含 dist/evidence/.git/node_modules |
| `node scripts/inventory.mjs --verify` | 見 freeze-verification.json | 再讀固定清單、核對來源及 dist 與 public 的 bytes/hash，未啟動 server |

失敗原因：接線測試只輪詢 `setImmediate`，Windows timer phase 到期前即用完100次上限；產品在每圖 decode 後刻意用 timer 讓事件有機會取消。測試改為有界2ms timer輪詢，未放寬輸出條件。歷史紀錄保留於 `evidence/m1/command-history.json`。

完整實際命令、stdout、exit 保留於 [command-history.json](evidence/m1/command-history.json)。逐條範圍見 [acceptance-matrix.md](evidence/m1/acceptance-matrix.md)。沒有將未執行的 browser gate 列入45項 PASS。

## 固定來源與環境證據

- 來源清單：[source-inventory.json](evidence/m1/source-inventory.json)，每檔相對路徑、bytes、SHA-256，以及整份排序來源樹的 SHA-256。包含本工具產品、scripts、tests、契約與本文件；不自我雜湊 evidence，避免循環。
- 建置清單：[dist/manifest.json](dist/manifest.json)，13資產逐檔 bytes/SHA-256；靜態候選可由 public 確定性重建。
- 凍結再核對：[freeze-verification.json](evidence/m1/freeze-verification.json)，實際 freeze/verify 命令、exit、來源樹 SHA、inventory 與 build manifest 本身的 SHA-256。未填的驗證不視為 PASS。
- [environment-before.json](evidence/m1/environment-before.json)、[environment-after.json](evidence/m1/environment-after.json)、[environment-compare.json](evidence/m1/environment-compare.json)：HKCU PATH `ExpandString`、834字元、16 entries、ephemeral0；HKLM PATH `String`、1227字元、30 entries、ephemeral0。原有重複MiKTeX路徑保留，未清理。
- 完整 Environment-key fingerprints：HKCU 18 values / `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`；HKLM 26 values / `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`。前後完整 Snapshots（PATH raw hash/type/length、ephemeral、TEMP/TMP）完全相同。

Git狀態僅查本工具，整個資料夾仍是 root repo 的 untracked 候選；未暫存／commit／push。來源詳細差異為本文件所列新增產品程式、工具鏈與測試，以及本文件回填；唯讀規格與共享檔未改。

## 驗收範圍與限制

ACCEPTANCE A01–A20 的純函式／fake 生命週期部分有明確測試。30張、8MiB、64MiB cap 以 metadata size oracle 驗，不建立大批大型媒體。PNG/JPEG parser 成功只代表 header/structure，不代表像素可解碼。A13 第四格白底只驗白色 fill 與沒有第四次 draw；A16–A20 只驗 API 呼叫與狀態／引用；透明實際像素未驗。

以下全部 **NOT_RUN_USER_FOCUS_INCIDENT**：真瀏覽器 JPEG/PNG decode、EXIF1–8鏡像／旋轉的實際像素、透明白底取樣、Canvas PNG bytes 可再解碼、損壞圖片與大型圖實際 decoder／記憶體、實際下載與取消、鍵盤／焦點／螢幕閱讀器、320px／200% zoom／reduced motion／實際 contrast/overflow、HTTP headers／Network／Storage 真實驗證。未啟動任何 browser/server、CDP、原生對話框或截圖；Node DOM 錄製器無 layout/AT tree，不能替代這些 gates。

合成未來 gate fixtures 見 `test/fixtures/README.md`；小 JPEG generator 未由真 decoder 驗證，不能聲稱 fixture 可解碼或 EXIF 視覺方向已通過。原生 decode／encode 不支援硬中斷時必須等待 settle；清頁面引用不等於安全抹除，也無法撤回已開始下載。

## 階段與主代理下一步

Source commit：NOT_COMMITTED（M1本地來源）；reviewed commit：NOT_REVIEWED；released commit：NOT_RELEASED。獨立 GitHub repo 尚未建立／推送，Cloudflare／正式網址／共享首頁均未動作。未使用憑證，未寫 Git user/system 設定，不需要本輪 publication guard。

沒有新增產品選項、依賴或權限問題需要決策。下一階段的必要條件是主代理審閱此固定來源與 diff，並以已確認不干擾使用者的機制補真瀏覽器 gates。未通過並另行放行 M2 前，不進 GitHub，也不部署。使用者可保留待驗紀錄，不表示豁免 release gate。

## B20-RP-45 — M1B 離線發布準備追加（2026-10-23）

本輪已完成契約限定的離線發布準備。原 M1 固定版本與歷史證據保留；依派送主代理已回收核心／CLI 驗收，這不改變必要 browser gates 的 NOT_RUN。M1B不是M2公開放行，也不是已上線或外驗完成。

### 實際修改與產物

| 路徑 | 本輪差異 |
| --- | --- |
| `package.json` | 增加精確 `build:release` / `check:release`；原test/check/build/dev不變，零dependency |
| `.gitignore` | 增加 `release-artifacts/` |
| `scripts/release.mjs`（新增） | 固定origin/slug、strict CLI、完整source pins、雙語head SEO／robots／sitemap／headers、閉合樹掃描與逐byte checker、拒覆寫污染輸出 |
| `scripts/release-inputs.json`（新增） | 原M1 public 13檔的固定path/bytes/SHA；與舊inventory一致 |
| `scripts/m1b-evidence.mjs`（新增） | capture不可變baseline、verify 47檔、M1B來源freeze；只寫m1b evidence與本輪pins |
| `scripts/check.mjs` | package script exact-schema擴充兩個新命令；preview安全規則不變 |
| `test/release.test.mjs`（新增） | 16項針對性發布工具鏈測試與copy內負例 |
| `test/tooling.test.mjs` | 只有臨時資料夾從m1移到m1b，不改既有預期與產品測試 |
| `M1B-RELEASE.md`（新增）、`TASK-ENTRY.md`、本文件 | 重現、信任邊界、實際結果、階段與未驗狀態 |
| `evidence/m1b/**`、`release-artifacts/**` | 新本輪證據及候選；不覆寫M1 evidence |

原 `public/`、`dist/`、原M1 evidence、六份規格／AGENTS／docs 共47個不可變檔經前後 bytes/SHA 比對完全相同。沒有更改任何核心 runtime 或使用者可見 body；release JS/CSS也與M1逐byte相同。未跑原preview build。未改兄弟工具、共享首頁、看板或run。

預定（未上線）origin：`https://contact-sheet.glossquote.com`；toolSlug：`image-contact-sheet`。web root為 [release-artifacts/site](release-artifacts/site/index.html) 所在目錄；這個連結是本地檔案，不代表直接開HTML可驗收ESM。browser驗收者應依 [M1B-RELEASE](M1B-RELEASE.md) 用安全隔離機制作該目錄的HTTP web root，本輪未啟動任何serve/browser。

site共14檔、65,840 bytes；完整public來源13檔、64,783 bytes。兩語HTML只有head robots與canonical/hreflang差異，x-default中文；body候選文案保留。`_headers`直接沿用原public檔，只改X-Robots-Tag；CSP及其他header完整保留，沒有使用serve fallback。manifest在site外、只列相對路徑，不含時間／本機路徑／自身hash。

### 實際命令與 exit

Node使用既有 `C:/Program Files/nodejs/node.exe`，npm由同一Node直接執行 `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`。完整stdout、命令與耗時見 [m1b command-history](evidence/m1b/command-history.json)。本輪沒有失敗重試。

| 命令 | Exit | 結果 |
| --- | --- | --- |
| `check-persistent-environment.ps1` before | 0 | PASS，完整Snapshots留存 |
| `node scripts/m1b-evidence.mjs capture` | 0 | 固定47不可變檔與13個M1 public pins |
| `node --test test/release.test.mjs` | 0 | 16/16，0 fail/skipped/cancelled |
| `npm test`（最終、一次完整suite） | 0 | **61/61**，0 fail/skipped/cancelled；原45＋新增16 |
| `npm run check`（最終） | 0 | ESM語法、package scripts、原13資產與preview靜態安全 |
| `npm run build:release`（最終） | 0 | 14個候選site檔、13固定來源；未部署 |
| `npm run check:release`（最終） | 0 | 重新建expected bytes，完整site/manifest/source pins核對 |
| `node scripts/m1b-evidence.mjs verify` | 0 | **47/47**不可變M1／契約檔bytes/SHA一致 |
| `check-persistent-environment.ps1` after＋全Snapshots比對 | 0 | PASS，完整一致，無drift |
| `node scripts/m1b-evidence.mjs freeze` | 見m1b freeze receipt | 固定本輪完整source inventory；排除dist/evidence/release-artifacts |

新證據：[acceptance-matrix](evidence/m1b/acceptance-matrix.md)、[source-inventory](evidence/m1b/source-inventory.json)、[freeze-verification](evidence/m1b/freeze-verification.json)。不以核心suite數目冒充browser通過。

### 已核對的雜湊與環境

- Release manifest SHA-256：`a64662fb12838b37083ef99eff6cb59f81596e06479ff66e4125ee977838bd95`；內含14個產物及13個完整public來源的逐檔bytes/SHA。
- Public pins檔 SHA-256：`2653699fbedc5a66dbb8279dc8d87f6455bdc33edfcdc080b99a013b66ea6557`。
- 47檔不可變records樹 SHA-256：`976e5ddf2bb5959026abc0f37decd42d4e23758fbcf3672cc8e4d7da29f6d480`；baseline檔SHA：`f57f45c7f781ceb69f64bcd66d114a746ff3f48e1ff69e2dbe2eeb120b655756`。
- 完整新source tree hash與inventory檔自身hash由freeze receipt記錄，避免把本文件的hash寫回本文件形成循環；舊M1來源清單仍保留歷史版本。
- [before](evidence/m1b/environment-before.json)、[after](evidence/m1b/environment-after.json)、[compare](evidence/m1b/environment-compare.json)：HKCU PATH `ExpandString`／834字元／ephemeral0，rawSHA `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`；HKLM PATH `String`／1227字元／ephemeral0，rawSHA `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`。所有Environment-key fingerprints、TEMP/TMP與完整Snapshots前後相同；未修改既有重複路徑。

### 未驗、風險與主代理事項

所有必要browser／視覺／原生／真機仍 **NOT_RUN_USER_FOCUS_INCIDENT**，包括真decode、EXIF1–8鏡像／旋轉、透明白底及Canvas PNG再解碼、實際下載／取消／memory、鍵盤／AT／320px／200% zoom／實際render、正式HTTP headers／Network／Storage。`_headers`與SEO檢查只是靜態產物驗證，沒有hosting證據。

本輪沒有GitHub、部署、認證／憑證、網路資產、install、新服務、持久Windows/Git/auth修改或UI操作。所有子測試CLI使用 `shell:false/windowsHide:true`；負例只在本任務copy。來源／輸出異動會拒絕，不自動清理未知輸出；首次寫入若I/O故障，可能留下新建部分產物，需主代理審查，不能刪除重試掩蓋問題。pins/產生器屬待受審工具鏈，非數位簽章。

沒有新增產品選項、依賴、權限或規格衝突需要主代理決定。下一步是主代理獨立讀diff、source pins、site與manifest，回收本輪離線驗收，再由安全隔離機制補browser gate；必須另行放行M2才可GitHub。Source commit仍NOT_COMMITTED，reviewed/released commit仍NOT_REVIEWED／NOT_RELEASED，外驗NOT_RUN。不另建ZIP，由主代理納入單一整合包。

## B20-45-F1 — 下載計時器／URL清理修正（2026-10-27）

主代理以已隔離Windows station、sandbox Chromium145／runner-v7執行舊凍結harness，回報PNG/TXT下載觸發後變成PNG_EXPORT_FAILED且90秒無download。已讀原收據 `BR45-02-three-photo-keyboard-output.json`：phase failed、544×512版面資訊仍在，但canvas0、下載disabled；03/05/06/13同類失敗為主代理回報。舊R1為 **browser FAIL**，其收據、原harness及root凍結證據未修改。

### 確認的範圍與修正

舊DownloadUrls把原始setTimeout/clearTimeout存為instance property，再用`this.timer`／`this.untimer`呼叫；實際JavaScript receiver為DownloadUrls instance。以保存的舊原碼和明確要求globalThis receiver的**純Node host模型**，已重現兩處Illegal invocation，以及URL未追蹤／未revoke的分支。此證實receiver呼叫形狀有缺陷；原browser錯誤被固定錯碼吞掉，**尚不能把Chromium原生Illegal invocation列為已獨立證實的唯一根因**，仍需新候選原harness重跑。

唯一runtime改動 `public/js/core/session.mjs` 的DownloadUrls：

- 預設timer／untimer改為arrow wrapper，透過`globalThis.setTimeout`／`globalThis.clearTimeout`呼叫，保留正確host receiver。
- 先登記URL所有權，再排程；排程丟例外仍release/revoke，不留下孤兒URL。
- release先移除Map所有權，再取消timer，finally revoke；重入或重複release不會double-revoke，取消timer丟例外也清理URL。
- clear嘗試所有URL，最後才傳遞第一個錯誤；同步注入callback也不把已釋放entry重新登記。

沒有改圖片生成、解析、排序、Canvas輸出、HTML/CSS、CSP或其他安全gate。7項新增regression涵蓋host receiver、排程失敗、取消失敗、批次clear、重入、同步fallback、PNG/TXT session流程；Canvas仍明確為fake，不冒充真PNG下載。原release checker政策不變，source pins只刷新session檔。release來源基礎version仍0.1.0-m1，修正版以F1新source／release manifest hash識別，尚未正式發布。

### 舊資料保存與新候選位置

動工前已將80個舊source/public/dist/release檔逐byte複製到 `evidence/f1-2026-10-27/old/`，清單 `old-inventory.json` 含所有原bytes/SHA；另保留歷史M1 inventory copy。原根目錄dist／release-artifacts刻意保持舊bytes，**不要把它們當F1候選**。root `.runs` 凍結資料及browser harness完全未動。

固定新候選：`evidence/f1-2026-10-27/candidate/`。本輪完整命令都對該新copy執行，web root為其 `release-artifacts/site/`；source與root目前修正後實作一致。原public已修正，原dist/release保持舊版便於對照。檢查後只同步本HANDOFF文件到copy，不重跑未變產品測試。

相關source差異共6項：session runtime、`scripts/release-inputs.json`、新增`test/download-urls-regression.test.mjs`、`test/release.test.mjs`的F1 pins基線驗證、任務專用`scripts/f1-candidate.mjs`、本HANDOFF。其他12個public資產不變。source完整bytes/SHA、source-vs-old與candidate產物清單見F1證據，不從舊root release覆寫來繞過checker。

### 實際命令與結果

既有Node24 runtime、零安裝；npm由 `C:/Program Files/nodejs/node.exe` 直接執行既有npm-cli.js。候選copy的check/build先執行，因release tests要讀已建置preview fixtures，隨後一次完整suite及release build/check；各步沒有啟動server/browser。

| 命令 | Exit | 結果 |
| --- | --- | --- |
| environment guard before | 0 | 完整Snapshots保存 |
| `node scripts/f1-candidate.mjs capture` | 0 | 保存80個舊檔；原bytes/SHA核對 |
| `node evidence/f1-2026-10-27/receiver-before.mjs` | 0 | 舊source的兩處錯receiver在Node模型重現，非native browser證據 |
| 初次新增regression（舊碼） | 1 | 0/7；含test setup在receiver guard前建立pool而等待Node60s timer的問題，原輸出保留 |
| `node --test evidence/f1-2026-10-27/regression-on-old.test.mjs` | 1 | 修正test setup後，同一7項對保存舊碼仍0/7（預期negative對照），不再啟用真Node60s timer |
| `node --test test/download-urls-regression.test.mjs`（新碼） | 0 | 7/7，明確host模型／fake Canvas |
| `node scripts/f1-candidate.mjs pin` | 0 | 僅session來源hash改變，其他public pins相同 |
| `node scripts/f1-candidate.mjs candidate` | 0 | 新建53個source檔的候選copy |
| `npm run check`（F1 copy） | 0 | ESM語法、雙語與靜態安全 |
| `npm run build`（F1 copy） | 0 | 13個preview資產exact bytes |
| `npm test`（F1 copy） | 0 | **68/68**，無fail/skipped/cancelled |
| `npm run build:release`（F1 copy） | 0 | 14個site檔、13來源 |
| `npm run check:release`（F1 copy） | 0 | 完整expected bytes／manifest／source pins重算 |
| environment guard after／full compare | 見F1 receipts | 比對全部HKCU/HKLM PATH、type/length/ephemeral及Environment fingerprints |
| `node scripts/f1-candidate.mjs sync-handoff`／`freeze` | 見F1 receipts | 只同步交接文件，固定新source/artifact manifest與差異 |

完整命令與所有初始失敗保留於 `evidence/f1-2026-10-27/commands.json`；新候選清單為 `candidate-manifest.json`、`source-vs-old.json`、`artifact-vs-old.json`，release完整清單為candidate內 `release-artifacts/manifest.json`。精確新hash與驗證收據在 `verification.json`；避免本文件hash自我引用。

### O01、未驗與下一步

**O01：允許事先存在但完全empty的release-artifacts是既有設計。** 未為選配觀察更改政策；原release測試的empty-root正例與unmanaged/modified負例在完整68項中通過。`scripts/release.mjs`未修改。

新F1真瀏覽器／PNG與TXT原生下載 **NOT_RUN_BY_OWNER_ROOT_RERUN_REQUIRED**。root舊R1失敗保留FAIL，不以Node模型／fake Canvas改PASS。請主代理將runner的sourceRoot改指F1候選web root，核對新manifest及source差異後，以原harness保留全部斷言重跑；harness metadata內的expected M1B hash是舊版provenance，root需另綁新F1實際manifest，不刪除或放寬任何斷言。

未操作互動UI/browser/desktop/IME/clipboard/native dialogs，未委派、push、部署、讀憑證或改持久環境/Git/auth。沒有功能縮減、安全gate降低或新增權限需求；原M1/M1B及browser人工限制繼續適用，GitHub與上線須等root新browser驗收通過後依原授權進行。

## B20-45-F1R1 — session 清理例外邊界（2026-10-27）

依 `.runs/batch20-completion-2026-10-27/F1-45-SECONDARY.md` 修正：F1的URL pool會在嘗試全部URL後重拋cleanup error，原session.invalidate未接住，會阻止Canvas/error/progress/phase及reset/dispose後續來源清除。這是有效的A20例外路徑，不是風格調整。root已在F1 ZIP乾淨copy通過68項及工具鏈，但尚未以F1執行browser；該歷史結果保留，不冒充F1R1驗收。

### 最小產品修正

只修改 `public/js/core/session.mjs` 的session層：constructor增加RAM-only `cleanupError`，invalidate捕捉URL pool清理失敗，保留固定 `ImageInputError('PNG_EXPORT_FAILED',{stage:'url_cleanup'})` 診斷，繼續執行Canvas、error/progress/phase清除。沒有保存raw exception、cause、message或可能持有輸入的自訂error欄位；成功的後續cleanup不抹去最後failure診斷。沒有新增UI、console、Storage或telemetry。

因invalidate不再向上拋URL清理例外，原reset後續files/items/options/notify，以及dispose後續disposed/onChange，都能完整執行。invalidate依原產品契約保留選取File/metadata以供重試；reset/dispose則清空來源與產物。普通成功路徑及其他核心行為未變，F1的host timer wrapper及URL best-effort release也未改。若host revoke本身失敗，只能保證所有release均嘗試、app自己的引用清除並保留診斷，不能宣稱已抹除browser內部／OS記憶體。

新增 `test/session-cleanup-regression.test.mjs` 5項session層失敗注入：invalidate含abort/phase清除與來源保留；reset含選項／通知／重複清理／晚到callback；dispose含disposed及observer斷開；revoke本身丟例外；setOptions清除失敗後仍通知且可再生成。使用真正DownloadUrls的untimer/revoke故障分支，Canvas／decoder仍明確為fake。4個既有test/fixtures檔案、原F1七項regression及browser harness皆未改。

### 新候選與保留範圍

新固定候選位於 `evidence/f1r1-2026-10-27/candidate/`，隔離runner的web root應指其 `release-artifacts/site/`。完整source／artifact清單是同證據根的 `candidate-manifest.json`，相對F1差異是 `source-vs-old.json`。本輪新增專用 `scripts/f1r1-candidate.mjs`、session層測試，刷新session source pin及本交接，其他產品檔不變。

前一F1的82個source＋build檔另存到本輪old/；之前整個 `evidence/f1-2026-10-27/` 先記錄全部files/SHA，freeze時逐項核對，不覆寫舊manifest/snapshot/results。根目錄既有dist/release、root凍結證據及舊harness也未操作。測試只在新的candidate copy執行；不直接覆寫未管理或已修改的release輸出。source的唯一public差異仍是session.mjs；O01允許empty release-artifacts的設計不變。

### 命令與狀態

| 命令／範圍 | Exit／結果 |
| --- | --- |
| environment guard before | 0，完整baseline |
| `node scripts/f1r1-candidate.mjs capture` | 0，保存82個F1檔與完整舊證據fingerprint |
| 新5項session regression，修正前F1 | 1，0/5（預期negative，證實缺口） |
| 同5項session regression，修正後 | 0，5/5 |
| `node scripts/f1r1-candidate.mjs pin` / `candidate` | 0，僅session public pin更新；55個新source檔 |
| `npm run check`（新copy） | 0，語法／雙語／靜態安全 |
| `npm run build`（新copy） | 0，13個preview資產 |
| `npm test`（新copy） | **0，73/73**，無fail/skipped/cancelled |
| `npm run build:release`（新copy） | 0，14 site files／13 source files |
| `npm run check:release`（新copy） | 0，expected bytes／manifest／source pins |
| 完整environment after comparison | 見本輪verification，全部Snapshots比對 |
| sync-handoff / freeze | 見本輪verification，只同步交接後凍結；未變實作不重跑 |

實際Node/npm絕對命令、stdout及完整FAIL/PASS歷史在本輪 `commands.json`；精確source tree／release manifest SHA與舊F1證據未變證明在 `verification.json`，不把本文件自己的hash寫回本文件。來源package version維持原未發布基線，新版由B20-45-F1R1及新manifest hash區分。

**F1R1 browser/native download仍NOT_RUN_BY_OWNER_ROOT_RERUN_REQUIRED**；未啟動browser/server/UI/OS操作，沒有安裝、憑證、持久環境／Git/auth變更、push或部署。Node exception injection不是native browser證明。沒有縮減功能或安全gate，root應讀新manifest/diff並以原harness綁新serving bytes重驗後再走既有授權發布流程；沒有其他待決產品選項。


## B20-45-M2A — 正式 assets-only 發布準備（2026-10-27）

本輪依主聊 M2A 派送準備正式來源與產物，不 push/deploy，不使用 browser/native/桌面、憑證、全域 Git/auth 或持久設定，不委派。允許範圍只有本工具與 workspace 的 .runs/batch20-completion-2026-10-27/owner-45-release。M2A 後主聊驗收，再由原對話執行 M2B；沒有標示外驗通過。

### 已驗基線與產品保持範圍

基線 B20-45-F1R1 的 release manifest 為 e52c0054578d01283d2db22201b74f8a7d910a03b69a09a09688b8d3a270a7ae。主聊本次回報 F1R1 ZIP 乾淨解壓保留原4個fixture，73 tests與5命令PASS；隔離真browser b20-45-f1r1 為44 PASS／8 NOT_RUN／0 FAIL、prohibited[]、parent cleanup PASS。此處是主聊證據回報，本對話沒有重跑或把8項未驗升格通過；前面各歷史NOT_RUN記錄也不覆寫。

本輪所有13個 public來源、release-inputs.json 與 F1R1相同。JS/CSS、CSP、核心、圖片PNG/TXT輸出、timer/cleanup修正完全不變。只在production HTML精確移除兩語頁尾的候選預覽固定文字；其餘HTML bytes保持已驗F1R1正式SEO產物。preview仍保留原noindex與候選標籤。

### 正式設定、redirect及manifest

新增wrangler.jsonc：glossquote-image-contact-sheet／contact-sheet.glossquote.com唯一custom domain／compatibility_date 2026-10-24。workers_dev、preview_urls、send_metrics、observability及logs／invocation_logs／traces均false。assets ./release-artifacts/site，run_worker_first false、html_handling none、not_found_handling none；沒有Worker main／vars／bindings／env／新dependency。

production site增加精確3列301 _redirects，完整內容為「/ /index.html 301」「/en /en/index.html 301」「/en/ /en/index.html 301」，每列一個LF，最後LF，無空列或其他規則。共15 site files，manifest仍在site外；schemaVersion 2／mode production／13 sourceFiles／1 deploymentFiles。固定config literal及root設定bytes在任何release寫入前核對；manifest僅記錄config hash，不能替改動的config背書。check也會先核對固定設定。

必要修改限於HANDOFF.md、M2A-RELEASE.md、wrangler.jsonc、scripts/check.mjs、scripts/release.mjs、test/release.test.mjs。沒有改舊M1B/F1/F1R1文件或證據、browser harness、root dist/release，亦不放寬O01／未知輸出拒絕政策。設定文件參考Cloudflare官方文件；依明確專案指示保留指定日期及關閉觀測，不採技能預設啟用logs/traces。未安裝Cloudflare CLI／schema／依賴，也沒有執行deploy dry-run或遠端檢查。

### 實際離線驗證

所有必要命令在owner-45-release/candidate新copy執行（57個source；僅複製歷史M1 inventory供原測試使用）。未複製root的舊dist/release，因此沒有覆寫原物。Node使用C:/Program Files/nodejs/node.exe，npm使用同安裝node_modules/npm/bin/npm-cli.js。順序為check及build完成後test，再build:release／check:release。

| 命令 | Exit／實際結果 |
| --- | --- |
| environment guard before | 0，完整baseline PASS |
| prepare.mjs capture / create | 0，84個F1R1基線檔；57個新source |
| npm run check | 0，source／語法／雙語／靜態安全／fixed config |
| npm run build | 0，13 preview資產，逐bytes確認 |
| npm test | 0，79/79；fail/skipped/cancelled/todo皆0 |
| npm run build:release | 0，15 site／13 pinned public／1 deployment config |
| npm run check:release | 0，production expected bytes／manifest通過 |
| environment guard after及freeze | 詳見本輪verification與commands；要求完整Snapshots相同 |

原73測試保留，更新production mode／schema／site count及精確footer例外的assertions；新增6測試群，包含22種設定欄位／權限／routing變動、缺失／另格式／directory／junction設定、8種redirect協同manifest竄改、8種manifest deployment record/mode/schema變動、5種設定bytes／missing/unknown field負例。每個拒絕案例均核對完整樹與bytes不變；協同manifest仍是可解析的JSON。Canvas/decoder仍為明示fake；Node測試不是新production native browser證據。

新候選、source-vs-f1r1.json、artifact-vs-f1r1.json、candidate-manifest.json、命令/stdout、完整環境快照、歷史檔fingerprint與verification.json均在owner-45-release；來源／產物及設定雜湊寫外層manifest/verification，不把HANDOFF自己的hash寫回文件。prepare freeze檢查所有舊evidence及root dist/release未變、13個public與F1R1相同、候選source與目前source相同。只同步本交接文件後凍結，不因未變的實作重跑已通過檢查。

M2A owner未執行browser/native、production HTTP、source publication、hosting或homepage integration，均NOT_RUN_IN_M2A；使用者焦點限制維持。狀態為正式產物已準備，等待主聊M2A驗收及M2B指示，不代表上線或外驗完成。


## B20-45-M2A-F1 — 補固定build command（2026-10-27）

主聊共同發布gate發現原M2A缺build欄位。依本輪窄修正，只在wrangler.jsonc及release.mjs的固定DEPLOYMENT_CONFIG加入build.command精確值「node scripts/release.mjs build」，更新config literal oracle、加入10種協同manifest竄改負例及M2A文件追加說明。runtime/public/CSP/核心/輸出、原15個正式site檔、schema2與production模式均不變；manifest只更新deploymentFiles的config bytes/hash。

改動限定HANDOFF.md、M2A-RELEASE.md、scripts/release.mjs、test/release.test.mjs、wrangler.jsonc。舊owner-45-release所有文件與候選都保留；本輪專用owner-45-release-r1，先複製87個M2A source/build基線，另fingerprint整個前一owner目錄及全部404個歷史tool evidence/root dist/root release檔。freeze會確認完整清單及bytes/SHA不變。主聊對原M2A的驗收仍屬歷史證據，不能作本修正版部署放行。

新candidate仍57個source／87個source+build檔，另外保留歷史M1 inventory供測試。必要命令只在新copy執行：check exit0；build exit0；node --test test/release.test.mjs exit0、23/23，fail/skipped/cancelled/todo皆0；build:release及check:release均exit0。新增測試涵蓋build缺失／空物件／null、check或多餘參數命令、shell串接、替代npm命令、命令array、cwd與watch_dir；均把config digest同步寫到可解析manifest，再核對build/check拒絕且原物bytes不變。

這輪只重跑受影響的完整release測試檔；原M2A完整79項PASS保留，沒有宣稱本輪完整suite重跑。環境guard前後完整Snapshots、實際命令與stdout、source-vs-m2a.json／artifact-vs-m2a.json、candidate-manifest.json及verification.json位於owner-45-release-r1。HANDOFF最後同步文件後freeze，不重跑未變的實作。

沒有browser/native/正式HTTP、GitHub create/push、deploy、憑證、CLI安裝、持久設定、全域Git/auth或委派。Cloudflare Custom builds官方文件僅作build.command欄位佐證；沒有實際執行Wrangler。主聊回報建庫頻率限制，後續M2B只允許local copy，繼續禁止create/push/deploy。狀態仍prepared，不是上線或外驗通過。
