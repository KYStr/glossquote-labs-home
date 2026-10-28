# GitHub 共用工作規則

規則版本：`2026-10-29.1`。適用於 GlossQuote Labs 主頁、新工具、製作預案，以及本地 Codex／雲端 dots 對這些工作的協作。八款遊戲仍在任務板分別追蹤；本協議不會把它們轉成 Labs 的庫存。

## 共同依據

- 原始碼與主頁入口：`KYStr/glossquote-labs-home`，目前預設分支 `codex/initial-publication`。
- 唯一承接登記：[`coordination/work-registry.json`](../coordination/work-registry.json)，必須讀遠端最新 blob SHA。
- 工作說明與驗收條件：GitHub 上已提交的文件；登記保存 repository、40 字元 commit、path。
- 製作候選：工具自身 GitHub repo 的固定 commit，透過 PR 交驗；提交、驗收與部署各自留證據。
- 任務板：這些資料與代理實際執行回報的檢視入口。工位偏好、訊息、卡片與口頭指派都不能取代 GitHub 所有權。

`catalog.json` 是公開展示目錄。此次讀取的 47 個 published、9 個 draft 只能描述目錄狀態，不代表 47 個本輪已驗收，亦不代表 9 份可以開工的完整預案。

## 一次性的舊工作盤點

初始登記刻意保留 `inventoryComplete: false`、兩端 reconciliation 為 null、actors 為空。可用預案數是未知，不是零；目前不開放新承接。

1. 本地先保留未提交修改與現有分支，讀取 GitHub；禁止 reset、覆蓋或刪除正在做的檔案來追上遠端。
2. 本地主頁、既有工具候選、預案與交接資料先推到可審查分支。若 GitHub 已有不同修改，逐項比對、合併，保留雙方歷史；不 force push。
3. 盤點至少列出：每個穩定 ID、工作類型、階段、真實承接者、GitHub 基線／候選、阻塞、下一步、是否完整預案、是否已被製作消耗。沒有來源的資料明確標未知。
4. 雲端原統籌做同樣盤點。已觀察到的 `agenda-conflicts`、`flashcards` 只是遷移線索，不是我代替原作者建立的有效 claim；其他既有工作也必須逐一查明。
5. 各原承接者讀規則並確認，透過 `adopt-existing` 遷入自己的真實工作。既有候選沒有完整預案時可以保留為待補齊的保留項，不計 ready 庫存、不假裝符合新開工條件。
6. 兩端各自提交完整盤點的 GitHub 證據與 task/spec IDs；解決 `pendingReconciliationTasks` 後才打開新承接門檻。任何一端未知，仍維持關閉。

這個步驟保留既有責任，避免雲端與本地各自以為對方尚未開工。不得由本次規則維護者替原統籌或本地執行者簽收。

## 開工前：先上 GitHub，再唯一承接

每件可承接工作都必須有唯一 task ID、目標範圍、GitHub brief、GitHub source baseline、完整驗收面向及 allowedExecutors。正式製作還要綁定一份通過完整度獨立檢查的 spec。

1. 讀遠端 registry 與規則，確認自己的 ACK 綁定目前 contractVersion／主頁 baseline。
2. 讀 task：確認未被承接、範圍不與現有工作重疊、自己的環境獲允許；製作預案未被其他 task 消耗。
3. 用最新 registry revision 與 GitHub blob SHA 寫入 claim；commit 先成功，工作才可以開始。
4. 讀回確認 operationId、claimId、actor、task 與 revision。發生 409 要重新查明誰先寫入，不可換 SHA 重試搶走工作；回應遺失先讀回同一 operationId，不盲目重送。
5. 在自己的工作分支工作，保持固定基線與候選紀錄。每次恢復、準備提交或交接先讀 GitHub，確保 claim 仍屬於自己。

GitHub 的 Issue 作為可讀的工作討論與入口；JSON 登記才是原子所有權依據。Issue assignee 常共用同一 GitHub 帳號，不能單獨辨認本地與雲端。純留言「我接了」不是有效 claim。

## 優先級與資源規則

| 條件／工作 | 規則 |
| --- | --- |
| 完整、可用、未消耗預案不足 6 份 | 補預案 P1 |
| 上述預案達 6 份 | 補預案降為 P3 |
| 被承接製作後低於 6 份 | 補預案回到 P1 |
| 庫存或本地進度未知 | 盤點／解除資訊阻塞 P1；不顯示 0 |
| 工具實作／持續製作 | P3，預設 local-codex |
| 雲端接製作 | 該任務先明確允許 cloud-dot，再走相同 claim 流程 |
| 高優先任務受阻 | 保留 owner、checkpoint、阻塞與恢復條件，借調不得覆蓋原責任 |

`spec ready` 只包括目標、範圍、使用流程、輸入輸出、實作方案、完整驗收、測試與交接內容都已上 GitHub，且由另一位 reviewer 核對的文件。草案、候選點子、已被 claim 的預案、製作中、驗收中都不算存量。

claim 製作時，同一個 GitHub 原子寫入會把預案標成 consumed。工作釋放或交接不自動把預案加回庫存，因為可能已有未完成成果；必須核實後另行重整，避免庫存被重複計算。

## 阻塞、暫停與交接

失去 heartbeat 或一段時間沒回報只代表目前執行狀態未知，所有權仍然存在。不能以「看起來閒置」偷換 owner。

- block：原 owner 寫明 checkpoint、實際 blocker 與 resumeCondition；保留 claim。
- release：原 owner 明確釋放並留下 GitHub 證據與 checkpoint，才成為可重新承接。
- offer-handoff：原 owner 指定實際接手者與交接證據，停在安全 checkpoint。
- accept-handoff：指定接手者先確認版本與範圍，在 GitHub 接受後才改 owner；舊 claim 即失效。
- 對方失聯時，先交統籌／使用者裁決。這版不提供逾時自動搶占，亦不把靜默視為同意。

## 交驗與完成

交驗前先把候選推上 GitHub，提供同一候選 commit 的 PR、測試、實際瀏覽器檢查與其他必要證據。必要面向在預案與 task 登記時已固定，交驗時不得刪掉低分項或換一套比較容易通過的 rubric。

獨立 reviewer 必須與作者不同，檢查同一 candidate commit。每個必要面向都有證據且分數至少 90，所有必要檢查完成才可 accepted；平均 90、測試全綠或一句「完成」不能替代。未執行的必要 GUI／可及性／正式站檢查保持 NOT_RUN，缺口未解決不得放行該驗收。

accepted 只表示該候選與約定範圍已驗收，不等於正式發布。沿用 README 既有流程：工具公開 source → 實際部署 → HTTPS、雙語、SEO、同語言主頁互連核對 → 更新 catalog published → 主頁重建／部署／雙語連結核驗。部署仍須符合既有批准，GitHub push 不會自動替它發生。

## CLI 與等價 GitHub 操作

使用 [`scripts/coordination.mjs`](../scripts/coordination.mjs) 及其同目錄核心。`read` 讀遠端最新登記；`validate` 核對檔案；`apply` 從 stdin 讀一個明確操作。CLI 用已授權的 GitHub 身分，沒有任何憑證時停止並回報，不能把 token 寫進 repo。

每次寫入必備：`actor.id`、`actor.executor`、`operationId`、`observedAt`、`expectedRevision`、`action`。實際動作欄位與可用命令見 [命令範例](COORDINATION-COMMANDS.md)。operationId 是操作去重鍵；不應把它當作代理執行 run ID。

若雲端僅有 GitHub connector，同樣先讀最新版文件內容與 blob SHA，用 `update_file` 以該 SHA 寫入通過核心驗證的完整 registry，再讀回核對。不得跳過純轉換驗證、用會覆蓋他人修改的推送方式、或用任務板寫入替代 GitHub claim。

這套協議提供共享依據、原子競爭保護與審計紀錄；它不會遙控本機，也不能阻止擁有 repo 寫入權的人刻意繞過檢查。因此面板會如實顯示讀取與確認狀態，原本還在運行的 dots 需要在下一次取得指令時實際採用。
