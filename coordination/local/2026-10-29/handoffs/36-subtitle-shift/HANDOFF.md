# 字幕時間平移交接

<!-- PUBLIC-SNAPSHOT-START -->
## M2 正式來源候選 — 2026-10-19

主代理已明確 GO M2。M1 固定 public 經主代理原 HTTP／隔離 Chromium 驗收：53 列整合為 30 PASS、17 明確範圍 PARTIAL、6 人工 NOT_RUN，並保留 native large editor/paste 的 NOT_RUN_ENVIRONMENT。這是帶既有排除的階段接受，沒有宣稱外驗完成。詳 [primary acceptance summary](docs/M1-ACCEPTANCE-SUMMARY.md)。

本輪新增 production-lib／production build/check／5216 preview+HTTP／release-check、14 個 production tests、exact wrangler.jsonc、M1 public pin、15 檔 dist-production 及 assets 外 [release-manifest.json](release-manifest.json)。原 public 13 檔與所有 app/core/module Worker/CSS bytes 未變；正式 HTML 僅 head SEO／visible FAQ JSON-LD，以及核准的兩個 footer 環境標籤替換。body 前後 hashes 與兩次精確替換均記於 manifest。

目前本地驗證：npm test 103/103 runner，其中 102 個有斷言案例、1 個 fixture 載入；check/build/build:production/check:production exit 0；production HTTP 43 checks；既有官方 Wrangler 4.147.0 dry-run exit 0，1702 runtime 檔前後一致，隔離 process home/config/temp，沒有 Cloudflare credentials、安裝或部署。8 個反向 CLI 案例對來源污染、陳舊產物、links、SEO、headers、config、manifest 及額外 body 變更如預期 exit 1，原陳舊檔保留。最終 release/source/guard receipt 另行固定。

- M1 public inventory SHA-256：`0326098381c7f70510374488259b1dd50a3a9a0e95a1b31390e02ab0bcc06404`。
- Production 15 檔 inventory SHA-256：`a8e04a22341f0048a88ccb0f59f4c8a9b0af488a573da4b883cf8fa773f84e8b`。
- 指定來源 repository：[KYStr/glossquote-labs-subtitle-shift](https://github.com/KYStr/glossquote-labs-subtitle-shift)，branch `codex/subtitle-shift-m2`。
- 此 source-candidate checkpoint 不嵌入自己的 Git commit／ZIP hash；精確 commit 由 Git history／archive comment 與外部 publication receipt 固定。

主代理負責 M2 獨立驗收後的 M3 部署、live checks 及雙語首頁。本輪不部署、不改首頁、不執行任何 browser/CUA/native UI。原生 IME、AT、native browser zoom、native save與真機下載、低階手機／虛擬鍵盤、真 crash、native large paste 均保留排除；production live HTTP/Network/Storage/browser 仍待主代理。操作與重現方式見 [M2 release notes](docs/M2-RELEASE.md)。
固定 M2 code/docs 候選（55 檔，排除三個可變狀態檔）SHA-256：`3c293e19b7f15c312811f83dff8b76433ad0fe4e3ecd853844d9de9375530c82`。
<!-- PUBLIC-SNAPSHOT-END -->

## 工作區 M2 證據與發布 receipt

工作區歷史證據（不隨來源包）：根 .runs/subtitle-shift/m2-20261019-01a1520e/。公開 copy 已從本檔及 TASK-ENTRY 的 PUBLIC-SNAPSHOT 區段產生可攜版本，project.json 僅省略工作區 evidence location 並標為 snapshot；三個可變狀態檔不宣稱與工作區歷史 bytes 相同。全部 executable/public/config/tests/docs 依精確來源 manifest 驗證。

2026-10-19：M2 正式來源已發布，等待主代理獨立 M2 驗收；未部署、未修改首頁，尚非外驗完成。

- Repository：[KYStr/glossquote-labs-subtitle-shift](https://github.com/KYStr/glossquote-labs-subtitle-shift)，已由 GitHub 回讀確認 **PUBLIC**。default branch 與發布 branch 均為 `codex/subtitle-shift-m2`。
- 固定 commit：`8cd25b8d39eb426cfbe13b6181e83b05fe87f42a`；`git ls-remote` 回讀完全相同，publishing copy clean。
- 固定 commit ZIP：根 `.runs/github-publish/glossquote-labs-subtitle-shift/m2-20261019-01a1520e/subtitle-shift-source-8cd25b8d39eb426cfbe13b6181e83b05fe87f42a.zip`；127446 bytes；SHA-256 `d5092d9b1d97fbbe26bf5012cdfe3257f0718e4407a95c209a39fd210c2a0fcc`。
- ZIP 為直接 `git archive` 的 58 個來源檔、6 個目錄／64 entries；archive comment 固定同一 commit。每個檔案的路徑、長度、CRC32、SHA-256 及 bytes 均對照已審 copy 與 Git blob；拒絕 links／特殊檔／traversal／額外檔。
- `source-manifest.json` 與 `committed-source-manifest.json` 同置上述 publishing 目錄。前者 SHA-256 `2e8cea23e1e3da9f39b06f2e6b6ff3c7efff715cb2fd22265abb41d964b24575`；含逐檔 Git blob id 的後者 SHA-256 `9f4d0a32a66a57e621d42c9661870af1a7b5da034372a3e0eddb1154d42002e5`。
- 已審 publishing copy 及 ZIP 解壓副本的 `test/build/build:production/check/check:production/release:check` 均 exit 0；原工作區必要 gates 沿用相同固定程式碼的既有通過結果。測試 103 runner＝102 有斷言案例＋1 fixture；HTTP 43 checks、8 類反向案例與 Wrangler dry-run 證據維持有效。
- Git settings guard 在 local commit、archive、repo create、push、遠端回讀與結尾均 PASS；User/Machine 環境前後全部 Snapshots 相同，含 PATH hash／type／length／零 ephemeral entries 與完整 Environment-key fingerprint。未修改全域／系統 Git 或持久環境設定。

完整機器收據：上述 M2 證據目錄的 `publication-receipt.json`、`archive-receipt.json`、`publication-commands.json`、`environment-comparison.json`、`git-settings-after.log`。最終工作區三個狀態檔新增本 receipt；公開固定 snapshot 不嵌入自己的 commit／ZIP hash，不宣稱兩者 status bytes 相同。M3 仍由主代理接手。

## 以下 M1／R1 原交接紀錄（保留歷史；階段狀態由上述 M2 GO 取代）

## 最新：W19-36-R1 修正候選

2026-10-19：主代理提出的三個 protocol 阻塞已修正，R1 CLI 回歸通過，等待主代理獨立複驗。**完整 M1 尚未通過，B01–B28 全部仍為 NOT_RUN_USER_FOCUS_INCIDENT；未進 M2、未發布、未部署。** requested gpt-6.1-sol/max 與 backend identity 未獨立確認的狀態不變。

初版守衛僅檢查了部分 shape，會接受與 cues 不一致的 srtText、稀疏 textLines 及語意錯誤的 error 組合。R1 的變更限定為：

- 修改 `public/protocol.mjs`：兩層陣列都限制為原生、密集、own enumerable data indexes；拒絕洞、symbol、額外欄位、accessor、non-enumerable index 及改變 prototype。先檢查 descriptor，不執行 getter。
- 同檔驗證每列一至十行、每行 1,000 Unicode code points、有效 surrogate、無 NUL／CR／LF、無 ASCII 空白分隔行、無「數字索引後接時間外形」字幕文字組合；其他支援的控制字元與非 ASCII 空白保持可接受。
- 同檔依已驗證 cues 逐段比對 canonical 完整 srtText，並依有效 Unicode code points 計算實際輸出 UTF-8 bytes，要求完全等於 outputUtf8Bytes。輸入 byte 欄位仍檢查合法上限及輸出最多 input+1 關係；沒有重新解析原始草稿。回覆的方向、秒數與目前工作比對仍由既有 controller 負責。
- 驗證受 2,000 cues、每 cue 十行、1 MiB+1 輸出長度／byte budget 限制；逐段比對在任何輸出／byte 超界時立即拒絕，不再跑 parser／analyzeAndShiftSrt、不建立第二份完整輸出字串，也不對整份字串配置編碼 buffer。保留小型 formatTimestamp／seconds helper。
- 同檔按 TECHNICAL 的錯誤碼族群要求 exact field 與 null／非 null location；CUE_COUNT_HIGH 限 cue ordinal 2001，MISSING_CUE_SEPARATOR 指下一候選 ordinal，其他 block ordinal 與最早物理行依可達的最小 block 結構限制。
- 新增 `test/protocol.test.mjs` 的 P01–P12：三個具體反例、兩層陣列各種 descriptor／稀疏／額外欄位反例、Unicode／子集合／canonical／bytes、1 MiB／2,000 cues 真成功及全部 29 種真 core error 相容性。
- 在 `test/state.test.mjs` 新增 S26：三個反例都令 controller 安全失敗、result/resultRevision 為 null、無下載 URL、保留草稿、終止本次 Worker。
- 重新生成 `dist/protocol.mjs`，並更新本檔、TASK-ENTRY、project.json。凍結腳本比對初版來源清單，確認只有上述兩個來源檔變更及一個測試檔新增，無刪除；其餘來源及 15 個核准契約 bytes 相同。核心、controller、app、下載 URL 模組、timer 先後順序及工具鏈未改。

| R1 命令 | Exit | 結果／本輪證據檔 |
| --- | ---: | --- |
| `node --test test/protocol.test.mjs test/state.test.mjs` | 0 | 38/38；protocol-state.log。 |
| `npm test` | 0 | 88 個有斷言案例通過：43 core、12 protocol、26 state、7 tooling。Node 顯示 89 項，另 1 項為 fixture 模組自動載入；test-final.log。 |
| `npm run build` | 0 | 13 檔 dist，與 public 逐檔一致；build.log。 |
| `npm run check` | 0 | 靜態與語法通過，existingBuild=IDENTICAL；check.log。 |
| `npm run dev -- --smoke` | 0 | 平台核准的 127.0.0.1:4216 HTTP 回歸 35 checks；http-smoke.log。只關閉自身 smoke server。 |
| `node …/freeze-candidate.mjs` | 0 | 來源／產物固定清單、R1 變更範圍及契約不變比對通過；freeze.log。 |
| 既有環境 guard 與前後比較 | 0 | 前後 PASS，全部 Snapshots 完全一致；environment-before.json、environment-after.json、environment-comparison.json。 |

R1 證據是工作區歷史，不隨可攜來源包：`<LOCAL_WORKSPACE>/.runs/subtitle-shift/m1-r1-20261019-01a1520e/`。初版證據未覆蓋。原工具鏈反向測試仍適用於 bytes 未變的工具鏈，未無故重跑。

最新固定候選：

- 28 檔 `source-inventory.json` SHA-256：`43f921617c3478558b113bc39a666a017bd54274478179c3a8746bdca1c5f5a0`。
- 13 檔 `preview-inventory.json` SHA-256：`0326098381c7f70510374488259b1dd50a3a9a0e95a1b31390e02ab0bcc06404`。
- `public/protocol.mjs` 與 `dist/protocol.mjs` SHA-256：`958fec29c130a6203b67fe75941b2a1da1b2e660457816fa700400168d4d5fb1`。
- 15 檔契約 inventory hash 維持 `da567b9e7364939d30b50b40d1c7d82b3539e2b4ad65e8ed92cff2dc5fc4b927`；核心 hash 維持 `ab2489be5e87ec7ca4da601b3d54ccf19299eb2d8ad1ed2b5ca0d92d22cac9cc`。
- 雜湊算法沿用 JSON.stringify(file records)+LF 的 UTF-8 SHA-256，各檔亦獨立記 bytes/hash。HANDOFF、TASK-ENTRY、project.json 可變狀態檔仍排除於自我引用 hash。

剩餘風險／決策：R1 需主代理針對固定 bytes 複驗；CLI/fake adapters 未驗真實 browser Worker／IME／下載／BFCache／可及性／視覺／行動效能。沒有改動或補寫 UI 通過結果，也沒有改 gate。請主代理依原流程決定後續 UI 隔離與 M2 GO。本輪沒有規格衝突、依賴或新產品權限需求。

## 初版 M1 交接紀錄（由上述 R1 取代，保留歷史）

2026-10-19：**M1 CLI candidate 已備妥，等待主代理獨立審查；完整 M1 尚未通過。** B01–B28 全部為 `NOT_RUN_USER_FOCUS_INCIDENT`。本輪沒有 browser/CUA/native UI、GitHub 發布、正式候選、Cloudflare 部署、首頁整合或外部驗收。M2 未獲 GO。

requested `gpt-6.1-sol/max`；backend identity 未獨立確認，不以自述作證。`project.json` 的 threadId 未獨立記錄，維持 null。

## 交付與變更範圍

交付目標為已核准 SRT 子集合的雙語本機候選。可觀察條件是核心固定期望通過、有限且可失敗的工具鏈、同源 module Worker 與單工作狀態、完整唯讀輸出及明確下載、閉合 noindex 建置、4216 loopback HTTP、前後環境相同及可重算的候選 hashes。UI 證據仍屬必要缺口。

新增 27 個來源檔：

- `package.json`、`.gitignore`：Node 24 ESM、private、零 runtime/dev 外部依賴；未執行 npm install。
- `public/core.mjs`：精確 descriptor/schema 驗證、編碼前 UTF-16／Unicode gate、UTF-8 byte gate、ASCII SRT parser、整數毫秒平移、完整序列化及固定安全錯誤形狀。保留索引與文字；解析整份通過後才平移，無部分輸出。
- `public/worker.mjs`、`public/protocol.mjs`：同源 module Worker、單次 terminal 回覆、受限傳輸形狀與安全拒絕；沒有主執行緒解析 fallback。
- `public/controller.mjs`：單 active Worker、單調 jobId、revision／pageGeneration／Worker 實例比對、10,000 ms timeout；edit／compositionstart／composing input 當下失效，舊事件不得清除新工作。clear、navigation、pagehide、persisted pageshow 重設。
- `public/download-urls.mjs`：精確 UTF-8 Blob bytes 與 MIME adapter；八個獨立 token／30,000 ms deadline；第九次拒絕，不撤舊 URL；編輯保留既有 URL；clear／pagehide 全撤，resume／新下載前清理到期項。
- `public/app.mjs`、`public/messages.mjs`：雙語錯誤與狀態、完整 textarea value、首尾摘要、頁內確認與鍵盤焦點處理、自然使用者下載連結。組字事件不改輸入 value、不驗證組字、不搶焦點。只有初始化／確認清除／確認導航／生命週期重設會改輸入值。
- `public/index.html`、`public/en/index.html`、`public/styles.css`：獨立 zh-Hant／en 路由、家族 token、可見標籤、零 GET 表單、JS 前控制項 disabled、唯讀結果、可見支援子集合與 FAQ、匹配語言首頁連結。未觀察實際渲染。
- `public/404.html`、`public/robots.txt`、`public/_headers`：預覽與 404 noindex、嚴格 CSP，含 worker-src self／connect-src none；無 inline script、遠端資產、storage、telemetry、file input、clipboard 或 print API。
- `scripts/manifest.mjs`、`scripts/files.mjs`、`scripts/validate.mjs`：精確 13 檔白名單、路徑／檔案節點及 hardlink 拒絕、HTML／headers／來源閉合斷言。靜態掃描不等於瀏覽器安全實測。
- `scripts/check.mjs`、`scripts/build.mjs`：語法與來源 gate、確定性 dist 建置、陳舊／未知輸出拒絕；source／dist 逐檔 bytes/hash 一致。清單僅輸出 stdout，不混入資產。
- `scripts/server.mjs`、`scripts/dev.mjs`、`scripts/http-smoke.mjs`：只 bind 127.0.0.1:4216，Host 限制、GET/HEAD、精確 MIME、未知 404、禁止 method 405、錯誤 Host 421；不返回工作區。`--smoke` 使用同一 server，檢查後關閉自己建立的服務。
- `scripts/test-fixtures.mjs`、`test/core.test.mjs`、`test/state.test.mjs`、`test/tooling.test.mjs`：產生式假資料、獨立期望、offline adapters 與反向斷言。

新增 `dist/` 13 個產物，與 `public/` 逐檔相同；其精確路徑與 hashes 見下方 inventory。更新本檔、`TASK-ENTRY.md`、`project.json` 的真實狀態。六份核准規格、START-HERE、AGENTS、docs 契約、兄弟工具、首頁／看板未修改。證據僅在本輪新建的根 `.runs/subtitle-shift/m1-20261019-01a1520e/`，不屬可攜來源包。

## 設計決定

採 Product App 模式，使用者是已有 SRT、需要固定時間修正的字幕編輯者。輸入與完整結果是主要物件；方向、秒數、平移、取消與清除相鄰，格式細節與 FAQ 置於下方 disclosure。資料只在頁面記憶體，失敗保留草稿。

沿用 family paper #f3f0e8、ink #111410、surface #ffffff、acid #c8f56a、control border #60645c。UI 採既有 Geist／Segoe UI／system fallback，時間與文字工作區採既有 mono fallback；沒有載入字型。寬版於 75rem 才並排輸入／結果，48rem 以下控制項堆疊。未重新定義家族 token 意義。

```text
寬版：工具／語言導覽
      標題、工作說明、記憶體說明
      [SRT 輸入與平移控制] | [完整唯讀輸出、首尾摘要、下載]
      [格式限制與 FAQ]

窄版：工具／語言導覽
      標題、工作說明
      [SRT 輸入]
      [方向] [秒數]（窄時各自一行）
      [平移／取消／清除、狀態與錯誤]
      [完整輸出、摘要、下載]
      [格式限制與 FAQ]
```

這是來源設計紀錄；無 screenshot、320px／200%／真機／對比實測證據，不宣稱通過 visual／anti-template acceptance。

## 命令與實際結果

工作目錄：本工具資料夾。Node 24.14.0、npm 11.9.0；使用既有完整 executable 路徑，未改 PATH 或任何持久設定。

| 命令／證據 | Exit | 結果與界線 |
| --- | ---: | --- |
| `node --test test/core.test.mjs`（core-initial.log） | 0 | 初輪 43 個有斷言核心測試通過，含 C01–C40。 |
| `npm test`（test-first.log、test-final.log） | 0 | 最終 Node 顯示 76/76；其中 75 個有明確斷言的測試 = C01–C40 + 3 個核心不變式／API 測試 + S01–S25 + T01–T07；另 1 個是 Node 自動發現 fixture 模組的載入項，不算獨立行為案例。 |
| `npm run check`（check.log） | 0 | 來源／語法／13 檔白名單／雙語與 noindex／安全 headers 通過；當時 dist 尚未建立，log 如實為 NOT_YET_BUILT。之後 build 內另做 source/dist 逐檔比較。 |
| `npm run build`（build.log） | 0 | dist 13 檔、bytes/hash 與 public 相同；預覽 noindex；無 production 輸出。 |
| `npm run dev -- --smoke`（http-smoke.log） | 1 | 首次 smoke 在沙箱 loopback 連線遭 EACCES；沒有把失敗記為通過。 |
| 同命令，平台核准後（http-smoke-approved.log） | 0 | 35 個實際 loopback HTTP checks 通過：12 個可服務資產逐檔 GET/HEAD + 11 個 route／method／Host checks；13 個 emitted assets 中 _headers 不提供 HTTP。服務自行關閉，未殺既有程序。 |
| `node …/probe-toolchain.mjs`（toolchain-negative.log） | 1 | 前四個反向案例已完成；實體 hardlink 建立受沙箱 EPERM 限制後停止。四案例為未知來源、放寬 CSP、移除 noindex、陳舊輸出；對應 check/build 必須 exit 1，陳舊檔保留而非偷偷刪除。 |
| `node …/probe-hardlink.mjs`，平台核准後（hardlink-approved.log） | 0 | 只在本任務假資料副本建立 nlink=2，實際 build exit 1，符合預期。原始產品檔未 hardlink。 |
| `node …/freeze-candidate.mjs`（freeze.log） | 0 | 凍結來源、預覽及契約逐檔 inventory；public/dist 比對通過。 |
| 既有 `check-persistent-environment.ps1`，前後 | PASS | environment-before.json／environment-after.json 的全部 Snapshots 結構完全相同；最終比較命令 exit 0。初輪包裝命令誤用未設定的 LASTEXITCODE 而 exit 1，但 guard JSON 為 PASS，讀回 JSON 已確認；沒有環境漂移。 |

診斷紀錄原樣保留：`http-diagnostic.log` 的第一版 helper 相對 import 路徑錯誤已更正；`http-diagnostic-corrected.log` 明確定位為 smoke EACCES。這些失敗與最終通過證據分開保存，未覆蓋。

核心固定期望檢查 schema／getter 零呼叫／錯誤順序、毫秒與上下界、原索引及文字、BOM／CR／CRLF／ASCII 邊界、Unicode code points、UTF-16／UTF-8 caps、2,000/2,001 列、整份拒絕、序列化與無回顯。S 測試僅用 fake Worker／timer／Blob／URL adapters 驗證狀態契約。T 與 CLI 反向案例驗證工具鏈會有效失敗。它們皆不是原路徑 UI E2E、實際下載或使用者裝置證據。

## 初版固定候選（已由 R1 取代）

工作區證據完整路徑（未隨可攜包，僅本機歷史證據）：`<LOCAL_WORKSPACE>/.runs/subtitle-shift/m1-20261019-01a1520e/`。

- `source-inventory.json`：27 個來源檔的 path／bytes／SHA-256。候選 hash 為該檔精確 UTF-8 bytes（JSON.stringify 陣列 + LF）的 SHA-256：`8f290254da179054346b1570f3eab0d9dfb19c2d2422b49087b96f2a0c4d1ce7`。
- `preview-inventory.json`：13 個預覽產物，inventory SHA-256：`7abbaf46cd81a940ac70b699dec2d719d3f3db46af8d79140e5ae4e69da4add0`。
- `contract-inventory.json`：15 個既有規格／本工具契約檔的指紋，SHA-256：`da567b9e7364939d30b50b40d1c7d82b3539e2b4ad65e8ed92cff2dc5fc4b927`。這是凍結時指紋，未冒稱存在未建立的 pre-edit hash 記錄。
- 核心 `public/core.mjs` SHA-256：`ab2489be5e87ec7ca4da601b3d54ccf19299eb2d8ad1ed2b5ca0d92d22cac9cc`。
- `candidate.json` 記錄算法與範圍。HANDOFF、TASK-ENTRY、project.json 是可變狀態紀錄，刻意不加入自我引用來源 hash；已核准規格另行指紋固定。

## Windows 環境

| 範圍 | PATH registry type | 長度 | ephemeral entries | PATH SHA-256 | 完整 Environment-key SHA-256 |
| --- | --- | ---: | ---: | --- | --- |
| HKCU | ExpandString | 834 | 0 | 3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb | 3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a |
| HKLM | String | 1227 | 0 | 52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8 | a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82 |

以上前後相同；TEMP／TMP 原始值 hashes／registry types 亦記在 guard JSON 且相同。既有 duplicate PATH entries 原樣保留。未讀憑證或 token、未執行 dotnet／安裝／Git auth/config 寫入；未做來源 publication block，因此本輪沒有宣稱執行 Git settings publication guard。

## 尚未執行的必要 UI

下列每項狀態都是 **NOT_RUN_USER_FOCUS_INCIDENT**。靜態檢查或 adapter 證據只提供補充，沒有將 B gate 改成 PASS。

| 案例 | 尚缺的原路徑／裝置證據 |
| --- | --- |
| B01 | 兩語真實初始頁與 disabled／預設狀態。 |
| B02 | 真實提交、完整輸出與摘要呈現。 |
| B03 | 真實輸入變動當下清結果／停下載。 |
| B04 | 真實 Worker 舊訊息與新工作隔離。 |
| B05 | 真實取消與 Worker terminate。 |
| B06 | 瀏覽器 Worker 缺失／建立失敗／malformed／crash。 |
| B07 | 瀏覽器 2,000 列完整輸出與控制項可用。 |
| B08 | 唯讀輸出仍可選取。 |
| B09 | 真實下載檔名／MIME／bytes；fake Blob 不代表瀏覽器下載。 |
| B10 | 瀏覽器八個下載 URL 與第九次拒絕。 |
| B11 | 瀏覽器各自到期撤銷。 |
| B12 | 真實編輯保留既有下載 URL。 |
| B13 | 清除取消／確認、焦點與 URL 撤銷。 |
| B14 | 切語言取消／確認及正確獨立頁。 |
| B15 | 真實 pagehide／BFCache pageshow 清空與終止。 |
| B16 | 純鍵盤與可見焦點。 |
| B17 | 320 CSS px／200% zoom／放大文字。 |
| B18 | 真實 IME 組字；adapter 只能證明立即失效與保留原字串。 |
| B19 | 螢幕閱讀器標籤與工作／成功／錯誤宣告。 |
| B20 | 停用 JavaScript 後的瀏覽器行為。 |
| B21 | 全生命週期真實 Network／Storage；HTTP/grep 不等同實測。 |
| B22 | 真實離線與重新載入觀察。 |
| B23 | 不開 OS 視窗的實際下載檢查能力／真機；原生視窗亦未操作。 |
| B24 | 瀏覽器隔離環境中的無 clipboard／print／file input；靜態檢查僅補充。 |
| B25 | 清空、Escape、焦點還原、減少動態、非預期提交實測。 |
| B26 | 原路徑整合驗證；S17–S22 只驗 fake timer 的 URL 狀態契約。 |
| B27 | 低階手機／瀏覽器、主執行緒與 DOM 數實測。 |
| B28 | 原路徑整合驗證；S04／S10／S11 只驗 fake timer 的 10 秒／舊工作契約。 |

## 風險與主代理決策

沒有發現需改動已核准規格或引入依賴的未解衝突。仍未證明真實瀏覽器的 module Worker 相容性、native download 預設動作、IME／dialog／focus／screen reader、BFCache、行動效能、Network／Storage、視覺與縮放；這些缺口阻止完整 M1 通過。瀏覽器可能依設定顯示儲存提示，本站不宣稱檔案已儲存，也不承諾完整離線。

請主代理依上述固定 bytes 獨立驗收；UI 需先驗證真正隔離機制並另行放行。只有書面 M2 GO 後，本原功能對話才能建立正式候選與公開 GitHub。M3 部署及首頁由主代理負責。來源、hosting 與外部驗收目前均未完成，沒有擅自跨階。

## 包裝要求

原始證據與失敗歷史保留。可攜包的相對 link 只可連到實際隨包檔案；上述工作區 .runs 不是來源包內容，以純文字標示，不用其他文件冒充 bytes 相同的證據。


## 主代理 M3 正式發布收據 — 2026-10-19

此段為本工作區最新發布狀態，取代前面發布前快照的「未部署」描述；固定 GitHub commit 中的歷史文件不改寫。原功能對話完成公開來源，主代理獨立核對 Git blobs／ZIP、必要 gates，部署後驗證正式雙語 HTTP／隔離瀏覽器並更新首頁。

- PUBLIC repository：https://github.com/KYStr/glossquote-labs-subtitle-shift
- 固定來源／正式版本 commit：8cd25b8d39eb426cfbe13b6181e83b05fe87f42a
- 正式繁中：https://subtitles.glossquote.com/index.html
- 正式英文：https://subtitles.glossquote.com/en/index.html
- Cloudflare Worker version：705cd9d4-0813-4a3c-84b1-9b66656e3fe1
- 主代理 Node runner：103 子項（102個有斷言案例＋1個fixture載入）；正式HTTP：41筆。
- 雙語核心流程、320px、原始CSP、實際Network／Storage與真BFCache清空已驗；人工IME／AT／實機／原生介面等排除仍保留。字幕原生大量貼上另為 NOT_RUN_ENVIRONMENT。
- 雙語首頁 https://glossquote.com/index.html 與 https://glossquote.com/en/index.html 已有正式入口。
- 狀態：已上線、主驗通過，待本固定正式版外部覆核；不是完整外部驗收完成。根發布報告：tool-projects/BROWSER-RELEASE-2026-10-19.md；完整原始證據：.runs/browser-release-2026-10-19/。
