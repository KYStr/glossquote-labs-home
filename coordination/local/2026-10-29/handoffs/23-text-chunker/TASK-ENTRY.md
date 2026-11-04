# 文字分段與字數限制任務證據

狀態：SPEC_ONLY；append-only。規格案例不是執行紀錄。

## TASK-W23-M1-T00：規格要求與初始狀態
- 目標：本機雙語可操作 MVP；實作 core/測試、textarea UI、切段與單片複製、loopback/check/build。
- M1 allowed paths：public/**；scripts/serve.mjs/check.mjs/build.mjs/validation.mjs 及必要 scripts/*.mjs；test/**；package.json；.gitignore；本工具 dist/**。只允許更新 HANDOFF/project.json/START-HERE/docs/RELEASE-CANDIDATE，TASK-ENTRY append-only。
- 驗收依據：ACCEPTANCE A01–A28、B01–B11；B01–B04、B07、B08、B11 必驗；320px 必實測；200% zoom、clipboard、Network/Storage 可依能力分項 NOT_RUN。
- 停止條件：同路徑有人正在改、規格矛盾、未知 persistent environment drift、需新權限/依賴/成本、兩輪相同錯誤無進展。

- 執行狀態：NOT_RUN
- Node / npm scripts / exit code：NOT_RUN
- source manifest / SHA：無
- 自動 A01–A28：NOT_RUN
- browser B01–B10：NOT_RUN
- Windows guard：NOT_RUN
- 已知缺陷 / 未驗項：尚未實作
- threadId：null（尚未建立原功能對話）

後續任務只能追加，保留固定輸入、檔案 SHA、commands、PASS/FAIL/NOT_RUN 和限制，不回寫過去證據。

## TASK-W23-M1-T00：本機實作與驗收凍結（2026-10-13，Asia/Taipei）

- Deliverable / acceptance：純靜態雙語本機 Product App；exact schema code-point split、100000 raw UTF-16 / 1000 段上限、無部分輸出、原文 rejoin、修改同步失效、單片 copy single-flight、loopback/check/allowlist build；A01–A28 及 npm test/check/build，真 browser 兩語/320px/keyboard/reload，原生工具能力缺口分項 NOT_RUN。
- 原功能 thread `01a133ac-06c5-7d23-8365-bb516cc8d53a`（local），DISPATCH create_thread 接受 requested gpt-6.1-sol/max；backend 未獨立確認。DISPATCH 保留。
- Scope：public/**、scripts/*.mjs、test/**、package.json、.gitignore、dist/**；狀態更新僅 HANDOFF/project/START-HERE/RELEASE-CANDIDATE，本檔追加；證據僅 `.runs/text-chunker/m1-2026-10-13-01a133ac/`。未動根 git、parent records/homepage、其他 tool、憑證/Cloudflare。
- Node/npm：`& 'C:/Program Files/nodejs/node.exe' --version` → v24.14.0；`& 'C:/Program Files/nodejs/npm.cmd' --version` → 11.9.0。
- Final cwd：`<LOCAL_WORKSPACE>/tool-projects/23-text-chunker`。
- `& 'C:/Program Files/nodejs/npm.cmd' test` → exit 0，49/49 PASS，0 skip；A01–A28 全通。首次 EISDIR 是 fake empty-directory cleanup，改用 rmdir；第一次失敗與第二次 PASS logs 保留。新增 loopback config negative 與 snapshot helper 後 final 49 PASS。
- `& 'C:/Program Files/nodejs/npm.cmd' run check` → exit 0，實際 module syntax / authored HTML subset / assets / parity / preview-noindex / loopback config。
- `& 'C:/Program Files/nodejs/npm.cmd' run build` → exit 0，8 個 public allowlist assets 與 dist bytes 相同。Hardlink/junction/traversal/stale-target negative fixtures、outside fake sentinel、占用 port fallback 保留既有服務全 PASS。
- Literal fake inputs/expected：test/fixtures.mjs、text-chunker.test.mjs；actual command logs 與 final-commands.json 留證，不使用網路第三方資料或使用者文本。
- Fixed code digest：`ef90a1b7579c4bdf3de71290a2b94c0bbbd90a59016d8384586fd8efdf3f344f`（19 files）。Runtime/dist：`30e9b8c76bef292d7c5b744e365eaefc19d354beae2fc030b5025a8c0d53a906`（8 files）。各 manifest 含 sorted path/bytes/SHA256；source-manifest 固定所有 source，不含 dist。
- Windows guard literal：`& '<LOCAL_USER>/.codex/check-persistent-environment.ps1'`；before/after PASS，完整 Snapshots 相同。User PATH ExpandString、834 units、hash `3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb`、0 ephemeral；Machine PATH String、1227 units、hash `52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8`、0 ephemeral。Environment-key fingerprints User `3a36b632b9e0143f2ff2b9e1c5b964e89bf192a4a3aa3ebc93ea8d0314ee7e5a` / Machine `a0f49688069fd5a21146e94fd22764caedcd3ffbe25dc60c716a6a398673ac82` 未變，TEMP/TMP fingerprints 也相同；full JSON 保留。
- Actual preview：127.0.0.1:4203（兩語 /index.html、/en/index.html），Node PID 28668、exec session 27133 留存；未 kill 既有服務。測量 fixture servers 是 task-owned，已清理停止，證據檔保留。
- B01/B02 PASS：實際貼入 A😀BC、strict/2 → A😀 / BC、4 code points/5 UTF-16 units，各段 2；固定 definition/grapheme 文案兩語可見。
- B03 PASS：`ab\r\ncd\rEF\n尾😀\n` 到 textarea.value 為 `ab\ncd\nEF\n尾😀\n`；strict/4 → `ab\nc` / `d\nEF` / `\n尾😀\n`，prefer-lf/4 → `ab\n` / `cd\n` / `EF\n` / `尾😀\n`。串接等於當下值。mode edit 立即 chunks 0，summary hidden；pure core CRLF/CR 保留另測。
- B04 320px 中文多行實際輸入 PASS：source `中文草稿\n第二行😀\n尾段`、prefer-lf/5 → `中文草稿\n` / `第二行😀\n` / `尾段`；按鍵前 0 chunks。真設備 IME/虛擬鍵盤 NOT_RUN；byte-identical fixture 的 synthetic compositionstart/input/end (isTrusted=false) regression PASS，不替代 native。
- B05 native success PASS：某段 copy 實際 session clipboard 為 BC；第1000段為 Z。Native reject/unavailable fallback NOT_RUN：Permissions Policy fixture 在 IAB 未生拒絕（失敗假設保留），opaque-origin 替代法 press 被工具限制超時；不造假 PASS、不盲重試。API mock 僅離線 state tests，非 browser native evidence。
- B06 native pending-lock NOT_RUN（driver 未能捕捉 pending）；離線 single-flight/revision/requestId/dispose/late settlement PASS。
- B07 keyboard main/manual selection PASS：ABCDE、2、ArrowDown prefer-lf、Tab/Enter → AB / CD / E；可 Tab 至 copy、Enter 原生複製、readonly 第2段 Select All [0,2]。2px outline + 6px acid ring 實測；native failure auto-selection 不可測項仍 NOT_RUN。
- B08 PASS：320×720、兩語 no whole-page horizontal overflow。1000 chunks/40 pages 全遍歷、rejoin true、每片1、最後 Z、總數可見；每頁 document scrollWidth305 ≤ innerWidth320。
- B09 實際200% browser zoom NOT_RUN；B10 full DevTools Network / Storage 分別 NOT_RUN；viewport或source掃描不替代。
- B11 PASS：兩語 reload notice 可見，刷新後 source 空、chunks 0、limit 回280，未自動恢復。
- 額外 real browser：100001-unit 完整 raw draft 尚在 textarea、maxlength null、可見超限 error、0 output；1001chunks 整份拒絕後上限10000成功；markup只文字且 result script/img count0。
- Evidence：browser-results.json、browser-zh/en-desktop.png、browser-zh/en-320.png、browser-keyboard-focus.png、browser-320-last-chunk.png、browser-copy.png、synthetic composition及失败fixture PNG/manifest、environment before/after/comparison、final commands/logs、source/code/runtime/dist manifests。
- Result：M1 source/runtime 凍結，需主代理 independent acceptance/正式 M2 放行。完整 goal 仍 active；GitHub/public visibility/commit/ZIP、Cloudflare/homepage、external review 均 NOT_RUN。不是完整發布里程碑完成。


## CHUNK-M1-R1：跨 state copy 生命週期修正（2026-10-13，Asia/Taipei）

- 來源：主代理正式要求恢復 M1 修正，不放行 M2。主驗受控 repro `.runs/handoff-release-2026-10-13/23-copy-epoch-repro.{mjs,json}` 顯示 old/new tickets 同為 `{requestId:4,revision:2,index:1}`，舊 app closure 讀 mutable global state 而讓舊回呼接受新copy。此為控制生命週期，不是 native BFCache/pending clipboard evidence；主代理文件只讀，未修改/執行其會寫入的repro。
- Acceptance：任何舊 state async resolve/reject 均不能改新 state 或新 DOM notice/focus/selection/lock；single-flight/revision/requestId 保留，same-instance 新回呼正常。只改 app/state、相關 tests/交接及 R1 evidence；M1 語義不變，禁止 M2/root Git<LOCAL_USER>/credentials/persistent settings/recursive delegation。
- Preflight：舊固定 source 37 個逐 hash/bytes全相同，無他人重疊改动；R1 before Windows guard PASS，full Snapshots與前次 M1 after 相同。改前 source copy/manifest 保留於 `.runs/text-chunker/m1-r1-20261013/baseline-source/`。
- Fix：state 的 WeakMap owner 只綁真正 ticket/state，numeric fields/schema不變；app 捕捉 copyState 並在 settlement 比對目前 state 實體，不匹配直接 return，不執行任何 DOM side effect。
- Actual integration regression：test/app-fixture.mjs 以 fake DOM/受控 Promise 直接 import 原生 ESM production app.mjs，沒有改寫 app source/imports/callback；test/copy-lifecycle.test.mjs 覆蓋 zh-Hant/en × 舊 resolve/reject × 新 resolve/reject 8組，以及空replacement。比對新 source/chunks/status/busy/全部controls/焦點次數/選取次數；old 回呼後 snapshot 完全相同，新回呼才解鎖/選取fallback。這是 offline controlled integration，非 native browser/clipboard/BFCache。
- test/ui-contract.test.mjs 加入同值ticket owner/clone冒用拒絕；test/toolchain.test.mjs 僅把 task-owned fixtures 根改至R1 evidence，避免寫原 frozen evidence。
- Red literal：`& 'C:/Program Files/nodejs/node.exe' --test test/copy-lifecycle.test.mjs test/ui-contract.test.mjs` → exit1（expected），19項中9FAIL，為8組app回呼及1owner collision；log/command JSON 保留。
- Green same command → exit0，19/19 PASS；after-fix log/JSON保留。
- Trace literal（孵化器 cwd）：`& 'C:/Program Files/nodejs/node.exe' '.runs/text-chunker/m1-r1-20261013/integration-trace.mjs'` → exit0，same numeric tickets、staleAccepted false、8 actual app callback cases PASS。integration-trace.json 保存 OLD!/NEW! 的 OL/NE payload、before/after新DOM及self-settlement。
- Final cwd：`<LOCAL_WORKSPACE>/tool-projects/23-text-chunker`；Node v24.14.0/npm11.9.0，無新依賴。
- `& 'C:/Program Files/nodejs/npm.cmd' test` → exit0，59/59 PASS、0 skip，含A01–A28和完整原toolchain gates；`... npm.cmd run check` → exit0；`... npm.cmd run build` → exit0。final-commands.json與完整logs留證，沒有改gate。
- 真 IAB affected flows：独立R1 tab #4，原tab #1與preview Node28668均保留；zh A😀BC strict/2 → A😀/BC，native copy2實讀BC；limit變更結果/所有copy按鈕清0，limit4 copy實讀A😀BC。en A😀BC strict/2 copy1實讀A😀；320×720以 keyboard prefer-lf/4，ab\ncdEF → ab\n/cdEF，native copy2讀cdEF、docWidth305≤innerWidth320，controls解鎖。兩語reload source空、chunks0、limit280。最後ABCDE→AB/CD/E copy2實讀CD；browser-results.json與3個PNG留證，viewport已reset。
- NOT_RUN 仍保留：真設備 IME/虛擬鍵盤、原生clipboard負向自動selection/pending鎖定、真BFCache與nativepending跨state回呼、實際200%zoom、完整Network/Storage。Controlled integration PASS 不替代這些原生項；原規格與首輪證據未覆寫。
- R1 Windows literal guard：`& '<LOCAL_USER>/.codex/check-persistent-environment.ps1'` before/after PASS、完整SnapShots identical；User/Machine PATH hash/type/length/ephemeral entries與Environment-key/TEMP/TMP fingerprints未變，完整JSON/comparison保留。
- R1 fixed code manifest21files digest `538aeb379eff1e85b1998a14f00dd35e0de9d5e6e6ca0be1d8c3246b41259621`；runtime/dist各8files digest `3608f282455e7f666e967d11121e144463429bd9790a556b976ee77d19aa474c`，bytes完全相同。source-manifest固定全部39source；changes.patch/changes.json記實際diff與scope。Freeze使用R1 evidence的freeze.mjs，未執行仍指舊evidence的scripts/snapshot.mjs。
- Result：CHUNK-M1-R1 修正候選重新凍結，主代理M1重新驗收/正式M2放行仍必要。Requested gpt-6.1-sol/max、backend未獨立確認；完整目標不標complete，source/publication/live/homepage/external review均未完成。

