# Core 固定最終候選：獨立複驗

**判定：三項必要維護面向各 100 分，建議接受固定候選。FH-CORE-A-01、FH-CORE-A-02 均已關閉，未發現新增阻擋。** 本文件是獨立技術評估；本人尚未執行本 task 的正式 registry review，不代表已 merged、套用規格或 ready。

候選：[PR295](https://github.com/KYStr/glossquote-labs-home/pull/295)，head `93595abc7b2f9c46a07aaaa74418b3882c8901b4`，唯一 parent `110e809c15b10004c2aadca6a6649b9324be1419`。六個公開候選檔都實讀 Git blob bytes；本次 delta 僅 commands、core、test 三檔。任務 `labs-five-hour-spec-maintenance-core-20261111`；原 maker/claim 保留。詳見 [固定版本](candidate-ref.json)、[輸入清單](input-manifest.json)與[下載讀回](download-verification.json)。

Reviewer：`local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review`。依派工為 Astra/ultra；未另確認實際 backend。未製作或修改候選、未借用 root 或 maker 身分。測試使用明示 synthetic actors；硬編 primary ID 僅在記憶體假 registry 測既有角色比較，沒有冒簽正式操作。

| 預宣告面向 | 分數 | 可反駁證據 |
| --- | ---: | --- |
| core-transition-correctness | 100 | A02 五型當前資格均以共同 effective gate 阻擋新 ready/register/claim；舊歷史仍 validate，既有 owner/claim/consumedBy/readiness 不被改寫。五型依既有新 mapping→accept→apply→ready→production 路徑恢復，各全 adapter 9 synthetic PUT，舊 task 與第一輪 history 精確保留。無新增 invalidate 權限。 |
| scope-owner-provenance | 100 | A01 的來源祖先、同 commit 不同 path/多記錄、曾任與現任 owner、DAG、多規格父來源、pending/cycle、直接 bytes 來源限制等 12 個獨立案例維持通過。A02 同時驗 mapping reviewer 與 ready reviewer、缺漏目前 maker；無關新來源不誤傷。40 ID、5-held/1-working、原身份與範圍沿用固定已審內容，policy literal 再確認不變。 |
| test-and-adapter-evidence | 100 | 本人 Node24 實跑獨立 12+13=25 案，全部 exit0；五型 register 與合法預先登記 task 的 claim 在 adapter PUT 前拒絕，無真網路/憑證/registry write。主統籌另外實跑完整候選 58/58、exit0；本人讀取其 receipt/full stdout 並逐位元比對六份受測來源與自己的公開下載，明確歸屬 primary，不列為本人執行。 |

本人的實跑命令：

```sh
node prepare-independent.mjs
node recheck-source-chain.mjs
node verify-effective-readiness.mjs
```

先由 `fetch-inputs.mjs` 取得並驗證 13 個固定輸入，包含六候選、三個 parent 差異對照、上輪 reviewer 的兩個 oracle 模組及兩支固定案例腳本。`prepare-independent.mjs` 原樣擷取上輪 A02 fixture builders，只加 export；A01 的 12 個測試 bodies/assertions 全未改，只更新結果的 candidate/scope 標記。[可核對 provenance](fixture-provenance.json)。不是把作者測試改成自己的 oracle。

獨立結果分開記錄：[A01 12/12](source-chain-results.json)與[A02/恢復 13/13](effective-readiness-results.json)。完整 58 項套件由 primary 執行：[其 receipt](primary-suite-receipt.json)、[其 stdout](primary-suite.stdout.txt)、[本人對來源與記錄的讀回](primary-evidence-readback.json)。上輪原 49/55 套件、一般 CAS/八章九面向/舊快照等已通過且未變的證據沿用，不把前輪測試冒稱本 head 的本人重跑。

五型拒絕與恢復的實質結果：

| 後知狀態 | 明確拒絕碼 | 有效庫存 | 後續恢復條件 |
| --- | --- | --- | --- |
| ready reviewer 晚成 maker | INDEPENDENT_REVIEW_REQUIRED | 40→39 | 新完整 mapping 與非作者再覆核 |
| mapping reviewer 晚成 maker | MAPPING_REVIEW_CONFLICT | 40→39 | 新 mapping acceptance；不能只換 ready reviewer |
| 來源尚未 accepted | MAINTENANCE_SOURCE_PENDING | 40→39 | 來源先由非作者 accepted，再新 mapping |
| 來源形成 cycle | MAINTENANCE_SOURCE_CYCLE | 40→39 | 另有已獨審、無循環且 bytes 精確的來源候選，再新 mapping |
| 兩位 reviewer 仍獨立但 mapping 缺新 maker | MAINTENANCE_SOURCE_STALE | 40→39 | 新 mapping 納入完整 maker 集合 |

每型均驗：歷史 registry 可以 validate；原 specs/mapping task/預先登記 production task 完全不變；pure core 與 adapter 同時拒絕新 production register/claim，兩種拒絕各 0 PUT。另驗 draft 不能換個 reviewer 跳過缺漏 mapping，無關來源不改有效 ready，原有 claim 保留但自行 release 後不能用 stale readiness reclaim。

五條恢復均走真候選 GitHubClient/executeOperation 與本 reviewer 假 transport，mapping JSON、Git blob/base64、直接來源 bytes、PR head 與 CAS 檢查開啟。新 task 正常 claim/start/submit，祖先 maker 的 mapping review 與 ready 都拒絕；真正非作者 accepted，primary apply 回 draft、清 readiness，再獨立 ready 恢復 40 份有效庫存，production claim 成功。每型 9 次成功 synthetic PUT；所有原 task、history[0]、原 readiness 的歷史快照逐欄位保留。

必要限制：指定 primary 仍是協作身分比對，不是額外認證；GitHub 寫入權限與真實 actor 追溯沿用既有程序。PR head 檢查與 registry CAS 是分開 HTTP 動作，沒有跨 ref 交易原子性。當前來源閉包以 registry 的固定來源紀錄解析；沒有對應紀錄的外部作者仍須內容 reviewer 核對。舊已派工規格的凍結與既有 claim 保留；新資訊使其資格失效時，不能本輪暗自換 owner 或解除凍結。產品 GUI、部署、spec 八節 readiness 都不是這個 backend 維護 acceptance，也沒有被執行或宣稱通過。

Windows guard 前後完整永久環境相同，[公開摘要](environment-summary.json)不含私人路徑/原始 fingerprint；子行程 windowsHide:true，沒有桌面、鍵鼠/IME/clipboard、原生對話、憑證讀取或安裝。舊 [PR300](https://github.com/KYStr/glossquote-labs-home/pull/300) 與 [PR307](https://github.com/KYStr/glossquote-labs-home/pull/307) 的退修報告、分數與固定 heads 保留。本候選可進入原 claim 正式交驗及本人獨立 registry review 排程；未給 slot 前不寫入。
