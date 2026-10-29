# 箱內排列容量試算：原功能對話契約

只依本資料夾規格實作，不修改父專案、兄弟工具、共用首頁、既有驗收包或其他對話檔案。必要證據可寫根專案 .runs/box-fit/ 自己唯一子目錄。TASKS.md 指定每個 milestone 的允許路徑；不可降級 PRODUCT/TECHNICAL/ACCEPTANCE 的門檻來讓測試通過。遇矛盾向主代理回報。

原對話 requested gpt-6.1-sol/max；工具接受的設定與實際 backend identity 分開記錄，不能用自述當模型證據。不再委派或另開對話。主代理負責設計、獨立驗收、共用整合與 hosting；原對話負責實作、同範圍修正、M1 通過後公開 GitHub。每個 gate 完成以 final 完整回報，主代理會讀取；不要求使用者轉貼。

所有使用者輸入只在頁面 memory。禁止 storage、URL 寫入、遙測、分析、遠端字型、外部套件、隱藏網路、console 輸出使用者內容。靜態本機運算；textContent/value 呈現內容。pagehide 清除草稿、結果、暫存、物件 URL 與 async epoch；BFCache 回來為初始空白狀態。改輸入即淘汰結果，不可沿用舊報告。

Node >=24、ESM、built-ins，測試離線假資料。預覽 loopback 127.0.0.1:4213。原生剪貼簿/下載/真機/完整 Network-Storage，不能以 mock 或靜態掃描冒充已驗；缺能力記 NOT_RUN 及影響，但必要運算與主要雙語操作仍須驗證。

禁止更改 persistent User/Machine 環境、PATH、TEMP/TMP、registry、服務、pagefile、BCD。禁止 setx、global/system Git 寫入及 gh auth setup-git/login/refresh。長時間工具工作前後執行既有環境 guard 並比對完整 fingerprints；來源發布前後執行 Git settings guard。只用 process-local 環境與官方完整 executable 路徑。發現未知漂移立即停止，不猜測還原。

不得讀帳戶憑證、環境中的 token、其他 repository、browser profile 或 credential store；不得使用 auth debug/trace。Cloudflare exact-file loader 的窄授權只給主代理部署，本功能對話不得調用。不得部署、變更權限、付費或碰 040141.xyz、GlossGate。保留現有服務與工作，不按 process 名稱/port 殺程序。

M1 只本機；M2 須主代理明確放行，只發布審核過的 public KYStr/glossquote-labs-box-fit，使用隔離副本與 per-command git -c。M3 主代理。完成後 waiting external review，外部未回覆不得標 complete。完整 Git 限制見 docs/GIT-PUBLICATION-SAFETY.md。

停止條件：同路徑衝突、規格矛盾、必要權限/依賴/費用不足、持久設定漂移、同錯兩輪無新證據。回報具體輸入、錯誤、已試方式，不無限重試。

## Browser-only testing restriction (user, 2026-10-18)

Use browser tools in task-owned isolated/hidden tabs only. Do not control the desktop, native applications or OS mouse/keyboard; do not activate windows, steal focus, change the user's tabs or clipboard, or trigger native print/file-picker/save dialogs. Such native checks remain NOT_RUN/manual. Browser-tool-supported operations without OS dialogs and background CLI tests/builds remain allowed. Preserve prior actual evidence; never turn missing tests into PASS.
