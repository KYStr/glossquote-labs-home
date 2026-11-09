# 圖片列印尺寸試算：原功能對話契約

只依本資料夾規格實作，不修改父專案、兄弟工具、共用首頁、既有驗收包或其他對話檔案。必要證據可寫根專案 .runs/print-size/ 自己唯一子目錄。TASKS.md 指定每個 milestone 的允許路徑；不可降級 PRODUCT/TECHNICAL/ACCEPTANCE 的門檻來讓測試通過。遇矛盾向主代理回報。

原對話 requested gpt-6.1-sol/max；工具接受的設定與實際 backend identity 分開記錄，不能用自述當模型證據。不再委派或另開對話。主代理負責設計、獨立驗收、共用整合與 hosting；原對話負責實作、同範圍修正、M1 通過後公開 GitHub。每個 gate 完成以 final 完整回報，主代理會讀取；不要求使用者轉貼。

所有使用者輸入只在頁面 memory。禁止 storage、URL 寫入、遙測、分析、遠端字型、外部套件、隱藏網路、console 輸出使用者內容。靜態本機運算；textContent/value 呈現內容。pagehide 清除草稿、結果、暫存、物件 URL 與 async epoch；BFCache 回來為初始空白狀態。改輸入即淘汰結果，不可沿用舊報告。

Node >=24、ESM、built-ins，測試離線假資料。預覽 loopback 127.0.0.1:4211。原生剪貼簿/下載/真機/完整 Network-Storage，不能以 mock 或靜態掃描冒充已驗；缺能力記 NOT_RUN 及影響，但必要運算與主要雙語操作仍須驗證。

禁止更改 persistent User/Machine 環境、PATH、TEMP/TMP、registry、服務、pagefile、BCD。禁止 setx、global/system Git 寫入及 gh auth setup-git/login/refresh。長時間工具工作前後執行既有環境 guard 並比對完整 fingerprints；來源發布前後執行 Git settings guard。只用 process-local 環境與官方完整 executable 路徑。發現未知漂移立即停止，不猜測還原。

不得讀帳戶憑證、環境中的 token、其他 repository、browser profile 或 credential store；不得使用 auth debug/trace。Cloudflare exact-file loader 的窄授權只給主代理部署，本功能對話不得調用。不得部署、變更權限、付費或碰 040141.xyz、GlossGate。保留現有服務與工作，不按 process 名稱/port 殺程序。

M1 只本機；M2 須主代理明確放行，只發布審核過的 public KYStr/glossquote-labs-print-size，使用隔離副本與 per-command git -c。M3 主代理。完成後 waiting external review，外部未回覆不得標 complete。完整 Git 限制見 docs/GIT-PUBLICATION-SAFETY.md。

停止條件：同路徑衝突、規格矛盾、必要權限/依賴/費用不足、持久設定漂移、同錯兩輪無新證據。回報具體輸入、錯誤、已試方式，不無限重試。

## 使用者測試限制（2026-10-18，立即生效）

各功能 UI 測試只使用瀏覽器工具，控制本功能自己專用的隔離／隱藏分頁。不得使用桌面/native app/OS 滑鼠鍵盤、啟用視窗或搶焦點，不得改動使用者的既有分頁、桌面或剪貼簿。允許瀏覽器內 DOM、頁內鍵盤及工具直接支援的非 OS 檔案操作；背景 CLI tests/check/build 不受影響。

不得為測試開啟原生列印、系統檔案選擇、下載儲存或其他 OS 對話框；這些能力逐項記 NOT_RUN。既有原生視窗不得用桌面控制關閉，改用新的專用分頁繼續不受影響檢查，不重試列印。保留歷史實際結果，不把未驗項改成 PASS。

### 焦點事件後暫停所有 UI（2026-10-18，優先於上述規則）

收到主代理緊急協調後，立即停止所有 browser/native/computer UI 操作，包括隱藏 IAB 的 fill/click/press/resize/screenshot/導航；不得為調查再呼叫 UI，不關閉分頁、視窗或程序。只可繼續背景 CLI 與檔案工作。此後的 UI 項標記 `NOT_RUN_USER_FOCUS_INCIDENT`，直到主代理重新通知。保留事件前的實測歷史，不以 hidden 推斷不會搶焦點。

使用者隨後澄清「可以操作，但不能影響到我」：背景檔案、CLI、HTTP 與已授權 M2 來源工作可繼續，不表示恢復 hidden IAB 輸入。主代理證實真正隔離機制前，不做任何本機互動 UI automation、不在使用者活躍桌面試錯、不換技術繞過或安裝／付費。完成可做的背景 milestone 後交回固定候選與 NOT_RUN，不等待或輪詢主對話。
