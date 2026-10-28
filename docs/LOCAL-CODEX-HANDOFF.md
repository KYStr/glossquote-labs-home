# 貼給本地 Codex 的交接提示詞

以下整段可直接交給原本在本地製作 GlossQuote Labs 的 Codex。請由它讀取最新版後執行；不需要使用者手動填入庫存或假造工作身分。

---

GlossQuote Labs 現在新增雲端 dots 作為協作者。請把 GitHub 當成你與雲端共同的主頁、預案、承接和驗收依據，避免你在本地製作的工作被另一端重做。請直接完成以下接入工作，保留現有成果；只有缺少實際存取權或必須由我裁決的衝突才問我。

**共同入口**：https://github.com/KYStr/glossquote-labs-home ，目前預設分支 `codex/initial-publication`。先讀遠端最新版 `AGENTS.md`、`docs/CLOUD-LOCAL-WORKFLOW.md`、`docs/COORDINATION-COMMANDS.md`、`coordination/work-registry.json`。任務板：https://gent-cloud-task-board.agentkystr.chatgpt.site/ 。先檢查遠端分支，不要沿用聊天中較舊的 commit。

1. **保留現場並盤點。** 找出你實際使用的主專案、主頁、工具 repo、預案、未提交修改及正在做的任務。不要 reset、覆蓋、清掉檔案或 force push。將缺少 GitHub 副本的主頁／工具候選／預案，先提交到合適的可審查分支；排除憑證與其他私人資料。若遠端有雲端新修改，保留雙邊歷史，核對後整合。
2. **報出真實基線。** 每個項目用固定 task/spec ID 列出目前階段、實際承接者、GitHub repo／commit／path、候選 PR、阻塞、checkpoint、下一步。把可開工預案、製作中、驗收中、已驗收、已發布分開。公開 catalog 的 47 published／9 draft 是舊目錄觀測，不能當成本地庫存。
3. **由你自己確認規則。** 取得可追溯的實際工作／對話身分，使用 `local-codex` 執行環境。讀取目前 contractVersion 和主頁 baseline 後，以 `acknowledge` 寫入自己的採用證據；不要替雲端、其他代理或我簽收。若真正主頁基線需要更換，先依 `change-baseline` 留下來源證據，再由兩端重新確認。
4. **遷入既有工作，暫時不領新的。** 依序 register-spec／register-task，再由實際承接者 adopt-existing。未完整的舊預案保留 reserved／待補齊，不冒充 ready。對應已知 pending 條目並檢查雲端是否已做同一項；遇到重複就比較候選、保留兩邊成果，提出合併／選定承接者的具體處理，不另開一份重做。
5. **完成本地盤點交接。** 把完整盤點報告先提交 GitHub，再用 reconcile 寫入實際 taskIds／specIds／evidenceRef。只在真的完整時填 inventoryComplete。這只是本地確認；雲端要由原統籌自行確認，兩端齊全前不要開新 claim。
6. **之後每次工作先領取。** 先讀遠端 registry，確認 task 未被承接、你的環境獲允許、來源與預案已在 GitHub。用協作 CLI 以最新 revision／blob SHA 取得 claim，讀回同一 operationId／claimId／owner 才開工。409 要重讀並重新選擇，不能覆蓋他人的 claim；網路結果不明先查原 operationId。開始、恢復、提交與交接都重新核對 owner。
7. **遵守優先級。** 工具製作維持低優先 P3，預設由本地接續。完整且未被製作承接的預案少於 6 份時，補製作說明書是 P1；達 6 份降 P3；被承接後低於 6 份再升 P1。未知庫存先盤點。對方工作沒有新回報不等於釋放，不可自行搶走；高優先任務受阻保留責任與恢復條件。
8. **最後交驗。** 候選先推 GitHub、開 PR，固定同一 candidate commit 和預先約定的完整驗收面向。由非作者的 reviewer 逐項給分與證據，每個必要面向至少 90，必要檢查已完成才 accepted。NOT_RUN、測試數量或平均分不能當通過。accepted 與正式部署／catalog published 分開，沿用原本發布流程與批准範圍。

先完成上述盤點與 GitHub 接入，並向我回報：主頁基線 commit、盤點報告連結、你的 ACK operationId、已遷入工作的 owner/claim、核實的 ready 庫存（或尚未知的具體原因）、與雲端重複的項目、尚待原雲端統籌確認的事項。不要把「讀到規則」說成其他代理已採用，也不要為了湊出 6 份而把草稿直接標 ready。

---

## 執行邊界

這份提示詞授權的是使用者已要求的來源同步、共同登記、盤點與驗收協作。它不會自動授予不存在的 GitHub 存取、正式部署批准、費用額度或其他人的本機控制權。缺少能力時回報具體缺口；已可安全完成的盤點與文件工作繼續進行。
