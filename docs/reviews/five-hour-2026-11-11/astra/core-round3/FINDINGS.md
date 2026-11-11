# 新固定 core 複驗發現

候選 `110e809c15b10004c2aadca6a6649b9324be1419`，PR295，parent `e1c4d5d50b23cd8e9449632d3eb697f217dea305`。55 項候選測試由 reviewer 實跑 exit 0。舊 FH-CORE-A-01 的已知祖先繼承已修；以下是同一來源閉包規則在現有 ready 庫存與後續承接上的缺口。

## FH-CORE-A-02：ready 後才成為已知的祖先 maker，仍能保留自評 ready 並進入 production

**阻止接受新 head。** `scripts/coordination-core.mjs` 的 `knownSpecMakers`（236）現在會動態找歷史 replacement 的來源祖先，但只有新 `mark-spec-ready`（587–599）調用此集合。`validateSpecReadiness`（423–438）只比靜態 `spec.contributors`；`inventorySummary`（456–469）計全部 status=ready；`readyToClaim`（486–499）再次只驗靜態 readiness。因此晚到的來源記錄在下一個 ready 動作之前會被阻擋，若在原 ready 動作之後出現則失效。

可重現的合法順序：

1. A maintenance 已 register/claim/start，來源程式在固定 commit2，但尚未 submit 到 registry。
2. B accepted maintenance 的 source 明確指 commit2。mapping 只列 B，在當下沒有 A 的 candidate 引用可供來源索引辨識。
3. 非作者 reviewer 接受 mapping，primary 套用；A maker 對該文件標 ready。此時 A 尚未被機器解析為祖先。
4. A 以原 claim submit commit2 並由真正其他 reviewer accepted，現在來源祖先 A 已知。
5. `validateRegistry` 仍通過，spec 仍 ready，readiness.reviewerId=A，spec.contributors 未包含 A；inventorySummary 仍把它計 1。
6. 加入 39 份真正各自有非作者 readiness 的 synthetic specs，保留門檻 40 不變；原 spec 的 production register/claim 均通過。最後 claim 經真實 GitHubClient/executeOperation 的離線 fake transport，發出 1 個 synthetic PUT 成功保存。

所有 registry 資料由合法 pure-core operations 生成，沒有修改 task/status/contributors/event 去偽造前提；也沒有真實 actor 冒簽或正式 registry 寫入。[重現入口](late-source-probe.mjs)與[結果](late-source-result.json)。exit 0 表示缺陷成功重現，不是候選 PASS。

補充[四種順序](effective-readiness-probes.mjs)及[結果](effective-readiness-results.json)：ready reviewer 晚成 maker、mapping reviewer 晚成 maker（ready reviewer 仍獨立）、ready 後出現 pending source、ready 後出現 source cycle，都仍計入庫存且允許真 adapter 的 synthetic production claim，各 1 PUT。這四案屬同一缺口。恢復未派工規格的既有新 mapping 流程也已實跑通過，第 1 輪 history 與原 tasks 完全不變；見[恢復語義](RECOVERY-SEMANTICS.md)。

窄修要求：保留歷史 snapshot 可讀，但當前可用庫存與後續 production 承接必須檢查目前已知來源 makers，不能讓已證實非獨立的舊 ready 繼續成為有效庫存。明確提供現有合法流程回到非作者覆核；不可只讓整份 registry 無法 validate、不能只修改這筆 fixture 的 contributors、不能以歷史相容為由允許新 claim。測試需包含「先 ready，再 accepted ancestor」與「先 ready，再出現 submitted-but-unaccepted source」，以及合法獨立 ready 不被無關新紀錄破壞。原 accepted mapping 的歷史證據不得重寫。
