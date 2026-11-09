# 隱私與安全：食譜份量換算

使用者的家庭食譜可能是私人內容。所有輸入只存在當前文件的記憶體；不發送 network，不記錄 console/log，不存 local/session storage、IndexedDB、cookie、不使用 service worker cache 或 analytics。pagehide/reload 清除輸入與結果。

不讀已保存憑證、帳戶或其他應用資料；不詢問秘密。沒有外部字型、CDN、API、遠端同步、上傳或伺服器計算。

嚴格限制欄位與列數；unknown schema 欄位拒絕；control characters 拒絕；所有使用者文字以純文字輸出。錯誤不重述整筆食譜。剪貼簿只有使用者操作時寫入，拒絕時有可選取文字備援，不將明細自動下載。

隱私文案限於本工具可證明的頁面內處理行為，不保證作業系統、擴充、截圖或使用者自行貼到其他目的地的資料安全。
