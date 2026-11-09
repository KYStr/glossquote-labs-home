# 行李清單與重量試算任務證據

狀態：SPEC_ONLY；以下為 append-only 記錄區。不要覆寫已追加紀錄，不得把規格案例當測試結果。

## TASK-W22-M1-T00：規格任務與初始狀態
- 目標：本機可操作雙語 packing-list MVP；含重量不完整下限邏輯、schema v1 JSON preview/import/export、測試、loopback/check/build。
- allowed paths：public/**；scripts/serve.mjs/check.mjs/build.mjs/validation.mjs 與必要 scripts/*.mjs；test/**；package.json；.gitignore；本工具 dist/**。狀態可更新 HANDOFF/project.json/START-HERE/docs/RELEASE-CANDIDATE，TASK-ENTRY append-only。
- acceptance：ACCEPTANCE A01–A40、B01–B11；B01–B08、B11 必驗；320px 必測；200% zoom、Network/Storage 依能力單獨標註。
- stop：同路徑有人寫、scope/規格衝突、未知環境 drift、需新權限/成本/依賴、兩輪同錯無進展。

## T00 / M1

- 執行狀態：NOT_RUN
- Node 版本 / 命令 / exit code：NOT_RUN
- 修改檔案與固定 manifest：尚無
- 自動測試：NOT_RUN
- 瀏覽器 B01–B11：NOT_RUN
- Windows 前後 guard：NOT_RUN
- 未驗項、風險、停止原因：實作尚未開始
- 凍結 commit / owner 狀態：無；等待 feature chat 建立

## 後續 append-only

每次新任務另加日期、任務 ID、固定輸入 SHA、允許檔案、實際命令/結果、NOT_RUN、風險及交接狀態。不得從「已寫文件」推導產品 PASS。

## 2026-10-13 / TASK-W22-M1-T00 / M1 實作與凍結

- deliverable：本機可操作繁中/英文靜態 MVP；observable acceptance 為 A01–A40、必要 toolchain、npm test/check/build、B01–B08/B11 真瀏覽器、320px 與原生檔案流程、Windows environment 不變。M2/M3 不屬本輪。
- allowed paths：依原始 T00/M1 allowlist；只新增 public/**、5 scripts、3 tests、package.json/.gitignore/dist，更新允許的 4 狀態文件並追加本紀錄。孵化器根專用 evidence 路徑為 .runs/packing-list/m1-2026-10-13-0113a/，沒有父級索引/首頁/其他工具修改。DISPATCH 保留。
- 功能 threadId 01a133ab-fe72-73f2-9590-7a99a9d8658a / local。DISPATCH 接受 gpt-6.1-sol/max 設定請求；backend unconfirmed。完整發布及外驗修正目標已 create_goal 成功，active，M1 不標 complete。
- Node v24.14.0 / npm 11.9.0。實際 literal 命令：`& 'C:/Program Files/nodejs/npm.cmd' test`、`& 'C:/Program Files/nodejs/npm.cmd' run check`、`& 'C:/Program Files/nodejs/npm.cmd' run build`；cwd 本工具根；最終 exit 均 0。57/57 tests，0 fail/skip。commands.json 與 final-test/final-run-check/final-run-build.log 保留原始輸出。
- A01–A40 PASS（純 core/state + toolchain）；未知重量維持 null、無部分摘要/匯入、最壞 989990100g、exact descriptors/getter 0 calls、dense arrays、128KiB、fatal UTF-8、固定備份 roundtrip、stale revision/request ID 與 URL cleanup。Node mocks 只證明受測 API 行為，並非 native download/filepicker 證據。
- B01–B08、B11：兩語實際 Chromium 分頁通過。衣物2×350g+充電器1×200g=900g，row1/2、pieces2/3；已知1200g+未知列，limit1500不能判、limit1000只至少超200g。篩選摘要維持完整清單；範例取消保留、確認800g；實際下載後真 FileChooser 選回、preview不覆蓋、取消不變、確認完整替换、edit立即失效。僅鍵盤新增/輸入/勾選/刪除/Tab/Escape及回焦。刷新前醒目警告、reload後清空。
- B08：實際 viewport override 320×760 CSS px；innerWidth320，clientWidth/scrollWidth305（15px scrollbar），中文/英文無頁面水平溢出。33-unit 數值完整保留且 visible error/summary removed/download disabled。文字名稱含 img/script 字面值而無執行節點；非法備份未知 key 優先且未回顯合成 canary。
- B09 實際200%zoom、B10完整DevTools Network/Storage、實體手機/虛擬鍵盤/螢幕閱讀器 NOT_RUN：工具無對應完整能力；未用 CSS zoom、320px 或 source scan 替代。
- preview：requested4202/assigned4202，127.0.0.1，PID82156，http://127.0.0.1:4202/index.html 與 /en/index.html，保留運行；port fallback 實測以 task-owned disposable listener 完成、沒碰既有服務。
- Windows 前/後 guard PASS；整份 Snapshots equality PASS_UNCHANGED。User PATH ExpandString長834/hash3efe0b0e…，Machine String長1227/hash52d7cb0c…，ephemeral均0；完整 Environment-key fingerprints/原始 hashes/types/lengths/entry counts/TEMP/TMP hashes 見 environment-before/after/comparison.json。沒有持久環境改動。
- 固定 code manifest digest：387d84fb93cad85fa09f6ff35c3a6c0e9de8516acfc19ed5250fe68fa18ab286，17 files/101011 bytes；runtime/dist digest：dbad9efa4638a8f75514773a1803f86d22ac119129fadcc9d313c3b6976334c6，各7 files/56553 bytes，逐檔相等。最終 source manifest 在 evidence，含更新完成的狀態紀錄；reviewed-source 按 bytes/hash 驗證。無 commit（M1 禁根Git），無 production ZIP。
- 視覺流程：frontend-design 單一流程，繼承 DESIGN-SYSTEM Product App tokens；工作畫布最大，桌面同列/手機直排、摘要下方、備份相鄰、dialog可取消。桌面與320px两語實渲染檢查後修正 stale status 与英文複數，affected view 重看；沒有第二設計方案或額外套件。
- 已凍結，待主代理獨立M1驗收/正式M2放行；GitHub/Cloudflare/首頁/外驗均 NOT_RUN。規格原始 SPEC_ONLY 表格保留為任務輸入，不改成歷史PASS。無停止 blocker；手動未驗依已允許例外留實記，完整產品仍未發布/完成。

## 2026-10-13 / PACK-M1-R1 / 主驗必要修正

- 來源：主代理 HR22-M1-R1 主驗明確派回；父證據 .runs/handoff-release-2026-10-13/22-import-priority-repro.{mjs,json}、22-readonly-review.md 只讀。基準 source digest 368e690fa79b3384f0b9f6155cf2953c5a904efa8274e1f216d47e9ae8a26a48，原固定來源/證據保留。
- 本輪 deliverable：修正 BackupV1 rows 的 ID/value 優先序並新增回歸，受影響 native import 流程再驗，必要 npm test/check/build 後重新凍結。M2未放行。不委派、無其他工具/父級/rootGit/部署/憑證/持久環境改動。
- 只修改 public/js/core/packing-list.mjs、test/import-export.test.mjs、generated dist/core，以及允許的 HANDOFF/project.json/START-HERE/docs/RELEASE-CANDIDATE/TASK-ENTRY append；獨立 evidence為 .runs/packing-list/m1-r1-20261013/。沒有修改 TECHNICAL 或降低 gate，採其明確 id/name/quantity/unitWeightGrams/packed 次序。
- 自身 before repro 真實返回 CONTROL_CHARACTER，after 返回 {ok:false,code:DUPLICATE_ID}。recordShape 維持先驗；ID檢查與查重完成後才驗 name 型別及後續值。3 項新測試包含 primary literal repro、12種duplicate+later-invalid、root/row額外欄位與全部缺欄/列次序、invalid candidate不替換。
- 最終 literal命令 `& 'C:/Program Files/nodejs/npm.cmd' test`、`run check`、`run build`，cwd 本工具；Nodev24.14.0/npm11.9.0，60/60 tests（原57+3）、0 fail/skip、3命令exit0。repro命令 `& 'C:/Program Files/nodejs/node.exe' '../../../.runs/packing-list/m1-r1-20261013/import-priority-repro.mjs' repro-after.json` 以 evidence記錄的實際absolute路徑為準；回傳PASS。commands.json/final-*.log及repro-before/after保留。
- 雙語真 Chromium FileChooser（合成本機UTF-8 JSON，無mock）：duplicate+C0只顯示DUPLICATE_ID固定翻譯，800g原清單/rows完全相同、confirm hidden；duplicate+extra仍UNKNOWN_FIELD。valid900g preview保持原800g、cancel保持、confirm900g/row1/2/pieces2/3；edit weight201使901g、撤preview，重複ID失敗不覆蓋901g。BadName未回顯。AX、PNG、browser-observations.json保留。舊預覽分頁保留，R1用新獨立測試tab。
- 不受影響的UI/CSS/app/i18n/state/toolchain字節不變，原M1對應B證據重用；B09實際200%zoom、B10完整Network/Storage、實體手機/虛擬鍵盤/螢幕閱讀器仍NOT_RUN。未以source scan或mock提升狀態。
- Windows前後guard PASS、全Snapshots PASS_UNCHANGED，PATH hashes/type/length/entry count/ephemeral count及完整Environment-key/TEMP/TMPhash全相同。自有preview PID82156/4202不restart；沒有啟停他人服務。
- R1 code digest 1e56d7257093fd9993ba88be6a0e435331645edf6198fe5e20cb08e28178a310（17檔104005bytes）；runtime/dist digest 78db8ea2db30c6cca515459c47cdf88fc0f5bf20fb9120672760f5af6e0b8474（7檔56587bytes，各檔相同）；最終source見R1 source-manifest。reviewed-source逐byte/hash核對，actualdiff相對原T00保存。
- R1已凍結待主代理M1複驗；尚未M2/public GitHub/Cloudflare/首頁/外驗。模型請求gpt-6.1-sol/max，backend未確認；get_goal仍為先前blocked，無resume tool且未虛報complete。完整目標保留，主代理回傳正式M2放行或具體修正後續行。

### R1 命令文字勘誤（同輪追加，不覆寫紀錄）

上行記錄中的相對路徑 repro 命令是抄寫示意，未實際執行；實際 literal 命令是 `& 'C:/Program Files/nodejs/node.exe' '<LOCAL_WORKSPACE>/.runs/packing-list/m1-r1-20261013/import-priority-repro.mjs' repro-before.json` 與同命令的 `repro-after.json` 參數，cwd 均本工具根、exit0。語義結果before為FAIL_REPRODUCED/CONTROL_CHARACTER，after為PASS/DUPLICATE_ID；不將before的exit0解釋成驗收通過。

## 2026-10-13 / PACK-M2-T01 / 主驗放行後production及PUBLIC source

- 主代理正式派回M2，已讀22-primary-m1/ACCEPTANCE/result/browser與22-r1-primary-repro：固定R1 source1848ebd9…，60tests/check/build0與獨立DUPLICATE_ID oracle PASS。主端原生File permission拒絕NOT_RUN、owner IAB歸屬保留。新增GitSafety與guard契約已讀，沒有代替主代理M3。
- 本輪observable deliverable：production SEO/headers/真正404/隱私配置、六gates、固定Gitblob ZIP安全解壓重建、PUBLIC remote SHA与guards。只改own M2 release/scripts/tests/package/wrangler/robots/allowed metadata；core/app/state/i18n/styles与原HTML bytes全保持。既有4202進程不restart、原進度不覆寫，父級/首頁/部署/憑證不碰。
- 生成12檔dist-production，origin allowlist packing.glossquote.com，canonical/hreflang/x-default/OG/JSONLD/robots/sitemap、兩語home back、two404、exact.mjs MIME/CSP JSON-LD hashes。only新preview robots Disallow:/；原7public byte-pinned/noindex，fresh clone可服務robots。Cloudflareconfig static-only 404-page/none，metrics/logs/traces/logpush/instrumentationfalse，workersdev/previewURLsfalse。
- Node24.14.0/npm11.9.0；workspace與zip-rebuild均實際執行npm test68/68（60+8release）、check、build、build:production、check:production、check:release，12次命令全exit0。literal可執行路徑、cwd/args/exit/log見workspace-commands與zip-rebuild-commands；未安裝依賴。current/rebuilt production manifest逐檔相同9b070df077b19d759d558e406e759f5017b8412678856c54a67c7420621f6eec（12檔61451bytes）。
- Native IABproduction adapter56669/PID2672：雙語實際DOM計算，known1200+unknown/1500不within，匹配canonical/homeHref；真Blob下載后English FileChooser preview/correct confirm，unknown/null未當0；missing頁面已看，獨立HTTP兩語404/MIMEtext/html。不是Cloudflarelive，完整NetworkStorage/200%zoom/deviceAT/WranglerCLI仍NOT_RUN。
- 只在reviewed-copy以per-commandgit-c禁autocrlf/hooks/globalattributes/fsmonitor/signing並用既有官方gh credentialhelper。沒有auth setup-git/login/refresh/token/global/system寫入。git version2.40.0.windows.1、gh2.96.0。PUBLIC repo KYStr/glossquote-labs-packing-list，defaultmain、remoteHEAD/main/API SHA都為02e9bc9a39ed12530e157806e49283455eb84632，非forcepush。source白名單38檔/217106bytes，不含privatehandoff/chatIDs/.runs/dist/cache/downloads/credentials。生成公開README，不自行加LICENSE。
- git archive固定ZIP91906bytes、sha48474e34fb48825733c600cadb709b77ba21b98c7749ac9c488404ca9f4a2bca；絕對路徑在archive-verification.json。所有38gitblobs bytes/SHA/CRC/mode/paths與EOCDcommit精確比對，安全解壓新zip-rebuild，未刪或覆蓋未知檔。ZIP及兩端gates PASS。
- Git-settings-before與publish-before兩次capture后verify均PASS_UNCHANGED；Windows完整Snapshots同樣前后PASS_UNCHANGED。沒有持久环境或任何凭證读取。
- evidence専用 .runs/github-publish/glossquote-labs-packing-list/m2-20261013-01/：commands/log、public verification、source/production/workspace manifests、actual diff、Git/Envguards、browser/PNG、本機HTTP、ZIP/blob核對及三種分開固定副本。公開sourcepackage digest5706fc2e19f0ca30d8f73eb263f90f88ddc06da6c02968c7528238aca013b56a；code26檔146811bytes digest5a49ff743bce7b9b64e7a14e2032b9d80122ffa63d5546a284462fe10346ae24；preview8檔56613bytes digest746a666dee00cf16e424be128e2b457ef3d536588f780ce95a8da69c116b08ba。
- M2已凍結/發布來源，待主代理M2/M3；Cloudflare live、雙語首頁、外驗仍NOT_RUN，不mark完整goal complete。模型配置請求不變、backend未確認。已讀Cloudflareworkers-best-practices作配置核對，按高優先使用者privacy規範保持觀测關，官方資料在RELEASE參考鏈接。

