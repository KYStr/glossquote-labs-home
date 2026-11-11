# labs-five-hour-repair-savings-20261111

## 具體目標與主統籌裁決
主統籌裁定 existing-tool-upgrade：既有 compound-interest-calculator 已有每月需存及月份反算，這份只保留尾款與有界達標計畫升級，不再獨立新站或計新工具ready。固定既有PR44規格與PR80來源，不改既有產品或owner。修正SG-02：期末餘額由實際顯示的尾款/初始額/期末利息推導，不強制等於目標；純成長11046.22及1046.22、含利息尾款後20000.01及2547.13入fixtures；目標另欄明示，無必然小於一分承諾。SG-03：精確幂與月份評估一律先限0至1200，先B(1200)判超期，再區間內求最早月份，永不先算三百萬次方。加入1200/1201、有正利率但超期、小額逐月捨入差異、尾款一分邊界。保留本提案未中間捨入模型為明示升級提案，不默默替換既有逐月捨入行為；後續產品整合另任務。

## 固定來源與非目標
sources.json列原PR/commit/task/owner；initial-review/<slug>/REVIEW.md有非作者反例及來源。原四檔須以遠端blob核對後放work/docs/specs/<slug>/；允許slug僅savings-goal-calculator。本輪只修文件/fixtures，不製作產品，不碰既有tools/、原分支、原owner、資料或部署。REG-01的合法登記修復由另案處理，此任務不可自行revise-spec。

## 開工/交驗
讀最新remote AGENTS/START-HERE/AGENT-HANDBOOK/協作規則/registry。目前只讀設計，等主統籌registry串行slot後，本人local-codex:<實際chatID> ACK/register maintenance/claim/readback/start；三必要面向 spec-corrections、exact-fixtures、provenance-and-scope。每個GitHub reference先確認存在；用pure core、fresh revision/blob條件寫入、精確operationId/requestHash/claimId/owner讀回；失敗查原操作，不搶別人的claim。禁止冒簽、revise-spec、標ready或改原作者task。修正不等於ready，產品九面向不等於文件八面向。

只寫本任務資料夾work/指定規格、evidence/及HANDOFF.md和任務腳本。不得改其他task/root/工具產品/sharedregistry/共用git index；不得再委派。所有fixtures用獨立算式釘literal expected；舊結果有變要列前後及原因，不能用待製作產品產生expected。共同repo獨立codex分支PR由本人等發佈slot後提交，固定candidate再非作者審；不得merge/deploy。交付實際檔案/diff、命令/exit、固定來源/hash、NOT_RUN、已知風險與需要決策事項。

## 安全/截止
禁止桌面、本機互動browser、鍵鼠/焦點/IME/clipboard/native dialogs；只背景CLI/HTTP，子行程windowsHide true。Node24內建/既有Python，fake data、零新依賴；高風險來源讀官方。長automation前後persistent-env guard，GitHub寫前後git-settings guard；不得讀憑證/環境token、改global/system Git/gh auth、persistent env、安裝/付費。來源/owner變動、需新權限/超範圍，或連續兩輪同失敗沒進展即保存回報。UTC07:22:08收尾，2026-11-11T07:37:08Z硬截止；不得延長或假PASS。
