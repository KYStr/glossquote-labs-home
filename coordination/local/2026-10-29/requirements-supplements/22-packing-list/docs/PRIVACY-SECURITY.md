# 隱私與安全：行李清單與重量試算

狀態：SPEC_ONLY；尚未跑 Network、Storage 或瀏覽器安全檢查。

- 清單可能包含個人行程與物品資訊，全部只在分頁記憶體；不傳給伺服器、不放 URL、不寫 localStorage/IndexedDB/cookie/cache、不分析、不記錄。
- 沒有帳號、雲端、同步、第三方 API、analytics、telemetry、crash report、外部字型/CDN/icon package，也不讀取或要求任何 credential。
- 本機 HTTP server 只 bind 127.0.0.1:4202，只服務經允許的 public/，拒絕寫入和跨根路徑。
- 名稱/JSON 是不可信資料。只接受固定 schema v1 exact key、UTF-8 fatal、<=128 KiB、<=100列、唯一 ID 和逐欄值界線；一個錯誤即拒絕整檔。拒絕名稱控制碼。資料不因內嵌 HTML 解譯。
- 匯入先預覽，且只有使用者確認才取代；舊資料在取消/錯誤後仍留在目前頁面。來源變動會使待處理預覽失效；錯誤不回顯原始 JSON、檔名路徑或 exception。
- 匯出是明確 user action，固定檔名、無日期/IP/analytics；其內容仍可能含使用者輸入，介面需說明檔案保存位置由瀏覽器決定。拒絕自動上傳或自動儲存。
- 下載 object URL 在完成後與 pagehide 撤銷；pagehide 清除應用程式持有的清單引用。不得宣稱能安全抹除瀏覽器歷史、OS下載或記憶體。
- 主要 browser 流程需人工核對 Network 無清單上傳、Storage 無寫入；如設備工具無法檢查，標 NOT_RUN。Source scan 不等於完整 Network 證據。
- 不接受航空政策判斷，避免將估算宣稱為合規/安全結論。
