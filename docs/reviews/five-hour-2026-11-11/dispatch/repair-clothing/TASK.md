# labs-five-hour-repair-clothing-20261111

## 具體目標與主統籌裁決
修正CLOTH01至03。女裝US0依原表可命中，00文法與他欄0未知結果釘明。女裝泛稱EU改成實際採用的德國制參考，選單/表頭/輸出/FAQ/SEO與schema一致，不把德國/法國/義大利混為一個EU。所有15列逐格核對可查一級品牌來源或清楚標產品彙整及特定參考，不把無證據格宣稱權威等價；不能只因要保留fixtures硬拗來源。男裝JP XXL/2L別名與數字UK/US來源差異須明確定義；優先選同一可查品牌/地區表並列異動理由，若必要縮小已釘表格須先提出具體表回主統籌。先在設計中提出逐列來源與擬採表再修改，保留原始表/作者紀錄為歷史，產品及BuildPR273另案，不重做。身體胸圍與衣物平量分開。

## 固定來源與非目標
sources.json列原PR/commit/task/owner；initial-review/<slug>/REVIEW.md有非作者反例及來源。原四檔須以遠端blob核對後放work/docs/specs/<slug>/；允許slug僅clothing-size-converter。本輪只修文件/fixtures，不製作產品，不碰既有tools/、原分支、原owner、資料或部署。REG-01的合法登記修復由另案處理，此任務不可自行revise-spec。涉及官方/科學來源應閱讀一級資料，網頁查不到不能編造，保存具體待核項。

## 開工/交驗
讀最新remote AGENTS/START-HERE/AGENT-HANDBOOK/協作規則/registry。目前只讀設計，等主統籌registry串行slot後，本人local-codex:<實際chatID> ACK/register maintenance/claim/readback/start；三必要面向 spec-corrections、exact-fixtures、provenance-and-scope。每個GitHub reference先確認存在；用pure core、fresh revision/blob條件寫入、精確operationId/requestHash/claimId/owner讀回；失敗查原操作，不搶別人的claim。禁止冒簽、revise-spec、標ready或改原作者task。修正不等於ready，產品九面向不等於文件八面向。

只寫本任務資料夾work/指定規格、evidence/及HANDOFF.md和任務腳本。不得改其他task/root/工具產品/sharedregistry/共用git index；不得再委派。所有fixtures用獨立算式釘literal expected；舊結果有變要列前後及原因，不能用待製作產品產生expected。共同repo獨立codex分支PR由本人等發佈slot後提交，固定candidate再非作者審；不得merge/deploy。交付實際檔案/diff、命令/exit、固定來源/hash、NOT_RUN、已知風險與需要決策事項。

## 安全/截止
禁止桌面、本機互動browser、鍵鼠/焦點/IME/clipboard/native dialogs；只背景CLI/HTTP，子行程windowsHide true。Node24內建/既有Python，fake data、零新依賴；高風險來源讀官方。長automation前後persistent-env guard，GitHub寫前後git-settings guard；不得讀憑證/環境token、改global/system Git/gh auth、persistent env、安裝/付費。來源/owner變動、需新權限/超範圍，或連續兩輪同失敗沒進展即保存回報。UTC07:22:08收尾，2026-11-11T07:37:08Z硬截止；不得延長或假PASS。
