# 預案品質與補庫說明

可用存量以遠端registry推導，門檻 **40**。完整、未消耗且文件獨審通過才是ready；catalog draft、候選、reserved、working、reviewing均不計。低於40補規格P1，達40降P3，未知先盤點P1。工具製作維持P3；規格通過就可先放行，不等尚不存在的產品完成瀏覽器測試。

## 需求選題

先查source-index、registry全部spec/task、open PR及雲端回報，確認不是改名重複。有既有工具能合理補足時走原owner升級。每個新案寫一段真實情境：誰、在哪個裝置、手上有什麼資料、現在卡在哪、最後要拿到什麼可用結果。避免只做單一公式或從API能力倒推產品。

## 每份文件的必備內容

| 八節 | 可檢查的要求 |
| --- | --- |
| goal | 使用者具體問題、環境、成功結果、和既有功能的差異 |
| scope | MVP必做、非目標、資料/設備/格式與性能界線 |
| userFlow | 完整任務、範例入口、回復錯誤、dirty/reset/cancel等狀態 |
| inputsOutputs | 每個欄位型別/語法/單位/預設/最大值、錯誤和輸出精確語義 |
| implementation | 決定算法、精度/rounding/排序/Unicode/時區、資料結構及責任邊界 |
| acceptance | 預宣告九必要面向，不能交驗時刪除低分項 |
| tests | 至少6個字面input/expected：正常、邊界、錯誤、dirty等；可第三者手算 |
| handoff | 目錄、命令、milestone、交驗格式、停止條件、source/PR/release責任 |

`BRIEF.md` 是任務入口，`SPEC.md` 是完整契約，`fixtures.json` 是字面案例，`AUTHOR-CHECK.md` 是作者對文件做了什麼檢查；作者不得稱自己的文件為獨審。需要共通規範時附可取得的相對連結，不依賴另一個私有聊天內容。

## 放行規格與建立可承接任務

作者先發固定commit與PR，再以本人register-spec；另一實際actor讀完整文件、重算案例、檢查完整性及不重複，留下可追溯獨評，八節全true才mark-spec-ready。存在缺陷退回原作者，不為湊40把draft改ready。

每份放行預案還要有production task，固定source/brief/specId及原樣acceptanceCriteria。本輪新補庫任務明確允許local-codex及cloud-dot；這不是替雲端claim，也不改其他舊任務的allowedExecutors。預設由本地接續，雲端只可領獲允許且沒有owner的工作。

本輪40份文件的產品程式尚未製作，產品九面向都為NOT_RUN；文件審查通過不應寫成產品accepted或正式上線。作者工作與review工作各保留真實actor，不用同一人換名字自審。
