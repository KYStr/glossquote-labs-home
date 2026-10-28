# 附件大小分包 M2A 發布準備

2026-10-27（Asia/Taipei）｜B20-47-M2A / RESUME-47-M2A｜**M2A_PREPARED_AWAITING_PRIMARY_REVIEW**。

本輪完成發布配置、正式產物候選標語移除及相關離線驗證。尚未 push、GitHub 公開、部署、更新首頁或交付外驗。M2B 必須由 root 另行具體放行。

## 中斷與復工盤點

用量／routing 中斷前，`evidence/m2a/commands.json` 已完整保存 Node24.14.0、67/67相關測試、check/build:release/check:release 的全部stdout/stderr/exit；各子命令均 exit0。`protected-after.json`、後置環境guard與正式新產物也已產生。復工沒有重跑這些未變更的命令、沒有覆寫任何舊證據，也沒有重建原候選或 preview。

復工補做固定來源與保存檔的 bytes/SHA 檢查，以及缺失的 source-set 封存及交接。`resume-integrity.json` 確認53個source/spec、目前15個artifact、舊15個artifact、61個protected files相符；所有已測source/config的mtime均不晚於已保存命令log，沒有測後來源寫入。此mtime盤點是附加證據，非browser測試。

## 實際 diff

| 類型 | 檔案／變更 |
| --- | --- |
| 新配置 | [wrangler.jsonc](wrangler.jsonc)：僅靜態assets，沒有main/runtime Worker或bindings |
| 新驗證 | [deployment-config.mjs](scripts/deployment-config.mjs)：canonical JSON exact allowlist與package script契約 |
| 更新check | [check.mjs](scripts/check.mjs)：既有preview安全／語法檢查前先驗配置 |
| 更新release | [release.mjs](scripts/release.mjs)、[release-policy.mjs](scripts/release-policy.mjs)、[release-html.mjs](scripts/release-html.mjs)：驗配置、只移除指定span、拒絕標語殘留 |
| 相關測試 | [release.test.mjs](test/release.test.mjs) 更新正式body期望及M2A scratch位置；新增 [deployment-config.test.mjs](test/deployment-config.test.mjs) |
| 證據工具 | [m2a.mjs](scripts/m2a.mjs)：archive／相關verify／seal；副程序shell:false、windowsHide:true |
| 文件／證據 | 本文件、HANDOFF/TASK-ENTRY追加、evidence/m2a；不改舊M1/M1B證據 |
| 正式產物 | 只改 `release-artifacts/site/index.html`、`site/en/index.html`、sibling manifest.json |

相對已凍結M1B source，原檔改動精確為5個：check/release-html/release-policy/release/release.test；新增4個source/config：deployment-config/m2a/deployment-config.test/wrangler.jsonc。package.json、.gitignore、public/**、dist/**、13份規格/docs與其他tests/scripts不變。交接prose及evidence不算進source-set聚合以免循環。

正式兩頁各只精確移除一次：

```html
<span class="candidate">本機候選版；尚未部署</span>
<span class="candidate">Local candidate; not deployed</span>
```

中文正式HTML 6961→6900 bytes，英文7162→7102 bytes。其餘body、功能HTML、SEO、CSP、JS、CSS、robots、sitemap及headers逐byte保持原樣；沒有更改FAQ措辭或加入已上線宣稱。12個非HTML site檔與M1B相同。public/dist仍保留noindex及原候選標語。

## 嚴格靜態配置

Worker name `glossquote-file-bundler`；compatibility_date按本輪指定固定 `2026-10-24`，不追復工當日。唯一route是 `{pattern:"file-bundles.glossquote.com",custom_domain:true}`。workers_dev、preview_urls、send_metrics皆false；observability.enabled、logs.enabled、logs.invocation_logs、traces.enabled皆false。

assets.directory僅 `./release-artifacts/site`，run_worker_first=false，html_handling/not_found_handling均none。build.command精確為既有支援的 `node scripts/release.mjs build`，並與package的build:release值比對；沒有新增未支援旗標或deploy命令。

`.jsonc` 刻意使用canonical JSON子集；拒絕comments、duplicate keys、未知欄位、字串boolean、env override、runtime main、錯domain/path及所有未核准值。這是本專案的嚴格allowlist，未宣稱已執行完整Wrangler CLI/schema或Cloudflare API驗證。沒有安裝依賴、呼叫Wrangler、登入或讀憑證。

欄位核對參照官方 [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) 與 [Invocation Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/#invocation-logs)。本輪明確要求停用觀測與固定日期，優先於Workers skill預設啟用logs/traces與使用今日日期的建議；未因skill建立額外審批或改動使用者決定。

## 舊產物保存

改動前先驗15檔與M1B凍結聚合SHA `422ac6779ef7208e57888530b413726d987b7db3f9f5b21104d3d4afcd3182cf` 相同，再以驗證過的同工具絕對路徑rename整個目錄至 [previous-release-artifacts](evidence/m2a/previous-release-artifacts/manifest.json)。沒有遞迴刪除、沒有覆寫舊artifact或舊manifest。rename後及復工又逐檔核對bytes/hash。[archive.json](evidence/m2a/archive.json) 記錄原15檔，原manifest SHA仍 `3165fc51e9121414ded9d99fa97822b0ec37c6b4e354552acc282dd6f694453d`。

## 實際命令與結果

| 命令／動作 | 實際結果 |
| --- | --- |
| `node scripts/m2a.mjs archive <pwsh> <guard>` | exit0；15檔完整保存（中斷前已完成） |
| `node --version` | exit0，v24.14.0（沿用保存log） |
| `node --test test/release.test.mjs test/deployment-config.test.mjs` | exit0，**67/67**、0 fail/skip/todo（沿用保存log） |
| `npm run check` | exit0，11個preview資產＋strict配置（沿用保存log） |
| `npm run build:release` | exit0，14個site檔（沿用保存log） |
| `npm run check:release` | exit0，完整expected-bytes＋SEO/config驗證（沿用保存log） |
| `node scripts/m2a.mjs seal <pwsh> <guard>` | exit0；新source-set／manifest hash與精確delta（復工補完） |
| `node evidence/m2a/verify-resume.mjs` | exit0；53 source／15新／15舊／61 protected、命令及環境一致（復工補完） |

`<pwsh>` 是既有runtime的完整pwsh路徑，`<guard>` 是 `C:/Users/<LOCAL_USER>/.codex/check-persistent-environment.ps1`。驗證wrapper `m2a verify` 的外層工具回覆受中斷影響未回收；不把它編成新的exit收據。五個實際子命令、後置guard及protected-after均有完整保存證據，故不為補外層回覆而重跑已通過驗證。詳 [commands.json](evidence/m2a/commands.json)。本輪未執行無關64MiB核心套件、full npm test、preview build、browser或server。

67項涵蓋release既有反竄改／確定性與新增配置反例：錯domain、wildcard／額外route、錯assets及traversal、開metrics/observability/logs/invocation/traces、workers.dev/preview、future date、錯name／build旗標、main/env，以及兩語候選span還原並同改manifest。負例皆在M2A任務copy；拒絕後不修復／覆寫原產物。

環境入口、測前／測後、復工前／後快照均與入口相同：User PATH ExpandString/834 chars、Machine PATH String/1227 chars、兩者ephemeral count0；PATH SHA、完整Environment-key fingerprints及TEMP/TMP不變。具體hash保存在 [入口](evidence/m2a/environment-entry.json)、[測前](evidence/m2a/environment-before-checks.json)、[測後](evidence/m2a/environment-after-checks.json)、[復工前](evidence/m2a/environment-resume-before.json)、[復工後](evidence/m2a/environment-resume-after.json)。61個protected files逐檔核對包含public、dist和所有M1/M1B evidence。

## 固定hash與下一步

聚合算法：按相對path排序，串接 `path<TAB>bytes<TAB>sha256<LF>` 再SHA-256。見 [source-set.json](evidence/m2a/source-set.json) 與 [resume-integrity.json](evidence/m2a/resume-integrity.json)。

- Source-set（53檔）：`09a6767793ade734e5adf6f02595a354bab25a2f6993209dd0241777d8a1ac0c`
- Artifact（15檔）：`6f9175c3e5a83dac4944b842ee0de5a1cebe85e1586fa81548b2b410b14a014e`
- 正式manifest本身：`ec2021a4b64b38044f2684135dcf40b47c07517838ba12c74abf5940bfcaa91a`
- Wrangler配置本身：`5609e47a2340d9e24fdb14fb8876d58f01948da5f4cbf9648f347f76f02ff366`

root提供並已核對原browser JSON：Chromium145.0.7632.6，r1＝44 PASS／16 NOT_RUN／2原harness FAIL；真63MiB cancel補驗＝6 PASS／0 failures。root認定原兩FAIL是產品清空input FileList後的transport後置誤斷，已用v5及B完整ZIP/index bytes排除；原始證據不改寫，不能把原r1改稱全PASS。root也已看320px成功圖。以上是root執行的證據，非本輪owner重測。

仍保留AT／真機、原生chooser/save/print/clipboard、真200%放大、20分鐘Ready、製造private晚訊息等NOT_RUN，不宣稱整批外部通過。新配置的CLI/schema與正式hosting行為、路由／headers／首頁整合尚未執行；本輪不GitHub、不deploy、不home、不另ZIP。剩餘動作是root對此固定M2A審查，之後才放行本原對話的M2B公開來源。

## 2026-10-27 追加：發布入口轉址

root要求固定 `_redirects` 解決html_handling:none下的入口路由；本補充只新增 `/`→`/index.html`、`/en`及`/en/`→`/en/index.html` 的三個301規則（真LF、65 bytes）。正式site現15檔，含manifest共16檔；舊M2A十五檔完整保存在 evidence/m2a-entry-redirects/previous-release-artifacts，之前hash及本文件上方紀錄維持歷史。

source變更僅scripts/release.mjs及test/release.test.mjs。原14個site檔與wrangler/public/dist/runtime/CSP/canonical都逐byte相同。相關release tests55/55、check/build:release/check:release均exit0；90個protected files及前後環境相同。未重跑browser或未變的核心／config suite。

最新source-set `8e7c7ea1bc55d62ad7afe198359347aacb727694df1d04a76590b43cc99229bb`、manifest `7bfaadd07f9e7d3ca9bab9006495b60b1c77049e3c03e81624f4a1a52c69dc99`；完整diff/規則/命令/備份及NOT_RUN見 [入口補充證據](evidence/m2a-entry-redirects/README.md)。仍待root複驗，未push/deploy/home。
