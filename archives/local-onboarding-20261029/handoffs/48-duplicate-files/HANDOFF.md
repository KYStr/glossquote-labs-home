# 重複檔案找出來 — B20-48-M1 交接

2026-10-23（Asia/Taipei）。M1 的 T00 → T10 → T20 → T30 已完成，靜態雙語候選與真實報告輸出已實作並凍結。Node gates 通過；尚未完成真瀏覽器或主代理獨立驗收。此版不得跳到 M2 公開／部署，也尚未進入外部驗收。

| 範圍 | 實際狀態 |
|---|---|
| 雙語 UI、Worker、比對核心、keeper、TXT/JSON | IMPLEMENTED_LOCAL_CANDIDATE |
| Node24 test / check / build | PASS，38 tests / 0 fail / 0 skipped |
| 合成 JSON/TXT 實際檔案回讀 | PASS，4 份與獨立預期逐 byte 相同 |
| 持久 Windows Environment 完整快照 | PASS，HKCU/HKLM 前後完全相同 |
| 真 browser／native／真機、Network/Storage | NOT_RUN_USER_FOCUS_INCIDENT |
| dev server／實際 HTTP listener | NOT_RUN_PER_DISPATCH_NO_SERVER；只有純 request handler 測試 |
| 主代理獨立 acceptance | NOT_RUN |
| GitHub／source commit／reviewed commit | NOT_PUBLISHED / 無 commit |
| 正式網址／released commit／首頁整合 | NOT_DEPLOYED / 無 released commit；domain 提案未驗證 |
| 外部驗收 | NOT_RUN |

本對話 requested gpt-6.1-sol/max；實際 backend 未獨立驗證，沒有自行切換。沒有開 chat、子代理、安裝套件／服務、啟動 server、操作 browser/native 或讀憑證。只改本工具授權路徑，未修改共享首頁、看板、兄弟工具或 GlossGate。

## 實作與差異

初始為 14 份規格／契約文件，沒有實作。本輪只更新其中 HANDOFF，其餘 13 份保持唯讀；新建 32 份來源／工作紀錄檔，另生成 11 份 dist。固定來源總數 33（含本檔與 TASK-ENTRY），逐檔 bytes/SHA-256 見 [candidate manifest](evidence/m1/candidate-manifest.json)。工具資料夾在開始與結束都是 Git untracked，沒有 tracked diff 可代表本輪差異；不能將空的 `git diff` 當成沒有變更。

- `package.json`、`.gitignore`：private ESM、Node >=24、零 runtime/dev 依賴，四個標準 scripts，無 npm install。
- `public/index.html`、`public/en/index.html`、`public/css/app.css`：獨立繁中／英文頁，完整 FAQ、限制、錯誤、狀態、普通語言連結與離頁遺失警語；匹配語言家族首頁。M1 noindex/nofollow/noarchive，無虛構 canonical。
- `public/js/app.js`、`public/js/ui.js`：多檔 input/drop、來源索引與大小、移除、進度／取消、真群組、原生 keeper radio、summary、TXT/JSON 下載與預覽、reset/pagehide。檔名使用文字節點；控制／bidi 字元可見化；相同名稱以 sourceIndex 區分。Singleton 不提供改選控制。
- `public/js/analysis-worker.js`、`public/js/core/{limits,analyze,compare,report,session}.js`：先數量／大小驗證，逐檔原生 SHA-256、size/hash buckets，再以 65,536-byte chunks 確認 bytes。預設首來源 keeper；只允許同組改選。Worker terminate + epoch/jobId 使取消、來源變更、新任務、錯誤與晚到事件失效；清除 URL 與分析引用。
- `scripts/{serve,check,build,run-gates,verify-artifacts,freeze-candidate}.mjs`：loopback-only 開發入口（未啟動）、封閉 11 檔 public allowlist、JS/toolchain 語法與靜態不變式、預覽 build、輸出回讀與固定候選清單。build 拒絕 junction/symlink、未知 source/output；不刪未知輸出。所有 child commands 使用 shell:false/windowsHide:true。
- `test/*.mjs`：12 份測試／輔助檔，共 38 測試。使用合成 File、明確碰撞注入、獨立 node:crypto oracle、精確預期與純狀態機；另有 genuine Node worker_threads 的 structured clone／terminate 檢查，不代表 browser Worker。
- `TASK-ENTRY.md` 與 `evidence/m1/**`：設計／例行決策、完整命令紀錄、環境快照、驗收對照、合成報告與來源清單。未另做使用者 ZIP；由主代理整合單一交付包。

## 實際命令與結果

在本工具目錄執行。現有 Node 為 `C:/Program Files/nodejs/node.exe`，v24.14.0。`scripts/run-gates.mjs` 以相同 Node 直接呼叫現有 npm CLI，沒有 shell 或 npm 安裝。各階段四個命令和 exit 完整保存在 commands JSON／相鄰 logs。

| 階段 | node --version | npm test | npm run check | npm run build | 證據 |
|---|---:|---:|---:|---:|---|
| T00 | 0 | 0；2/2 | 0 | 0 | [commands](evidence/m1/t00-commands.json) |
| T10 | 0 | 0；26/26 | 0 | 0 | [commands](evidence/m1/t10-commands.json) |
| T20 | 0 | 0；29/29 | 0 | 0 | [commands](evidence/m1/t20-commands.json) |
| T30，最終程式 | 0 | 0；38/38 | 0 | 0 | [commands](evidence/m1/t30-commands.json)、[tests log](evidence/m1/t30-2.log) |

`node scripts/verify-artifacts.mjs` exit 0：[command](evidence/m1/artifacts-command.json)、[逐檔 bytes/SHA-256](evidence/m1/artifacts-verification.json)。精確 oracle a=abc,b=abc,c=abd,d/e empty 得到 groups [0,1],[2],[3,4]、2 duplicate groups、unique=3、duplicates=2、savedBytes=3。預設與改選 source1 的 JSON/TXT 內容均獨立回讀驗證，沒有使用被測結果建 expected。

- [預設 JSON](evidence/m1/artifacts/oracle-default.json)：2274 bytes，SHA-256 `9961a4264c4554bd33b092667d045d62358c26c60a6b249ac1862b1a778b088d`。
- [預設 TXT](evidence/m1/artifacts/oracle-default.txt)：579 bytes，SHA-256 `9046254fb10ea9b88eba2262c71a3c871670e67d26664cab5ae61b0376ef3f26`。
- [改選 JSON](evidence/m1/artifacts/oracle-keeper1.json)：2274 bytes，SHA-256 `d2b22e1d31e912c8cf31c5750ca88ec09d04423f0540d74536f4dc3140191b37`。
- [改選 TXT](evidence/m1/artifacts/oracle-keeper1.txt)：579 bytes，SHA-256 `1b361f6d09f333f0883d53b38ce2fcf5996de50f97390d8b29fc5529f56075e4`。

`node scripts/freeze-candidate.mjs capture` 與 `verify` 固定並比對 sources／dist／唯讀規格；最終執行結果見 [freeze verification](evidence/m1/freeze-verification.json)。manifest 不含自己，避免循環雜湊；public 與 dist 每檔 bytes/hash 必須相同。沒有為文件更新重跑未變更的程式測試。

## 環境保護

長測試前後執行既有 `<LOCAL_USER>/.codex/check-persistent-environment.ps1`。比較整個 Snapshots（含 registry type、PATH length/hash、ephemeral entries、全 Environment fingerprint、TEMP/TMP hash），不是只看 Status。見 [before](evidence/m1/environment-before.json)、[after](evidence/m1/environment-after.json)、[比較](evidence/m1/environment-comparison.json)，另保留 T10 後與 T30 前快照。

| 範圍 | PATH type / length / ephemeral count | PATH SHA-256 | Environment-key SHA-256 |
|---|---|---|---|
| HKCU | ExpandString / 834 / 0 | `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb` | `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a` |
| HKLM | String / 1227 / 0 | `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8` | `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82` |

沒有變更 persistent environment、registry、Git global/system config 或 auth 設定；沒有進行 publication，因此未執行 Git publication guard。

## 未驗與下一步界線

完整 D48-01–26 對照見 [acceptance results](evidence/m1/ACCEPTANCE-RESULTS.md)。目前沒有已知未修正的 Node gate 失敗；下列必要 release/browser gates 全為 **NOT_RUN_USER_FOCUS_INCIDENT**：真正 file input/drop、module Worker/Web Crypto、取消時機、來源更換、keeper 鍵盤／焦點、惡意名稱 DOM、普通語言導頁、新頁無舊 state、瀏覽器下載、320px、200% zoom、live region、Network/Storage、真機。靜態／Node view-model／worker_threads 證據均不能代替這些項目。未截圖、未試驗輸入隔離、未啟動或關閉任何使用者分頁／server／程序。

記憶體清理表示丟棄可達引用與 revoke object URLs，並非鑑識抹除保證。取消仍保留選取來源供重試；reset/pagehide 才同時清來源引用。下載檔案由使用者自行保存／清除。UI 不宣稱磁碟已存檔或實際釋放空間。靜態 scanner 是檢查工具，不是安全證明。

主代理需先讀固定 sources、獨立 acceptance，並在已核准隔離機制下補完 browser gates；M2 另行放行後才可公開。M3 hosting／首頁由主代理處理；未建立公開 repo、未部署，也沒有標記 awaiting external review 或產品完成。

## B20-RP-48 / M1B 追加交接（2026-10-23）

本輪是 `.runs/batch20-release-prep-2026-10-23/TASK.md` 的離線發布準備授權，不是 M2 放行。已完成 release generator/checker 與固定候選；預定 origin `https://duplicates.glossquote.com`、toolSlug `duplicate-files`。原 M1 public/dist/runtime 與全部舊 evidence 保持逐 byte 相同，未重建 preview；上方 M1 紀錄與原 manifest 保留為歷史，不以更新後 package/scripts/docs 重寫舊證據。

### 實際差異

修改 package.json 新增 `build:release` / `check:release`（原四個 scripts 不變），追加本 HANDOFF 與 TASK-ENTRY。新增：

- `scripts/release-policy.mjs`：鎖定 M1 11 份 public bytes/SHA、原 serve 來源 SHA、固定 origin/slug/雙語 metadata。
- `scripts/release.mjs`：嚴格 build/check CLI；只產生獨立 `release-artifacts/site/` 與 sibling manifest。預先完整檢查 inputs/outputs，拒絕未管理／被修改／缺漏／多餘／linked output；合法重建逐 byte 確定。沒有遞迴刪除、部署或認證命令。
- `scripts/run-m1b-gates.mjs`：shell:false/windowsHide:true、離線 targeted/final gate runner，保留每次命令／exit／stdout log，不覆蓋先前 attempt。
- `scripts/m1b-evidence.mjs`：比對 93 份初始檔案、檢查改動範圍、產生實際來源 patch、逐檔固定 sources/artifacts 與 M1 immutable 記錄；新證據只進 m1b。
- `test/release.test.mjs`：14 項發布準備測試，negative cases 全在 tool-owned test 臨時 copy；不修改真 public/dist 或用戶資料。
- `M1B-RELEASE.md`：重現方式、輸出／manifest schema、header 依據、browser 驗收位置與尚缺 gate。

共 9 個來源檔新增／修改（6 新增、3 修改）；另生成 14 site 檔＋1 manifest。`.gitignore` 未改。實際 [source patch](evidence/m1b/source-changes.patch)、[所有差異 before/after bytes/SHA](evidence/m1b/changes.json)、[來源／產物固定清單](evidence/m1b/candidate-manifest.json) 供主代理核對。未碰兄弟工具、共享看板／首頁、GlossGate 或原驗收包；未開 chat／子代理、未自行切換模型。

### 最終命令與內容證據

現有 Node `v24.14.0`，沒有安裝依賴。先針對性 `node --test test/release.test.mjs` exit0，14/14 pass；最終程式一次完整執行如下，沒有重跑原 preview build。

| 命令 | 實際結果 | 證據 |
|---|---|---|
| node --version | exit0；v24.14.0 | [log](evidence/m1b/final-1-1.log) |
| npm test | exit0；52 pass、0 fail、0 skipped（原38＋新增14） | [log](evidence/m1b/final-1-2.log) |
| npm run check | exit0；11 public allowlist／syntax／靜態不變式 | [log](evidence/m1b/final-1-3.log) |
| npm run build:release | exit0；14 site assets | [log](evidence/m1b/final-1-4.log) |
| npm run check:release | exit0；鎖定來源＋獨立重建 expected bytes／SEO semantics | [log](evidence/m1b/final-1-5.log) |

完整 [commands JSON](evidence/m1b/final-1-commands.json)，另保留 [targeted log](evidence/m1b/targeted-1-1.log)。新 tests 證明兩語互返、正確 domain、preview／可見 body／九份 runtime 不變、robots/sitemap/headers、確定重建、tampered/extra/missing/unknown-dir、manifest+asset 一起改、source+asset+manifest 一起改、來源／serve 漂移、junction、CLI 邊界均拒絕或符合精確獨立預期。這些是離線工具鏈證據，沒有增加任何 browser PASS。

site 14 檔合計 59,422 bytes；sibling manifest 3,900 bytes，SHA-256 `6791701d99d3408eeb730c3b14e8f26d1c23c7e7ea7082ffcf66654e60402460`。manifest 只有 schemaVersion/mode/origin/toolSlug/files/sourceFiles；paths 分別相對 site/public，沒有時間／隨機值／本機絕對路徑，不列自己。完整 sources/artifacts hashes 以 [M1B candidate](evidence/m1b/candidate-manifest.json) 為準；capture/verify 結果另存 [freeze verification](evidence/m1b/freeze-verification.json)。

原 public 無 `_headers`，依未改動 `scripts/serve.mjs` 的 HEADERS 常數生成（來源 SHA `a810dd96c8e90f9f44518061f93dc331dacfa65aef85e53d37a15d8fe2e3ad5b`），import 不啟動 server。CSP／nosniff／no-store／no-referrer 原樣保留，只改 X-Robots-Tag index, follow。HTML 只有 head robots/canonical/hreflang 改變；候選未部署提示保留。headers 配置不是實際 hosting header 證明。

### 環境與尚缺門檻

長測試前後執行既有 environment guard，比對完整 Snapshots（PATH type/hash/length/ephemeral、全 Environment fingerprint、TEMP/TMP hashes），結果完全相同，沒有持久修改。見 [before](evidence/m1b/environment-before.json)、[after](evidence/m1b/environment-after.json)、[comparison](evidence/m1b/environment-comparison.json)。本輪沒有 publication，未讀憑證、未執行 Git/auth 設定變更；沒有 server／browser／native／OS 輸入／剪貼簿／dialog 操作。

Browser 驗收者應使用 **`release-artifacts/site/`**，兩語入口 index.html／en/index.html；操作機制仍由主代理另行核准。真 browser／視覺／原生／真機／正式 Network/Storage／實際 hosting headers 全為 **NOT_RUN_USER_FOCUS_INCIDENT**。未確認預定 domain 已在線，未 GitHub、未部署、未納入正式首頁；沒有 M2 放行或新權限需求。沒有剩餘已知離線 gate 失敗。主代理仍需回收實際 diff／產物並獨立驗證，再決定隔離 browser gates；由主代理合併單一交付 ZIP。

## B20-48-M2A — 正式發布來源準備（2026-10-25）

狀態：**SOURCE_PREPARED_NOT_PUBLISHED_NOT_DEPLOYED**。本輪只完成主代理授權的M2A，不是M2B推送或部署放行。requested gpt-6.1-sol/max；backend身分未獨立確認，未自行切模型或再委派。上方M1/M1B是歷史交接，原evidence與owner browser模組不重寫；本輪所有新證據在evidence/m2a。

### Root真瀏覽器紀錄，保留原始失敗與NOT_RUN

Root已執行`isolated/b20-48-r1`：20 PASS、4 FAIL、14 NOT_RUN。四個FAIL的原文均為測試傳輸限制 `Cannot set buffer larger than 50Mb...`，不是產品修正；root更換審核過的檔案傳輸後執行`b20-48-large-r1`，兩語各限制／取消／NetworkStorage共6項PASS，parent cleanup兩次均PASS。按原案例替換06/08，合併產品原案例為**24 PASS，14 NOT_RUN保留**，不是把首次歷史改為全PASS。

來源receipt SHA、browserVersion、原始狀態、替換映射及cleanup摘要見 [browser receipts](evidence/m2a/browser-receipts.json)。本對話只讀既有結果，沒有啟動browser/server/native，也沒有重跑未變的38項核心套件；root已檢視desktop/320px畫面。200%、強制碰撞／late-message注入、精確revoke/GC、20分鐘、native、真機/AT等14個NOT_RUN仍待其原定範圍處理，未轉成PASS或冒稱外部驗收。

### 本輪精確變更與原版保存

- `scripts/release.mjs`、`scripts/release-policy.mjs`：正式輸出僅移除中文 `<p class="candidate">本機候選版；尚未部署</p>` 與英文 `<p class="candidate">Local candidate; not deployed</p>` 各自完整單行，含原縮排與換行分別62/61 UTF-8 bytes。Preview 11份來源SHA仍鎖定，原head SEO保持M1B；其餘body全量SHA與expected bytes均驗，拒絕任何其他body改寫／banner復活／asset+manifest共同竄改。
- `test/release.test.mjs`：對應精確banner差異調整既有測試，新增完整body防護反例。
- `wrangler.jsonc`：純static name=`glossquote-duplicate-files`，僅`duplicates.glossquote.com` custom_domain。workers_dev/preview_urls/send_metrics、observability.enabled/logs.enabled/logs.invocation_logs/traces.enabled全false；assets=`./release-artifacts/site`、run_worker_first=false、html_handling=none、not_found_handling=none；build=`node scripts/release.mjs build`。沒有runtime Worker、依賴、帳戶ID／secret／資源。
- `scripts/check-publish-config.mjs`、`test/publish-config.test.mjs`：完整精確config policy、未知資源／額外domain／telemetry／路徑／build命令及錯誤日期反例。
- 本HANDOFF追加；package.json、TASK-ENTRY、M1B-RELEASE、所有public/dist與其他Runtime source都未改。共7個來源新增／修改，另生成3個active artifact變更（兩語HTML與manifest）。[實際source patch](evidence/m2a/source-changes.patch)、[最終before/after差異](evidence/m2a/final-delta.json)、[固定來源與資產](evidence/m2a/candidate-manifest.json)。

**日期更正：** 主代理最初指定2026-10-25，後續明確改為`2026-10-24`以避免其UTC時間仍10-24時的future compatibility date。本輪wrangler、validator與config tests均採10-24；沒有改動Runtime或Windows時區。完整設定依據與schema/dry-run限制見 [config review](evidence/m2a/CONFIG-REVIEW.md)。

修改active artifact前已複製全部原15檔到 [original-release](evidence/m2a/original-release/manifest.json)，逐檔bytes/SHA相同；舊manifest SHA `6791701d99d3408eeb730c3b14e8f26d1c23c7e7ea7082ffcf66654e60402460`。通過受影響tests/check後，先核對來源與目的絕對路徑皆在本工具內，再將舊active目錄原樣rename到 [retired-active-release](evidence/m2a/retired-active-release/manifest.json)，沒有遞迴刪除或覆寫。見 [retirement plan](evidence/m2a/retirement-plan.json)、[result](evidence/m2a/retirement-result.json)。新build從空active路徑生成；原兩份保存都再驗hash。

### 實際命令、固定產物

Node v24.14.0；child shell:false/windowsHide:true；未安裝套件、未執行Wrangler或認證工具。只執行受影響release/config測試，不以舊core重跑增加通過數。

| 命令 | 實際結果 | 證據 |
|---|---|---|
| node --test test/release.test.mjs test/publish-config.test.mjs | exit0，18 pass／0 fail／0 skipped（15 release＋3 config） | [tests](evidence/m2a/pre-build-1-2.log) |
| npm run check | exit0，11 public來源與語法／靜態不變式 | [check](evidence/m2a/pre-build-1-3.log) |
| node scripts/check-publish-config.mjs | exit0，精確Node policy；非Wrangler/schema/provider PASS | [config](evidence/m2a/pre-build-1-4.log) |
| npm run build:release | exit0，14 site檔 | [build](evidence/m2a/release-1-1.log) |
| npm run check:release | exit0，重建expected與完整body防護 | [release check](evidence/m2a/release-1-2.log) |
| node evidence/m2a/task.mjs verify-delta | exit0，兩語只少原banner，各manifest bytes/hash更新 | [delta before handoff](evidence/m2a/delta.json) |

完整 [pre-build commands](evidence/m2a/pre-build-1-commands.json)、[release commands](evidence/m2a/release-1-commands.json)。未執行npm test全套、preview build、browser或server。Wrangler CLI/schema/dry-run仍NOT_RUN；本專案沒有本地Wrangler/schema，依本輪不安裝／不部署要求保留給root後續審核環境，沒有為此新增依賴或權限。

| Active formal artifact | bytes | SHA-256 |
|---|---:|---|
| site/index.html | 6490 | `cc60ba6c4390b5e010d039888b1e27387f5cf0fb1958f842ab592de1b92e61d7` |
| site/en/index.html | 6677 | `a5b733fd6f9a20701c3db3022f2df4f83d03de54eff41809d6db25c77b322a4c` |
| manifest.json | 3900 | `e44d02f2942b0738c1202b0f8f5d9b03de480448a87accedb5150629d704283b` |

其餘12份site assets完全不變（包括九份JS/CSS、robots/sitemap/_headers）；site合計59,299 bytes，連sibling manifest共63,199 bytes。manifest schema與sourceFiles完全不變，只改兩個HTML記錄的bytes/SHA。正式輸出沒有新增已上線、驗收通過或假評價聲明。

環境guard前後完整Snapshots相同，包含HKCU/HKLM PATH type/hash/length/ephemeral與Environment全指紋、TEMP/TMP hashes，見 [before](evidence/m2a/environment-before.json)、[after](evidence/m2a/environment-after.json)、[comparison](evidence/m2a/environment-comparison.json)。沒有持久環境、registry、Git設定、auth或帳戶狀態修改，沒有憑證讀取。

固定來源／資產清單與精確差異由task freeze/verify保存，結果見 [freeze verification](evidence/m2a/freeze-verification.json)。本輪沒有push/deploy，source/reviewed/released commit仍無；正式hosting與external verification尚未執行。Root審查M2A後需另發M2B，才由本對話準備受審副本與GitHub推送；部署／首頁／總表與單一ZIP仍由root負責。

## M2A 發布入口補充（2026-10-27）

Root在42站實測指出 `html_handling:none` 使`/`與`/en/`回404，因此本輪依其明確指示採用既有首頁 `tool-projects/00-home/scripts/site.mjs` 的固定三行轉址。只補發布入口，不擴UI、不修改任何共享檔、Runtime、public/dist、CSP、canonical、舊evidence或owner browser；Wrangler仍為原 `html_handling:none`，compatibility_date仍2026-10-24。

正式site新增 `_redirects`，**65 UTF-8 bytes**，每行為真正LF且最後也有LF：

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

實際只修改 `scripts/release.mjs` 的site/output allowlist及固定資產生成、`test/release.test.mjs` 的相應清單／數量與精確規則／tamper反例，以及本HANDOFF追加。Active output只增加 `_redirects`，manifest新增該檔記錄；原14份site資產（兩語HTML、九份JS/CSS、robots/sitemap/_headers）逐byte完全不變，manifest其他欄位與11份sourceFiles保持原樣。

修改active前先保存上一版完整15檔與全部before hashes：[original release](evidence/m2a-redirects-2026-10-27/original-release/manifest.json)、[before](evidence/m2a-redirects-2026-10-27/before.json)。舊manifest SHA-256 `e44d02f2942b0738c1202b0f8f5d9b03de480448a87accedb5150629d704283b`。受影響tests/check通過後核對絕對路徑皆在本工具內，將舊active原樣rename到 [retired release](evidence/m2a-redirects-2026-10-27/retired-active-release/manifest.json)，不刪除／覆寫。兩份舊版15檔均再次逐檔驗證；[retirement plan](evidence/m2a-redirects-2026-10-27/retirement-plan.json)與[result](evidence/m2a-redirects-2026-10-27/retirement-result.json)保留。

| 本輪實際命令 | 結果 | 證據 |
|---|---|---|
| node --version | exit0；v24.14.0 | [version](evidence/m2a-redirects-2026-10-27/tests-1-1.log) |
| node --test test/release.test.mjs | exit0；17 pass／0 fail／0 skipped | [tests](evidence/m2a-redirects-2026-10-27/tests-1-2.log) |
| npm run check | exit0 | [check](evidence/m2a-redirects-2026-10-27/tests-1-3.log) |
| npm run build:release | exit0；15 site files | [build](evidence/m2a-redirects-2026-10-27/release-1-1.log) |
| npm run check:release | exit0；16檔含sibling manifest | [release check](evidence/m2a-redirects-2026-10-27/release-1-2.log) |

完整 [test commands](evidence/m2a-redirects-2026-10-27/tests-1-commands.json)、[release commands](evidence/m2a-redirects-2026-10-27/release-1-commands.json)。新增精確規則／缺漏與共同竄改測試，拒絕302、錯目的地、外部目的地、漏行、額外wildcard、CRLF、字面反斜線n、缺結尾LF、重複行、manifest同步更新或刪除。負例只在本工具test臨時copy中；未重跑未變核心套件、config或browser測試，沒有啟動server。

`_redirects` SHA-256 `9e47a2579b08f461b1124de1e42a1bde7a79ca29d77401104f6f432d8be90e1e`；新manifest **4043 bytes**，SHA-256 `a8577a7b29d5b23968bbdf95790231167f523f7d89109122a9d1450529f3d7e1`。Site合計59,364 bytes，含manifest共63,407 bytes。完整 [來源／產物固定清單](evidence/m2a-redirects-2026-10-27/candidate-manifest.json)、[精確diff](evidence/m2a-redirects-2026-10-27/exact-changes.patch)、[delta](evidence/m2a-redirects-2026-10-27/delta.json)、[freeze verification](evidence/m2a-redirects-2026-10-27/freeze-verification.json)。

環境guard完整Snapshots前後相同（HKCU/HKLM PATH type/hash/length/ephemeral、Environment全指紋、TEMP/TMP），見 [before](evidence/m2a-redirects-2026-10-27/environment-before.json)、[after](evidence/m2a-redirects-2026-10-27/environment-after.json)、[comparison](evidence/m2a-redirects-2026-10-27/environment-comparison.json)。未安裝依賴、讀憑證、改持久Windows或全域Git/auth；child shell:false/windowsHide:true。

本輪沒有browser／desktop／OS輸入／剪貼簿／原生dialog，也沒有GitHub/push/deploy或新ZIP。Root既有24產品案例PASS、14NOT_RUN不變；本輪只證明本地固定轉址產物與防竄改，**48站真實HTTP轉址尚未執行／驗證**。待root再次驗證後另行放行M2B；正式hosting及external驗收仍未執行。

## B20-48-M2B — 已驗證公開來源（2026-10-27）

狀態：**SOURCE_PUBLISHED_NOT_DEPLOYED**。主代理明確放行 M2B 後，以獨立受審 publishing copy 建立並推送 [KYStr/glossquote-labs-duplicate-files](https://github.com/KYStr/glossquote-labs-duplicate-files)；GitHub API 確認 public、private=false、default branch=`codex/release-2026-10-27`。固定 commit **`32bae23bcfc9753cb60756ff9ef2381219565f67`**，GitHub branch/commit API、完整50檔tree及公開 git ls-remote 全部相同；不是本地 commit 冒稱已發布。

精確 publishing copy：`<LOCAL_WORKSPACE>/.runs/b20-48-m2b-2026-10-27-r1/publishing-copy`。僅此副本執行 init/add/commit/push，沒有推送外層 Labs repository。公開提交50檔，包含所有14份 test/ 測試、輔助程式與合成fixture生成來源；沒有漏掉巢狀fixtures，沒有裁減測試逃避乾淨clone。公開 README/HANDOFF/.gitignore 採可攜來源交接版本；保留核准規格與必要docs，不包含原始workspace evidence、scratch、node_modules、私有log、憑證或生成的dist/release-artifacts。只發布固定manifest與離線驗證摘要兩份合成metadata。

唯一產品樹測試變更為 `test/release.test.mjs` 的sandbox準備：改由該sandbox固定public bytes建立preview fixture，解決乾淨clone尚無dist的前置相依。產品Runtime、public/dist、release scripts/config與所有active正式產物未改；既有M1/M1B/M2A與redirects歷史證據保留。[精確測試/HANDOFF diff](evidence/m2b-2026-10-27-r1/source-changes.patch)、[來源差異](evidence/m2b-2026-10-27-r1/source-delta.json)。

乾淨copy在沒有dist時先執行 `npm test`：**58 PASS、0 FAIL、0 skipped**。`npm run check`、`npm run build`、`npm run build:release`、`npm run check:release`、`node scripts/check-publish-config.mjs` 均exit0，全部測試使用離線合成資料；沒有新browser/server或套件安裝。[實際命令](evidence/m2b-2026-10-27-r1/commands.json)、[驗證摘要](evidence/m2b-2026-10-27-r1/clean-validation.json)。這是提交前乾淨來源copy驗證；由主代理另做遠端fresh-clone獨立審查，不冒稱本對話已跑遠端clone。

正式release仍為15份site assets加sibling manifest共16檔／63,407 bytes；manifest 4,043 bytes，SHA-256 **`a8577a7b29d5b23968bbdf95790231167f523f7d89109122a9d1450529f3d7e1`**。copy build逐檔與主代理核准active artifact完全相同，GitHub內 `publication/release-manifest.json` 實際bytes再驗相同。固定 `_redirects` 65 bytes／SHA-256 `9e47a2579b08f461b1124de1e42a1bde7a79ca29d77401104f6f432d8be90e1e` 保持原樣；沒有48站實際HTTP或hosting驗證。

[Publication receipt](evidence/m2b-2026-10-27-r1/publication-receipt.json) 記repo/public/commit/releaseManifestSha256；[逐檔tracked inventory](evidence/m2b-2026-10-27-r1/tracked-inventory.json) 列全部50份Git blob的path/bytes/SHA-256；[遠端驗證](evidence/m2b-2026-10-27-r1/remote-verification.json)保存API與remote結果。[公開文件相對連結](evidence/m2b-2026-10-27-r1/portable-document-links.json)全部可解析。原始逐命令logs及前後來源清單一併存於本輪獨立evidence，舊版不覆寫。

Git settings guard發布前/後及最終均PASS，已知三份user/system Git設定檔的存在/大小/SHA-256不變，未設定global/system helper或變更auth。Windows guard完整Snapshots前後完全相同，含HKCU/HKLM PATH hash/type/length/ephemeral、全Environment-key指紋及TEMP/TMP protected hashes；[Git before](evidence/m2b-2026-10-27-r1/git-settings-before.json)、[Git final](evidence/m2b-2026-10-27-r1/git-settings-final.json)、[環境before](evidence/m2b-2026-10-27-r1/environment-before.json)、[環境final](evidence/m2b-2026-10-27-r1/environment-final.json)、[完整比較](evidence/m2b-2026-10-27-r1/environment-comparison-final.json)。只用現有官方CLI認證、每次命令git -c；所有child shell:false/windowsHide:true。

本輪**沒有部署、首頁/看板變更、browser/native/OS輸入、剪貼簿或新ZIP**；root原24項產品PASS／14項NOT_RUN原樣保留，外部驗收尚未執行。主代理接續遠端獨立審核、Cloudflare與首頁整合，再合併單一交付ZIP；本M2B不代表網站上線或版本完成外部驗收。
