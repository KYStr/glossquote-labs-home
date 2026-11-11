# FH-QC-A 規格維護套用：最窄協作核心設計意見

本文件為獨立 reviewer 的設計建議，未改核心或 registry，未代簽任何 actor。基準是讀取 GitHub 的 registry r1530（blob e01da965f28e5248ca13158094ca356254a25c2b）與 scripts/coordination-core.mjs（blob 4782dd1f249995ceeec00b2d0a89b57d9b9bbb7d）。提交實作或執行操作前仍須重新讀取最新遠端。使用者已授權不等待原作者的獨立維護；此建議把該授權變成受限、可測的協作操作，而非要求重新授權。

## 已核實的阻止 ready 問題

九份 spec 均仍為 draft、authorId 為原 cloud actor；spec.document 及原 spec 任務 submission 仍指各自原 commit，沒有指向 PR283 的 448bd9fc9865fe65f6014b66f4a2e2d54b76f539。九份均無任何 task.specId 引用，現在尚可修正未派工的產品契約。

九份 spec.acceptanceCriteria 全是 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff 八個文件審查項。它們是原 spec 製作任務的合理 rubric，卻不應成為 production 的 acceptanceCriteria。core 第 101–103、285–287 行要求 production criteria 與 spec 完全一致；若直接 ready 並派工，產品會繼承八個文件欄位而漏掉各 SPEC 的九個產品面向。正式 ready 前需將 spec criteria 改為該固定 SPEC 的 functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility，保留各工具自己的可反駁 label。原 spec task 的八節 rubric 和 submission 不改。

現行 revise-spec（261–268 行）只允許 spec.authorId 本人，且任何 task.specId 引用即凍結。accept-handoff（356–364 行）只移交 task.owner，不會改 spec.authorId。mark-spec-ready（271–275、115–120 行）沒有新候選參數，也只排除原作者，不能憑 PR283 的文字證據替舊 document 放行。review（377–385 行）精確匹配 task.submission.candidate。已 accepted 的 labs-run5-legacy-repair-20261110 只有 repair-correctness/source-provenance/status-delivery 三項，不等於九份文件八節實審。

不可行的捷徑：借原作者 ID 執行 revise；改原 task owner/submission；直接改 JSON；另建重複 spec ID/path；拿三面向 maintenance accepted 當八節 ready；mark-ready 的 evidence 雖寫新 commit 卻讓 document 留在舊 commit。

## 建議操作 apply-spec-maintenance

只新增一個「套用已驗收維護到未派工規格」操作，不泛化為移轉作者或任意管理員改寫。

1. 執行者必須是經審核核心／固定政策明定的 primary actor，且本人已有當前 ACK。權限不可由 command.actor.role、自述字串、一般 acknowledge 額外欄位或可一般 reconcile 改寫的 actorId 推導。可採明確常數或同 PR 固定的受限政策；不讀憑證、不建立新帳號權限。工具呼叫者必須仍為實際 primary。
2. 採現有 expectedRevision、operationId、requestHash、CAS/readback；另要求 expectedAuthorId、expectedDocument、expectedSource、expectedCriteriaHash 全等於當前值。避免規格在其他合法修訂後仍被舊維護覆寫。拒絕無差異套用。
3. spec.status 只允許 draft/ready/invalid；consumedBy 必須為 null；registry.tasks 不能有任何 task.specId 指向它，包含 ready/released 等狀態，不能只查正在 working。
4. 保持同 spec.id、authorId、title、repository 與 document.path；本輪 document.path 限定 docs/specs/<slug>/SPEC.md。source 的 path 也應保持原固定來源用途，不准藉此改成另一工具。只替換已核定的新 refs、產品 criteria，追加維護來源。
5. maintenanceTaskId 必須指向 maintenance 且 status=accepted。其 owner、contributors、submission、acceptance 均保留，submission.candidate 與 acceptance.candidate 必須完整相同，驗收 reviewer 不得是該任務 maker。new document/source 必須在該 accepted candidate 的同 repo/同 commit。
6. 不允許拿任意 accepted maintenance 來修任意 spec。最清楚的可測方式：maintenance 註冊前即含結構化 specRevisionTargets，每項固定 specId、舊 refs/author/criteriaHash、同路徑的新候選範圍；register-task/validateRegistry 需驗證此欄，套用操作必須命中它。完整新 refs 和九項產品 criteria 應在 accepted 固定候選的修訂映射內可核對。若本輪已登記的修正任務沒有此欄，保留其成果，另以真實責任登記一份窄範圍的「規格維護映射與八節覆核」任務，不回改既有已提交任務。
7. 追加 append-only maintenanceHistory：完整舊 document/source/criteria/readiness/status 快照、新 refs、新 criteria、操作人、actual maker/contributors、maintenance task/claim/submission、獨立 acceptance reviewer/evidenceRef、operationId/time。保持原 spec author 與原所有 tasks/PR/claims。最後將 status 設 draft、readiness 設 null，不能直接 ready。
8. spec 增加 contributors（或等義欄位），至少包含原作者及各次維護 task 的所有 maker/contributors。validateSpecReadiness 和 mark-spec-ready 一併拒絕任一歷任 maker 自評。僅做 metadata 套用的 primary 不必虛構為產品作者；若其實編修過，必須從 maintenance contributors 如實加入。不可只排除原 author 而漏掉修者。
9. 套用後由非原作者、非歷任維護 maker 的實際 reviewer 讀新固定 refs、重用相同 bytes 的既有證據、重驗受影響部分並核對完整八節。八節俱全才本人 mark-spec-ready。此步不需要尚不存在的產品 GUI，也不把 maintenance 三面向轉成產品九面向。
10. operationReferences 必須加上 maintenance task 的 source/brief/submission candidate/acceptance evidenceRef，以及舊／新 spec refs、固定修訂映射，使現行 GitHub adapter 先讀回其存在與固定 bytes。純核心不能聲稱已自行查 GitHub；保留 adapter 和人類可審的八節證據角色。

若要將第 6 點限制在本輪九份／已知維護任務，明確 allowlist 比新增可任意自授權的角色管理更小。不要順便改 baseline、production 容量、ready 門檻、原 owner 或一般 task handoff 規則。

## 最小必要測試矩陣

正向：真 primary + fresh ACK + 未派工 draft + exact expected state + 已獨立 accepted 的匹配 maintenance → 只改目標 spec 的新 refs/九項產品 criteria、清 readiness、保留作者/歷史，舊 task bytes 不變；獨立 reviewer 後續可 ready。ready/invalid 合法入口亦確認回 draft。

負向：
- 非 primary、偽 role、未 ACK、stale contract/baseline。
- stale revision、expected author/ref/criteriaHash 任一不符、無差異操作。
- consumed/reserved 或任何 task.specId 引用、non-null consumedBy。
- maintenance 非 maintenance、未 accepted、缺 acceptance、candidate 不同、maker 自評、未預宣告 target、越界 spec/path/repo/commit。
- 九產品 criteria 缺項/重複/拿八文件或三維護 rubric 代替；spec 舊歷史或其他 task/owner 被改。
- 原作者、任一歷任 maker、任一維護 contributor 在新 document 上 mark-ready 均拒絕；真正非作者可操作。
- 同 operationId 同內容重放不增加事件/歷史；同 ID 異內容拒絕；batch 部分重放、CAS 衝突維持現行語義。
- operationReferences 涵蓋所有固定關聯 refs；adapter 缺檔／讀回 head 變動不得寫。
- r1530 原 registry 及現有測試不受新可選欄位影響；舊 accepted 記錄不改、不回補假分數。

需要由原真實修正 owner 提交獨立核心 PR／測試／規則說明，再由本 reviewer 對固定候選獨審；未完成前以上只是可實作設計，不是現行規則已允許該操作。

