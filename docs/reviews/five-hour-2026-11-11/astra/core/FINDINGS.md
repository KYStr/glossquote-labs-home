# Core 固定候選阻擋項

受審候選：[PR295](https://github.com/KYStr/glossquote-labs-home/pull/295)，`e1c4d5d50b23cd8e9449632d3eb697f217dea305`。原 49 項離線測試由本 reviewer 實跑 exit 0；以下缺口由另外的獨立 fixture 重現，不能用原 49 PASS 覆蓋。

## FH-CORE-A-01：省略已知上游維護會讓歷任製作者自評

**阻止接受。** 位置：`scripts/coordination-core.mjs` 175–180、183–188、201–207、594–600、699–704；`scripts/coordination.mjs` 111–129。

重現鏈是「原規格 → accepted maintenance A → 來源明確指 A commit 的 accepted maintenance B → mapping 只列 B」。A 與 B 都在同份 registry，A 的實際 maker／claim／accepted candidate 已知。新文件 bytes 完全等於 B 的固定候選，但 B 延續 A 的修訂。這不是要求根據無法取得的隱藏 Git 歷史猜作者。

目前 `sourceMaintenanceTasks` 只解析明列 IDs，`taskMakers` 只取該任務直接 contributors／owner／submission.author。`knownSpecMakers` 只追加 workType=spec 的製作者，未追回既知 maintenance 祖先。A maker 因而沒有進 mapping contributors；同一 A maker 可將 mapping 評 accepted，套用後也沒有進 spec.contributors，接著可 `mark-spec-ready`。所有操作與 `validateRegistry` 均成功。

可反駁證據：

- [reproduce-omitted-ancestor.mjs](reproduce-omitted-ancestor.mjs) → [omitted-ancestor-result.json](omitted-ancestor-result.json)：純核心合法操作重現，沒有手改正式 registry。
- [reproduce-ancestor-adapter.mjs](reproduce-ancestor-adapter.mjs) → [omitted-ancestor-adapter-result.json](omitted-ancestor-adapter-result.json)：使用候選真正的 GitHubClient／executeOperation，注入本 reviewer 的 [fake-github.mjs](fake-github.mjs) 離線 transport。固定 mapping JSON、Git blob/base64、來源 bytes、PR head 與 CAS 檢查全開；register/claim/start/submit/review/apply/ready 的 7 次 synthetic PUT 全部 saved。
- fixture 與 actors 全是 [independent-fixtures.mjs](independent-fixtures.mjs) 的明示假資料；硬編 primary ID 只用來測候選既有角色比較，沒有冒簽、真憑證、網路或正式 claim。

預期：登記時繼承 registry 已知且可追溯的上游來源 maintenance makers，或拒絕省略的來源閉包；review、apply、readiness 與歷史驗證須保持同一集合。至少涵蓋 A→B→mapping、來源原 owner／曾任 contributor、循環／重複防護及跨第二輪維護的保留。不能只在測例手填 A contributor，也不能要求 reviewer 在不受機器核對的敘述欄位自行補救。

實際關聯：本輪已接受 `labs-run5-legacy-repair-20261110` 的候選為 `448bd9fc9865fe65f6014b66f4a2e2d54b76f539`；已接受 `labs-five-hour-precision-repair-20261111` 的 source 正指該 commit、候選為 `23fa1265837f66fbedc04441db260dbb2a5ed924`。只列後者就有相同的前輪 maker 漏繼承風險。此處只讀歷史，沒有以任一既有作者身分測試或寫入。

兩支 reproduction 的 exit 0 代表「缺陷按預期成功重現」，不是驗收 PASS。修正仍由原 core owner 完成；本 reviewer 不修改候選。
