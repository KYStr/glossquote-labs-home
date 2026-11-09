# 交接：名單比對與合併

目前狀態（2026-10-13）：主代理已回報使用者授權的 Git helper 撤銷處理完成，解除發布暫停。M2 技術命令、production 與 PUBLIC 固定來源證據保留，事件處置與新安全規則已補入；等待主代理 M2 獨立驗收及 M3，未自行部署、修改首頁或再推送。完整目標未完成。下列停止/候選/M1 紀錄均保留為歷史。

## Incident disposition and publication safety acknowledgment

主代理在原對話通知：使用者明確要求撤銷誤設定；主代理先備份現況，再只移除 GitHub/Gist 四個已確認的 gh helper assignment，其他 bytes 不變，並驗到兩個主機繼承既有 system Credential Manager。此功能對話沒有操作該恢復，也沒有讀取備份或 credential store。無原修改前快照，不能宣稱已逐字恢復未知 pre-state 或被覆蓋的自訂值；原 incident 記錄不刪除、不改為「從未違規」。

已讀根 AGENTS.md 新增 Git 規則與 `tool-projects/GIT-PUBLICATION-SAFETY.md`，確認後续禁止 gh auth setup-git/login/refresh、global/system config writes、直接編輯設定、credential fill/token/export。既有 CLI 認證僅在已授權的工作中使用；未來若推送需 helper，只可採單次 git -c，參數用陣列，禁止把認證設定不足轉成重新設定授權。任何 Git/Windows Environment drift 或缺認證均停止回報，不猜測復原。

本次只做文件處置与唯讀核對，沒有新的 publication block。新 guard 的 before/after 是**恢復後本次 metadata/read-only 區塊**，不能倒補原誤執行前的快照。新證據根 `.runs/github-publish/glossquote-labs-list-compare/m2-incident-disposition-2026-10-13-01a133a5-01/`：git-settings-before.json、git-settings-verify.json、environment-before/after/comparison.json、fixed-artifacts-proof.json、public-proof.json、incident-disposition.json。guard 從根執行 `node tool-projects/scripts/git-settings-guard.mjs capture|verify <new task evidence>`；只保存三個已知 user/system Git config 的存在、大小、SHA-256，不顯示值、不接觸 credential store，亦不是 OS 層封鎖所有工具。

固定 PUBLIC repo、HEAD `3956762b0c9c2ff5ec0933e78b4253d40a0f2f0e` 和 ZIP SHA `fb6bd7523363288f1854f2d16d1eeac9608ed69cbf7feefef975b06024abf674` 已唯讀重新核對，不因狀態文件建立新 commit/推送。已測 code/runtime 與 production12檔保持精確 bytes；既有 owner/ZIP 必要 gates 仍是其原證據，不重跑未變輸入。只更新本工具 HANDOFF/project/RELEASE-CANDIDATE 和新證據，已公開 fixed commit/ZIP 不變。人工 NOT_RUN 保留，source publication 不等於 live hosting，M3/首頁/外驗由主代理續辦。

## M2 verified artifacts and scope stop

PUBLIC repo：<https://github.com/KYStr/glossquote-labs-list-compare>，gh repo view 實查 PUBLIC。default branch `codex/m2-public-source`；git ls-remote 的 HEAD 與該 branch 均為 `3956762b0c9c2ff5ec0933e78b4253d40a0f2f0e`。沒有 force push、部署或 DNS/首頁變更。

固定來源ZIP位於根 `.runs/github-publish/glossquote-labs-list-compare/m2-2026-10-13-01a133a5/source-commit.zip`，95,923 bytes，SHA-256 `fb6bd7523363288f1854f2d16d1eeac9608ed69cbf7feefef975b06024abf674`。51檔 source 與 Git commit blob bytes 一致；安全解壓的 `zip-clean/` 不借用 workspace 產物。source digest `aa92ce5b3ad25706f876d315fa25a96ec52d3ad5feeaf14ae3b7cb75c1a968d0`，code `35ee32892d2dab53ac1398a788db4e4c4cf9e3241f67a715b4fccd39d242302b`，runtime/preview dist `5d202dd6f0b0ce3af25aba6658e597246291a3670b3e034b8ff11449f50b632f`，production `be5fef5500a173685af4499c2b0c8dd9060ffd763c59b61e095d0b8e6e424053`。owner與ZIP五組摘要一致。

Node v24.14.0 / npm11.9.0，owner和真正ZIP解壓副本各執行 npm test（52entries）、check、build、build:production、check:production，全部exit0；production12檔/preview9檔。check:production另做真loopback HTTP GET/HEAD、HTML/CSS/ESM/XML/TXT MIME、安全headers、未知路徑/404.html/_headers真正404、POST405、Host/query固定canonical與逐byte body保護。Wrangler4.147.0 owner和ZIP隔離 --dry-run --autoconfig=false 各exit0，無upload/bindings、無credential继承/metrics，前置help/schema已核對；報告「Read16files」另逐檔實查regular files恰12且config/assets無漂移。ZIP7個負案例（traversal/symlink/encryption/CRC/count/absolute/backslash）在實際Node執行，預期拒絕均PASS。

證據：同目錄 owner-commands.json / zip-commands.json，owner-dry-run.json / zip-dry-run.json，candidate-manifest.json / zip-manifest.json，zip-blob-audit.json / zip-negative-tests.json，reviewed-copy.json / source-scan.json / scope-proof.json，public-repo-proof.json / git-publication-commands.json / dry-run-tree-proof.json。19個M2新增或變更source路徑均在task允許路徑；14個M1 protected files未改，DISPATCH只從public source排除、local未改。核心流程與語義測試不變。

**Scope incident**：推送 command block 中誤執行 `gh auth setup-git --hostname github.com`；其exit0由後續push成功且中間非零退出guard證明，工具只保存整個block的combined output，未分段記錄helper stdout/stderr，原命令精確執行時間未暴露。此命令配置Git credential helper，可能重寫全域Git設定，超出M2範圍。[官方說明](https://cli.github.com/manual/gh_auth_setup-git)。這是實作者錯誤；未捕捉pre-task Git global config快照，不得猜測unset/還原，也不能宣稱Git全域未變。

主代理要求停止後，僅唯讀 `git config --global --show-origin --show-scope --name-only --get-regexp` 查目前key/source，沒有輸出值：`credential.https://github.com.helper` 與 `credential.https://gist.github.com.helper` 各兩筆，來源均 global / `file:<LOCAL_USER>/.gitconfig`。此讀取不是before快照，不能證明新增或修改了哪些值。封存時間 2026-10-13 17:23:06 Asia/Taipei（09:23:06 UTC），不冒稱原command時間。未讀credential store、未執行credential fill、未還原、停止後無推送/其他外部變更。scope-incident.json / scope-incident-detail.json 有精確命令與工具output/exit/snapshot缺口。

Windows before/after guard full Snapshots相同（PATH type/length/hash、ephemeral0、Environment-key fingerprint/TEMP/TMP）；這僅覆蓋HKCU/HKLM Environment，不能證明Git config無變更。主代理正在處理此事件，本功能對話停等新指示。M2技術資料可供主驗但scope gate未結案，人工NOT_RUN全部保留，未自行進M3。

這份incident/成功後交接只更新工作目錄HANDOFF/project/RELEASE-CANDIDATE，未再push、未改固定commit/ZIP；公開snapshot保留當時candidate checkpoint，交付真實狀態以此交接與外部證據為準。

## M2 candidate checkpoint

已授權：正式 production SEO/404/headers、候選設定、獨立 PUBLIC source。禁止 deployment/DNS/shared homepage/credentials/global environment/新增依賴/再委派。M1主驗根證據 .runs/handoff-release-2026-10-13/19-primary-m1/ACCEPTANCE.md，source digest debf2c17d3130d9b78cb62a9f52263f8595637c9f87d1900bfb7748025ffaff2。

M2只改 package/scripts/public 404/_headers/sitemap/wrangler 與本 task 允許的 project/HANDOFF/docs RELEASE/CANDIDATE。M1 preview HTML/robots、JS/CSS、14個固定輸入/語義測試檔 bytes 保持不變；production build 的工具 body 也必須逐byte相同。正式固定origin https://lists.glossquote.com，候選12檔產物位於 dist-production，PUBLIC repo候選 https://github.com/KYStr/glossquote-labs-list-compare。

此 checkpoint 不把未做的測試、公開push或部署寫成PASS。命令、git/gh實查、source/code/runtime/production manifests、固定commit ZIP、CRC/path/symlink/blob-byte audit及乾淨副本重建證據，都在 .runs/github-publish/glossquote-labs-list-compare/m2-2026-10-13-01a133a5/。PUBLIC固定commit與ZIP SHA必須在成功後追加；published snapshot 保留建立當時狀態，真正交接以驗證後工作目錄HANDOFF及外部證據為準，避免在commit內自我嵌入commit造成循環。

人工NOT_RUN仍沿M1主驗紀錄保留。M2本地HTTP gate及Wrangler dry-run只能證明candidate，不證明Cloudflare live。M3由主代理用同一固定source/build部署、驗證live安全標頭與metadata，再整合首頁。backend identity未確認。

## M1 自驗與固定版本

- 任務：LIST-COMPARE-M1-T00。threadId `01a133a5-8a46-7051-8802-1c189f457b30` / host `local`，依 DISPATCH.json。要求 gpt-6.1-sol/max；create_thread 已接受指定配置，backend identity 未確認。
- 本機中文：<http://127.0.0.1:4199/index.html>；英文：<http://127.0.0.1:4199/en/index.html>。僅 loopback，4199 未衝突；固定預覽 PID 81748，exec session 31391。保持供主驗使用。初始 task-owned PID 59528 在核對精確程序身分後停止一次，載入最終 HTML；未停止其他服務。
- 根專用證據：`.runs/list-compare/m1-2026-10-13-01a133a5/`。`commands.json` 與 npm-test/check/build.txt 記錄 literal 命令、exit code、Node/npm 版本及實際輸出。
- Node v24.14.0 / npm 11.9.0。從本工具目錄執行 `& 'C:/Program Files/nodejs/npm.cmd' test`、`& 'C:/Program Files/nodejs/npm.cmd' run check`、`& 'C:/Program Files/nodejs/npm.cmd' run build`，各 exit 0。node:test 報 52 PASS：43 個 A 案例、7 個額外行為/HTTP 檢查、2 個 fixture 模組載入；不是 52 個人工案例。check 檢查 9 個資產、17 個 ESM syntax 檔、零依賴；build 固定 9 檔。
- source/code/runtime/dist 各檔 bytes/SHA-256 及 aggregate 摘要在 `source-manifest.json`；精確 source bytes 保存為 `frozen-source/`，dist bytes 為 `frozen-dist/`。`scope-diff.json` 對照起始清單與 M1 允許路徑。`preview-http.json` 對照服務的固定資產 bytes/hash。
- code digest：`9bda4a1fe3ebabacc078c4923d8239263ffb1b5e6b0664979265810fae4374fb`。
- runtime/dist digest：`5d202dd6f0b0ce3af25aba6658e597246291a3670b3e034b8ff11449f50b632f`。本摘要對排序後 `{path,bytes,sha256}` JSON 的 UTF-8 bytes 計 SHA-256。
- Windows guard：`& "$env:USERPROFILE/.codex/check-persistent-environment.ps1"` 前後 PASS，完整 Snapshots 相同。User PATH ExpandString/834 字元、Machine PATH String/1227 字元，ephemeral count 各 0；PATH 與完整 Environment-key fingerprint、TEMP/TMP 未變。完整 JSON 在 environment-before/after/comparison.json；既有重複 PATH 項目未處理。

## 改檔與行为

新增 package.json/.gitignore、public/index.html、public/en/index.html、public/robots.txt、public/styles/app.css、public/js/core/compare.mjs、public/js/{state,render,wording,app}.mjs，scripts/{pages,files,check,build,server,dev,manifest}.mjs，test/{fixtures,dom-fixture,core.test,state.test,server.test}.mjs。僅更新 README/START-HERE/TASK-ENTRY/HANDOFF/project.json/docs/RELEASE-CANDIDATE；核心規格、DISPATCH 與父級文件未改。

核心 exact schema、Map 穩定去重/順序、錯誤驗證優先序、完整雙側驗證後輸出；保留 firstLine/occurrences。textarea 不設 maxlength，不截斷原始稿；上限錯誤後原稿保留、結果全清除。每次 input/change 或規則事件同步增加 revision；非空 copy 使用全部 text、LF join、無尾端 LF，晚到 Promise 必須同 revision 且最新 request 才回寫。缺失/拒絕/同步錯誤只提供該區唯讀文字。pagehide/pageshow persisted/重新載入清除內容。無 storage、telemetry、外部 assets 或 network API。

## 真瀏覽器 evidence 與 NOT_RUN

真實 Edge（extension browser 3，tab 1991446792）雙語各輸入 A=`Ada\nBo\nAda`、B=`Bo\nCy`，得到 A-only Ada / B-only Cy / 共同 Bo / 合併 Ada,Bo,Cy；A 統計 raw=3 blank=0 nonEmpty=3 unique=2 duplicate=1，B=2/0/2/2/0。各自用 alice/ALICE 驗證 case-sensitive → ignoreCase 變化、改來源/規則立即清空結果与 copy disabled、載入標示假資料範例、清除與空集合。中英都有原生 Tab/typeText/Return 的主流程与合併複製，按鈕寫入後 Ctrl+V 貼回欄位實見 `Ada\nBo\nCy`。

320px 實際 `innerWidth=320`、`innerHeight=900`、page scrollWidth=308，控件與結果無整頁橫向溢出。viewport 400×1125 經設備像素倍率 1.25 換算後得到此實際 CSS 尺寸；不可由此推定 browser zoom。原始 override 320 得到 256 CSS px 的觀察保留但不充作 320 gate。原生 zoom 快捷鍵未改變觀測尺寸，真正 200% zoom 是 NOT_RUN，無 CSS zoom 模擬替代。temporary viewport 已 reset。

繁中真瀏覽器 `Ada\n` 加 201 個 X，實見 A 第2行長度錯誤、焦點A，原稿205 UTF-16單位保留、無部分結果；英文 B=100001 個 X，實見 B 原始長度錯誤、焦點B、完整100001長度保留、copy disabled。真瀏覽器 Chinese text 為「測試甲/測試乙/測試甲」對「測試乙/測試丙」，實際輸出记录在 browser-observations.json，但使用 DOM fill，未冒稱 OS IME。重載、雙語切換和 back 返回後草稿消失。

`browser-observations.json`、browser-final-zh/en-320.txt 與 .jpg 畫面保存實際輸入/輸出/尺寸/方法。native Edge 版本未暴露；DOM read-only scope 的 navigator 不可用，沒有猜版本。DOM adapter 僅是離線 Node state/事件測試，不列原生瀏覽器證據。

明列人工 NOT_RUN：真正200% browser zoom、讀屏播報、真手機/虛擬鍵盤、完整 Network/Storage 面板（cookies/local/session/IndexedDB）、原生 clipboard 缺失/拒絕/同步錯誤下的 fallback、OS IME composition、其他瀏覽器引擎、貼到其他 OS app。A40 fallback 用離線控制 Promise/缺失 API 實測；真瀏覽器 copy/paste 成功另列 PASS。不得把 code scan 或 mocks 當上述人工 gate。

console 能見的警告來自現有 chrome-extension content script（EventEmitter listeners/ObjectMultiplex）；未改擴充或瀏覽器設定。Network/Storage 全面觀测仍 NOT_RUN，不据此宣稱所有環境請求為零。未发现需放寬核心語義的 in-scope defect。

下一步由主代理獨立驗收固定 source/runtime、必要 B 與 NOT_RUN，再正式決定 M2；本功能 chat 不自行進 M2、不讀憑證、不部署、不改共用首頁或父級進度。

## 規格建立時的紀錄（保留）

2026-10-13 規格建立時：SPEC_ONLY，沒有 runtime、tests、preview server、commit、GitHub repo、正式主機或外部測試。下表與原下一步是當時狀態，非目前狀態。

|項目|目前狀態|
|---|---|
|要求模型|gpt-6.1-sol / max|
|實際配置/ backend identity|未提交對話、未確認|
|threadId / hostId|null / null|
|M1|NOT_RUN|
|M2 公開 GitHub|NOT_RUN；repo 尚未建立|
|M3 Cloudflare/首頁|NOT_RUN|
|外部審查|NOT_RUN|

下一步：主代理檢查本規格與所有本地連結；通過後由主代理建立名為「名單比對與合併」的實作對話並要求指定配置。該對話只做 TASKS.md 的 M1/T00。每次報告實際模型要求值與可確認值分開；不能依實作者自述推定 backend identity。

預定來源 repo KYStr/glossquote-labs-list-compare、網站 lists.glossquote.com 都只是候選。未核實 repository、visibility、commit、HTTP 或 DNS 前不得說已發布。所有產品驗證及人工檢查目前 NOT_RUN。

後續每個版本追加日期、任務 ID、diff、命令與 exit、runtime/tool versions、專用證據相對路徑、瀏覽器觀察/能力未暴露項、固定 manifest、來源/hosting/首頁/外部狀態與風險。不覆寫舊證據，不保存使用者貼入的資料。

<!-- primary-handoff-release-2026-10-13 -->
## 2026-10-13 主代理正式發布與驗收

最新固定來源：https://github.com/KYStr/glossquote-labs-list-compare/commit/3956762b0c9c2ff5ec0933e78b4253d40a0f2f0e（PUBLIC獨立核實）。主代理由固定ZIP逐Git blob核对，再跑52測試及test / check / build / build:production / check:production全通過。34項正式HTTP回應及11資產核對通過；Cloudflare version de3435b0-1559-4e49-8ef2-f6ecdb9c439c。

正式站：[繁中](https://lists.glossquote.com/index.html) / [English](https://lists.glossquote.com/en/index.html)；雙語首頁已實際列出本工具。主驗名單集合、順序、去重、大小寫／空白規則；Git helper事件另記，不冒稱完整歷史還原。

狀態：**主驗通過，等待外部驗收**。保留原紀錄中的人工NOT_RUN；本輪更精確的瀏覽器範圍見批次驗收包，24正式英文頁Edge封鎖未繞過。沒有把發布前固定文件的NOT_RUN視為最新狀態，也沒有將自動或HTTP測試冒稱真裝置/AT/完整Network與Storage測試。

主證據：`.runs/handoff-release-2026-10-13/`；工作區狀態註記不是固定公開commit內的檔案。
<!-- primary-handoff-release-2026-10-13-end -->

<!-- external-followup-accepted-2026-10-16 -->
## 2026-10-16 主代理採納外部複驗

固定版本 `3956762b0c9c2ff5ec0933e78b4253d40a0f2f0e` 標記 **外部測試通過（本輪核心與雙語離線受測範圍）**：52項原測試、1,000組對照、6項雙語離線核心操作。這些是外部實跑結果；主代理已核對版本、回報及封裝完整性，未在本輪重跑整套。

完整正式站Network／Storage、原生操作與真機等仍待驗；NEL停用的提供者紀錄比對一致，不代表既有瀏覽器policy／queue全部清除。沒有新增確認產品缺陷，無需產品返工或重發。詳[最新外驗總表](../EXTERNAL-FOLLOWUP-2026-10-16.md)。本註記不改公開固定commit；下方／上方較早等待外驗狀態保留為歷史。
<!-- external-followup-accepted-2026-10-16-end -->
