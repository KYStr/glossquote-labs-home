# 可用未消耗製作說明書補充：第一件

本工作承接使用者「整理製作說明書，讓存量到達20個」的已選後備。先完成一份實用、不重複、可獨立交接的純靜態工具製作說明書，不為湊數拆分文件或把既有 reserved 當新庫存。此 task 只做 spec，並非工具製作。

## 開始門檻
每次啟動/恢復先讀最新 AGENTS.md、CLOUD-LOCAL-WORKFLOW.md、CLOUD-DOTS-HANDOFF.md、COORDINATION-COMMANDS.md、registry、Issue #1 及任務板 policy/status/TASK-STATUS-OPERATIONS.md；本人 ACK 目前 contract/baseline。讀回兩端 reconcile、先用原 core＋blob CAS register/claim 並精確讀回，再開始實際規格撰寫。既有本地盤點不可重跑，原 owner 不變。

## 範圍與選題
依最新 catalog 和 registry 比較用途、使用者流程與輸入輸出，選擇一項未被現有任務/規格覆蓋的實用工具。優先純瀏覽器離線處理、不需帳戶、API、付費服務、憑證、個人資料外傳的用途。已有同題 owner 的範圍不接走；不能靠改名重複。若沒有有價值且不重疊選題，保留具體比較證據並 block，不編造任務。

## 交付與驗收（完整保留）
1. 目標：明確受眾、實際問題、成功條件與非目標。
2. 範圍：包含/排除功能，與既有 catalog/task 的差異矩陣及固定來源。
3. 使用流程：桌面正常使用完整旅程、取消、錯誤與恢復、重複操作。
4. 輸入輸出：格式、容量、邊界、編碼、有效/無效例及資料生命週期。
5. 實作：可直接執行的模組拆分、靜態架構、雙語/可及性、隱私安全與明確依賴限制。
6. 完整驗收：逐項 functionality/boundaries/privacy/security/usability/accessibility/localization-seo/toolchain-provenance/compatibility 的方法、預期與證據；未測 null/NOT_RUN，不拿測試數替代分數。按使用者桌面正常使用範圍，無資源的手機/裝置測試明列非承諾，不擅加硬門檻。
7. 測試：最小充分測試資料與原生 GUI 必要證據，區分純測與真人體驗，不杜撰 PASS。
8. 交接：固定 GitHub document/source commit、待實作步驟與驗收方式，所有引用可讀，沒有私人路徑或秘密。

## 完成界線
文件先固定 GitHub，交不同且未製作該規格的人逐項檢查上述八節。只有完整並實核後才 mark-spec-ready；單一草案不算 ready，不能自行給自己通過。新製作需要另外的 task/allowedExecutors/claim；本工作不部署、不改 catalog、不新增origin/費用/憑證或替人交接。

## 角色與優先度
cloud-dot 可承接此 spec task。品控2僅在沒有自己可評的遊戲候選時作此一項使用者指定後備；其工位依已保存政策為 P2，出現可評件在保存點回切。全域庫存低於6的補規格需求為P1，不以此擅改品控工位優先度。每一份獨立規格的完成、待複核、ready分開計數。
