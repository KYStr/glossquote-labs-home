# labs-five-hour-repair-feeding-20261111

## 具體目標與主統籌裁決
BABY先讀NHS一級指引，入口需明確確認健康足月/配方奶、已過第一週、仍在約6個月適用期；以受限可判斷的年齡欄及必要確認處理未滿一月/空白，非適用只顯示原因、無逐餐成功/下載，不用checkbox覆蓋已知超域。不得暗示第一週/9月或其他醫療情境適用。每日量為指引一般估算，分餐改標算術均分示意，非個別餵食時程，回應飢飽信號不能被數字蓋過；最大3000ml單餐不是可執行建議，應在方案中移除該個別餐量推薦路徑。報告帶固定來源/查閱日/適用條件/估算與非餵食指示，JSON兩語可單獨理解；保留域內算術反例。PET減重輸入前明示獸醫確認的目標體重；切入減重保存但不沿用一般體重，需填/重新確認目標值，切回可恢復草稿；更改值後確認失效，報告記weightBasis/估算。PET02維持正常日量與分配整數契約，若任何正能量餐的克數/杯量在原精度為0，將該單位分餐狀態設below-display-resolution，對應可執行餐量欄null並顯示小於可用精度/無法按此單位分餐，不顯示0等於不用餵；保留總量與完整原始推導供追溯，不默默四捨五入造出正整數破總和。一般數值/11倍率保留，加入極端、切換及有無cup路徑，來源為估算起點非醫囑。

## 固定來源與非目標
sources.json列原PR/commit/task/owner；initial-review/<slug>/REVIEW.md有非作者反例及來源。原四檔須以遠端blob核對後放work/docs/specs/<slug>/；允許slug僅baby-feeding-calculator, pet-feeding-calculator。本輪只修文件/fixtures，不製作產品，不碰既有tools/、原分支、原owner、資料或部署。REG-01的合法登記修復由另案處理，此任務不可自行revise-spec。涉及官方/科學來源應閱讀一級資料，網頁查不到不能編造，保存具體待核項。

## 開工/交驗
讀最新remote AGENTS/START-HERE/AGENT-HANDBOOK/協作規則/registry。目前只讀設計，等主統籌registry串行slot後，本人local-codex:<實際chatID> ACK/register maintenance/claim/readback/start；三必要面向 spec-corrections、exact-fixtures、provenance-and-scope。每個GitHub reference先確認存在；用pure core、fresh revision/blob條件寫入、精確operationId/requestHash/claimId/owner讀回；失敗查原操作，不搶別人的claim。禁止冒簽、revise-spec、標ready或改原作者task。修正不等於ready，產品九面向不等於文件八面向。

只寫本任務資料夾work/指定規格、evidence/及HANDOFF.md和任務腳本。不得改其他task/root/工具產品/sharedregistry/共用git index；不得再委派。所有fixtures用獨立算式釘literal expected；舊結果有變要列前後及原因，不能用待製作產品產生expected。共同repo獨立codex分支PR由本人等發佈slot後提交，固定candidate再非作者審；不得merge/deploy。交付實際檔案/diff、命令/exit、固定來源/hash、NOT_RUN、已知風險與需要決策事項。

## 安全/截止
禁止桌面、本機互動browser、鍵鼠/焦點/IME/clipboard/native dialogs；只背景CLI/HTTP，子行程windowsHide true。Node24內建/既有Python，fake data、零新依賴；高風險來源讀官方。長automation前後persistent-env guard，GitHub寫前後git-settings guard；不得讀憑證/環境token、改global/system Git/gh auth、persistent env、安裝/付費。來源/owner變動、需新權限/超範圍，或連續兩輪同失敗沒進展即保存回報。UTC07:22:08收尾，2026-11-11T07:37:08Z硬截止；不得延長或假PASS。
