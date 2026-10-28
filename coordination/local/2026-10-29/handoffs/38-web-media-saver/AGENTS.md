# 現行任務：WEB-RELEASE

2026-10-22 使用者已明確授權本工具發布。本輪只依 [WEB-RELEASE](docs/WEB-RELEASE.md) 任務 A 製作正式發布候選；主代理固定版本 GO 後任務 B 由原對話推 GitHub。這項明確覆蓋下方已結束 M1 的停止範圍；禁止 UI／核心改動、遞迴委派與部署，其他安全規則保留。

# 歷史任務：WEB-M1

使用者已選 C 純網頁架構。原對話現在執行 [WEB-M1](docs/WEB-M1.md)，允許其中明列的 public/test/scripts/package/dist/HANDOFF/TASK-ENTRY/project 路徑與 `.runs/media-web-m1-2026-10-22/owner/`，取代下方 M0／UX1 已結束的範圍。主代理獨立做瀏覽器驗收；原對話禁止啟動或操作瀏覽器，禁止遞迴委派。保留原 src/core 與 dist-core。未收到固定候選 release GO 不推 GitHub／部署；其他安全／環境規則不變。

# 38 網頁影音下載助手：原功能對話契約

2026-10-22 UX1最新任務覆蓋：M0已凍結通過。本輪依使用者最新省步驟要求，只允許原對話新增docs/EXPERIENCE-OPTIONS.md與主代理新指定的UX1 owner證據；不可改M0程式或推進未選路線的M1。此明確覆蓋下方「只做M0」及docs通常由主代理持有的規則，僅限上述一份選項文件。最新需求見docs/EXPERIENCE-REQUIREMENTS.md，其他安全限制不變。

只做當前TASK-ENTRY允許的M0。主代理擁有規格/docs/共享首頁/部署/看板；你擁有本專案src/test/scripts/package/.gitignore/dist-core/HANDOFF/TASK-ENTRY/project.json，證據唯一目錄由dispatch指定。不要改其他產品，尤其11/12；不再委派。

requested gpt-6.1-sol/max，不用自述假裝backend驗證。先讀PRODUCT/TECHNICAL/ACCEPTANCE/docs，完成實作＋測試再交回，不能只寫提示詞或規劃。M0只Node24 ESM builtins，無外部套件／引擎下載執行、沒有UI或真網站請求。文件中的未來目標不是越級授權。

使用者仍在用電腦：禁止CUA/IAB/Playwright/瀏覽器/native UI、滑鼠鍵盤/IME/clipboard、啟用視窗或檔案選擇/儲存/列印對話框。hidden不是隔離證明。背景CLI測試可繼續；不實驗使用者桌面、不碰既有分頁或程序。必要UI記NOT_RUN_USER_FOCUS_INCIDENT，日後主代理核准隔離後才測。

禁止讀憑證、cookie、browser profile、token環境、全域config。禁止gh auth setup-git/login/refresh、全域／系統Git寫入、持久PATH/TEMP/TMP/registry/services/BCD/pagefile變更。只使用完整exe路徑或process-local環境，不能setx。長測試前後執行既有 `$env:USERPROFILE\.codex\check-persistent-environment.ps1`，完整Snapshots一致；未知漂移停回報，不猜復原。任何自有子程序windowsHide=true/Start-Process Hidden；不因測試方便關閉不屬本任務的程序。

若未來發佈：使用原對話與主代理指定固定版本GO，先後git-settings-guard；公開repo只KYStr/glossquote-labs-web-media-saver。此M0沒有產品必要gate，不能提前公開或部署。用戶原授權在gate通過後仍有效，無需再問一樣的授權。

遇契約衝突、需要新權限/成本/依賴、無法不干擾電腦、兩次相同失敗無新證據時停止相依工作並報具體原因；不要降低gate或謊稱PASS。完整結果由主代理親驗與封裝一個ZIP。
