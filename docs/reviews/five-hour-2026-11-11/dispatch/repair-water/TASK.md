# labs-five-hour-repair-water-20261111

## 具體目標與主統籌裁決
WATER01 cycle設獨立上限9，bimonthly通過、quarterly回ENUM，其餘欄8不動；新增第10字與首錯。WATER02增明確保育費是否附徵欄，初載要求依帳單確認，範例可指定true；費率為有查閱日期的5%，一般台水用戶可選免附徵，不默認全部要付；313與325同輸入對比固定。WATER03按台水官方『角以下四捨五入』及營業稅法14條核對整元含義，若本欄是估算拆稅需明確同義並限定不重複加總；採整元資訊欄4元、非營業戶不另列，原含稅總額不變。先讀官方公告/PDF/免附徵附表、26基本費與級距保持；不增加北水、優惠或分攤模型，不聲稱法律發票。更新全部受影響fixture/controller/schema及查閱日。

## 固定來源與非目標
sources.json列原PR/commit/task/owner；initial-review/<slug>/REVIEW.md有非作者反例及來源。原四檔須以遠端blob核對後放work/docs/specs/<slug>/；允許slug僅taiwan-water-bill。本輪只修文件/fixtures，不製作產品，不碰既有tools/、原分支、原owner、資料或部署。REG-01的合法登記修復由另案處理，此任務不可自行revise-spec。涉及官方/科學來源應閱讀一級資料，網頁查不到不能編造，保存具體待核項。

## 開工/交驗
讀最新remote AGENTS/START-HERE/AGENT-HANDBOOK/協作規則/registry。目前只讀設計，等主統籌registry串行slot後，本人local-codex:<實際chatID> ACK/register maintenance/claim/readback/start；三必要面向 spec-corrections、exact-fixtures、provenance-and-scope。每個GitHub reference先確認存在；用pure core、fresh revision/blob條件寫入、精確operationId/requestHash/claimId/owner讀回；失敗查原操作，不搶別人的claim。禁止冒簽、revise-spec、標ready或改原作者task。修正不等於ready，產品九面向不等於文件八面向。

只寫本任務資料夾work/指定規格、evidence/及HANDOFF.md和任務腳本。不得改其他task/root/工具產品/sharedregistry/共用git index；不得再委派。所有fixtures用獨立算式釘literal expected；舊結果有變要列前後及原因，不能用待製作產品產生expected。共同repo獨立codex分支PR由本人等發佈slot後提交，固定candidate再非作者審；不得merge/deploy。交付實際檔案/diff、命令/exit、固定來源/hash、NOT_RUN、已知風險與需要決策事項。

## 安全/截止
禁止桌面、本機互動browser、鍵鼠/焦點/IME/clipboard/native dialogs；只背景CLI/HTTP，子行程windowsHide true。Node24內建/既有Python，fake data、零新依賴；高風險來源讀官方。長automation前後persistent-env guard，GitHub寫前後git-settings guard；不得讀憑證/環境token、改global/system Git/gh auth、persistent env、安裝/付費。來源/owner變動、需新權限/超範圍，或連續兩輪同失敗沒進展即保存回報。UTC07:22:08收尾，2026-11-11T07:37:08Z硬截止；不得延長或假PASS。
