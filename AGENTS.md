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

## 單一來源與接續手冊（2026-11-09 使用者更新）

使用者要求將分散工具整理至共用repo並補足大量完整預案。先讀 [START-HERE](START-HERE.md) 及 [接續說明書](docs/AGENT-HANDBOOK.md)。新工具在本repo `tools/<slug>/` 以獨立codex分支/PR交驗，不再新建獨立repo；此項取代較舊一工具一repo偏好。舊repo/commit/候選/owner及既有部署保留，來源快照不可冒充新accepted。

`sources/`、`archives/`為固定證據，不直接改產品；原owner依 [遷移規則](docs/SOURCE-LAYOUT.md) 在有效claim下把固定來源轉至tools後才修改，不重領或覆蓋另一端成果。根npm test只涵蓋首頁/協作；不可遞迴執行所有快照。

新預案每份八節、明確使用情境、字面測例和九必要產品面向，非作者文件審查後才ready。文檔完整不等於產品通過。現行40庫存、5held/1working、P1補庫/P3製作、本人ACK與唯一CAS/readback全保留；本次不更換homepage reconciliation基線，也不代替其他actor採用規則。

不得干擾使用者桌面/焦點/IME/clipboard；隱藏本地tab不代表隔離。GitHub操作禁止改global/system Git/gh認證或尋找憑證，Windows持久環境不得修改。交付保持一個ZIP。

## 主動調用瀏覽器與本機 WebGL 工具（2026-11-09 使用者更新）

使用者要求：工作需要 WebGL 時，主動使用使用者已建好的本機 GPU 工具；需要瀏覽器時，主動調用適合的可用瀏覽器。這是本組代理承接、恢復及交驗時必須採用的工作方式，不以「尚未再次催促調用工具」作為等待理由。既有任務範圍、所有權、隔離、必要確認及驗收標準仍適用。

1. **先核實能力，隨即執行可做的步驟。** 每次開始相關工作，核對真正執行者當下可呼叫的工具名稱、schema、目前操作文件及狀態。不能只憑舊摘要、外掛短描述或其他代理的清單判定工具不存在。讀取狀態、能力與候選資料時，不額外消耗遊戲單次許可；同一範圍已有有效授權時，不自行加設重複詢問關卡。
2. **需要瀏覽器就主動使用。** 畫面、互動、渲染或使用者明確指定瀏覽器的工作，主動選用已獲准且符合任務的瀏覽器工具。純資料操作若已有合適 connector／API／CLI，先用該工具。雲端開發與一般驗證優先使用雲端獨立瀏覽器；使用者指定本機驗證時，核實所選電腦與連線並使用已核准的隔離入口。不得干擾使用者桌面、視窗焦點、鍵盤滑鼠、IME 或剪貼簿；隱藏本地分頁不等於已證明隔離。
3. **WebGL 優先走既有本機 GPU 工作站。** 主動讀取 `gpu_help(section: operations)` 的全部分頁，保留版本及內容雜湊，並核對 `gpu_status`、`gpu_target_status` 與實際工具清單。通用背景互動瀏覽器、固定首幀、固定遊戲測試與佇列是不同能力，依當下正式契約選用，不把舊固定候選的限制套成整個工具不能互動。
4. **先核對精確候選與許可。** 使用已入庫的固定版本；尚未入庫時，依官方 `candidate-admin` 流程由有權限的執行者準備完整離線套件，核對來源、ZIP／manifest／檔案雜湊、入口與入庫結果。再以真實 proposal 查明 `browser.targetId`、測試範圍、剩餘次數、到期及撤回狀態。入庫不等於 `permit-browser`，首幀許可不等於互動許可。只在精確許可有效時執行；缺少的資料或必要批准要具體提出，不偽造 ID、延長期限、重置已耗額度或把聊天當成伺服器已記錄的批准。
5. **依正式單次或佇列流程操作。** 單租約模式使用 acquire → browser open → 原 job 終態／evidence → 最小必要互動 → release。正式佇列模式使用 queue submit／status，取得自動開啟的原 job、租約與證據後才操作，不能再 acquire／open 同一件。每件工作保留自己的 request、task key、handle 與候選關聯，按目前契約的隔離、容量、時限及輪詢間隔執行；不共用或公開私有 handle／task key。未確認支援時不自行加上參數。
6. **背景隔離與必要確認不放鬆。** 本機 GPU 測試只在工具提供的背景隔離工作階段與已准入套件內執行，不操作使用者桌面、不注入任意外部網址，不自行開放 CDN／區網、建立憑證、變更網路或安全權限。工具實際要求原生確認時，交由使用者完成該次確認；不能換工具或身份繞過。文件更新本身不擴張任何權限。
7. **失敗只阻塞確實受影響的部分。** 區分工具不可見、連線失敗、服務不可達、候選／許可缺失、WebGL 能力不足與產品失敗，記錄精確動作、環境、時間、錯誤及恢復條件。一次 localhost 連線失敗或一個不支援的參數，不能泛化為「瀏覽器不可用」或「所有 WebGL 工具不能用」。操作未被拒絕且不會重播已消耗測試時，可採用另一條已獲准且符合契約的路徑；遭拒絕、單次測試失敗或結果不明則停止該操作、查回原結果並清理，不換 ID 重送。Maker 繼續自己未受阻的實作／修正，QC 依有效候選與佇列驗證，不讓單一驗收卡點把所有工位一起停住。
8. **留下真實驗證證據。** 先看實際首圖，再依該遊戲的前置狀態與成功信號安排最小互動，保存同候選的前後畫面、原 job 結果、觀測時間及清理結果。工具接受、輸入送達、builtin probe、CPU／mock／CLI 測試都不能替代遊戲 GUI、音訊實聽或獨立品質評分；未測與未知保持 NOT_RUN／UNKNOWN。完成、失敗或停止都依官方流程釋放並核對清理，不為補圖重開已消耗的工作階段。

這一節補充前述桌面保護與接續手冊的隔離要求，不是全面禁止瀏覽器，也不解除其他既有限制。各原工作者須在下一次承接或安全點實際讀取並採用；文件提交不代表已自動通知、喚醒或完成任何驗證。
