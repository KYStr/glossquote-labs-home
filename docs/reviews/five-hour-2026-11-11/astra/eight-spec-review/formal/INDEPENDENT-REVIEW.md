# MAP8 正式八節獨立審查

**建議 accepted：僅此維護映射任務的文件八節。正式 registry review 尚未寫入，apply、ready與產品接受也未執行。**

任務：labs-five-hour-eight-spec-mapping-20261111。候選 [PR324](https://github.com/KYStr/glossquote-labs-home/pull/324)，固定 head **3bc18c8ec3659ad87b3da37b5c7dac59570cb288**，path docs/reviews/five-hour-2026-11-11/eight-spec-mapping/HANDOFF.md。審查者 local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf:/root/five_hour_astra_review，要求Astra/ultra，實際backend未另確認。

## 實際提交綁定

本人親取 [完整r1661登記](https://github.com/KYStr/glossquote-labs-home/blob/c428de646307f415f81e3cb96d134592726af99a/coordination/work-registry.json)，Gitblob **60f62082e21f03d2efa53e94f779c0695b078ec3**。真實owner為 local-codex:01a1c886-768c-7cc1-adb2-bf050f33316b，claim **map8-claim-7c081a14-4a3c-4139-a05d-ea9c38f05ded**，狀態reviewing，未有acceptance。沒有把原來dry-run或本機runtime問題當已登記。

四筆實際命令 r1658–1661：
- register-task：map8-register-task-283e8030-1138-4be7-b865-d04698359196
- claim：map8-claim-7c081a14-4a3c-4139-a05d-ea9c38f05ded
- start：map8-start-244cb5e6-5ff4-4cc3-acaf-c4dec5194e0a
- submit：map8-submit-f2c16143-b5e6-48ea-9059-f4eac2e2b345

本人重算 [四份原命令](registered-commands.json) 的canonical requestHash，逐筆與遠端完整event核對operationId/action/actor/task/revision/observedAt；實際submission的candidate、evidenceRef、evidence、owner、claim全部相符。[完整task](registered-task.json)與[結果](binding-results.json)可反查。

八個 registered specRevisionTargets 精確等於固定mapping materialization：old author/document/source/criteriaHash、替換document/source、mappingRef、sourceMaintenanceTaskIds及72個產品labels均一致；目前八份仍是相同未消耗draft，無specId製作綁定。六個來源維護在當前r1661仍accepted，完整task等於已核SOURCE-HISTORY；current core lineage沒有新增未列或未accepted祖先。這不是僅相信scheduler摘要。

## 八項評分

| 正式預宣告面向 | 分數 | 判斷及可反駁依據 |
|---|---:|---|
| goal | 100 | 八份有具體工作及可觀察輸出；[本人64格矩陣](../prior/semantic-matrix.json)逐工具列目標與假設。 |
| scope | 98 | 包含/排除與相近工具差異清楚。wallpaper/ping續作、savings升級不增庫存；五份僅潛在新庫存，中央去重的時點限制保留。 |
| userFlow | 100 | 操作、修改、取消、重設、錯誤與回復、無效報告等流程明定；既有產品缺陷不偷換為文件規則不明。 |
| inputsOutputs | 100 | 精確schema、容量、首錯、整分/有理數/四捨五入及輸出生命週期完整；既有數值證據與32相同blob相連。 |
| implementation | 100 | 純核心/controller/DOM、Node24零依賴、雙語、可及性、離線命令及Worker/Blob清理方法可實作。這不是產品執行分數。 |
| acceptance | 100 | 72個未來九面向ID/順序/label逐字匹配SPEC；三面向來源維護、八節文件與九項產品審查分離，GUI/部署未驗明示。 |
| tests | 98 | 258字面案及重現步驟有根據；225個provided輸出先前深比對，stock33僅provided成功摘要/ID覆蓋。未把這些當本人新算術。新產品race/URL問題另需回歸。 |
| handoff | 98 | 真owner/claim/提交/固定候選/八targets全綁；實際九位makers排除本人。外層assembler不在核心contributors的結構限制與後續分工明示。 |

逐項英文精確理由和機器格式在 [scores.json](scores.json)。必要八節檢查完成，各項至少90；無新增阻止文件映射接受的缺陷。評分是本人內容裁決，不由腳本或來源maintenance分數代替。

## 所有已知實際製作者與限制

實際排除集合九人：原cloud作者、六位來源維護作者、實際mapping owner，以及root assembler。完整清單在binding-results.json。核心structured contributors共有八人；root assembler在固定SOURCE-HISTORY及本次實際submission evidence中以actor、task、claim具名：
- actor local-codex:01a0c75e-24c2-76e1-8c70-536ae1ad1fbf
- task labs-five-hour-coordination-20261111-v2
- claim five-hour-claim-26cb82aa-16ea-4818-bedd-9d931f911ffb

本人另把此外層整合者加入排除集合，並核其協調claim真實有效；本人不在全部九人中。**不能聲稱目前核心會自動把外層assembler納contributors或自動防止其自評**；本次靠已公開/提交的明確事實與獨立reviewer身分滿足實際隔離，不改核心、手填contributors或隱去真實整合者。

## 執行、沿用與未驗

新跑 [verify-task-binding.mjs](verify-task-binding.mjs)：Node v24.14.0 exit0；10固定輸入、4命令hash、8targets、8結構化makers加1外層assembler、本人current ACK、已合併core，純記憶體review可接受且specs完全不變。可攜入口見 [README](README.md)。正式write另須明示writer slot、新鮮registry/CAS與exact readback；PRhead與CAS是分開請求，不是假稱單一原子交易。

沿用 [PR326預審固定4e89a9a](https://github.com/KYStr/glossquote-labs-home/blob/4e89a9acd1dbb02790495c0fe0fcfb447c456a4b/docs/reviews/five-hour-2026-11-11/astra/eight-spec-review/INDEPENDENT-PREFLIGHT.md)：86pins、38候選、32相同規格檔、33來源、72labels、134相對連結、64格實質內容。這些相同bytes未重算，當前新驗的是正式task/來源閉包/事件綁定。225 peer輸出與33摘要是provided數值證據，來源標示保持原樣。

獨立產品檢查 [PR329固定15cee03](https://github.com/KYStr/glossquote-labs-home/tree/15cee03ae514ad0431560ee61a1038b8e60a80fa/docs/reviews/five-hour-2026-11-11/astra) 記錄舊controller晚回覆與Worker建構失敗URL清理缺陷。它們不被本文件分數洗成產品PASS；wallpaper/ping仍既有候選續作，產品必要回歸由各真正owner另行處理。未測GUI、真browser、下載、實際SEO、部署或外驗，維持NOT_RUN_USER_FOCUS_INCIDENT。

## 後續庫存

本審查後仍需root合法apply八份、維持draft，再由非作者獨立ready。wallpaper、ping、savings始終排除新ready。breakeven、markup-margin、tax-included、stock-profit、baking-pan五份僅在fresh中央去重與未消耗核對通過後可能ready；[PR308固定去重證據](https://github.com/KYStr/glossquote-labs-home/blob/6ea34a76eb0e77128d5a45cbd7e2c34a6a68827e/docs/reviews/five-hour-2026-11-11/spec-review-03/next-five-dedup/REPORT.md)為provided來源，不能把當時293 PR清單說成現在強一致全庫。沒有新增產品接受、合併、部署或registry寫入。

