# 訂單揀貨與裝箱單 交接
目前狀態：**B20-44-M2B-R03 公開來源更新與遠端乾淨 clone 驗證 PASS；正式站尚未部署，待主代理後續驗收與 release。** F03 清理與入口轉址已包含在 [公開 repository](https://github.com/KYStr/glossquote-labs-order-picklist) 的 main／remote HEAD `58875852c076f3f156918bc565885f6bbf5206b6`。發佈副本與匿名乾淨 clone 都通過73/73、五項必要離線命令，69份 tracked 檔與16份重建產物逐 byte／SHA核對一致。POSIX 整合版及原10項人工／browser NOT_RUN 保留。最新 [publication-receipt.json](evidence/m2b-r03/publication-receipt.json)、[tracked-inventory.json](evidence/m2b-r03/tracked-inventory.json) 與 [remote-verification.json](evidence/m2b-r03/remote-verification.json) 已固定。下列各輪描述屬當時狀態；首發與F03／R02歷史證據皆保留原 bytes。

狀態：**B20-44-M2B 獨立 PUBLIC 原始碼發佈與遠端逐檔驗證 PASS；正式站尚未部署，產品仍待後續 release 與外部驗收。** 原始碼為 [KYStr/glossquote-labs-order-picklist](https://github.com/KYStr/glossquote-labs-order-picklist)，default branch `main`，source commit／remote HEAD `9d715f17686e95f76ca97192b7eca79dd72fc3a4`。主代理既有 browser 主流程30 PASS、lifecycle2兩語2 PASS，0 FAIL／禁止事件；10 NOT_RUN 保留。本輪獨立發佈副本的21/21 release tests、check/build:release/check:release 通過，69個公開檔案經匿名 fetch 逐 byte／SHA-256 核對。詳見 [M2B publication](evidence/m2b/publication.json)。[M2A candidate](evidence/m2a/candidate.json)、[M1B candidate](evidence/m1b/candidate.json) 與 [R01 candidate](evidence/m1/r01/candidate.json) 均維持固定歷史 bytes；以下各里程碑描述為當時狀態。

## T00（2026-10-23）

建立零依賴 ESM package、封閉 public allowlist、check/build、未啟動的 loopback-only dev 腳本、兩語頁骨架、TASK-ENTRY。實際 `node scripts/check.mjs` exit 0（4 assets）；Node v24.14.0。Environment guard 的前置快照 PASS，位於 evidence/m1/environment-before.json；長測試後仍須比較。未啟動 server/browser。後續核心／介面尚未驗收。

## T10（2026-10-23）

新增 strict CSV parser、固定錯碼、不同四欄映射、精確 required values 與 ASCII quantity / BigInt 驗證。`node --test test/csv.test.mjs test/orders.test.mjs` exit 0，17 tests / 17 pass，證據 t10-tests.tap、t10-result.json。含 A01–A08、A13–A15 及多行 logical record、fatal UTF-8、各 cap 真實邊界。未做 browser。

## T20（2026-10-23）

完成 first-seen Map 彙總、不同品名整批拒絕、重複行加總、BigInt 十億上限、schemaVersion 1 與固定名稱 TXT/JSON 輸出。`npm test` exit 0，30 tests / 30 pass（t20-tests.txt、t20-result.json）。包含實際 serializer 合計恰好 8,388,608 bytes 可輸出、+1 byte 拒絕。A17 僅確認惡意字串核心 round-trip；真 DOM/browser 仍未驗。A18 匯出 checked snapshot 已驗，實際 checkbox UI 待主驗。

## T30（2026-10-23）

建立完整繁中 index.html／英文 en/index.html、同語系首頁／語言切換、noindex/nofollow、格式說明與 FAQ；來源兩列樣本、四欄映射、總表、逐單品項 checkbox、個別核對進度與固定 TXT/JSON 下載。source-derived 值經 textContent，無外部資源。`npm run check` exit 0、`npm run build` exit 0；13 個 preview assets，證據 t30-*.txt／t30-result.json。工作區及 CSS 尚未在真瀏覽器檢視，全部 browser gate 維持 NOT_RUN_USER_FOCUS_INCIDENT。

## T40 第一輪失敗記錄

`npm test` exit 1，44 tests / 43 pass / 1 fail（t40-tests.txt）。新增的靜態資源掃描把 JS `revokeObjectURL(...)` 的尾端誤認為 CSS `url(...)`。修正為僅在 CSS 檔掃描 CSS resource 語法，並加入允許 URL revoke／拒絕 CSS url 的反例。沒有改掉或刪除第一輪失敗證據；check/build 在該輪因前置測試失敗未執行。

## T40 修復與驗證

受影響的 `node --test test/tooling.test.mjs` exit 0，3/3 pass，重用未變更的 41 個核心／生命週期通過結果。`npm run check` exit 0；`npm run build` exit 0（t40-tooling-repair.txt、t40-check.txt、t40-build.txt、t40-result.json）。來源/映射/run/reset 以 generation + AbortController 保護，聚合每 100 列 yield；兩個輸出先驗合計 bytes 才建 Blob；重匯出、核對變更、來源/映射變更、reset/pagehide revoke URL。environment-after-t40.json 與 before 所有快照欄位相同。T50 將對最終輸入重跑完整命令。

下表為 M1 當時的歷史狀態；目前主驗與未驗範圍以本頁 M2A 章節為準。

|範圍|狀態|
|---|---|
|T00–T50 初版離線 Node／check／build|歷史 46/46 PASS；初版凍結已撤回|
|R01 修正／離線 Node／check／build|PASS（49/49 tests；commands exit 0），待主驗|
|真瀏覽器/原生/真機|NOT_RUN_USER_FOCUS_INCIDENT|
|GitHub|NOT_PUBLISHED（M1 不發布）|
|Cloudflare／正式網址／首頁|NOT_DEPLOYED（M1 不部署）|
|外部驗收|NOT_RUN|

每輪記錄需求、實際檔案、差異、命令與 exit、固定檔案 bytes/SHA-256、未驗與已知限制；產品 source commit、reviewed commit、released commit 分開。不得刪歷史失敗或把缺口改 PASS。使用者接受保留手動待驗不等於豁免必要 gate。

## T50 初版候選歷史（2026-10-23，Asia/Taipei；R01 已撤回該凍結）

最終實際命令（Node v24.14.0，零 dependencies，未 npm install）：

|命令|exit|結果／證據|
|---|---:|---|
|`npm test`|0|46 tests、46 pass、0 fail／skip／cancel；[final-tests.txt](evidence/m1/final-tests.txt)|
|`npm run check`|0|13 public assets、scripts/public ESM syntax、兩語文件／連結／labels／preview noindex、安全靜態掃描；[final-check.txt](evidence/m1/final-check.txt)|
|`npm run build`|0|13 assets 複製到 dist，逐 byte 與 public 相同；未知/stale 檔拒絕且不刪除；[final-build.txt](evidence/m1/final-build.txt)|

實作差異：新增 package.json、.gitignore、TASK-ENTRY.md；public/ 的兩語完整工作區、CSS、copy/view/app 與 csv/orders/export/errors/session 五個核心模組；scripts/ 的 assets/audit/check/build/serve/pages/candidate-evidence；test/ 的六個測試檔與小型 DOM model helper；更新本 HANDOFF，產出 dist 與本工具 evidence/m1。未修改原有其他 13 份規格／契約、兄弟工具、共享首頁／看板或根目錄。進入時本工具已是 Git untracked 資料夾，沒有既存 tracked diff 可作基線；以封閉來源 manifest 與本段實際檔案範圍交接，未 commit。

覆蓋 CSV 的字串／quoted multiline／record index、caps、mapping、數量、first-seen 彙總、品名衝突、十億上限、schema 與 8 MiB 真 byte 上限；另驗 yielding cancel、generation stale、read race、reset、checked snapshot、URL lease、固定 filename。兩語實際 app listeners 在離線 DOM model 可走完 sample→mapping→result→checks→TXT/JSON→source/mapping invalidation→pagehide，惡意字串只成為 text node。**這不是瀏覽器、排版、網路、鍵盤或輔助科技的 PASS。**

## 初版固定來源與真實產物（歷史，R01 前）

- [candidate.json](evidence/m1/candidate.json)：版本、來源／dist／fixtures 總 bytes、aggregate SHA-256 與命令結果。
- [source-manifest.json](evidence/m1/source-manifest.json)：完整自包含來源與契約的逐檔 bytes／SHA-256；不含 dist、evidence 本身或其他工作區檔案。
- [dist-manifest.json](evidence/m1/dist-manifest.json)：13 個實際 preview assets 的逐檔 bytes／SHA-256；與 public 相同。
- [fixture-manifest.json](evidence/m1/fixture-manifest.json)：合成 CSV 和真實核心輸出的 bytes／SHA-256。
- [假資料 CSV](evidence/m1/fixtures/fake-order-lines.csv)、[實際 TXT](evidence/m1/fixtures/order-picklist.txt)、[實際 JSON](evidence/m1/fixtures/order-picklist.json)。手寫 oracle：SKU 001=7（2 orders）、PAPER=1、1=1；DEMO-001 有 001=4／PAPER=1。首個 pick 與首個 order item checked=true，其餘 false；沒有個資或憑證。
- [ACCEPTANCE-MAP.md](evidence/m1/ACCEPTANCE-MAP.md)：A01–A20 各自的自動化範圍與真 browser 缺口。
- [BROWSER-GATES.md](evidence/m1/BROWSER-GATES.md)：12 類真 browser／原生／真機項目逐項 **NOT_RUN_USER_FOCUS_INCIDENT**。

manifest 使用排序後 `relative path + NUL + byte length + NUL + hex SHA-256 + LF` 的 UTF-8 bytes 再做 aggregate SHA-256。重新產生證據：先跑必要命令，再 `node scripts/candidate-evidence.mjs`。這個命令只讀本工具封閉檔案清單並寫 evidence/m1；不開 server/browser，不產出獨立 ZIP。主代理負責單一整合外層 ZIP。

## 環境與限制

[environment-comparison.json](evidence/m1/environment-comparison.json) 記錄前後完全相同；原始 before／before-final／after-final 快照均保留。User PATH：ExpandString、834 chars；Machine PATH：String、1,227 chars；兩者 ephemeral entries 均 0；PATH SHA、全 Environment-key fingerprint 及 TEMP/TMP 類型／長度／SHA 均未變。沒有持久環境、Git 設定、帳戶、認證或服務變更，也沒有任務背景 server。

requested configuration 為 gpt-6.1-sol/max；backend 未獨立驗證。Source commit／reviewed commit／released commit 目前均無（null）。M2 GitHub repository 尚未建立／推送，M3 Cloudflare、正式 canonical／sitemap、首頁均未變更。本地預覽維持 noindex/nofollow。

已知產品限制依規格保留：只記當頁 checkbox、離頁會清除；匯出目前不支援重新匯入勾選；不扣庫存、不處理地址／付款／配送。初版 TXT 直接插入原字串的做法已由 R01 修正為可逆單行 quoting。靜態 regex 掃描不是安全證明；實際 HTTP headers／Network／Storage／排版／下載仍須真隔離 browser 驗收。未作清除 OS 或瀏覽器記憶體的保證。

待主代理：讀實際來源與固定 manifests、獨立重驗必要範圍，核可真正隔離 browser 後補完必要 gates。其後才另行放行 M2／M3；本對話不自行跨 milestone 或輪詢等待。

## B20-44-R01 修正與重新固定

主代理確認這是報表正確性缺陷。已由指定一列 CSV 重現：單一品名可使 TXT 出現 4 個看似 SKU 項目的行，正常應為總揀貨和裝箱各 1 行。重現來源與原輸出保留於 [baseline-and-reproduction.json](evidence/m1/r01/baseline-and-reproduction.json)、reproduction-before.csv/.txt/.json。修改前先逐檔核對原 44 檔 bytes/SHA，並保留原來源與證據；沒有覆寫原始 M1 manifests 或 logs。

所有 TXT 來源字串（總表 SKU/name、orderId、單內 SKU/name）改用可逆 JSON string quoting；CR、LF、tab、雙引號及反斜線以 escapes 顯示，另將 NEL/U+2028/U+2029 轉成 JSON 可還原的 Unicode escape，確保不增加物理行。固定 heading、項目結構與操作介面不變；TXT 加固定表示法說明，兩語現有下載提示說明相同規則。JSON schema、字串原文與核對語義不變。原規格對 TXT 直接保留多行文字的描述由本次明確修正指示取代。

實際來源變更：package.json 版本、public/js/core/export.mjs、scripts/pages.mjs 及兩份生成 HTML、test/export.test.mjs、test/tooling.test.mjs、scripts/candidate-evidence.mjs、TASK-ENTRY.md、本 HANDOFF；dist 的對應三份資產重新建置。未改 CSS、UI 結構或其他工具。完整新舊來源差異見 [source-diff.json](evidence/m1/r01/source-diff.json)。

|R01 實際命令|exit|結果|
|---|---:|---|
|`node --test test/export.test.mjs test/tooling.test.mjs`|0|11/11；[affected-tests.txt](evidence/m1/r01/affected-tests.txt)|
|`npm test`|0|49/49、0 fail／skip／cancel；[final-tests.txt](evidence/m1/r01/final-tests.txt)|
|`npm run check`|0|13 assets；[final-check.txt](evidence/m1/r01/final-check.txt)|
|`npm run build`|0|13 assets 與 public 逐 byte 相同；[final-build.txt](evidence/m1/r01/final-build.txt)|

新增 actual serializer regression：指定 quoted multiline CSV 不新增 SKU／order 區段；newline、CRLF、CR、tab、quote、backslash、NEL、U+2028/U+2029、混合值逐欄 JSON.parse 還原等於來源，TXT 行數固定；JSON 同時保持原文。8 MiB 實際序列化邊界也重驗為恰好上限接受、+1 byte 拒絕。

最新 [來源 manifest](evidence/m1/r01/source-manifest.json)、[dist manifest](evidence/m1/r01/dist-manifest.json)、[產物 manifest](evidence/m1/r01/fixture-manifest.json)、[最終固定驗證](evidence/m1/r01/freeze-verification.json)。新 [TXT](evidence/m1/r01/fixtures/order-picklist.txt)、[JSON](evidence/m1/r01/fixtures/order-picklist.json) 與 [重現修正版 TXT](evidence/m1/r01/fixtures/reproduction.txt) 均由實際核心產生；原文 JSON 與修正前逐 byte 一致的比較亦記入固定驗證。`node scripts/candidate-evidence.mjs` 現在只寫本輪 evidence/m1/r01，保留 root 初版證據。主代理仍負責單一整合 ZIP。

[R01 environment-comparison.json](evidence/m1/r01/environment-comparison.json) 為 PASS，User/Machine PATH 與全 Environment fingerprints 前後完全一致。所有 browser／OS／視覺／真下載 gate 仍為 NOT_RUN_USER_FOCUS_INCIDENT；本輪未 browser／server／CUA／委派／發布／部署。Source/reviewed/released commit 仍 null；待主代理驗收修正版並決定後續 gate，沒有自行跨 milestone。

## B20-RP-44 M1B 離線發布準備（2026-10-23）

完成實作與最終必要命令。新增 build:release/check:release（scripts/release.mjs build/check），固定預定 origin https://picklist.glossquote.com、slug order-picklist；沒有自動部署、CLI/env origin 或認證配置。新增 release-html.mjs 與 source hash pins、封閉且含目錄的 preflight、預期 bytes 重建、獨立實際 HTML SEO 解析；release-artifacts/site 與 sibling manifest 完全隔離。既有 public/dist、六份規格、AGENTS/docs 及 evidence/m1 均不改。完整重現與剩餘 gates 見 [M1B-RELEASE.md](M1B-RELEASE.md)。

實際來源變更：package.json 只新增兩個 scripts；.gitignore 排除 release-artifacts；新增 scripts/release.mjs、scripts/release-html.mjs、scripts/m1b-evidence.mjs、test/release.test.mjs、M1B-RELEASE.md；追加 TASK-ENTRY.md 與本 HANDOFF。其餘來源維持既有版本。新證據只進 evidence/m1b，沒有覆寫舊 M1/R01 證據。

17 個工具鏈針對性測試的首輪為 16 pass/1 fail（release-targeted-tests.txt，exit 1）：測試的隨機資料夾 regex 誤把固定 mode `release-candidate` 當成隨機字串。修正為核對實際 fixture basename／絕對路徑不在 manifest；重跑為 17/17、exit 0（release-targeted-repair.txt）。原失敗紀錄保留。另強化 task-copy 的 parent junction 檢查；負例使用的 junction 在測完以非遞迴方式只移除自建 link，不碰目標。

17 tests 包含：固定 origin、兩語 canonical／三個 hreflang／robots、僅 head SEO 差異、runtime/preview bytes 不變、精確 sitemap/headers、兩份不同 copy 的確定性重建、未知/missing/tampered/extra 輸出與空目錄、來源＋輸出＋manifest 同步污染、manifest＋asset 同步竄改、junction、未管理輸出拒絕、無參數/錯 mode/多參數拒絕。這些都是離線檔案／CLI 斷言，不是 browser PASS。

|M1B 最終實際命令|exit|結果／證據|
|---|---:|---|
|`npm test`|0|66/66、0 fail/skip/cancel；[final-tests.txt](evidence/m1b/final-tests.txt)|
|`npm run check`|0|13 public assets 與全 scripts 語法／原 preview 契約；[final-check.txt](evidence/m1b/final-check.txt)|
|`npm run build:release`|0|14 site 檔、65,146 bytes；[final-build-release.txt](evidence/m1b/final-build-release.txt)|
|`npm run check:release`|0|獨立讀 source/reconstruct/比較與實際 SEO 解析；[final-check-release.txt](evidence/m1b/final-check-release.txt)|
|原 `npm run build`|NOT_RUN_UNCHANGED_PUBLIC|依本輪契約不重建已固定 preview|

本輪完整 suite 僅依契約在最終程式固定後跑一次；其中 49 項為既有核心／離線 app model，17 項是本輪新增工具鏈測試，沒有當作 browser 證據。發布產物為 [release-artifacts/site](release-artifacts/site)，審核 [release-artifacts/manifest.json](release-artifacts/manifest.json) 不在 site 內。source/hash、每檔 bytes/SHA 及固定 aggregate 見 [source-manifest.json](evidence/m1b/source-manifest.json)、[site-manifest.json](evidence/m1b/site-manifest.json)、[artifact-manifest.json](evidence/m1b/artifact-manifest.json)；精確新增／修改路徑見 [source-diff.json](evidence/m1b/source-diff.json)。

[input-preservation.json](evidence/m1b/input-preservation.json) 以進入前基線逐檔確認 public、dist 和原 evidence/m1 共 142 檔的 bytes/SHA 與檔案集合不變；本輪所有負例只改自有 copy。[environment-comparison.json](evidence/m1b/environment-comparison.json) 確認 HKCU/HKLM PATH hash、type、length、ephemeral entries 與全 Environment-key fingerprint、TEMP/TMP type/length/hash 完全相同；User PATH ExpandString/834 chars，Machine PATH String/1,227 chars，ephemeral 都是 0。沒有持久環境、Git 設定、auth 或服務變更。

M1B 固定資料由 `node scripts/m1b-evidence.mjs` 生成，只寫 evidence/m1b。原 .runs 精確契約為十項 acceptance；本輪已完成允許的離線部分，真 browser／視覺／OS／native／真機／正式 Network/Storage 仍全部 NOT_RUN_USER_FOCUS_INCIDENT；實際 hosting HTTP headers 未驗。預定網址不是已上線，無 GitHub／部署／首頁變更，source/reviewed/released commit 仍 null。待主代理讀實際 diff／source／產物並獨立驗收、補必要 browser gate，再決定 M2/M3；目前沒有新增依賴、憑證或授權需要，也沒有自行跨里程碑。

## B20-44-M2A 正式發布來源（2026-10-25）

主代理已執行 `.runs/batch20-browser-release-2026-10-25/isolated/b20-44-r1`（browser 145.0.7632.6）：30 PASS、10 NOT_RUN、0 failures／prohibited，parent-cleanup PASS；`b20-44-lifecycle2-r1` 兩語 pagehide/back-forward 2 PASS、返回 idle、來源空、勾選0、四 mapping 全空、下載停用、local/session/IDB/cache空，0 failures／prohibited，cleanup PASS。這些結果已從原 result.json 核對並在 [browser-reference.json](evidence/m2a/browser-reference.json) 固定 hash，原執行證據沒有改。本對話本輪沒有啟動 browser，沒有把 Node 斷言當 browser PASS。

10 NOT_RUN 是兩語各5項：精確 source-replacement event overlap、真正200% zoom、native chooser/save/print、真機/AT、exact8MiB browser boundary。依使用者允許保留人工待驗；既有 Node 邊界證據獨立記錄，沒有改成 PASS。M2A banner 最小改動未另跑 browser，正式 hosting／外部驗收尚未執行。

實際修改：scripts/release-html.mjs 以語言固定的一個完整 banner tag 作精確替換；scripts/release.mjs 的 body guard 僅允許該差異，test-copy sandbox 改至 evidence/m2a/fixtures；test/release.test.mjs 增補 missing/duplicate/變形banner、任意body＋manifest污染拒絕、Wrangler exact object；新增 wrangler.jsonc、M2A-RELEASE.md、scripts/m2a-evidence.mjs；更新本 HANDOFF／TASK-ENTRY。未改 public/dist、JS/CSS/core、原規格或 frozen evidence。

正式兩語 banner 現為「檔案在此瀏覽器處理」與「Files are processed in this browser」；class/tag、其餘 body、SEO head、JS/CSS、robots/sitemap、CSP/headers 及其他site bytes 完全沿用 M1B。public/dist 仍保留原候選提示及 noindex。原 managed release 完整15檔先驗 bytes/SHA及安全路徑，保存至 [release-before](evidence/m2a/release-before) 後再 fresh build；沒有遞迴刪除或放寬 existing-output 拒絕規則。[release-preservation.json](evidence/m2a/release-preservation.json) 記錄實際保存操作。

|M2A 實際命令|exit|結果／證據|
|---|---:|---|
|`node --test test/release.test.mjs`|0|初驗21/21；日期修正後重用未改20項，另重驗config1項；[release-tests.txt](evidence/m2a/release-tests.txt)|
|`node --test --test-name-pattern="M2A Wrangler configuration" test/release.test.mjs`|0|日期10-24 oracle：1/1；[date-correction-config-test.txt](evidence/m2a/date-correction-config-test.txt)|
|`npm run check`|0|原 preview／public allowlist 與 scripts 語法；[check.txt](evidence/m2a/check.txt)|
|`npm run build:release`|0|14 site files、65,167 bytes；[build-release.txt](evidence/m2a/build-release.txt)|
|`npm run check:release`|0|exact expected bytes、banner／SEO與manifest；[check-release.txt](evidence/m2a/check-release.txt)|
|未變核心 suite／preview build／browser|NOT_RERUN|保留原有必要證據，沒有無理由全跑|
|Wrangler CLI schema／dry-run|NOT_RUN|本輪無CLI、安裝或部署授權；Node只驗指定JSON object|

wrangler.jsonc：assets-only ./release-artifacts/site，name glossquote-order-picklist、compatibility_date **2026-10-24**、唯一picklist.glossquote.com custom_domain=true；workers_dev/preview_urls/send_metrics、observability/logs/invocation_logs/traces 全關，run_worker_first=false、html_handling/not_found_handling=none；build=node scripts/release.mjs build。主代理更正原10-25日期以避免當時UTC仍10-24的future date；原52檔來源與全部證據先核SHA後保存在 evidence/m2a/date-correction-before，日期更正不影響任何site/runtime bytes。沒有 Worker程式、storage、依賴或帳號設定。參考官方欄位與完整重現說明見 [M2A-RELEASE.md](M2A-RELEASE.md)。

固定來源／產物及 per-file bytes/SHA：[source-manifest.json](evidence/m2a/source-manifest.json)、[artifact-manifest.json](evidence/m2a/artifact-manifest.json)、[site-manifest.json](evidence/m2a/site-manifest.json)；新舊精確差異：[source-diff.json](evidence/m2a/source-diff.json)、[artifact-diff.json](evidence/m2a/artifact-diff.json)。[preservation.json](evidence/m2a/preservation.json) 比較3122個 preview／舊evidence／owner module／既有browser結果檔案，全部 bytes/SHA不變；新site除了兩個HTML的指定banner及必要manifest重算，其餘12檔逐byte相同。

[environment-comparison.json](evidence/m2a/environment-comparison.json)：完整 before/after Snapshots 完全相同（HKCU/HKLM PATH hash/type/length/entries/ephemeral、全Environment fingerprint、TEMP/TMP type/length/hash）。本輪沒有 Git/auth、持久設定、憑證、服務、發布或部署動作；source/reviewed/released commit仍null。root審查M2A後才能另發M2B公開來源，之後由root處理正式站；目前無新增權限／依賴／產品支援決策。

主代理 compatibility_date 更正紀錄：[date-correction-preservation.json](evidence/m2a/date-correction-preservation.json)。原10-25版本的52檔來源、manifest與命令證據先逐SHA核對並保存，10-24更正只影響Wrangler設定／其validator與交接描述；site所有15份產物包含manifest均維持更正前bytes。設定case1/1及更新過的scripts語法check另有 [date-correction-check.txt](evidence/m2a/date-correction-check.txt)，完整suite、browser、build沒有無理由重跑。

## B20-44-M2B 獨立公開原始碼（2026-10-27）

主代理獨立審查 M2A source-set SHA-256 `9f1f1f454e44dac3e00d0ed1be9e8093c84027add7acc9ff4d176636cd643749` 後，明確授權本輪只做 reviewed publishing copy、獨立 PUBLIC GitHub 發佈與證據回填。進入時52份來源／15份 release artifacts 均核對 bytes／SHA；原 HANDOFF 先保存為 [HANDOFF-before-publication.md](evidence/m2b/HANDOFF-before-publication.md)，本文件是本輪唯一改動的原 M2A source-set 檔案。沒有改寫 frozen M1／M1B／M2A 證據或 runtime。

公開副本保留41份核准來源的原 bytes，將 README／HANDOFF 兩份改寫為可攜、如實區分來源與 hosting 的說明，另收錄21份固定合成 browser fixtures、4份安全驗證資料與 PUBLISH-MANIFEST.json，共69檔／490,731 bytes。9份內部協調／證據產生檔排除；沒有上傳其他工具、工作區私有檔案、憑證、profile、node_modules 或原始 browser 執行資料。來源選取與衍生說明見公開 [PUBLISH-MANIFEST.json](https://github.com/KYStr/glossquote-labs-order-picklist/blob/main/PUBLISH-MANIFEST.json)；原52檔審查摘要與公開 payload digest 分開記錄，沒有宣稱兩者相同。

|M2B 發佈副本實際命令|exit|結果|
|---|---:|---|
|`node --test test/release.test.mjs`|0|21/21 PASS|
|`node scripts/check.mjs`|0|來源檢查與 scripts 語法通過|
|`node scripts/release.mjs build`|0|release manifest 與固定 M2A bytes 相同|
|`node scripts/release.mjs check`|0|正式產物與 SEO／banner 契約通過|

命令結果見 [publication-copy-checks.json](evidence/m2b/publication-copy-checks.json)、[command-summary.json](evidence/m2b/command-summary.json)。未變產品核心與 browser 證據依逐 byte 相同來源及主代理既有驗證沿用，本輪沒有額外執行 browser／native UI／server。建立前兩次 gh API 查詢均確認目標不存在（預期 HTTP404／exit1）；後續 create、push 與所有核對命令 exit0，沒有覆寫既有 repository 或 force push。

公開 repository：[KYStr/glossquote-labs-order-picklist](https://github.com/KYStr/glossquote-labs-order-picklist)，visibility `public`，default branch `main`。本地 commit、remote main 與 symbolic remote HEAD 均為 `9d715f17686e95f76ca97192b7eca79dd72fc3a4`。獨立空 Git object database 以匿名 fetch 取回遠端內容，69份 blob 逐 byte／SHA-256 與 reviewed payload 一致，詳見 [remote-verification.json](evidence/m2b/remote-verification.json)。完整公開集合 SHA-256 `18f8c213ce45d9d9077cb0b38044d2ba1a9c9bc8889f6e0d922f55a245aa547b`；PUBLISH-MANIFEST.json 本身 SHA-256 `98d03136f79ce2a73dfbc4adb5f49697acd4f1d0452fca9b482816dd737c10ac`。完整逐檔清單見 [full-public-manifest.json](evidence/m2b/full-public-manifest.json)。

發佈前 capture、push前及遠端核對後 verify Git settings guard 均通過；[git-settings-verification.json](evidence/m2b/git-settings-verification.json) 記錄最終 PASS。完整 [environment-comparison.json](evidence/m2b/environment-comparison.json) 的 before／after Snapshots 完全相同：HKCU PATH ExpandString／834 chars、HKLM PATH String／1,227 chars，ephemeral entries 均0，全 Environment-key fingerprints 與 TEMP／TMP type／length／hash 不變。僅使用既有 CLI authentication 及逐命令 git `-c`，沒有讀取憑證、執行 auth login／refresh／setup-git 或修改全域／系統設定。

本輪僅原始碼發佈。正式 hosting 為 `NOT_DEPLOYED`，released commit 仍 null；主代理接續處理已授權的正式 release／首頁整合。外部驗收 `PENDING`，既有10項 NOT_RUN 維持原狀，沒有將來源上傳視為網站上線或產品完成。最終範圍與驗證見 [publication.json](evidence/m2b/publication.json)、[final-verification.json](evidence/m2b/final-verification.json)。

## B20-44-F03 directory-link 測試清理（2026-10-27）

外部驗收發現原 release 測試的兩個 finally 在 POSIX 對 directory symlink 呼叫 rmdir，會以 ENOTDIR 蓋掉已通過的產品拒絕斷言。本輪獨立審查指定 findings／handoff／候選 diff，只修本工具測試；沒有套用其他工具或封裝器的修改。回饋檔案的 bytes／SHA 固定於 [reviewed-feedback.json](evidence/f03/reviewed-feedback.json)，原來源與證據先建立 [baseline.json](evidence/f03/baseline.json)，三份修改檔原 bytes 保存於 evidence/f03/before。

唯一程式變更為 test/release.test.mjs：新增 removeOwnedDirectoryLink(root, path, targetPath)，先驗 owned fixture 路徑、lstat 連結型別、預期 target 是真目錄且 realpath 相符，然後 Windows junction 用 rmdir、POSIX symlink 用 unlink。完全不遞迴刪除 target。原產品拒絕錯碼與案例保留；來源 target 以原 app.js 作哨兵，輸出 target 同時保留空目錄和新增 keep.txt 哨兵兩種情況，清理後確認 link 消失、target 全檔 bytes／SHA 不變。新增一項拒絕清理普通目錄、檔案、越界路徑與不匹配 target 的回歸，拒絕及合法清理後的整棵 fixture inventory 均核對不變。這些檢查不宣稱防範其他程序同時換檔的 TOCTOU。

|F03 實際命令|exit|結果／證據|
|---|---:|---|
|`npm test`|0|71 tests／71 pass，0 fail／skip／cancel；[npm-test.txt](evidence/f03/npm-test.txt)|
|`npm run check`|0|13 public assets、package 契約與 scripts 語法通過；[npm-check.txt](evidence/f03/npm-check.txt)|
|POSIX 整合版 helper／完整 suite|NOT_RUN_LOCAL_PLATFORM|本機為 win32，未啟動／安裝其他平台；外部候選版結果不算本次整合版 PASS|
|browser／native／正式站|NOT_RUN_UNCHANGED_TEST_ONLY|本輪只修測試，既有10項人工 NOT_RUN 保留|

命令在 evidence/f03/verification-copy 內執行，52份來源先逐 byte 固定，測試與全部 runtime／scripts 與本工具相同。既有 release API 的 sandbox 固定為其 ROOT/evidence/m2a/fixtures，因此透過副本把所有新 fixture 寫入 f03，而不修改 runtime 或舊 m2a 證據。執行後僅同步本輪 HANDOFF／TASK-ENTRY 文件；受測程式碼未變，不重跑已通過命令。npm 使用自有空 user/global config、自有 cache 及 process-local offline／停用更新設定，沒有安裝套件或讀取認證。[commands.json](evidence/f03/commands.json) 與 [verification-copy-manifest.json](evidence/f03/verification-copy-manifest.json) 記錄實際環境和輸入。

前置包裝腳本首輪誤把 PowerShell 正常 return 後的空 LASTEXITCODE 當失敗，當時只建立空 evidence/f03，未改來源或跑測試；改為讀 PowerShell 成功狀態及 guard JSON 後 PASS，原紀錄保留於 [preflight-attempt.json](evidence/f03/preflight-attempt.json)。[environment-comparison.json](evidence/f03/environment-comparison.json) 的完整 before／after Snapshots 完全一致，包含 HKCU／HKLM PATH hash／type／length、ephemeral entries（均0）、全 Environment-key fingerprint 與 TEMP／TMP；沒有持久設定或 Git／gh 認證變更。

實際 diff 限 test/release.test.mjs、HANDOFF.md、TASK-ENTRY.md 及新 evidence/f03；見 [changes.diff](evidence/f03/changes.diff)、[source-diff.json](evidence/f03/source-diff.json)。[preservation.json](evidence/f03/preservation.json) 核對所有舊檔和目錄，public 13檔、dist 13檔、release-artifacts 15檔與歷史 evidence bytes／集合保持不變。release aggregate SHA-256 仍為 `269e622f3ff4184b226b5a1605c9d5e9e833ef10e4e79bfe38a411c9e88d7bba`。本輪固定 [source-manifest.json](evidence/f03/source-manifest.json) 與 [candidate.json](evidence/f03/candidate.json) 交主代理審查，狀態 LOCAL_FIXED_AWAITING_PRIMARY_VERIFICATION；目前公開來源仍為 `9d715f17686e95f76ca97192b7eca79dd72fc3a4`，沒有 push／部署／首頁／ZIP／委派或本機互動 UI。

## B20-44-M2A-R02 固定發布入口（2026-10-27）

F03 完整證據已先固定：source-set SHA-256 `693f6728259990d31d7ef7f447cc47f4df9cfe3dcf77175439c75c26e9bd8f03`，其 test 修改和71/71結果保留原 bytes。本輪依主代理實測其他正式站後的指示，保留 html_handling:none 與既有 canonical，為 /、/en、/en/ 提供固定發布入口；沒有自行改 UI 或 hosting。

scripts/release.mjs 的 site allowlist 與 expected bytes 增加 _redirects，內容恰為下列三行、使用真正 LF 且末行含 LF，共65 bytes。public/dist 不新增此檔，Wrangler config 不變。

```text
/ /index.html 301
/en /en/index.html 301
/en/ /en/index.html 301
```

manifest 覆蓋新增檔案的 bytes／SHA-256；既有 check/build 重新構造 expected bytes，仍使用閉合白名單且先驗後寫。test/release.test.mjs 僅在 F03 基線上增加固定三行／manifest 測試及篡改矩陣：缺檔、未配對bytes、配對manifest的狀態碼／目的地／literal backslash-n／CRLF／額外規則，兩種模式都拒絕並保留污染原狀。F03 helper 與其回歸內容維持不變。

|R02 實際命令|exit|結果／證據|
|---|---:|---|
|`node --test test/release.test.mjs`|0|24/24，0 fail／skip／cancel；[release-tests.txt](evidence/m2a-r02/release-tests.txt)|
|`npm run check`|0|13 public assets 與 scripts 語法；[check.txt](evidence/m2a-r02/check.txt)|
|`npm run build:release`|0|原工具根目錄 fresh build：15 site檔／65,232 bytes；[build-release.txt](evidence/m2a-r02/build-release.txt)|
|`npm run check:release`|0|原工具根目錄正式產物、完整manifest、SEO／banner檢查；[check-release.txt](evidence/m2a-r02/check-release.txt)|
|49項未變核心／browser|NOT_RERUN_UNCHANGED|核心沿用已固定F03完整suite；不重跑既有browser|
|實際 HTTP 301／Cloudflare routing|NOT_RUN_NOT_DEPLOYED|本輪只有離線來源與產物，不將規則檔驗證當成正式站成功|
|POSIX 整合版|NOT_RUN_LOCAL_PLATFORM|本機 win32，沒有安裝／啟動其他平台|

release suite 與 check 使用 evidence/m2a-r02/verification-copy 的逐 byte 副本，避免 fixture 寫入歷史 evidence；build/check:release 在原工具根目錄執行。只同步最終文件後保留已通過命令，受測可執行輸入沒有再改；[commands.json](evidence/m2a-r02/commands.json) 與 [verification-copy-manifest.json](evidence/m2a-r02/verification-copy-manifest.json) 記錄實際範圍。npm 同樣只用自有空 config／cache 與 process-local offline 設定，沒有安裝或認證操作。

原 release 先驗完整閉合15檔與 SHA，再於已核實的本工具路徑內完整移至 [release-before](evidence/m2a-r02/release-before)；舊 aggregate `269e622f3ff4184b226b5a1605c9d5e9e833ef10e4e79bfe38a411c9e88d7bba` 保存且再次逐檔核對，沒有遞迴刪除、覆寫或放寬既有 output 拒絕。新 release 共16檔（15 site＋manifest）：原14份 site bytes／SHA 全同，只新增 site/_redirects 並更新manifest，sourceFiles 的13份 pins 不變，CSP／headers／canonical／HTML／JS／CSS 都不變。[artifact-diff.json](evidence/m2a-r02/artifact-diff.json)、[artifact-manifest.json](evidence/m2a-r02/artifact-manifest.json) 與 [release-preservation.json](evidence/m2a-r02/release-preservation.json) 記錄完整差異和歷史保存。

相對 F03 實際來源 diff 僅 scripts/release.mjs、test/release.test.mjs、HANDOFF.md、TASK-ENTRY.md；見 [changes.diff](evidence/m2a-r02/changes.diff)、[source-diff.json](evidence/m2a-r02/source-diff.json)。[preservation.json](evidence/m2a-r02/preservation.json) 確認 public／dist／config 與所有歷史 evidence（包含完整F03）不變；[environment-comparison.json](evidence/m2a-r02/environment-comparison.json) 的完整前後 Snapshots 完全相同。最終 [source-manifest.json](evidence/m2a-r02/source-manifest.json)、[site-manifest.json](evidence/m2a-r02/site-manifest.json) 與 [candidate.json](evidence/m2a-r02/candidate.json) 交主代理驗證，尚未 push／部署／首頁更新，10項人工 NOT_RUN 和外部待驗狀態維持。

## B20-44-M2B-R03 修正來源公開更新（2026-10-27）

主代理已獨立閱讀本輪 release／test diff，固定副本跑 preview build、release tests、check、release build／check 全部PASS且16份產物逐byte相同，明確放行更新原獨立公開 repository。本輪先固定 [source-inventory.json](evidence/m2b-r03/source-inventory.json)：52份來源 source-set `e9f2311c60c9c0ccb154d51b5b7fd1ea5f2b52fd3b06606d571d170e294b9ed5`、主代理47份輸入及16份產物核對通過。原 HANDOFF 保存於 [HANDOFF-before-publication.md](evidence/m2b-r03/HANDOFF-before-publication.md)；只有本交接文件在完成來源發佈後補充狀態，受測程式碼沒有再改。

確切 publishing copy：`<LOCAL_WORKSPACE>\.runs\batch20-completion-2026-10-27\owner-44-publication-r03\repository`。由原公開 main `9d715f17686e95f76ca97192b7eca79dd72fc3a4` 匿名 clone，先核對首發全部69份公開 bytes／SHA；新 commit 保留其 parent，不 force push。公開白名單仍是69檔：41份審核來源原 bytes、2份可攜 README／HANDOFF、21份固定合成 fixtures、4份安全驗證資料與PUBLISH-MANIFEST。所有8份 test／helper 完整保留（本工具沒有額外 test/fixtures 子目錄）；沒有發布 scratch、node_modules、.runs、工作區私人檔案、憑證或其他工具。完整選取、掃描與22個相對文件連結核對見 [publication-policy.json](evidence/m2b-r03/publication-policy.json)、[payload-review.json](evidence/m2b-r03/payload-review.json)。

|實際離線命令|publishing copy exit|遠端乾淨 clone exit|
|---|---:|---:|
|`npm test`|0；73/73，0 fail／skip／cancel|0；73/73，0 fail／skip／cancel|
|`npm run check`|0|0|
|`npm run build`|0|0|
|`npm run build:release`|0|0|
|`npm run check:release`|0|0|

兩次都使用零依賴來源、自有空 npm user/global config、自有cache與process-local offline／停用更新設定，沒有安裝、listener、browser、原生UI或認證配置。首輪證明受審公開副本閉合；後輪另從 GitHub 匿名乾淨 clone 證明實際交付不缺 test／fixture。受測程式碼與全部 tracked files 在命令後保持原 bytes；兩次16份 release 產物皆與本工具固定產物相同，preview dist 13份也與 public 同 bytes。證據見 [publication-copy-checks.json](evidence/m2b-r03/publication-copy-checks.json) 與 [remote-verification.json](evidence/m2b-r03/remote-verification.json)。

目前公開 repository 為 [KYStr/glossquote-labs-order-picklist](https://github.com/KYStr/glossquote-labs-order-picklist)，visibility `public`、default branch `main`；本地commit、GitHub API remote main 與匿名 symbolic HEAD 全為 `58875852c076f3f156918bc565885f6bbf5206b6`。tracked inventory 共69檔／498,544 bytes，aggregate SHA-256 `c8e6417beb86bdbca6ca056b37130595c83c9384129ac1497a19a7d9831d6375`。PUBLISH-MANIFEST.json 本身 SHA-256 `44674cbc09470e59eb5f2b7438df05ce09981685867dea7b65ca35cc89384786`；固定 release manifest SHA-256 `a89639a1e1129b5f60cf638ed22aa3851b650c0a830a5ed30a973278e65f44e4`，release aggregate 仍 `18d0b11120e5ab361c15f7a21ef37389f6d52619bb4390edf6fd2dc229aca210`。逐檔 path／bytes／SHA 與固定 commit 關係見 [tracked-inventory.json](evidence/m2b-r03/tracked-inventory.json)；API與推送記錄見 [push.json](evidence/m2b-r03/push.json)。

Git settings 先 capture，push前／push後／遠端重現後 verify 全部PASS；最終 [git-settings-final.json](evidence/m2b-r03/git-settings-final.json) 僅比對三個已知 user/system config 指紋，沒有讀 credential store 或宣稱OS級封鎖。[environment-comparison.json](evidence/m2b-r03/environment-comparison.json) 的完整 Snapshots 完全相同：HKCU PATH ExpandString／834 chars、HKLM PATH String／1,227 chars，ephemeral entries均0；全Environment-key fingerprints及TEMP／TMP相同。所有自行啟動的child均shell:false／windowsHide；只用既有gh CLI認證和逐命令git -c，沒有auth login／refresh／setup-git或global/system設定寫入。

[preservation.json](evidence/m2b-r03/preservation.json) 固定原public／dist／release與所有首發、F03、R02證據的不變結果。[publication-receipt.json](evidence/m2b-r03/publication-receipt.json) 記錄repo／public／commit／releaseManifestSha256與確切副本路徑。本輪僅來源公開，正式hosting `NOT_DEPLOYED`、released commit仍null、外部驗收 `PENDING`；沒有部署、首頁、ZIP或委派。主代理收到後另做獨立遠端／產物驗證及release；POSIX整合版、正式HTTP301與10項人工browser門檻沒有改成PASS。
