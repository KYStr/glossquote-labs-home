# B20-56-M1 工作紀錄

2026-10-23（Asia/Taipei）。僅執行 M1，不發布、不部署、不動共享路徑；requested gpt-6.1-sol/max，未獨立驗證 backend。

已讀本工具 14 份規格/契約、根 AGENTS、SECURITY-BASELINE、PRODUCT-THESIS、完整設計系統；工具 docs/DESIGN-SYSTEM 與根設計系統 SHA-256 相同。採用 frontend-design 方法輔助既有設計契約，不執行外部 hook 或加入套件。

可觀察完成條件：雙語靜態頁接上實際 CSV/練習/JSON 匯入匯出/列印 HTML，A01–A12 與負例有離線測試，check/build 實際產物及反例驗證，固定來源前後 hash 一致。B01–B05 由主代理後續真正隔離機制驗收，不能用 Node mock 充當。

介面模式：Product App。使用者在考前把現有題庫轉為練習；主要物件是當前問答卡。來源與限制可見，揭答案及自評相鄰，進度/練習模式/輸出相鄰，少用的匯入與順序設定一層 disclosure。

```text
桌面：工具名                         語言 / 首頁
      來源（15rem） | 當前題目、揭答案、已會/待複習
                   | 進度、批次、前後題、輸出
手機：工具名 / 導覽 → 來源 → 開始 → 單卡 → 進度與輸出
```

可逆決策：表頭與欄位保留序號識別；額外 CSV 欄可以選擇但不輸出；無內容的初始題庫；空白判斷只 trim 不修改。所有題庫替換/重設進度用頁內確認。輸入錯誤保留可編輯來源，立即讓舊輸出失效。

M1 不啟動 server、browser、CUA、截圖、原生對話框；不讀使用者文件、帳戶或 token。不開新 chat、不委派、不設定自動續行。

T00→T01→T02→T03→T04 已依前置門檻順序執行。最終 M1-r2：53/53 offline tests，check/build exit 0，20 ESM syntax、14 dist bytes 比對、41 來源檔前後 hash 相同；包含 3 張假資料的 schema1 JSON 與兩語 HTML 真檔案。所有歷史命令／失敗保留，詳細見 HANDOFF 與 evidence/m1/ACCEPTANCE-STATUS.md。

整合覆讀修正：CSV 失敗讀取保留舊編輯來源，成功才替換；header 改變清除舊標籤而保留欄位索引；pagehide 後晚到讀取不復活。JSON 格式化超 2 MiB 明確拒絕，避免生成不能還原的下載。

Environment guard 初始至最終完整一致，沒有修正既有 PATH duplicate entries。瀏覽器及 release 必要 gate 仍 NOT_RUN_USER_FOCUS_INCIDENT；等待主代理親自驗收與必要隔離機制，未自行進入 M2/M3。單一整合 ZIP 由主代理彙整，本功能對話不另製使用者交付包。

B20-56-R01：主代理阻止 M1-r2 驗收，指出 app 選取 JSON 檔案及取消預覽會丟棄已貼草稿。已修正匯入流程只在確認成功替換時清空草稿，並標示檔案／貼文預覽來源。新增 18 項兩語 app 事件假 DOM 回歸；目前候選 M1-r3，71/71 tests、check/build exit 0、21 檔語法、42 檔來源前後 hash 相同。來源與假資料輸出證據在 evidence/m1/r01；舊證據保留。R01 前後完整 Environment 一致；browser/native/焦點/clipboard 等未操作，B01–B05 繼續 NOT_RUN_USER_FOCUS_INCIDENT，未發布／部署／委派。

B20-RP-56／M1B（2026-10-23）：已完整讀取本輪 .runs/batch20-release-prep-2026-10-23/TASK.md，僅實作離線發布工具鏈。新增 build:release/check:release、固定 origin 與 public pins、15 檔 site＋獨立 manifest、26 項 release 測試；原工具鏈測試暫存改至 evidence/m1b。最終一次完整 npm test 97/97、check/build:release/check:release 全 exit 0；46 檔執行來源前後相同，107 檔 public/dist/舊證據/契約不變。Environment 前後完整一致。沒有重建 preview，沒有 browser/CUA/IAB/CDP/native/clipboard/server、憑證、安裝、Git/auth/persistent 修改、GitHub、部署或委派。M1B-RELEASE.md 與 HANDOFF 追加本輪現況，舊 M1 evidence 保留；主代理回收獨立驗證後仍須必要 browser／release gate。
