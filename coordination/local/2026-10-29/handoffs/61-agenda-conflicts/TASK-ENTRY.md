# B20-61-M1 — 多軌議程衝突檢查

日期：2026-10-23（Asia/Taipei）。本次只做 M1；不開 chat、不委派、不切模型、不啟動 server/browser、不公開來源或部署。

已讀根 AGENTS、安全基線、產品 thesis、完整共通設計契約，以及本工具 14 份規格與契約（含五份 docs）。唯讀規格保持不變。requested 配置為 gpt-6.1-sol/max；backend 未獨立驗證。

## 可觀察完成結果

空白起始的雙語本地候選可建立房間、講者和場次，逐一檢查全部 pair，顯示合併重疊原因、轉場不足、未指派覆蓋缺口與完整資源議程，產生固定名稱 JSON/TXT。Node 核心與生命週期測試、check、封閉 allowlist build 通過；固定來源 bytes/SHA-256 和逐項驗收記於 evidence/m1。真實 browser gate 獨立保留未跑。

## 介面決策

Product App 模式；主要使用者為公告前檢查單日多軌活動的主辦人。使用原生表單直接編輯，主畫布是衝突清單與議程，無預載假衝突。頻繁：新增/編輯場次、檢查、取消；相鄰：資源選擇/移除、結果視圖與下載；較少使用：清除確認及使用說明。使用系統字型與家族 tokens。

Wide：`[設定/場次，固定窄欄] [結果/coverage/pairs/資源議程，彈性主畫布]`。
Compact：`[場次與資源 | 檢查結果]` 明示頁籤；場次欄位直向，pair 每組直向，功能保持可達。Standard 提前疊為同樣顯式頁籤，避免窄畫布。

## 例行技術決策與限制

- raw schema：`{rooms:string[], speakers:string[], sessions:[{id,title,roomIndex,speakerIndexes,start,end}], transitionMinutes?}`。ref 是 index，空 room 為 null。省略 transition 預設10；不接受字串假裝整數。
- Registry 名稱 NFC+trim；title 保留文字但拒空白/不合法 Unicode。ID 不默默 trim 或修復。未知欄位拒絕。
- 核心以原輸入次序列舉 i<j，共同講者以 registry 次序輸出，資源議程以 start/end/原列序排序。
- 清除採頁內明確確認區，不呼叫 OS/native dialog；移除資源會明示解除對應指派。
- TASKS T07 寫離線 HTTP，但本次派送明確禁止啟動 server。交付 dev 的 pure request routing/response 測試與安全實作；實際 HTTP/listen 為 `NOT_RUN_SCOPE_NO_SERVER`，不假算 PASS。
- 沒有真實 browser 執行。Node 的 worker 排程/主執行緒 generation 測試僅證明純 JS 契約；B01–B04 為 `NOT_RUN_USER_FOCUS_INCIDENT`。

最終命令、檔案和已知限制見 [HANDOFF.md](HANDOFF.md)。

## 2026-10-23 追加 — B20-RP-61 / M1B

已完整讀本輪 `.runs/batch20-release-prep-2026-10-23/TASK.md`。完成零依賴離線正式候選產生／檢查：`node scripts/release.mjs build|check`，對應build:release/check:release；固定預定origin `https://agenda-check.glossquote.com` 與slug `agenda-conflicts`，不接受任意參數／環境origin。

本輪只改package/.gitignore、scripts、test與三份交接文件，產物／新證據各在release-artifacts與evidence/m1b。public/dist/舊M1 evidence共40檔bytes/SHA-256前後不變。既有test工具鏈的暫存root移到m1b；產品runtime及原M1 preview未改。

針對性25項測試通過；最終一次完整npm test為108/108，check/build:release/check:release全部exit0。site 11檔、81,255 bytes；完整env snapshots前後相同。來源／產物與實際命令見 [M1B-RELEASE.md](M1B-RELEASE.md)、[HANDOFF.md](HANDOFF.md) 的本輪追加及 [凍結清單](evidence/m1b/candidate-manifest.json)。

requested為gpt-6.1-sol/max，backend未獨立確認；未切模型、未委派或開chat。本輪不是M2放行；browser/native與實際hosting headers未驗，不GitHub、不部署、不動首頁，不新增權限。主代理後續驗收使用release-artifacts/site站點根，並獨立決定browser與下一階段。

## 2026-10-27 追加 — B20-61-M2A

root已執行b20-61-r1：36 PASS／6 NOT_RUN／0 FAIL、prohibited[]、exact parent cleanup PASS。本owner已讀實際結果；本輪不再啟動browser，六個zoom／舊訊息注入／原生AT子項仍NOT_RUN。

完成固定assets-only wrangler.jsonc（agenda-check.glossquote.com、指定metrics/logs/traces全false、無Worker/vars/bindings、HTML/notFound none、run_worker_first false），加入三條精確LF 301，正式兩語只剝完整候選footer。configFiles納入closed release manifest；不改public/runtime/核心/SEO/CSP。舊M1B產物驗後移到本輪owner previous-release-artifacts，未放寬builder的覆寫／拒絕規則。

本輪允許範圍只有本工具與 `.runs/batch20-completion-2026-10-27/owner-61-release/`，無外部寫入／委派。適當針對性32/32與最終115/115測試通過，check/build/build:release/check:release皆exit0，完整Windows env snapshots相同。新正式site12檔／81,271 bytes，preview8檔／79,829 bytes不變。

見 [M2A-RELEASE.md](M2A-RELEASE.md)、HANDOFF本輪追加及 [固定來源／產物清單](../../.runs/batch20-completion-2026-10-27/owner-61-release/candidate-manifest.json)。只交root獨立驗收；沒有push、deploy、首頁整合或外驗完成聲明，沒有使用憑證或改動持久系統/Git設定。

## 2026-10-27 追加 — M2A-F1

依root精確契約，只把compatibility_date從2026-10-27改為2026-10-24，更新對應policy／測試與必要文件；新增拒絕舊日期的回歸輸入。其他config、runtime/public、SEO/CSP與所有site bytes不變。舊M2A來源／artifacts及歷史證據保留，新紀錄只在owner-61-release-r1。

受影響測試32/32、check/build/build:release/check:release全部exit0，完整Windows snapshots相同；未重跑未變核心115項、未操作browser/UI／憑證／系統設定／Git/auth、未push/deploy。見 [r1固定候選](../../.runs/batch20-completion-2026-10-27/owner-61-release-r1/candidate-manifest.json) 與HANDOFF本輪追加。待root primary-fixes/61-r1再驗後才進M2B。
