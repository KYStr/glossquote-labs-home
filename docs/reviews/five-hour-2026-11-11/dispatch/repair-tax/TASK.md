# labs-five-hour-repair-tax-20261111

## 目標
固定SPEC本身有truncated字串且後半缺失，不可拼猜另一候選；以殘存BRIEF/fixtures/作者check為歷史資料，完整補八章節和九產品契約。保留單筆/明細、整元估算與手填稅率MVP；gross反算明訂估算，不承諾可直接填發票或法定通用回推。正算比對差額必須可見/可匯出，10元5%與13元4%半元反例固定。以已讀財政部一級來源核實法規用途、版本和限制，不新增正式開票/申報。缺失的錯誤優先序、schema、controller生命周期/晚到取消、JSON bytes、雙語、Node24零依賴命令、九面向/必要瀏覽器與交接全部補齊；來源說法不確定即列待查不可編造。

## 固定來源與失敗證據
原始來源詳sources.json（原PR/head/task/owner），initial-review/<slug>/REVIEW.md和review.json是具名非作者的初審快照，含literal input/expected及一級來源，不代表產品實測。用GitHub blob逐byte核對原四檔後，複製到本任務work/docs/specs/指定slug/再改；舊PR、舊owner、舊文件保留。只允許 tax-included-converter。

## 開工/交驗
讀最新remote AGENTS/START-HERE/AGENT-HANDBOOK/協作規則/registry。目前只讀設計，等主統籌registry串行slot後，本人local-codex:<實際chatID> ACK/register maintenance/claim/readback/start；三必要面向 spec-corrections、exact-fixtures、provenance-and-scope。每個GitHub reference先確認存在；用pure core、fresh revision/blob條件寫入、精確operationId/requestHash/claimId/owner讀回；失敗查原操作，不搶別人的claim。禁止冒簽、revise-spec、標ready或改原作者task。修正不等於ready，產品九面向不等於文件八面向。

只寫本任務資料夾work/指定規格、evidence/及HANDOFF.md和任務腳本。不得改其他task/root/工具產品/sharedregistry/共用git index；不得再委派。所有fixtures用獨立算式釘literal expected；舊結果有變要列前後及原因，不能用待製作產品產生expected。共同repo獨立codex分支PR由本人等發佈slot後提交，固定candidate再非作者審；不得merge/deploy。交付實際檔案/diff、命令/exit、固定來源/hash、NOT_RUN、已知風險與需要決策事項。

## 安全/截止
禁止桌面、本機互動browser、鍵鼠/焦點/IME/clipboard/native dialogs；只背景CLI/HTTP，子行程windowsHide true。Node24內建/既有Python，fake data、零新依賴；高風險來源讀官方。長automation前後persistent-env guard，GitHub寫前後git-settings guard；不得讀憑證/環境token、改global/system Git/gh auth、persistent env、安裝/付費。來源/owner變動、需新權限/超範圍，或連續兩輪同失敗沒進展即保存回報。UTC07:22:08收尾，2026-11-11T07:37:08Z硬截止；不得延長或假PASS。
