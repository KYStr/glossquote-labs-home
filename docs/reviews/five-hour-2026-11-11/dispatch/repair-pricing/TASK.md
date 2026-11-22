# labs-five-hour-repair-pricing-20261111

## 目標
損益平衡可保留NO_MARGIN核心政策，但明確是沒有正貢獻的唯一銷售門檻；等價/低價、固定成本零/正的兩語文字不能全說每賣一件都更虧。2.675的half-even同為2.68，新增2.665→half-up2.67/half-even2.66鑑別。定價工具的用途是找達到目標的最低售價，solve-markup與solve-margin改精確有理數向上取整到最小分位；report維持原捨入，結果明示目標率與依售價回算實際率，不混淆。保留既有schema欄位意義，必要新增actualMarkup/actualMargin欄位須統一命名、下載與全部fixtures；0.01成本/25%兩模式需2分，並用減1分不達標證明最小性。零售價毛利率null，比例恆等式限分母非零。這是主統籌在已授權修正範圍的產品裁決，不待使用者重選。

## 固定來源與失敗證據
原始來源詳sources.json（原PR/head/task/owner），initial-review/<slug>/REVIEW.md和review.json是具名非作者的初審快照，含literal input/expected及一級來源，不代表產品實測。用GitHub blob逐byte核對原四檔後，複製到本任務work/docs/specs/指定slug/再改；舊PR、舊owner、舊文件保留。只允許 breakeven-calculator, markup-margin-calculator。

## 開工/交驗
讀最新remote AGENTS/START-HERE/AGENT-HANDBOOK/協作規則/registry。目前只讀設計，等主統籌registry串行slot後，本人local-codex:<實際chatID> ACK/register maintenance/claim/readback/start；三必要面向 spec-corrections、exact-fixtures、provenance-and-scope。每個GitHub reference先確認存在；用pure core、fresh revision/blob條件寫入、精確operationId/requestHash/claimId/owner讀回；失敗查原操作，不搶別人的claim。禁止冒簽、revise-spec、標ready或改原作者task。修正不等於ready，產品九面向不等於文件八面向。

只寫本任務資料夾work/指定規格、evidence/及HANDOFF.md和任務腳本。不得改其他task/root/工具產品/sharedregistry/共用git index；不得再委派。所有fixtures用獨立算式釘literal expected；舊結果有變要列前後及原因，不能用待製作產品產生expected。共同repo獨立codex分支PR由本人等發佈slot後提交，固定candidate再非作者審；不得merge/deploy。交付實際檔案/diff、命令/exit、固定來源/hash、NOT_RUN、已知風險與需要決策事項。

## 安全/截止
禁止桌面、本機互動browser、鍵鼠/焦點/IME/clipboard/native dialogs；只背景CLI/HTTP，子行程windowsHide true。Node24內建/既有Python，fake data、零新依賴；高風險來源讀官方。長automation前後persistent-env guard，GitHub寫前後git-settings guard；不得讀憑證/環境token、改global/system Git/gh auth、persistent env、安裝/付費。來源/owner變動、需新權限/超範圍，或連續兩輪同失敗沒進展即保存回報。UTC07:22:08收尾，2026-11-11T07:37:08Z硬截止；不得延長或假PASS。
