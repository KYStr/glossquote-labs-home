## 2026-10-13 主代理整合：AWAITING_EXTERNAL_REVIEW

新版 PUBLIC 固定來源 **024fad2beb937a1f8cb0e22fab6af490518373e7**，42 檔 source ZIP 與 Git blob 逐 bytes/SHA 相符。主代理已親讀實際 diff／核心／測試，獨立執行 44/44、check、preview／production，另讀取獨立 12 組 core 預審及核對七檔 SHA 相符；沒有直接採信 owner 宣告。

主代理 Edge 專用候選頁已補做兩語原生：2/1 權重 baseline 66.67 平手、+33.33/−33.33、完整三人首位及第二名群組、成本方向、零權重 null、無效即清舊結果、清空取消／確認。原生下載 729 bytes JSON 與固定 UTF-8 預期完全相等，schemaVersion1、三個 null、不含衍生比較資料。Native import chooser 受 Edge file URL 權限限制未跑，沒有擴權；owner URL 自動安全審查拒絕與 NOT_RUN 原紀錄保留。

dry-run／ValidateOnly／實際免費 Cloudflare 部署 exit0，version **c3ec258d-5aac-4057-bcc9-f26022795622**。正式 https://decide.glossquote.com/index.html 與 /en/index.html，15 資產／42 HTTP 檢查的 bytes、安全標頭、兩語 SEO、404、UA PASS；既有 JSON-LD 缺項單列 follow-up，不冒稱已補。正式 Edge 英文 75/62.50、差12.50及原始分子式通過。首頁原雙語入口仍適用，本批最後另做全入口核對。

證據：`.runs/outcome-batch-2026-10-13/08-{source,zip,browser,live-browser,live,deployment}.json`、`08-checks-024fad2beb93/results.json`、`decision-pre-review.md`。全 Network/Storage、實體裝置、AT、真200%zoom、主代理本輪320px與原生匯入仍 NOT_RUN；本版本等待使用者外驗，不沿用舊版外驗通過。
## U08-CONTRIBUTION-DELTA-20261013 — 目前候選（2026-10-13）

- 新版狀態：SOURCE_PUBLIC_CANDIDATE / OWNER_HANDOFF_READY / AWAITING_PRIMARY_NATIVE_REVIEW；本輪來源與封裝已核驗。未部署新版／未主驗／未外驗，不繼承舊版外部通過。產品寫入權已釋放；session16065預覽保留供主代理驗收。
- 新行為：共用scoreDocument整數N／排名，取stable前兩顯示方案；完整first／second同名次群組。單表最多8準則含方向、weight/share、各raw score／貢獻、first−second數值與較有利文字；0權重null仍未評分／未計入／0貢獻。總差取原始總N相減，rounding文案不再聲稱只差0.01。原單方案details保留；新invalid／missing／zeroW同次refresh清除舊區。匯入與清空原取消／確認流程、schemaVersion1 exact bytes不变。
- 實改public：js/core/comparison.mjs（新增）、js/app.mjs、js/i18n.mjs、index.html、en/index.html、styles/app.css；test/comparison.test.mjs與comparison-controller.test.mjs（新增）、i18n.test.mjs；PRODUCT/TECHNICAL/ACCEPTANCE/UX-SEO/TASKS/HANDOFF/docs/VERIFICATION。原schema/import/file-io/matrix/scoring/tokens/header/工程腳本均不改；dist僅既有build生成。專用證據／副本屬允許範圍，未改其他工具或共享路徑。
- 命令：focused core 15/15 exit0（補i18n新測試前）、focused controller/i18n 7/7 exit0；settled `npm.cmd test` **44/44 exit0**、check exit0、preview build exit0（15檔）、production build指定origin exit0（16檔）。900個frozen獨立oracle、12項驗收覆蓋／限度見docs/VERIFICATION。無runtime依賴／安裝／權限擴張。
- 原生阻塞：Windows computer-use自動安全審查無法可靠確定Chrome當前URL，在本工具頁面載入前停止本turn。未重試不明分頁／繞過限制；操作是否曾開出空白分頁無法確認，沒有關閉未知分頁。新版兩語原生／chooser／keyboard／320px／200%／8×8／40字／Network/Storage皆NOT_RUN；离線DOM harness不是browser PASS，舊版browser結果不套用。真手機／Firefox／screen reader／物理離線保留NOT_RUN。
- 主代理後續明確指示保留此原因與NOT_RUN後做candidate PUBLIC source-only與固定ZIP，由主代理另以可明確綁URL的專用Edge/CUA分頁做必要原生驗收，再決定正式部署。owner本輪沒有新版部署、首頁更動或讀憑證。Source publication 不代表新版live或complete。
- 預覽 `http://127.0.0.1:63055/` 與 `/en/index.html`，task-owned session16065/public；保留供主代理驗收。未停止既有media/checksum/他人程序。11個合成fixture含exact65536/65537 bytes與invalid JSON僅在 `.runs/08-decision-matrix-outcome-2026-10-13`。
- 模型設定：本工具被明確指定gpt-6.1-sol/max；沒有可用host證據確認backend身份，未宣稱切換或確認。未啟動子代理／新對話，未自行傳訊其他對話。

以下是原 MVP／正式發布歷史；U08最新固定source/ZIP/環境核驗追加於文末。

## 主代理發布收尾 — 2026-10-11

最新公開來源HEAD [e14fbb6442927f756599cb02af2ed2f737daaef0](https://github.com/KYStr/glossquote-labs-decision-matrix/commit/e14fbb6442927f756599cb02af2ed2f737daaef0) 已確認PUBLIC/remote一致；最後README/manifest-only提交未改部署產物。部署來源為 f99595e10aabab97d8ee2ab3e7a0999506b65b88，Cloudflare version 70679fb3-726a-4056-be7d-49de3a6dd7aa。首頁兩語均已納入全部10工具並通過HTTP與實際導航。詳見[本輪總表](../review-packages/2026-10-11-release/00-STATUS.md)。必要發布驗收PASS；人工NOT_RUN保留。

> **2026-10-11 最新發布狀態：PUBLIC_SOURCE_VERIFIED / LIVE_HTTP_VERIFIED / PASS_SCOPED_BROWSER。** 正式網站已上線；以下舊的 NOT_DEPLOYED、來源 commit 與整合待辦保留為歷史，現況以文末[本輪發布更新](#release-20261011)為準。人工 NOT_RUN 依該更新保留。

# 權重決策矩陣：實作交接

- 藍圖版本：1.0
- 初始日期：2026-09-23
- 產品狀態：READY_FOR_INTEGRATION（2026-10-10；人工NOT_RUN見下）
- 目前任務：T00–T08 已完成；READY_FOR_INTEGRATION（保留已授權人工 NOT_RUN）
- 下一步：原主對話審查 RELEASE-CANDIDATE，正式部署及首頁整合。
- 程式碼：繁中＋英文完整本機 MVP
- 自動測試：審查後獨立來源副本 npm.cmd test 31/31 PASS、check/build exit0。T07原始FAIL與復測仍保留。
- 瀏覽器驗收：Chromium155核心/IO/隱私/320px PASS；讀屏/Firefox/真手機/200%zoom等人工 NOT_RUN，見 VERIFICATION。
- build：PASS（preview14 / production-candidate15 靜態資產）
- 來源發布：PUBLIC，https://github.com/KYStr/glossquote-labs-decision-matrix；最新已核驗 HEAD `1e894c0ff1424b1caf271236e3bf5d4f1e0fd877`，實作 commit `774dd595a1ed9f09ac1f466abba91756aa499309`。差異僅兩份交接文件。
- Hosting：NOT_DEPLOYED_BY_THIS_CHAT；候選 decide.glossquote.com，正式部署／00-home由原主對話處理。

## 已固定的產品決定

以 PRODUCT.md 與 TECHNICAL.md 為準。不要重新詢問已有預設，也不要把未來功能加入 MVP。
目前没有套件鎖定、模型下載或速度量測紀錄；需要者在所屬研究任務建立。

## 進度表

實作開始後逐項追加 TASKS.md 的任務 ID、狀態、日期、證據連結。只記真正做過的事，不預先勾選。

| 任務 | 狀態 | 證據 |
|---|---|---|
| T00 | NOT_STARTED | 尚未執行 |
| T00–T02 | PASS | 以下各milestone紀錄及docs/RESEARCH.md |
| T03-L10N/T03/T04/T05 | PASS_WITH_MANUAL_NOT_RUN | docs/VERIFICATION.md |
| T06/T06-SEO/T07 | PASS_WITH_MANUAL_NOT_RUN | 31必要案例+404復測/preview與candidate產物 |
| T08 | IN_PROGRESS | 來源審查／發布候選 |
| T08 | SOURCE_PUBLIC_VERIFIED | 38檔／31tests／PUBLIC／774dd595，文件更新後再驗最新HEAD |
| T08 | COMPLETE / READY_FOR_INTEGRATION | 最終 PUBLIC HEAD 1e894c0f、15檔候選、環境完整快照一致；以下收尾紀錄 |

## 2026-10-10 — T00 PASS

- 需求：工程骨架／FR-12 安全預覽。新增 package.json、scripts/{serve,check,build}.mjs、public/{index.html,styles/*.css,js/app.mjs}、test/scaffold.test.mjs；TASKS.md 記新版雙語／SEO／發布準備的範圍。project.json 狀態 in-progress。
- 環境：Node v24.14.0，npm 11.9.0。`npm.cmd test` exit 0（2/2）；`npm.cmd run check` exit 0；`npm.cmd run dev` 真正瀏覽器預覽 127.0.0.1:4188，H1/noindex PASS；完成後 Ctrl+C 停止 task-owned session 74744（中斷退出 1，非測試失敗）。HTTP 回歸含 GET/HEAD、405、MIME、nosniff、CSP、穿越/雙重編碼/控制字元/非公開檔案拒絕。
- 持續環境前快照：../../.runs/decision-matrix/environment-before-20261010.json，HKCU/HKLM ephemeral 0；全程不修改持續環境，結束比較。
- 模型配置：收到 create_thread delegation 的 model=gpt-6.1-sol、thinking=max 已接受；後端實際路由無可用獨立 host 證據，未確認。未改模型，未啟動子代理／新對話。
- 範圍：根 Git status 已有 AGENTS/GlossGate/其他工具未提交工作，本對話不動根 branch/index；只寫指定工具與專用證據／發布副本。

## 2026-10-10 — T01 PASS

- 需求 FR-03–06/09–13，研究及 M02–M05 手算見 docs/RESEARCH.md。Chromium 155 真 API 可行性 PASS；合成 65536/65537 bytes、fatal UTF-8、BOM、Blob/Object URL/revoke。實際選檔/下载留 T04，Firefox/真手機人工 NOT_RUN。
- 官方規格已核對；無未決公式或 schema 選擇。`npm.cmd run check` exit 0（T01 文件不改程式；同 T00 公開資產）；無安裝或依賴。
- 下一步 T02 exact schema/JSON scanner/整數評分及增刪同步。

## 2026-10-10 — T02 PASS

- FR-01–10/M01–M17：新增 core/{schema,json-import,scoring,matrix}.mjs 及四個對應測試。exact keys、NFC/原始 UTF-16/碼點長度、禁控制字元、UI ASCII 權重、嚴格 JSON 型別、escape 還原重複 key、迭代深度 scanner、byte/UTF-8 閘門、整數平手/competition rank、null/0 權重、immutable 行列增刪、序列化 roundtrip 和注入編碼失敗皆測。
- `node --test test/schema.test.mjs test/import.test.mjs test/scoring.test.mjs test/matrix.test.mjs` 首次 exit1，15 PASS/1 FAIL：測試用 padEnd 字數錯當 UTF-8 byte數；修正為 exact65536 bytes。只復測受影響 `node --test test/import.test.mjs` exit0（3/3）；其他13項未變沿用 PASS。`npm.cmd run check` exit0。
- API研究／手算為獨立真值，沒有放寬產品邊界。下一步 T03-L10N 及 T03 工作矩陣。

## 2026-10-10 — T03-L10N PASS

- 新增 public/js/i18n.mjs、public/en/index.html、test/i18n.test.mjs；繁中 index 靜態公式/說明/FAQ/同語首頁、英文完整同等內容。19固定錯誤碼與 placeholders/key parity 通過。
- `npm.cmd test` exit0（20/20）；`npm.cmd run check` exit0。語言切換是另一頁，不在 URL/storage 傳工作內容；文案先提醒下載。
- 下一步 T03 連接 core 到雙語工作矩陣，設計 brief 存 docs/VERIFICATION.md。

## 2026-10-10 — T03 PASS（人工例外列明）

- FR-01–08/13：工作矩陣、準則/方向/權重比例、欄位錯誤、同步排序與展開貢獻、局部移除/清空確認、keyboard/native dialog fallback、安全 DOM。public/{index.html,en/index.html,styles/app.css,js/app.mjs} 與 docs/VERIFICATION.md。修正就地 title error/id、remove 名稱同步。
- `npm.cmd test` exit0（20/20）、check exit0；Chromium155 真操作 M18/21/24核心/25 320px 8×8 PASS，基準排行兩66.67/並列 PASS；200%真zoom及讀屏/Firefox/真手機人工 NOT_RUN（工具未能設zoom，使用者允許保留人工例外）。細節見 VERIFICATION。預覽只用專用4188；T04延續此 task-owned preview，完成後停止。
- 下一步 T04 本機檔案 IO/generation競態、確認取代及Object URL清理。

## 2026-10-10 — T04 PASS

- FR-09–11：file-io.mjs、app.mjs、test/file-io.test.mjs及VERIFICATION。generation取消/最新讀取，64KiB讀前+讀後，review草稿分离、原生dialog背景鎖定、單一URL/timer、固定JSON下載與失敗清理。
- `npm.cmd test` exit0（25/25）、check exit0；真正chooser→取消/壞檔/確認取代→Blob下載→strict roundtrip PASS；M19/20/22/24dialog/M27結果明細見VERIFICATION。未讀真實工作檔/憑證。OS檔案picker操作與非Chromium平台人工NOT_RUN。
- 下一步 T05有界屬性/隱私/能力缺失與無JS實測。

## 2026-10-10 — T05 PASS（人工例外列明）

- FR-02/05/10–13，新增test/boundaries.test.mjs及驗收證據。`npm.cmd test` exit0（30/30）、check exit0；真Performance資源/storage/URL/console觀察、能力缺失核心仍計算、無JS静態說明、dialog fallback focus trap PASS；明確人工NOT_RUN與限度見VERIFICATION。
- 沒有新增帳號、服務、資料持久化、依賴或偷偷下載；網路/隱私來源審查與實測兩者都有。下一步T06/T06-SEO雙語preview與production候選建置，hosting仍未部署。

## 2026-10-10 — T06/T06-SEO PASS

- 新增404/_headers/wrangler.jsonc/.gitignore/seo.test，更新check/build/serve/scaffold與README。兩模式SEO與受限静態產物、真正security/MIME headers、兩語静態公式/FAQ同語首頁準備完成。
- gate首輪29/31，scaffold/seo因i18n檔名被窄allowlist拒絕；check/build同拒，沒有發布。追加精確i18n允許項，受影響`node --test test/scaffold.test.mjs test/seo.test.mjs` exit0（3/3），check/build preview exit0；`npm.cmd run build -- --production --origin=https://decide.glossquote.com` exit0（15資產）。最終headers補充將在T07一次finalgate驗。
- dist真正EN browser與320px PASS；正式hosting/MIME/HTTPS/DNS未執行。Cloudflare技能中observability預設不覆蓋此工具無追蹤規範。下一步T07最後gate與逐項交接，再T08獨立public GitHub；不改首頁、不部署。

## 2026-10-10 — T07 PASS_WITH_MANUAL_NOT_RUN

- 最後`npm.cmd test` exit1（30/31 PASS）：新增巢狀無副檔名404文件測試發現serve原先早回純文字；回T06擁有路徑serve修正共用notFound。只復測受影響`node --test test/scaffold.test.mjs` exit0（2/2），其餘29項未變沿用PASS。原始FAIL與復測完整保留 .runs/decision-matrix/final-{test,server-retest}-20261010.log，未重寫成全綠紀錄。
- `npm.cmd run check` exit0；serve修復後check再次exit0；`npm.cmd run build` exit0（14資產），public未改，無需重跑已驗candidate SEO。再讀 build清單/MIME/headers、雙語/staticcopy，無產品工作檔。
- 真瀏覽器新增M21 filled準則保留→仍兩66.67；確認移除→剩1準則/2格/100及50分，焦點相鄰criterion-c1。404 HTML以200路徑預覽的兩語文案/正確根連結PASS（HTTP404回歸PASS；IAB404導航client阻擋，人工例外）。其他瀏覽器證據沿用未變來源。
- 持續環境快照 after-build 與 before 的完整Snapshots byte內容比對一致：HKCU ExpandString length834 PATH 3efe0b0… / EnvironmentKey3a36b632…；HKLM String length1227 PATH52d7cb0… / EnvironmentKeya0f49688…，ephemeral皆0。完整原值雜湊證據在專用.runs，不讀真實變數內容。
- 本機必要邏輯/可行性gate均PASS；人工 NOT_RUN清楚保留，不宣稱全平台/MVP所有人工case全通過。範圍限定自己的工具及指定.runs，無root index/branch改動或他人工具寫入。

## 2026-10-10 — T08 SOURCE_PUBLIC_VERIFIED

- 經審查allowlist副本38檔（154225bytes初次v2；含自身來源/必要工程隱私規格，不含根AGENTS/TASK-ENTRY/工作檔/.runs/其他工具/secret），manifest source-review-v2。原有專用發布副本不存在，建立全新獨立Git；既有history不清除。後續helper更新只覆寫明確同工具allowlist。
- 副本 `npm.cmd test` exit0（31/31）、check exit0、build exit0（14資產）證據published-copy-{test,check,build}-20261010.log。這是獨立副本驗收的必要新證據，產品輸入/程式未變；沒有重跑無意義的全平台gate。
- 既有gh登入api確認KYStr，不讀token；目標repo最初不存在。僅副本`git init/add/commit`，根Git branch/index完全未碰。staged38檔與source-review-v2精確一致後commit，`gh repo create ... --public --source . --remote origin --push` exit0。
- SOURCE：[https://github.com/KYStr/glossquote-labs-decision-matrix](https://github.com/KYStr/glossquote-labs-decision-matrix)，PUBLIC；implementation commit `774dd595a1ed9f09ac1f466abba91756aa499309`。`verify-source.mjs` exit0確認copyHEAD=remote main=GitHubAPI、Git tree38檔精確清單、逐檔Git-normalized內容匹配；evidence source-verified-v1。
- 核验器初次泛token字樣誤拒tokens.css exit1，修正為既審查清單比對後exit0；無真憑證或未審查路徑。沒有關閉人工NOT_RUN；原主對話收到READY_FOR_INTEGRATION，尚未live、不寫首頁、不部署、不讀部署token。
- docs/RELEASE-CANDIDATE與VERIFICATION更新來源核驗與候選狀態，後續documentation-only commit；最後remote HEAD及環境快照再追加。

## 2026-10-10 — T08 COMPLETE / READY_FOR_INTEGRATION

- 本次交付：繁中＋英文 MVP、嚴格本機 JSON、可解釋整數評分與平手排序、兩種 SEO 建置、獨立公開來源及正式候選。必要驗收已完成：獨立副本 31/31 tests、check、preview build exit0；production-candidate build exit0（15 靜態資產）。人工 NOT_RUN 維持 [docs/VERIFICATION.md](docs/VERIFICATION.md) 原紀錄，沒有轉成 PASS。正式 hosting／首頁整合不是本對話交付範圍。
- 最後文件更新只 staged `docs/RELEASE-CANDIDATE.md`、`docs/VERIFICATION.md`，檢查清單相符後 commit/push exit0。最新 PUBLIC 遠端 HEAD：[`1e894c0ff1424b1caf271236e3bf5d4f1e0fd877`](https://github.com/KYStr/glossquote-labs-decision-matrix/commit/1e894c0ff1424b1caf271236e3bf5d4f1e0fd877)；copy local HEAD = ls-remote main = GitHub API，Git tree 38 檔與審查清單相符、逐檔 Git 換行正規化內容一致、發布副本 clean。證據：[source-verified-final-20261010.json](../../.runs/decision-matrix/source-verified-final-20261010.json)。兩文件以外程式／測試／設定未變，沿用已通過的驗收結果。
- 保存正式候選：[production-candidate-20261010](../../.runs/decision-matrix/production-candidate-20261010/)，來自上述已核驗發布副本，origin 為 `https://decide.glossquote.com`。命令／15 檔 bytes 與 SHA-256：[production-candidate-manifest-20261010.json](../../.runs/decision-matrix/production-candidate-manifest-20261010.json)；建置 log：[published-copy-candidate-build-20261010.log](../../.runs/decision-matrix/published-copy-candidate-build-20261010.log)。孵化器工具 dist 保留 preview/noindex；候選建置與保存不會部署。
- 最終合成基準畫面：兩方案皆並列第 1／66.67，展開原始分子與貢獻；[matrix-result-preview-20261010.jpg](../../.runs/decision-matrix/matrix-result-preview-20261010.jpg)。只用本工具合成 JSON，沒有真實個人檔案。task-owned dist 預覽 session 92747 已 Ctrl+C 結束（中斷 exit1，非驗收失敗）；先前專用 research/audit/npm preview 也已結束，未停止別人的程序。viewport override 已還原。
- 結束再執行 persistent-environment guard，exit0：[environment-final-20261010.json](../../.runs/decision-matrix/environment-final-20261010.json) 與 before 的完整 Snapshots 相同（包括 Environment-key／TEMP／TMP）。HKCU ExpandString／PATH length834／SHA-256 `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`／Environment-key `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`；HKLM String／length1227／PATH `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`／Environment-key `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`；ephemeral count 皆0。原有重複 entries 未修改。
- 範圍收尾：根 Git 的既有 dirty paths 與開始時一致；只寫此工具／專用 .runs／獨立發布副本，未動根 branch/index、00-home、其他工具、GlossGate 或 040141.xyz。未啟動子代理／新對話，未讀憑證，未新增套件或持續環境設定。本文件早段「原主對話收到 READY_FOR_INTEGRATION」代表候選的可交接狀態；本對話沒有透過傳訊工具送出或確認原主對話已讀，正式交接以本次最終回覆及候選文件為準。
- 下一步由原主對話完成獨立審查、既有授權的免費正式 hosting／live 驗證及雙語首頁 catalog 整合。來源已公開；hosting **NOT_DEPLOYED_BY_THIS_CHAT**。不因 source publication 宣稱 live release 完成。

## 每次交接追加格式

~~~text
日期／模型：
任務 ID：
需求 ID：
變更檔案：
命令與退出碼：
瀏覽器／作業系統：
人工案例與 PASS / FAIL / NOT_RUN：
剩餘問題：
下一步：
~~~

## 發現規格矛盾時

記錄兩份文件的位置、具體矛盾、保守處理方式與需要的決定。未解決前不放寬資料、安全或發布邊界。


<a id="release-20261011"></a>

## 2026-10-11 正式發布更新

- 狀態：**PUBLIC_SOURCE_VERIFIED / LIVE_HTTP_VERIFIED / PASS_SCOPED_BROWSER**。下列證據取自已保存的主代理發布紀錄；本次文件更新未重跑 Git、部署、HTTP 或瀏覽器測試。家族首頁整合結果由主對話發布報告另行記錄。
- 正式網址：[繁體中文](https://decide.glossquote.com/index.html)、[English](https://decide.glossquote.com/en/index.html)。
- 公開來源：[KYStr/glossquote-labs-decision-matrix](https://github.com/KYStr/glossquote-labs-decision-matrix)，**PUBLIC**；verified source commit／remote HEAD 均為 [f99595e10aabab97d8ee2ab3e7a0999506b65b88](https://github.com/KYStr/glossquote-labs-decision-matrix/commit/f99595e10aabab97d8ee2ab3e7a0999506b65b88)（2026-10-11T06:22:15.664Z）；[來源發布 JSON](../../.runs/release-2026-10-11/decide-source-publication.json)。
- Cloudflare：正式 host decide.glossquote.com，部署 exit code **0**；version **70679fb3-726a-4056-be7d-49de3a6dd7aa**（2026-10-11T06:22:23.2179709Z）；[部署 JSON](../../.runs/release-2026-10-11/decide-deployment.json)。
- HTTP：**PASS_HTTP**（2026-10-11T06:23:22.009Z）。14 個發布資產的 GET／HEAD 均為 200，GET 精確位元組／SHA256 與發布 dist 對應；HTTPS、CSP/MIME、canonical/alternates、robots/sitemap 檢查通過。兩個不存在路徑為真 404；兩語 browser User-Agent 頁面均為 200 且 SHA256 對應。共 32 筆 HTTP 紀錄；[正式 HTTP JSON](../../.runs/release-2026-10-11/decide-live.json)。
- 瀏覽器：**PASS_SCOPED_BROWSER**（2026-10-11T06:31:45.136Z）。未填四格時阻擋排名；英文同分 50.00、成本方向 100.00／0.00 與零權重阻擋成功；繁中顯示並列 100.00。原生下載 JSON schemaVersion 1，兩方案各保留兩個 null（共四個 null），未將未填評分改成 0。 [本輪瀏覽器 JSON](../../.runs/release-2026-10-11/decide-browser.json)。
- 剩餘人工 **NOT_RUN**：完整 Network/Storage、跨瀏覽器／真實裝置、screen reader、物理斷網；原有 Firefox、實體手機／觸控、真正 browser zoom 200%、OS filepicker 全鍵盤與 IAB 404 狀態導航例外仍保留。HTTP 真 404 已通過。 本輪 scoped browser 與靜態 HTTP 驗收不構成完整封包／Storage 稽核。
- 原有本機 MVP gate、產品限制與歷史命令結果維持上方歷史紀錄；本輪新證據取代其舊正式 hosting／live HTTP 待驗狀態，沒有把人工未跑項目改標 PASS。所有時間為 UTC。

## U08 固定候選交接 — 2026-10-13

- PUBLIC：[KYStr/glossquote-labs-decision-matrix](https://github.com/KYStr/glossquote-labs-decision-matrix)，固定 source commit [`024fad2beb937a1f8cb0e22fab6af490518373e7`](https://github.com/KYStr/glossquote-labs-decision-matrix/commit/024fad2beb937a1f8cb0e22fab6af490518373e7)。copy HEAD／Git ls-remote main／GitHub commit API相同、visibility PUBLIC、發布副本clean；base e14fbb6442927f756599cb02af2ed2f737daaef0。這是source-only新候選；本輪未正式部署／改首頁，主代理原生驗收後再發布。
- 實際公開diff：14檔，包含新增comparison／2測試／UX-SEO，6項public資產、i18n測試和5項current規格／驗收文件；未帶根AGENTS、TASKS、HANDOFF、OUTCOME派工／thread metadata、.runs、dist、node_modules或憑證。完整樹42檔，固定ZIP每檔 bytes／Git blob／SHA256：[u08-source-024fad2beb937a1f8cb0e22fab6af490518373e7.manifest.json](../../.runs/08-decision-matrix-outcome-2026-10-13/u08-source-024fad2beb937a1f8cb0e22fab6af490518373e7.manifest.json)。
- [固定 commit source ZIP](../../.runs/08-decision-matrix-outcome-2026-10-13/u08-source-024fad2beb937a1f8cb0e22fab6af490518373e7.zip)：98,874 bytes；SHA256 `b5740422b38ca97d62d9521f75238dd4bf270055c101766d6a33127a9dcc6140`。實際解碼ZIP的42檔與逐Git blob精確bytes／hash一致，無僅按工作副本／換行相等就宣稱通過。manifest不進自身commit，沒有循環hash。
- 核驗器的兩次不同修正有保留證據：首次staged diff check exit1，抓到ACCEPTANCE／VERIFICATION兩處EOF多空行；只修允許文件格式後exit0。複本原RELEASE-CANDIDATE與root歷史不同，修復本次不必要的copy，保留原公開HEAD該檔，不改root歷史。其次初次ZIP被Windows Git autocrlf轉CRLF，exact blob驗證FAIL；.NET独立解讀確認每個差異正規化後一致。保留 owner-archive-attempt1-crlf.zip／owner-archive-attempt1.json，再以單次 `git -c core.autocrlf=false -c core.eol=lf archive ...` 重建，42檔精確驗證PASS。未改持續Git或Windows環境，也未重跑已通過的產品gate。
- settled gate均exit0：test44/44、check、preview15、production16；有意義的publishing staged `git diff --check` exit0、根工具scope diff check exit0。測試／新程式未再變，只有上述doc EOF整理與本機交接追加。來源審查／逐檔原前後SHA：[owner-owned-file-diff-final.json](../../.runs/08-decision-matrix-outcome-2026-10-13/owner-owned-file-diff-final.json)，16個本工具allowed改動，19個原input檔案bytes不變；公開14檔diff：[owner-source-diff.patch](../../.runs/08-decision-matrix-outcome-2026-10-13/owner-source-diff.patch)。
- loopback三個HTTP checks（兩語HTML、新comparison JS）：200／原public精確bytes、JS MIME與CSP connect-none PASS；[owner-preview-http.json](../../.runs/08-decision-matrix-outcome-2026-10-13/owner-preview-http.json)。這只是HTTP存活，不是native browser PASS。16個候選dist資產hash：[owner-production-assets.json](../../.runs/08-decision-matrix-outcome-2026-10-13/owner-production-assets.json)。預覽仍為public／noindex：`http://127.0.0.1:63055/`、`http://127.0.0.1:63055/en/index.html`；task-owned session16065保留，不動其他程序。
- 環境guard before/final皆exit0、完整Snapshots相等（包括TEMP/TMP與全Environment-key）；[owner-environment-final.json](../../.runs/08-decision-matrix-outcome-2026-10-13/owner-environment-final.json)。HKCU ExpandString／PATH834／ephemeral0／PATH SHA `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`／Environment-key `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a`；HKLM String／1227／ephemeral0／PATH `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`／Environment-key `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82`。未使用dotnet、安裝、新runtime依賴、憑證或持續設定。
- 剩餘：新原生兩語基準／tie／cost／zero-weight／edit清理／JSON chooser／keyboard／320px／200%／8×8／40字，以及Network/Storage／物理offline／screen reader／跨瀏覽器皆owner NOT_RUN。主代理已收悉自動URL審查阻塞並負責明確URL新分頁獨立驗證；本輪沒有新截圖或fake browser通過。若主驗需修正，回本原owner；新版待主驗／正式live／外驗，不能稱version complete。
- 交接：本輪U08指定owner milestone已交付固定候選，**產品寫入權釋放**。不開後續功能、不發其他對話、不再委派；模型請求Sol/max／backend identity未確認的界線維持。根Git branch/index及其他工具／共享status／homepage都未寫。

