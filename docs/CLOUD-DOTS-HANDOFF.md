# 原雲端調度 dot 的接入指令

請由原本負責 GlossQuote Labs 的雲端統籌及實際承接者執行。規則維護者不能代簽。

1. 每次接受新工作或恢復舊工作前，讀 GitHub 最新 AGENTS.md、協作規則及 registry；呼叫任務板 `board_get_control` 或既有 `board_get_status` 讀取本輪使用者政策。工具回覆會附規則連結，但讀到不等於確認。
2. 暫停對未盤點 Labs 工作的新承接。保留高優先遊戲原 owner／checkpoint／恢復條件；不得因 Labs 新任務而把所有工位一起轉去低優先。
3. 盤點你與子 dots 真正在做、交驗中、阻塞及待製作的工作；逐個保存可核對的 GitHub source、brief、candidate、PR、checkpoint。已觀察到 agenda-conflicts、flashcards 只是必要遷入線索，不是全部清單，也不是有效 claim。
4. 各原承接者使用含真實對話／工作識別的 cloud-dot actor 身分，確認目前規則與主頁基線。原統籌需要對網站調度 policy 明確 ACK；GitHub actor ACK／完整盤點還需另外寫入，不能混為一筆。
5. 先 register-spec／register-task，再由原承接者 adopt-existing；雲端既有製作的 allowedExecutors 必須如實保留 cloud-dot，這只登記既有事實，不代表所有新製作都可交給雲端。未完整預案設 reserved，不計 ready 庫存。
6. 原統籌提交完整雲端盤點的 GitHub 報告與 reconcile；不得替本地填 inventoryComplete，亦不得認定對方沒有上報就是沒有在做。
7. 兩端完成盤點後，新工作必須先在 GitHub 取得唯一 claim 並讀回才能派下去。每個子 dot 也要核對最新 claim，不能只收到聊天委派就開工。委派可以先安排候選人，但正式承接必須落在 registry。
8. 製作預設 local-codex／P3；本地工作不能因雲端空閒就自動被接走。只有該 task 明確允許 cloud-dot 且未被承接才可領取。預案存量 <40 時補預案 P1，>=40 時 P3；未知先盤點。
9. 任務板回報包含實際 projectId、workType、policyRevision；Labs 任務另帶 githubTaskId、githubClaimId、githubRegistryRevision（未核實填 null）。回報維持真實來源時間與證據；這些欄位只連結 GitHub 狀態，不能創造 claim。
10. 交驗使用固定 GitHub candidate 與 PR，非作者獨立審查完整預先約定面向，每項 >=90。交驗、accepted、merged、deployed、catalog published 分開。

採用後，回報你實際寫入的 GitHub ACK／盤點 operationIds、目前 registry revision、原本地是否已確認、下一件真正可領取的工作。任何尚未完成的確認如實保留待確認。

## Labs 批量製作（2026-11-01 使用者更新）

- ready 且未消耗的完整預案目標為 **40**；低於 40 補預案 P1、達 40 降 P3。未知仍是未知，不把 draft/reserved/claimed/reviewing/catalog 當 ready。製作仍為 P3，預設 local-codex，cloud-dot 必須在各 task 明確允許。
- 每位實際 actor 一批預領 **5 件尚未交付的製作子件**；已有自己的 1 件時只補 4 件。claimed/working/blocked/revision 計入名額，reviewing 已完整交驗不占下一批名額，但仍保留原 owner、claim 與獨評責任；accepted 也不占。退修優先在現行安全 checkpoint 回切。歷史或新退修造成超過 5 件不刪 owner、不搶件，先消化到上限以下再補領。
- 一個後備批次不是五名人力、也不是同時五件執行：每位 actor 同時最多 **1 件 working**；其餘是預領。四名 maker 保留各自遊戲主線；兩位品控仍以各自可接的 P1 獨評優先，安全點回切，不因預領而擴借調人數。
- 每個子件各有 taskId、operationId、claimId、固定來源與驗收條件。一次 fresh snapshot 對全部子操作依序純轉換驗證（expectedRevision 逐件 +1），所有條件及固定 GitHub references/PR 都通過才以原 blob SHA **一次 CAS** 寫完整 registry；逐件讀回原 operationId/requestHash、actor、claim、task、revision。任一條件不符整批不寫，競爭失敗不強推、不盲重試。
- 結果不明先讀全部原 opIds；全數精確存在才認已落盤，部分存在就停下查明，不自動補寫其餘或換 ID 重送。庫存不足不造 ready、不部分領取當完整批次；例如兩位各已有 1 件而 ready 只有 6 件，所需 8 件仍缺 2，先由既有規格原責任人補齊並獨審。
- 逐件完成後先用原有 block 保存真實完成 checkpoint／候選定位，blocker 明寫「待整批交驗，非退修」，resumeCondition 明寫 `batch submit ready`，不能顯示為正在製作或在等修正。全部製作完成後再一次保存 GitHub 產品來源批次；GitHub commit 與 registry submit 是兩個不同步驟，仍需原批准範圍。
- 整批交驗以各件原 claim 的 resume→submit 操作列逐件固定 candidate/PR/evidence，暫存期間各件都已 block；resume 只恢復交驗前狀態，不是新的實作執行證據。一次 CAS 可容納 5 組 resume/submit。每件均獨立審查相同固定候選的完整約定面向，禁止混分、自評或把預領當執行；未完成檢查仍 NOT_RUN。交驗、accepted、merge、部署分開，不擴發布/分享/憑證/費用權限。
- 單件 apply 保留相容與修復用途，但同樣受未交付 5 件與 working 1 件上限限制。正式批領使用 apply-batch；不是以五次單領繞過整批不足檢查。既有本地盤點、主頁 baseline、他人 owner 完全不變。
