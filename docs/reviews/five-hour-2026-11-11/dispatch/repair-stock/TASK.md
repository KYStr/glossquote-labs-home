# labs-five-hour-repair-stock-20261111

## 具體目標與主統籌裁決
修正 ST-01 至 04。day 模式須明確確認適格普通現股當沖，規格不能用 share/lot 字串單獨判資格；採規格範圍的標準1000股交易單位，正規化後買賣沖銷數量均須整批、另明示同帳戶/同日/同標的與資格確認，否則明確錯誤；不替人推斷真實交易資格。不新增券商連線。保留每分理論保本價，雙語結果與JSON標明不是可委託報價，100.59例仍理論值；100.50與101.00只作tick反證，不新增市場委託功能。以精確有理數連續上下界推導有界全域最小搜尋，證明上下界與最多候選數，加入49/50/51非單調反例及合法極值，不能用二分或鄰點誤證全域最小。主統籌決定金額輸出一律固定兩位十進字串，BigInt分值內算，避免保留原巨大合法域又丟失分值；更新core/Worker/UI/JSON schema、全部fixtures和canonical bytes。百分比/數量維持既定語義。官方來源需重讀資格、期限和第62/94條，費率預設不是法定統一費率。保留原owner與舊candidate。

## 固定來源與非目標
sources.json列原PR/commit/task/owner；initial-review/<slug>/REVIEW.md有非作者反例及來源。原四檔須以遠端blob核對後放work/docs/specs/<slug>/；允許slug僅stock-profit-calculator。本輪只修文件/fixtures，不製作產品，不碰既有tools/、原分支、原owner、資料或部署。REG-01的合法登記修復由另案處理，此任務不可自行revise-spec。

## 開工/交驗
讀最新remote AGENTS/START-HERE/AGENT-HANDBOOK/協作規則/registry。目前只讀設計，等主統籌registry串行slot後，本人local-codex:<實際chatID> ACK/register maintenance/claim/readback/start；三必要面向 spec-corrections、exact-fixtures、provenance-and-scope。每個GitHub reference先確認存在；用pure core、fresh revision/blob條件寫入、精確operationId/requestHash/claimId/owner讀回；失敗查原操作，不搶別人的claim。禁止冒簽、revise-spec、標ready或改原作者task。修正不等於ready，產品九面向不等於文件八面向。

只寫本任務資料夾work/指定規格、evidence/及HANDOFF.md和任務腳本。不得改其他task/root/工具產品/sharedregistry/共用git index；不得再委派。所有fixtures用獨立算式釘literal expected；舊結果有變要列前後及原因，不能用待製作產品產生expected。共同repo獨立codex分支PR由本人等發佈slot後提交，固定candidate再非作者審；不得merge/deploy。交付實際檔案/diff、命令/exit、固定來源/hash、NOT_RUN、已知風險與需要決策事項。

## 安全/截止
禁止桌面、本機互動browser、鍵鼠/焦點/IME/clipboard/native dialogs；只背景CLI/HTTP，子行程windowsHide true。Node24內建/既有Python，fake data、零新依賴；高風險來源讀官方。長automation前後persistent-env guard，GitHub寫前後git-settings guard；不得讀憑證/環境token、改global/system Git/gh auth、persistent env、安裝/付費。來源/owner變動、需新權限/超範圍，或連續兩輪同失敗沒進展即保存回報。UTC07:22:08收尾，2026-11-11T07:37:08Z硬截止；不得延長或假PASS。
