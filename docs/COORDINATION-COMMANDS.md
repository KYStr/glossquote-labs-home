# 共用工作登記：命令與資料格式

這是 [協作規則](CLOUD-LOCAL-WORKFLOW.md) 的執行參考。規則以 [`scripts/coordination-core.mjs`](../scripts/coordination-core.mjs) 的驗證為準；GitHub 的 [`coordination/work-registry.json`](../coordination/work-registry.json) 是唯一承接登記。

**以下 JSON 全是格式示例。所有 `REPLACE_...`、範例 ID、revision、時間、證據與分數都必須換成實讀資料；不是可直接寫入正式登記的任務，也不是已有確認或驗收。** 不得建立假 actor、代替原統籌確認或為了通過檢查填造分數。

## 讀取、驗證、提交

使用 Node.js 24 以上；不需要額外 npm 相依套件。

```sh
node scripts/coordination.mjs read
node scripts/coordination.mjs validate coordination/work-registry.json
node scripts/coordination.mjs apply < command.json
```

PowerShell 的寫入方式：

```powershell
Get-Content -Raw -Encoding UTF8 .\command.json | node .\scripts\coordination.mjs apply
```

`read` 讀 GitHub 遠端並回傳 registry、blob SHA、庫存推導。`validate` 只驗證指定本地 JSON，沒有寫入或同步效果。`apply` 讀一次最新遠端，執行純狀態轉換，核實引用的 GitHub 檔案存在，再以最新 blob SHA 做最多一次 conditional PUT，最後讀回精確操作。

寫入使用執行環境中已有的 `GH_TOKEN` 或 `GITHUB_TOKEN`。沒有已授權憑證時停止並說明，不把 token 放在 command.json、命令列參數、提示詞、repo 或日誌。雲端只有 GitHub connector 時，可用 `fetch_file` → 核心 `applyOperation` 驗證 → `update_file` 帶最新 blob SHA → 讀回同一 event 的等價流程；不得省略驗證或使用 force push。

### 每個 command.json 的共同欄位

先從 `read` 得到當前 revision，再以真實執行者建立以下外層；下一節各 action 的欄位加入同一個物件。

```json
{
  "operationId": "REPLACE_WITH_A_UNIQUE_OPERATION_ID",
  "expectedRevision": 0,
  "observedAt": "REPLACE_WITH_ACTUAL_UTC_ISO_TIME_WITH_MILLISECONDS",
  "actor": {
    "id": "local-codex:REPLACE_WITH_ACTUAL_CONVERSATION_OR_RUN_ID",
    "executor": "local-codex"
  },
  "action": "REPLACE_WITH_ACTION"
}
```

雲端 `actor.id` 使用 `cloud-dot:<實際對話識別>:<實際代理路徑>`，`executor` 使用 `cloud-dot`。同一 actor ID 不能換執行環境；`/root`、`maker1` 與共用 GitHub 使用者名稱都不能單獨識別代理。這是明確的自我識別與可追溯證據，不是 GitHub 自動認證某個 AI 執行緒的身分。

`operationId` 是這次狀態變更的去重鍵，不是實際 run ID。只有**完全相同命令**的結果不明重查才沿用；改了欄位卻沿用鍵會被拒絕。遇到 revision／blob SHA 衝突要讀現況並重新判斷，不得只換 SHA 搶寫。

### GitHub 固定引用

`source`、`brief`、`document`、`homepage`、`candidate`、`evidenceRef` 都用相同格式：

```json
{
  "repository": "REPLACE_OWNER/REPLACE_REPOSITORY",
  "commit": "REPLACE_WITH_EXACT_40_CHARACTER_COMMIT_SHA",
  "path": "REPLACE_WITH_EXISTING_RELATIVE_FILE_PATH"
}
```

必須先把檔案推上 GitHub，確認遠端確實存在再引用；分支名、local path 與只存在對話裡的內容都不符合。候選的 PR head 也必須是該 commit，候選更新就要重交、重審。

## 首次接入與盤點

### 1. acknowledge：執行者確認目前規則

加入外層的 action 欄位：

```json
{
  "action": "acknowledge",
  "contractVersion": "REPLACE_WITH_CURRENT_REGISTRY_CONTRACT_VERSION",
  "baselineCommit": "REPLACE_WITH_CURRENT_REGISTRY_HOMEPAGE_COMMIT",
  "evidence": "REPLACE_WITH_WHAT_THIS_ACTUAL_ACTOR_READ_AND_CONFIRMED"
}
```

必須每位實際參與者各自確認，包含 reviewer。確認不代表已開始工作，也不代表另一個本地／雲端對話已讀到。

### 2. 既有工作：先註冊，再 adopt-existing

先把來源、預案／brief 與既有進度證據推上 GitHub，依下方 action 表 `register-spec`、`register-task` 建立穩定 ID，再由原承接者執行：

```json
{
  "action": "adopt-existing",
  "taskId": "REPLACE_WITH_REGISTERED_EXISTING_TASK_ID",
  "pendingId": "REPLACE_WITH_MATCHING_PENDING_RECONCILIATION_ID",
  "checkpoint": "REPLACE_WITH_THE_ACTUAL_PAUSED_CHECKPOINT_AND_NEXT_STEP",
  "evidence": "REPLACE_WITH_PROOF_THIS_ACTOR_ALREADY_OWNED_THIS_WORK",
  "evidenceRef": {
    "repository": "REPLACE_OWNER/REPLACE_REPOSITORY",
    "commit": "REPLACE_WITH_EXACT_40_CHARACTER_COMMIT_SHA",
    "path": "REPLACE_WITH_EXISTING_HANDOFF_FILE"
  }
}
```

沒有對應 `pendingReconciliationTasks` 項目時省略 `pendingId`。有項目則必須連到正確舊工作，不能用別件工作消掉盤點缺口。匯入只在兩端尚未盤點完成時允許，工作會保留原 owner 並先 blocked。未完成的舊預案保留為 `reserved`，不計庫存；補好並獨立核對後才轉成該任務已消耗的 `consumed`，完成盤點後才可 resume。

### 3. reconcile：各端提交完整盤點

```json
{
  "action": "reconcile",
  "inventoryComplete": true,
  "taskIds": ["REPLACE_WITH_EVERY_ACTUAL_REGISTERED_TASK_IN_THIS_ENVIRONMENT"],
  "specIds": ["REPLACE_WITH_EVERY_ACTUAL_REGISTERED_SPEC_IN_THIS_INVENTORY"],
  "evidence": "REPLACE_WITH_INVENTORY_SCOPE_FINDINGS_AND_RESOLVED_DUPLICATES",
  "evidenceRef": {
    "repository": "REPLACE_OWNER/REPLACE_REPOSITORY",
    "commit": "REPLACE_WITH_EXACT_40_CHARACTER_COMMIT_SHA",
    "path": "REPLACE_WITH_THE_COMMITTED_INVENTORY_REPORT"
  }
}
```

只有真的盤點完整才可 true；未完成請填 false。沒有某類資料才填空陣列，不能用空陣列掩蓋未查明事項。兩端都完成、所有已知舊工作都完成連結且 ACK 版本有效時，才推導已知庫存與開放新 claim。

若本地有新的主頁基線，先推上 GitHub，再用 `change-baseline` 記錄新 `homepage`、`evidence` 與 `evidenceRef`。它會使舊 ACK 不再適用、兩端 reconciliation 清空，要求各端讀新基線並重新確認；不要直接覆蓋遠端主頁或假稱舊基線已包含本地修改。

## 承接、執行、交驗

### claim 與 start 分開

```json
{
  "action": "claim",
  "taskId": "REPLACE_WITH_READY_OR_EXPLICITLY_RELEASED_TASK_ID"
}
```

claim 成功 receipt 必須 `saved: true`、精確 owner/claimId 相符，且 `workMayStart: true`。claimId 就是該次成功 claim 的 operationId。正式製作的預案在同一原子寫入中消耗；製作仍為 P3。沒有真實開始證據時，不發 start。

```json
{
  "action": "start",
  "taskId": "REPLACE_WITH_THE_CLAIMED_TASK_ID",
  "claimId": "REPLACE_WITH_CURRENT_CONFIRMED_CLAIM_ID",
  "evidence": "REPLACE_WITH_ACTUAL_EXECUTION_START_EVIDENCE"
}
```

`resume` 使用同樣欄位，適用 blocked／revision／claimed 的原 owner；先核對阻塞已解除且沒有待接收 handoff。CLI 不會替你啟動程式、派發代理或部署。

### submit：固定 GitHub 候選與 PR

```json
{
  "action": "submit",
  "taskId": "REPLACE_WITH_THE_TASK_ID",
  "claimId": "REPLACE_WITH_CURRENT_CONFIRMED_CLAIM_ID",
  "candidate": {
    "repository": "REPLACE_OWNER/REPLACE_TOOL_REPOSITORY",
    "commit": "REPLACE_WITH_EXACT_CANDIDATE_COMMIT_SHA",
    "path": "REPLACE_WITH_A_FILE_IN_THE_CANDIDATE"
  },
  "pullRequest": "https://github.com/REPLACE_OWNER/REPLACE_TOOL_REPOSITORY/pull/REPLACE_NUMBER",
  "evidence": "REPLACE_WITH_ACTUAL_CHECKS_AND_EXPLICIT_NOT_RUN_LIMITS",
  "evidenceRef": {
    "repository": "REPLACE_OWNER/REPLACE_REPOSITORY",
    "commit": "REPLACE_WITH_EXACT_EVIDENCE_COMMIT_SHA",
    "path": "REPLACE_WITH_COMMITTED_ACCEPTANCE_EVIDENCE"
  }
}
```

PR 必須還開著，head 必須等於 candidate commit。若需加入新證據或修正而改了候選，提交新 commit 並讓 reviewer 重審；不能用原候選通過結果替新的程式碼背書。

### review：由不同實際執行者檢查所有既定面向

此命令外層 actor 必須換成**已 ACK 且沒有參與製作的 reviewer**，不能由目前或曾經的 owner 代填。

```json
{
  "action": "review",
  "taskId": "REPLACE_WITH_THE_SUBMITTED_TASK_ID",
  "candidate": {
    "repository": "REPLACE_OWNER/REPLACE_TOOL_REPOSITORY",
    "commit": "REPLACE_WITH_THE_EXACT_SUBMITTED_COMMIT_SHA",
    "path": "REPLACE_WITH_THE_EXACT_SUBMITTED_CANDIDATE_PATH"
  },
  "verdict": "accepted",
  "rubricComplete": true,
  "requiredChecksComplete": true,
  "aspects": [
    {
      "id": "REPLACE_WITH_EACH_REQUIRED_PREDECLARED_ASPECT_ID",
      "score": "REPLACE_WITH_ACTUAL_NUMERIC_SCORE_0_TO_100",
      "evidence": "REPLACE_WITH_OBSERVED_EVIDENCE_FOR_THIS_ASPECT"
    }
  ],
  "evidence": "REPLACE_WITH_INDEPENDENT_REVIEW_RESULT_AND_SCOPE",
  "evidenceRef": {
    "repository": "REPLACE_OWNER/REPLACE_REPOSITORY",
    "commit": "REPLACE_WITH_EXACT_REVIEW_EVIDENCE_COMMIT_SHA",
    "path": "REPLACE_WITH_COMMITTED_REVIEW_REPORT"
  }
}
```

aspects 要列全，score 是數字；每項均至少 90 且有證據才可 accepted。未通過時用 `verdict: "revision"`，如實記錄缺陷、分數與未執行檢查，不為了湊平均把分數填成 90。accepted 不修改 `publication`、不合併 PR、不更新 catalog、不部署。

## 兩向交接

原 owner 停在安全 checkpoint，以目前 claimId 提出：

```json
{
  "action": "offer-handoff",
  "taskId": "REPLACE_WITH_TASK_ID",
  "claimId": "REPLACE_WITH_CURRENT_CLAIM_ID",
  "toActorId": "REPLACE_WITH_ACTUAL_ACKNOWLEDGING_RECEIVER_ID",
  "checkpoint": "REPLACE_WITH_PUSHED_FILES_CHECKED_STATE_AND_NEXT_STEP",
  "evidenceRef": {
    "repository": "REPLACE_OWNER/REPLACE_REPOSITORY",
    "commit": "REPLACE_WITH_EXACT_CHECKPOINT_COMMIT_SHA",
    "path": "REPLACE_WITH_HANDOFF_EVIDENCE_FILE"
  }
}
```

這時 owner 仍是原承接者，但工作 blocked；兩邊都不繼續寫。指定接手者讀回 offer、檢查來源後，用自己的 actor 發：

```json
{
  "action": "accept-handoff",
  "taskId": "REPLACE_WITH_TASK_ID",
  "offerId": "REPLACE_WITH_EXACT_CURRENT_HANDOFF_OFFER_ID",
  "evidence": "REPLACE_WITH_RECEIVER_CHECKPOINT_READBACK_AND_ACCEPTANCE"
}
```

接手成功後產生新 claimId，舊 owner 的 claim 即失效。原 owner 也可在尚未被接受時 `cancel-handoff`，再明確 resume。對方逾時、離線、觀察陳舊或任務板看起來閒置都不會自動換 owner。

## 完整 action 欄位表

以下均另加共同外層欄位；除 acknowledge 外，actor 都要已確認當前規則與基線。

| action | 額外必填欄位 | 前提與效果 |
| --- | --- | --- |
| acknowledge | contractVersion、baselineCommit、evidence | 本 actor 確認精確版本；不代表執行或他人確認。 |
| change-baseline | homepage、evidence、evidenceRef | 新 GitHub 主頁 baseline；使舊 ACK 不適用，兩端重新盤點。 |
| reconcile | inventoryComplete、taskIds、specIds、evidence、evidenceRef | 各端真實盤點，不能漏掉本端既有 active 工作或未解 pending。 |
| register-spec | spec: {id,title,document,source,acceptanceCriteria:[{id,label}]} | 只建立 draft；同一 repo/path 的 spec 不可換 ID 重複計庫存。 |
| revise-spec | specId、document、source、acceptanceCriteria、evidence | 原作者、尚未被任何 task 引用才可修改；回到 draft，需重審。 |
| mark-spec-ready | specId、sections、evidence | 不同 reviewer；sections 的 goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff 均實核 true；reserved 則變 consumed，不增庫存。 |
| register-task | task: {id,title,workType,source,brief,acceptanceCriteria}；production 另需 specId | workType 為 spec/production/review/maintenance；optional allowedExecutors。production 預設只有 local-codex，criteria 與 spec 完全一致。 |
| adopt-existing | taskId、checkpoint、evidence、evidenceRef；optional pendingId | 僅初次盤點期，原 actor 匯入舊責任，先 blocked；不偽裝新開工。 |
| claim | taskId | 兩端盤點完整、允許環境、沒有 owner；唯一 CAS 承接，製作同時消耗 spec。 |
| start / resume | taskId、claimId、evidence | 原 owner，兩端盤點有效；沒有待接 handoff，製作 spec 已完整。 |
| block | taskId、claimId、blocker、checkpoint、resumeCondition | 保留原責任，記錄實際阻塞與恢復條件。 |
| release | taskId、claimId、checkpoint、reason、evidenceRef | 原 owner 明確釋放；spec 不自動回補庫存。 |
| offer-handoff | taskId、claimId、toActorId、checkpoint、evidenceRef | 原 owner 暫停；接手者已 ACK、環境獲准，尚未轉 owner。 |
| cancel-handoff | taskId、claimId、evidence | 原 owner 取消尚未接受的交接；維持 blocked，之後明確 resume。 |
| accept-handoff | taskId、offerId、evidence | 指定接手者接受精確 offer；換 owner 與 claimId。 |
| submit | taskId、claimId、candidate、pullRequest、evidence、evidenceRef | 真實候選已在 GitHub，PR head 相符；進 reviewing。 |
| review | taskId、candidate、verdict、evidence、evidenceRef；accepted 另需 rubricComplete、requiredChecksComplete、aspects | 不同且未參與製作的 reviewer；所有固定面向達 90 才 accepted。 |

所有 GitHub 參照都使用前述固定引用物件。`acceptanceCriteria` 在開工前固定；交驗時沒有修改面向的 action。後續需求變更需另立可追溯工作，不得把這件工作原本未通過的項目移除。

## 失敗時怎麼做

| 回應 | 下一步 |
| --- | --- |
| ACK_REQUIRED / STALE_CONTRACT | 讀最新規則與基線，由本人確認；不代簽。 |
| RECONCILIATION_REQUIRED / INCOMPLETE_RECONCILIATION | 補齊兩端真實盤點與既有 owner，維持新承接關閉。 |
| ALREADY_OWNED / EXECUTOR_NOT_ALLOWED | 停止；選其他合法工作或經正式交接，不能搶占。 |
| REVISION_CONFLICT | 重新讀取遠端，核對先成功者；不能盲目換 revision 重送。 |
| OUTCOME_UNKNOWN | 不開工；恢復讀取後核對原 operationId/requestHash，避免重複寫入。 |
| WRITE_NOT_CONFIRMED / READBACK_MISMATCH | 未取得有效承接收據；先核對遠端，不能宣稱已接或已完成。 |
| CANDIDATE_MISMATCH / INCOMPLETE_REVIEW / SCORE_BELOW_TARGET | 回到精確候選修正、補實證與獨立複驗；不換較容易的驗收標準。 |

這套工具只做共用狀態轉換與 GitHub 讀回，不會遙控本地 Codex、喚醒舊對話、核發發布批准或保證擁有 repo 寫權的人無法繞過協議。任務板應持續把「規則已保存」「本人已確認」「實際執行」「驗收通過」「已發布」分開顯示。
