# 單一來源與預案補庫：整合紀錄

使用者要求：大量補齊可開工預案，整理分散repo，提供完整總說明書給雲端接續。這是來源與協作文件milestone，產品製作/部署/歷史驗收不在本輪重新宣告通過。

## 這次核實的現況

- 起點：registry revision804；spec130：ready2、draft38、reserved69、consumed21。145項task、90個ACK actor。兩端原始reconciliation完整；主頁固定baseline `26525d5f6380915ea95dde879dec769442db0d95` 保留。
- 與前輪revision801比較：802–804為新雲端統籌/品控身分ACK，未發現這三筆是產品修正或新候選。cloud採用回報是self_report，不等於已執行所有工作。
- 重新取得69個首頁open PR、65個公開工具repo預設分支、18個外部候選PR固定head；前輪19候選（含中央CSS）head未改。11/03退修與瀏覽器缺口仍保留原owner。
- 初始 ready2 是 UTF-8 Base64 與骰子總和分布。後續實際補庫數以[READY-STOCK](../../READY-STOCK.md)和最新registry為準，不把原草案38當ready。

## 來源整理

單一repo保存65個獨立repo預設分支快照（2343檔／12,161,192 bytes）、18個外部候選（416檔）、19個中央候選、61組已登記規格及原本地/雲端盤點。共5237份保存檔案、38,516,492 bytes，逐份bytes/Git blob SHA/SHA-256比對。

預設分支有18個只有一份README/gitignore或小骨架；完整候選分開保存。新檔索引不把骨架誤標為完成工具。部分中央快照與舊本地資料本就重複，保留原版本以免覆蓋差異。

`sources/legacy/`和`sources/candidates/`讓一個checkout就能讀取程式，`archives/`保留原證據，`tools/`是新實作位置。舊repo不封存/刪除，原PR、owner、固定規格及部署來源未改。更改已發布工具時由原owner做具來源比對的中央承接PR。

## 接續文件與工具

提供START-HERE、完整AGENT-HANDBOOK、SOURCE-LAYOUT、IMPLEMENTATION-CHECKLIST、REVIEW-AND-RELEASE、SPECIFICATION-STOCK、工作總表、可用庫存及JSON索引。修正原README過時的六份門檻與新建獨立repo流程；舊README原樣保存在根目錄歷史文件。

增加只讀 `scripts/workspace.mjs`：list、ready（分執行端）、show、verify-sources。輸出聲明是checkout快照，不寫claim、不改owner。根test命令改為具名首頁/協作測試，避免Node遞迴執行所有保留產品。

## 驗證與限制

主代理執行首頁/協作/索引共51項測試通過；源完整性5237檔通過；check、preview build及6產物byte核對通過。安全cleanup變更後單獨重跑受影響3項workspace測試通過，不累加成54項唯一測試。測試覆蓋不完整預案、環境不允許、已消耗/承接及未知盤點不列可領；source缺檔/篡改/重複/越界會拒絕。

來源取得曾遇候選archive TLS證書鏈失敗，未停用TLS驗證或修改信任設定；改用既有固定候選副本，逐檔與本輪GitHub tree/blob核對一致。跨repo Git tree不能直接引用，會先搬入原樣objects；這不是產品merge或部署。

未做產品功能重驗、正式站Network/Storage、真機、UI或部署；沒有控制使用者桌面。所有先前NOT_RUN與退修不被整合PASS抵銷。新預案的文件獨審與產品九面向分別記錄。

## 雲端接續與衝突

八組歷史本地/雲端替代來源完整保留，讀SOURCE-LAYOUT的對照後由原owner協商；統籌不默默選一份覆蓋。新預案先查130既有spec與候選，避免相同範圍重新製作。

原雲端統籌下一次工作需讀最新中央入口，確認新手冊/來源位置，按自己的實際actor查有效claim；原退修仍由原作者修正。新ready庫存只為尚未承接且獲允許的工作，沒有替任何雲端actor簽收、claim或宣稱自動喚醒。
