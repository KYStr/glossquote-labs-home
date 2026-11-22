# labs-five-hour-repair-wallpaper-ping-20261111

## 目標
壁紙採購MVP用保守整幅方法：門窗只用來顯示淨牆面面積，不從整幅條數/採購捲數扣寬度；沒有位置、切割和可重用餘料資料時不能假設省掉整條。同步兩語文案和全部受影響字面fixtures/下載；門窗height不得高於牆height、首錯/欄位/row固定。驗WALL-01/02所列6條2捲反例。坪數保留全部常數和30坪下載，僅把『近似係數可區分』必測改100坪，3558.32 vs3558.33；補字面expected及一致作者紀錄。兩款已有build PR270/274，本任務只修規格，記錄後續產品受影響面，不重做工具。

## 固定來源與失敗證據
原始來源詳sources.json（原PR/head/task/owner），initial-review/<slug>/REVIEW.md和review.json是具名非作者的初審快照，含literal input/expected及一級來源，不代表產品實測。用GitHub blob逐byte核對原四檔後，複製到本任務work/docs/specs/指定slug/再改；舊PR、舊owner、舊文件保留。只允許 wallpaper-calculator, ping-area-converter。

## 開工/交驗
讀最新remote AGENTS/START-HERE/AGENT-HANDBOOK/協作規則/registry。目前只讀設計，等主統籌registry串行slot後，本人local-codex:<實際chatID> ACK/register maintenance/claim/readback/start；三必要面向 spec-corrections、exact-fixtures、provenance-and-scope。每個GitHub reference先確認存在；用pure core、fresh revision/blob條件寫入、精確operationId/requestHash/claimId/owner讀回；失敗查原操作，不搶別人的claim。禁止冒簽、revise-spec、標ready或改原作者task。修正不等於ready，產品九面向不等於文件八面向。

只寫本任務資料夾work/指定規格、evidence/及HANDOFF.md和任務腳本。不得改其他task/root/工具產品/sharedregistry/共用git index；不得再委派。所有fixtures用獨立算式釘literal expected；舊結果有變要列前後及原因，不能用待製作產品產生expected。共同repo獨立codex分支PR由本人等發佈slot後提交，固定candidate再非作者審；不得merge/deploy。交付實際檔案/diff、命令/exit、固定來源/hash、NOT_RUN、已知風險與需要決策事項。

## 安全/截止
禁止桌面、本機互動browser、鍵鼠/焦點/IME/clipboard/native dialogs；只背景CLI/HTTP，子行程windowsHide true。Node24內建/既有Python，fake data、零新依賴；高風險來源讀官方。長automation前後persistent-env guard，GitHub寫前後git-settings guard；不得讀憑證/環境token、改global/system Git/gh auth、persistent env、安裝/付費。來源/owner變動、需新權限/超範圍，或連續兩輪同失敗沒進展即保存回報。UTC07:22:08收尾，2026-11-11T07:37:08Z硬截止；不得延長或假PASS。
