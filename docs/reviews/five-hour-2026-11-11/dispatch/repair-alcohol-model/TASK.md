# labs-five-hour-repair-alcohol-model-20261111

## 具體目標與主統籌裁決
依S02-BAC01至04修正高風險用途：主統籌裁定移除個人過酒駕門檻/歸零/恢復駕駛的分鐘倒數與行政/刑事/低於門檻標籤。主成果改為輸入飲料對應攝入純酒精克數，副項若保留Widmark僅明示『完全吸收的固定參數數學模型』，不是當前量測或個人法律/駕駛判斷；不再使用elapsedMinutes推目前血值，該欄從新schema/介面移除，保留舊規格在來源歷史。不新增吐氣換算。法律資料若保留僅另獨立說明兩項檢測途徑及其他事證，官方查閱日/適用範圍明確，不將行政刑事說成互斥，也不說0.4罰額級距不存在。兩語結果/SEO/報告同樣明示模型假設、未量測/不可判可駕駛，停止飲酒後仍可能上升，來源不支持固定消除速度保證。飲料row shape精確定義錯型/缺欄/額外欄/非物件/首錯/row，不讀accessor，新增row2/sex錯誤競合literal。原嚴格門檻ceil反例保留文件勘誤，不能以改floor+1重新推出個人駕駛時間。先提供完整新input/output和數值用途設計供主統籌核對，再寫四檔及新fixtures。產品仍須另行完整審查。

## 固定來源與非目標
sources.json列原PR/commit/task/owner；initial-review/<slug>/REVIEW.md有非作者反例及來源。原四檔須以遠端blob核對後放work/docs/specs/<slug>/；允許slug僅bac-calculator。本輪只修文件/fixtures，不製作產品，不碰既有tools/、原分支、原owner、資料或部署。REG-01的合法登記修復由另案處理，此任務不可自行revise-spec。涉及官方/科學來源應閱讀一級資料，網頁查不到不能編造，保存具體待核項。

## 開工/交驗
讀最新remote AGENTS/START-HERE/AGENT-HANDBOOK/協作規則/registry。目前只讀設計，等主統籌registry串行slot後，本人local-codex:<實際chatID> ACK/register maintenance/claim/readback/start；三必要面向 spec-corrections、exact-fixtures、provenance-and-scope。每個GitHub reference先確認存在；用pure core、fresh revision/blob條件寫入、精確operationId/requestHash/claimId/owner讀回；失敗查原操作，不搶別人的claim。禁止冒簽、revise-spec、標ready或改原作者task。修正不等於ready，產品九面向不等於文件八面向。

只寫本任務資料夾work/指定規格、evidence/及HANDOFF.md和任務腳本。不得改其他task/root/工具產品/sharedregistry/共用git index；不得再委派。所有fixtures用獨立算式釘literal expected；舊結果有變要列前後及原因，不能用待製作產品產生expected。共同repo獨立codex分支PR由本人等發佈slot後提交，固定candidate再非作者審；不得merge/deploy。交付實際檔案/diff、命令/exit、固定來源/hash、NOT_RUN、已知風險與需要決策事項。

## 安全/截止
禁止桌面、本機互動browser、鍵鼠/焦點/IME/clipboard/native dialogs；只背景CLI/HTTP，子行程windowsHide true。Node24內建/既有Python，fake data、零新依賴；高風險來源讀官方。長automation前後persistent-env guard，GitHub寫前後git-settings guard；不得讀憑證/環境token、改global/system Git/gh auth、persistent env、安裝/付費。來源/owner變動、需新權限/超範圍，或連續兩輪同失敗沒進展即保存回報。UTC07:22:08收尾，2026-11-11T07:37:08Z硬截止；不得延長或假PASS。
