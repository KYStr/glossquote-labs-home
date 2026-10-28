# 自訂文字遮蔽任務證據

狀態：SPEC_ONLY；append-only。產品測試尚未執行。

## TASK-W24-M1-T00：規格要求與初始狀態
- 目標：完成本機雙語 MVP、trie core/測試、source/rules/output UI、原生 copy/download 與 loopback/check/build。
- M1 allowed paths：public/**；scripts/serve.mjs/check.mjs/build.mjs/validation.mjs 及必要 scripts/*.mjs；test/**；package.json；.gitignore；本工具 dist/**。狀態可更新 HANDOFF/project.json/START-HERE/docs/RELEASE-CANDIDATE，TASK-ENTRY append-only。
- M1 acceptance：ACCEPTANCE A01–A36、B01–B13；B01–B03、B06–B08、B11–B13 必驗；320px 必測；200% zoom、原生能力與 Network/Storage 分開記錄，可在工具受限時 NOT_RUN。
- Stop：同路徑他人正在寫、需求矛盾、未知 persistent-state drift、需新權限/依賴/成本、兩次同錯無進展。

- threadId: null（原功能對話待建立）
- Node/commands/exit codes：NOT_RUN
- 自動 tests：NOT_RUN
- 真 browser B01–B13：NOT_RUN
- privacy Network/Storage：NOT_RUN
- Windows environment guard：NOT_RUN
- source manifest/fixed hash：無
- blockers/risks：目前只有 specification
- M1 owner state：awaiting primary review of spec

後續以日期與任務 ID 追加固定輸入、修改 paths、命令、實際結果、NOT_RUN、已知風險；不能以 spec acceptance 表冒充執行證據。

## 2026-10-13 TASK-W24-M1-T00：本機候選凍結

- Owner thread 01a133ac-0e4a-7da3-a243-93f67d0c014a（local）；依 DISPATCH 更新 configuration，requested gpt-6.1-sol/max，backend identity unconfirmed。未委派、未建立其他 chat。
- Deliverable：零依賴靜態繁中/英文本機 MVP，exact schema、有界 trie、source/target/result、native copy/download、clear、preview/check/build 與離線假資料測試；M1 固定候選供主驗。Observable gates：A01–A36、必要 B01–B03/B06–B08/B11–B13、test/check/build、環境不漂移、修改範圍限 M1。
- 新增 public/**、scripts/{serve,check,build,validation,pages,manifest}.mjs、test/{text-redactor,ui-contract,toolchain}.test.mjs、package.json、.gitignore、dist/**。狀態更新 START-HERE、HANDOFF、project.json、docs/RELEASE-CANDIDATE；本檔僅追加。不可修改規格/父級/首頁/他工具/根 Git；DISPATCH 保留。
- 實際 Node v24.14.0、npm 11.9.0。Final literal commands：`& 'C:/Program Files/nodejs/npm.cmd' test`、`& 'C:/Program Files/nodejs/npm.cmd' run check`、`& 'C:/Program Files/nodejs/npm.cmd' run build`；cwd 為本工具。皆 exit 0；44 tests pass、0 fail、0 skip；check publicFiles=8/runtimeDependencies=0；build 8 allowlisted static files。
- A01–A36 PASS；A34 最大 trie nodes 10001、最壞 multi-rule fixture edge checks 19,980,100，<20,000,000；A27/A35 count100000/output1000000 units 精確通過。A36 accessor/symbol/non-enumerable/sparse/noncanonical fixtures getter calls=0，failure 無 output/counts。
- 真 Edge browser：繁中/英文均以 `Anna Ann\nAlice email: a@example.test`、Ann/Anna/a@example.test 取得 `[REDACTED] [REDACTED]\nAlice email: [REDACTED]`，each count1。來源/rule 各變更後舊結果與數量消失，copy/download disabled。Native clipboard click/keyboard 讀回 PASS。Clear cancel/Escape/confirm 及 focus restore PASS。刷新清空、CRLF→textarea LF/emoji 保留、target newline拒絕、未列出 email保留及警告 PASS。
- 實測 copy busy 時瀏覽器 focus 落 body；已修正成功時條件式還原 copy，重新完整純 Tab/typing/Enter 流程到 output/copy/download 並 readback PASS。修正後再跑上列 final gates，未重複無關 expensive gate。
- B08 兩語 native viewport PASS：API request320×740 回報256×592；改 native override400×925 後實測 innerWidth320/innerHeight740、clientWidth=scrollWidth308，所有 visible controls 高度≥44且未越界。對話框寬276/高276.4正常；未注入 CSS zoom，測完已 reset override。
- B05 NOT_RUN：native下載按鈕已嘗試，8秒download event timeout無返回file path，未檢驗落盤name/bytes。B09實際200% browserzoom、B10完整DevTools Network/Storage NOT_RUN（工具無API）；真設備虛擬鍵盤/IME composition/screen reader software NOT_RUN。有限靜態scan、CSP、TextEncoder mechanics 不冒充這些原生驗證。全頁 screenshot 兩次逾時後改 normal viewport；實際文字核對用 DOM values，截圖用於外觀。
- Guard PASS：before/after完整Snapshots unchanged；User PATH ExpandString/834/ephemeral0/hash3efe0b0eba15a12d5555fb191a204ce0048f87381d73108bac1d6d5d05b67ffb；Machine PATH String/1227/ephemeral0/hash52d7cb0c3e02b67714f1b0caefc8f92d5d2c365bb2513dc537d42207d8b56eb8；完整Environment fingerprints及TEMP/TMP均相同。未安裝、讀憑證或改persistent state。
- Evidence：../../.runs/text-redactor/m1-2026-10-13-01a133ac/；initial-files、initial-git-status、initial-root-head、design-brief、npm-test/check/build.log、commands.json、browser-cases.json、screenshots、environment-before/after/comparison、scope-verification、fixed-manifest。Preliminary logs保留；final literal npm test已修正單一參數splat的額外字元並重跑44/44。
- Code digest b9f1a9539f8a184ec201b42d56d8cb57ff44f84e29697147e781e412c5fa1011；runtime digest169709438bbb273b1f62021014c30e8a4f69472ede4318dfeda076ae65134faa；dist digeste0531338d32c6aac5efd0b8571ffcd144cd9c442ba41aa93a1a833df400d3688。Full source inventory與每檔bytes/hash見fixed-manifest；未將hash嵌入被hash文件形成循環。
- Preview實際http://127.0.0.1:4204/index.html與/en/index.html；task-owned session27130仍啟動供主驗。產品local候選凍結，primary acceptance NOT_RUN；M2/source/GitHub固定commitZIP/M3/Cloudflare/首頁/external review全部NOT_RUN。完整功能Goal保持active，未標complete。
- 已用實際send_message_to_thread回報主對話01a0c75e-24c2-76e1-8c70-536ae1ad1fbf；正式M1放行前不進M2。

