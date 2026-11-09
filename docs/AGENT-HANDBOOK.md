# 線上與本地 agent 接續說明書

適用 repo：`KYStr/glossquote-labs-home`；預設分支 `codex/initial-publication`。文件整合日期 2026-11-09。使用者要求主對話統籌需求、架構、雲端與本地協調、獨立驗收及正式發布；原工具作者負責實作與修正。這份文件給接手者實際操作，不表示其他對話已經讀過或承接。

## 1. 開始前先回答五個問題

| 問題 | 權威來源 | 不可替代的東西 |
| --- | --- | --- |
| 我現在讀到哪一版？ | 遠端分支 head、registry blob SHA/revision | 本地檔案時間／聊天摘要 |
| 誰擁有這件工作？ | task.owner.actorId + claimId | GitHub 共用帳號、PR作者名稱、任務板卡片 |
| 我要修改哪個版本？ | task.source / spec.document / submission.candidate 固定 commit/path | 舊 repo 的預設分支不一定有產品 |
| 我是否獲准在這裡執行？ | allowedExecutors、實際 ACK、有效 claim | 看到 ready 或有寫入權 |
| 什麼才算完成？ | SPEC 八節、task.acceptanceCriteria、固定候選的獨評證據 | npm test 綠燈、作者自評、已部署網址 |

第一次讀取 `AGENTS.md`、`docs/CLOUD-LOCAL-WORKFLOW.md`、`docs/COORDINATION-COMMANDS.md`、`coordination/work-registry.json`。每輪恢復、交驗、發布前重讀遠端，核對原 owner、PR head、修正與雲端新回報。規則與 registry 不一致時保留現場並交主統籌判斷，不自行放寬。

## 2. 安全取得工作副本

新環境可 clone 本 repo，先確認 Node.js 24 以上。不需要先安裝 npm dependencies；新預案預設零 runtime dependency。既有產品需要依賴時照其固定 lockfile 與已核准規格，不能因整合而升級全部套件。

已有修改時先 `git status --short` 和 `git diff --stat`；記錄 branch/HEAD、未提交檔案及原工作。不要 reset、clean、stash 使用者成果、force push，或把整個本地工作區加入 Git。用新的獨立工作副本或具名 worktree 隔離，禁止改動他人正在使用的分支。

```sh
git clone --branch codex/initial-publication https://github.com/KYStr/glossquote-labs-home.git
cd glossquote-labs-home
node --version
node scripts/workspace.mjs list
node scripts/workspace.mjs ready cloud-dot
node scripts/workspace.mjs show <slug-or-task-id>
```

以上 workspace 命令只讀本次 checkout；輸出的 revision 可能已舊，不能當 claim。GitHub connector 可以免 clone 閱讀，但寫 registry 必須使用純 coordination core 驗證與 CAS。來源快照保存的是固定 commit；需要執行測試時先在自己的工具目錄準備，不直接在 `sources/` 或 `archives/` 修改。

## 3. 選擇正確的接續路徑

- **自己已有 working / blocked / revision**：先回原 task。核對 checkpoint 和 resumeCondition；退修優先，其他人的沉默不會釋放工作。
- **自己的 reviewing**：原候選已交驗，保留 owner 等 reviewer；不能把 reviewer 缺證據當作正式通過，也不能改 PR head 卻繼續沿用舊評分。
- **新 production**：必須有完整 ready spec、可承接 task、正確 allowedExecutors。一次補至自己五件未交付、同時一件 working；不足整批時先補規格，不拆單規避。
- **新 spec 工作**：先有 GitHub brief 與 spec task，自己 claim 後寫八節；發布文件後交非作者 review。產品尚未實作，不該填產品 PASS。
- **已有成果但沒有正規 claim**：保留 source/作者/PR；交主統籌做補正，不能新 claim 同名預案假裝尚未製作。`adopt-existing` 只供未完成原始 reconciliation 時，已完成後不能拿它繞過新工作規則。
- **有兩個來源版本**：查 source-index 的 snapshots 中相同 slug、不同 kind 的列，以及 archives 下的本地/雲端歷史來源，固定兩邊 commit，讀實際差異與各自證據，交原 owner 決定合併；不以日期最新直接取代另一份。

## 4. 本人 ACK、唯一 claim、讀回

身分形式為 `local-codex:<實際對話/工作ID>[:agent-path]` 或 `cloud-dot:<實際對話/工作ID>:<agent-path>`。不要把 `/root`、maker1 或 KYStr 當獨立身分；不要替其他執行者 ACK。模型的「要求設定」與工具可證明的 backend 要分開寫。

從最新 registry 取得 `contractVersion`、`baseline.homepage.commit`、`revision` 及 blob SHA。依 [命令格式](COORDINATION-COMMANDS.md) 產生自己本次的 operationId/UTC時間/actor。先 ACK 目前版本，再用 fresh snapshot 建立 claim 批次。operationId 用來冪等，不是執行證據。

可靠寫入步驟：

1. 讀最新 metadata 與完整 blob；大於 1 MiB 的 contents 可能只有 metadata，需同 repo `/git/blobs/<sha>`，校驗 bytes 與 Git blob SHA。
2. 用 `applyOperation` 或 `applyBatch` 對完整 registry 做純轉換。批次 1–20 操作、同一真實 actor、expectedRevision 逐筆增加。
3. 核實 command 引用的 GitHub 固定檔案；submit 再核 PR open 且 head 等於 candidate。
4. 以剛讀的 blob SHA **一次** conditional update；禁止 force。遇衝突重讀、重新判斷工作歸屬，不只是換 SHA 重送。
5. 讀回相同 operationId/requestHash、task、owner、claimId 與 revision。確認後才 start；start 不是開啟 agent 的替代紀錄。
6. 結果不明先查原 operationId；整批部分存在就停止查明，不補寫、不換 ID 假裝新操作。

本地禁止為方便而讀 token 環境或憑證庫；使用已連線 GitHub connector 與純 core。已授權既有 CLI 認證可以用，但不能 `gh auth setup-git/login/refresh` 或寫 global/system Git 設定。原 `coordination.mjs apply` CLI 的 token 介面不代表授權本地去尋找 token；能力不足時回報具體缺口。

## 5. 開始實作及保存點

成功 claim 後開 `codex/<task-id>-<actor-short>` 分支，在 `tools/<slug>/` 實作。對新工具先讀 `docs/specs/<slug>/SPEC.md`、fixtures、作者檢查與獨立文件審查；以 registry 固定版本為準。新資料夾不是新 repo。

既有工具若還在獨立 repo／保留快照：原 owner 在同一 claim 下做中央承接 PR，記錄舊 repo/commit/path → 新目錄；先證明複製 bytes 相同，才在後續 commit 修改。接受前原已發布來源不變。共享首頁、registry、發布配置等由主統籌序列整合，不可兩邊同時改。

先做一個可驗收 milestone；錯誤與取消、dirty狀態、資料格式與語言完整度一起完成。保存 checkpoint 時寫：固定 source、已跑命令與exit code、實際問題、未驗項、下一步、恢復條件。不得在 log 放使用者真實資料、檔案內容、token 或機器帳號路徑。

## 6. 測試不能干擾使用者

背景 Node/檔案/HTTP 檢查允許。不得控制桌面、啟用本機視窗、OS鍵盤滑鼠/IME/clipboard、開原生檔案/列印對話框。隱藏本地 tab 不能證明隔離。必要瀏覽器驗收要使用主統籌已核實的隔離機制；缺少機制記 `NOT_RUN_USER_FOCUS_INCIDENT`，保留 gate，不以靜態碼讀取冒充真實 Network/Storage、render、download 或裝置測試。

Windows 長任務前後執行環境指紋檢查；Git發布前後執行專案 Git設定 guard。保護已有程序與服務，只處理自己明確建立的可拋棄程序；不依程序名稱或共用埠批次終止。

## 7. 提交、退修、交接與完成

按 [審查與發布說明](REVIEW-AND-RELEASE.md) 提交固定 PR。作者不得對自己的候選作獨評。review 必須同一 candidate commit、所有預定必要面向逐項至少90且有證據。有必要 NOT_RUN 就不能 accepted；文件預案 ready 與產品 accepted 不同。

原 owner 回覆失敗證據並修正；變更候選就新 submit，受影響驗證重跑，未變部分保留可追溯證據。兩輪無進展由主統籌重查設計與根因，不無限重送同一任務。沒有回報不是釋放。

正式發布由主統籌依既有免費 Cloudflare 授權完成，來源、候選accepted、部署、首頁/看板、使用者外部驗收分列。交付一個 ZIP：`00-START-HERE.md`、總表、固定來源、必要證據、hash manifest；檢查相對連結及安全壓縮路徑。

## 8. 最後回報的最低欄位

`taskId/specId/actorId/claimId`、原source與候選repo/commit/path、PR、允許修改範圍、實際檔案、命令與環境/exit code、九面向證據/NOT_RUN、已知風險、checkpoint、需要誰做什麼。作者不能代替 reviewer、雲端統籌、主部署者或外部驗收者宣告完成。
