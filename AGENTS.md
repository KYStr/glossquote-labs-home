# GlossQuote Labs：本地 Codex 與雲端 dots 的共同工作規則

本 repo 是 GlossQuote 主頁與跨環境協作的共同入口。任何承接本組工作的代理，開始、恢復、交接與交驗前都必須讀取 **GitHub 上的最新版**，不能只相信本地快取或對話記憶。

1. 先讀 [協作規則](docs/CLOUD-LOCAL-WORKFLOW.md) 與 [共用工作登記](coordination/work-registry.json)。主頁、工具基線、預案、驗收要求與候選必須先有可讀取的 GitHub commit；本機唯一副本不算交接完成。
2. 尚未完成本地／雲端兩端盤點時，停止新承接。既有工作保留原承接者與 checkpoint，先遷入登記；禁止把舊草案當成無人處理的任務。
3. 每個執行者以自己的實際身分確認目前 contractVersion 與主頁 baseline commit。身分包含實際對話／工作識別，不可只用可能重複的 `/root` 或 GitHub 共用帳號。不得代替本地或原雲端統籌確認。
4. 開工前，透過協作 CLI 或等價 GitHub API，以最新 blob SHA 原子登記唯一承接者；讀回相同 operationId／claimId 與 actor 後才能開始。409、網路結果不明、對方已承接或執行環境不在 allowedExecutors 中，一律不開工。留言或任務板卡片不能取代有效 claim。
5. 工具製作固定低優先 P3，預設 `local-codex`；只有該任務明確允許 `cloud-dot` 才能由雲端接手。雲端有空不等於獲准拿走本地工作。
6. 完整且未被承接製作的預案少於 40 個時，補預案為 P1；達到 40 個後降為 P3；被承接而降回 40 以下時再升 P1。未知庫存先盤點，不當成 0，也不把 catalog 的 draft/published 當庫存。
7. 高優先工作等待時仍保留原 owner、阻塞原因與恢復條件。低優先借調以小段工作與安全 checkpoint 為單位；高優先恢復後按原責任回切。不能把所有工位因一則新訊息一起改做低優先。
8. 無回報、逾時或離線不會釋放所有權。轉交須原承接者留下 checkpoint 並提出交接，接手者在 GitHub 接受後才換 owner；不得兩邊同時繼續寫同一範圍。
9. 開工前固定完整驗收面向。交驗固定候選 commit，獨立 reviewer 對同一 commit 逐項提出證據；每個必要面向至少 90，必要檢查完成才算 accepted。測試數量、平均分、未執行檢查與自我宣稱不可替代驗收。
10. accepted 與 published 分開。遵守 README 既有正式發布順序與批准範圍；GitHub push 不等於部署、catalog published 不等於這輪新驗收。任務登記不授予部署、費用、郵件或本機控制權。

本地首次接入直接使用 [本地 Codex 交接提示詞](docs/LOCAL-CODEX-HANDOFF.md)；雲端統籌使用 [雲端接入指令](docs/CLOUD-DOTS-HANDOFF.md)。本文件是可執行協作入口，不能宣稱它已自動喚醒、通知或約束尚未讀取規則的舊對話。

## Labs 批量製作（2026-11-01 使用者更新）

- ready 且未消耗的完整預案目標為 **40**；低於 40 補預案 P1、達 40 降 P3。未知仍是未知，不把 draft/reserved/claimed/reviewing/catalog 當 ready。製作仍為 P3，預設 local-codex，cloud-dot 必須在各 task 明確允許。
- 每位實際 actor 一批預領 **5 件尚未交付的製作子件**；已有自己的 1 件時只補 4 件。claimed/working/blocked/revision 計入名額，reviewing 已完整交驗不占下一批名額，但仍保留原 owner、claim 與獨評責任；accepted 也不占。退修優先在現行安全 checkpoint 回切。歷史或新退修造成超過 5 件不刪 owner、不搶件，先消化到上限以下再補領。
- 一個後備批次不是五名人力、也不是同時五件執行：每位 actor 同時最多 **1 件 working**；其餘是預領。四名 maker 保留各自遊戲主線；兩位品控仍以各自可接的 P1 獨評優先，安全點回切，不因預領而擴借調人數。
- 每個子件各有 taskId、operationId、claimId、固定來源與驗收條件。一次 fresh snapshot 對全部子操作依序純轉換驗證（expectedRevision 逐件 +1），所有條件及固定 GitHub references/PR 都通過才以原 blob SHA **一次 CAS** 寫完整 registry；逐件讀回原 operationId/requestHash、actor、claim、task、revision。任一條件不符整批不寫，競爭失敗不強推、不盲重試。
- 結果不明先讀全部原 opIds；全數精確存在才認已落盤，部分存在就停下查明，不自動補寫其餘或換 ID 重送。庫存不足不造 ready、不部分領取當完整批次；例如兩位各已有 1 件而 ready 只有 6 件，所需 8 件仍缺 2，先由既有規格原責任人補齊並獨審。
- 逐件完成後先用原有 block 保存真實完成 checkpoint／候選定位，blocker 明寫「待整批交驗，非退修」，resumeCondition 明寫 `batch submit ready`，不能顯示為正在製作或在等修正。全部製作完成後再一次保存 GitHub 產品來源批次；GitHub commit 與 registry submit 是兩個不同步驟，仍需原批准範圍。
- 整批交驗以各件原 claim 的 resume→submit 操作列逐件固定 candidate/PR/evidence，暫存期間各件都已 block；resume 只恢復交驗前狀態，不是新的實作執行證據。一次 CAS 可容納 5 組 resume/submit。每件均獨立審查相同固定候選的完整約定面向，禁止混分、自評或把預領當執行；未完成檢查仍 NOT_RUN。交驗、accepted、merge、部署分開，不擴發布/分享/憑證/費用權限。
- 單件 apply 保留相容與修復用途，但同樣受未交付 5 件與 working 1 件上限限制。正式批領使用 apply-batch；不是以五次單領繞過整批不足檢查。既有本地盤點、主頁 baseline、他人 owner 完全不變。

## Primary local/cloud oversight (user instruction, 2026-11-02)

The primary local conversation retains technical coordination and final delivery responsibility under the user. Follow [the shared oversight goal](docs/LOCAL-CLOUD-OVERSIGHT-GOAL.md): inspect current GitHub rules, registry, cloud proposals/production, exact PR candidates and independent evidence on every work round; preserve actor ownership and return defects to the original owner. Specification review is a separate gate: once complete and independently verified, record document acceptance/readiness promptly so authorized cloud/local partners can claim production. Do not wait for future product/browser/deployment checks to approve a sound specification, and do not treat document approval as product acceptance. This does not waive current CAS, independent review, capacity, credentials, focus, or deployment rules, nor claim that other actors have acknowledged this addition.
