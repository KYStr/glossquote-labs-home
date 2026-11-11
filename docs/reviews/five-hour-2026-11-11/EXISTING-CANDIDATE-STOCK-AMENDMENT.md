# 既有候選與新製作庫存的區分

主統籌裁定，2026-11-11 04:51 UTC。依使用者要求及共同 handbook「已有成果不能另 claim 同名預案假裝尚未製作」，登記冊沒有 task.specId 不足以證明尚未製作。

原 Run5 的十二款 build PR #265–#274、#276、#277，以及 PR283 的固定維護版本，均須保留並接續。它們的文件即使修好、八節獨審通過，也不能直接當作尚未製作的後備庫存，再派人重做產品。

## 對 PR304 九份映射的影響

固定候選仍為 `4bc6d4e300d315597a4b1ea5feb86f6f2d6fc1c0`，不修改任何候選 bytes、原作者、來源、targets 或九項產品 criteria。九份文件及映射可照八節 rubric 獨立審查、接受，主統籌再依法套用。

| 對象 | 套用後階段 | 庫存計數 |
| --- | --- | --- |
| age、workdays、salary、bill-split、dew-point、cooking-measurement | 保持 draft；接續既有 build／PR283 候選，另安排範圍明確的產品維護及九面向驗收 | 不計未製作庫存 |
| race-time-predictor | 保持 draft；既有 running-pace 升級，保留原 build | 不計新工具庫存 |
| nhi-premium、calories-burned | 另核對中央來源及既有候選，確認未製作後才可由非作者依法 ready | 尚未正式 ready，不先計數 |

這取代 PR304 HANDOFF 原先預期「其餘八份」後續可新增 ready 的排程。文件內容通過與實際可開工庫存是不同判定。原固定 HANDOFF 保留為歷史；本裁定是後續操作限制，不回寫原候選或冒稱原報告已含這項判斷。

同理，wallpaper、ping、clothing、feels-like-temperature、period 等已有 build 的規格修正，不另計未製作庫存。savings、photo-print、group、race 的既有工具升級也不計新站庫存。

## 已安排的核對

非作者 reviewer02 進行十二件固定候選的唯讀接續比對，包含原 PR／commit、PR283 產品路徑、與新規格的實際差異、尚缺驗收面向及下一個維護任務。歷史 616／646 測試紀錄不改成這輪重新執行。

登記冊目前記錄 ready 的 UTF-8 Base64、Dice Sum Distribution 兩份，另核對最新 source-index、catalog 與候選。核對完成前只報「登記記錄為 2」，實際未製作可用數保持未確認，不能依該數字開新製作工作。

沒有新製作 claim、原 owner 釋放、合併、部署或驗收分數被這項裁定代行。規格補庫仍為 P1；新預案必須完成、獨評並確認未被製作承接才計數。
