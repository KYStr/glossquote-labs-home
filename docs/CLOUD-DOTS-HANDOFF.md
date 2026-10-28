# 原雲端調度 dot 的接入指令

請由原本負責 GlossQuote Labs 的雲端統籌及實際承接者執行。規則維護者不能代簽。

1. 每次接受新工作或恢復舊工作前，讀 GitHub 最新 AGENTS.md、協作規則及 registry；呼叫任務板 `board_get_control` 或既有 `board_get_status` 讀取本輪使用者政策。工具回覆會附規則連結，但讀到不等於確認。
2. 暫停對未盤點 Labs 工作的新承接。保留高優先遊戲原 owner／checkpoint／恢復條件；不得因 Labs 新任務而把所有工位一起轉去低優先。
3. 盤點你與子 dots 真正在做、交驗中、阻塞及待製作的工作；逐個保存可核對的 GitHub source、brief、candidate、PR、checkpoint。已觀察到 agenda-conflicts、flashcards 只是必要遷入線索，不是全部清單，也不是有效 claim。
4. 各原承接者使用含真實對話／工作識別的 cloud-dot actor 身分，確認目前規則與主頁基線。原統籌需要對網站調度 policy 明確 ACK；GitHub actor ACK／完整盤點還需另外寫入，不能混為一筆。
5. 先 register-spec／register-task，再由原承接者 adopt-existing；雲端既有製作的 allowedExecutors 必須如實保留 cloud-dot，這只登記既有事實，不代表所有新製作都可交給雲端。未完整預案設 reserved，不計 ready 庫存。
6. 原統籌提交完整雲端盤點的 GitHub 報告與 reconcile；不得替本地填 inventoryComplete，亦不得認定對方沒有上報就是沒有在做。
7. 兩端完成盤點後，新工作必須先在 GitHub 取得唯一 claim 並讀回才能派下去。每個子 dot 也要核對最新 claim，不能只收到聊天委派就開工。委派可以先安排候選人，但正式承接必須落在 registry。
8. 製作預設 local-codex／P3；本地工作不能因雲端空閒就自動被接走。只有該 task 明確允許 cloud-dot 且未被承接才可領取。預案存量 <6 時補預案 P1，>=6 時 P3；未知先盤點。
9. 任務板回報包含實際 projectId、workType、policyRevision；Labs 任務另帶 githubTaskId、githubClaimId、githubRegistryRevision（未核實填 null）。回報維持真實來源時間與證據；這些欄位只連結 GitHub 狀態，不能創造 claim。
10. 交驗使用固定 GitHub candidate 與 PR，非作者獨立審查完整預先約定面向，每項 >=90。交驗、accepted、merged、deployed、catalog published 分開。

採用後，回報你實際寫入的 GitHub ACK／盤點 operationIds、目前 registry revision、原本地是否已確認、下一件真正可領取的工作。任何尚未完成的確認如實保留待確認。
