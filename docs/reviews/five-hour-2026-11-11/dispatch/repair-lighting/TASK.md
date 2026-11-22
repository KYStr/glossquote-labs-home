# labs-five-hour-repair-lighting-20261111

## 具體目標與主統籌裁決
LIGHT01：顆數用未捨入精確流明需求除單顆後ceil，不能先round流明；恰達標是>=不是永遠>。1.09坪100lx360lm例需2顆。LIGHT02：採可核實的現行GB/T50034-2024住宅表5.2.1作有查閱日期的參考，維持六個已有數值需逐格證明；標用途/參考平面、書寫閱讀混合照明，不稱台灣法定要求或辦公通用標準。LIGHT03：結果叫簡化模型平均照度估算，非實測；下載同義。LIGHT04：保留核心停用欄容量上限，但controller收到該欄錯誤時顯示可操作的『切回此模式修正』按鈕，按後顯示/啟用首錯欄再移焦，不自動清空使用者草稿；補切換/修正/重新送出字面state契約。不得用maxlength假裝全部程式輸入不可能。

## 固定來源與非目標
sources.json列原PR/commit/task/owner；initial-review/<slug>/REVIEW.md有非作者反例及來源。原四檔須以遠端blob核對後放work/docs/specs/<slug>/；允許slug僅lighting-lumen-calculator。本輪只修文件/fixtures，不製作產品，不碰既有tools/、原分支、原owner、資料或部署。REG-01的合法登記修復由另案處理，此任務不可自行revise-spec。涉及官方/科學來源應閱讀一級資料，網頁查不到不能編造，保存具體待核項。

## 開工/交驗
讀最新remote AGENTS/START-HERE/AGENT-HANDBOOK/協作規則/registry。目前只讀設計，等主統籌registry串行slot後，本人local-codex:<實際chatID> ACK/register maintenance/claim/readback/start；三必要面向 spec-corrections、exact-fixtures、provenance-and-scope。每個GitHub reference先確認存在；用pure core、fresh revision/blob條件寫入、精確operationId/requestHash/claimId/owner讀回；失敗查原操作，不搶別人的claim。禁止冒簽、revise-spec、標ready或改原作者task。修正不等於ready，產品九面向不等於文件八面向。

只寫本任務資料夾work/指定規格、evidence/及HANDOFF.md和任務腳本。不得改其他task/root/工具產品/sharedregistry/共用git index；不得再委派。所有fixtures用獨立算式釘literal expected；舊結果有變要列前後及原因，不能用待製作產品產生expected。共同repo獨立codex分支PR由本人等發佈slot後提交，固定candidate再非作者審；不得merge/deploy。交付實際檔案/diff、命令/exit、固定來源/hash、NOT_RUN、已知風險與需要決策事項。

## 安全/截止
禁止桌面、本機互動browser、鍵鼠/焦點/IME/clipboard/native dialogs；只背景CLI/HTTP，子行程windowsHide true。Node24內建/既有Python，fake data、零新依賴；高風險來源讀官方。長automation前後persistent-env guard，GitHub寫前後git-settings guard；不得讀憑證/環境token、改global/system Git/gh auth、persistent env、安裝/付費。來源/owner變動、需新權限/超範圍，或連續兩輪同失敗沒進展即保存回報。UTC07:22:08收尾，2026-11-11T07:37:08Z硬截止；不得延長或假PASS。
