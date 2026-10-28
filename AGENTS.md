# GlossQuote Labs：本地 Codex 與雲端 dots 的共同工作規則

本 repo 是 GlossQuote 主頁與跨環境協作的共同入口。任何承接本組工作的代理，開始、恢復、交接與交驗前都必須讀取 **GitHub 上的最新版**，不能只相信本地快取或對話記憶。

1. 先讀 [協作規則](docs/CLOUD-LOCAL-WORKFLOW.md) 與 [共用工作登記](coordination/work-registry.json)。主頁、工具基線、預案、驗收要求與候選必須先有可讀取的 GitHub commit；本機唯一副本不算交接完成。
2. 尚未完成本地／雲端兩端盤點時，停止新承接。既有工作保留原承接者與 checkpoint，先遷入登記；禁止把舊草案當成無人處理的任務。
3. 每個執行者以自己的實際身分確認目前 contractVersion 與主頁 baseline commit。身分包含實際對話／工作識別，不可只用可能重複的 `/root` 或 GitHub 共用帳號。不得代替本地或原雲端統籌確認。
4. 開工前，透過協作 CLI 或等價 GitHub API，以最新 blob SHA 原子登記唯一承接者；讀回相同 operationId／claimId 與 actor 後才能開始。409、網路結果不明、對方已承接或執行環境不在 allowedExecutors 中，一律不開工。留言或任務板卡片不能取代有效 claim。
5. 工具製作固定低優先 P3，預設 `local-codex`；只有該任務明確允許 `cloud-dot` 才能由雲端接手。雲端有空不等於獲准拿走本地工作。
6. 完整且未被承接製作的預案少於 6 個時，補預案為 P1；達到 6 個後降為 P3；被承接而降回 6 以下時再升 P1。未知庫存先盤點，不當成 0，也不把 catalog 的 draft/published 當庫存。
7. 高優先工作等待時仍保留原 owner、阻塞原因與恢復條件。低優先借調以小段工作與安全 checkpoint 為單位；高優先恢復後按原責任回切。不能把所有工位因一則新訊息一起改做低優先。
8. 無回報、逾時或離線不會釋放所有權。轉交須原承接者留下 checkpoint 並提出交接，接手者在 GitHub 接受後才換 owner；不得兩邊同時繼續寫同一範圍。
9. 開工前固定完整驗收面向。交驗固定候選 commit，獨立 reviewer 對同一 commit 逐項提出證據；每個必要面向至少 90，必要檢查完成才算 accepted。測試數量、平均分、未執行檢查與自我宣稱不可替代驗收。
10. accepted 與 published 分開。遵守 README 既有正式發布順序與批准範圍；GitHub push 不等於部署、catalog published 不等於這輪新驗收。任務登記不授予部署、費用、郵件或本機控制權。

本地首次接入直接使用 [本地 Codex 交接提示詞](docs/LOCAL-CODEX-HANDOFF.md)；雲端統籌使用 [雲端接入指令](docs/CLOUD-DOTS-HANDOFF.md)。本文件是可執行協作入口，不能宣稱它已自動喚醒、通知或約束尚未讀取規則的舊對話。
