# 本機資料與安全契約

輸入只存在当前頁面記憶體，由使用者明確copy/download才輸出。不用cookies、localStorage、sessionStorage、IndexedDB、Cache API、Service Worker、history/URL query/hash保存內容。不自動讀剪貼簿、不讀私人文件/瀏覽器profile/credentials。清除/離頁移除工具引用不等於OS抹除或抹掉已複製內容。

無帳號、API、telemetry、analytics/beacon、crash upload、遠端字型/CDN/圖片。runtime不fetch使用者URL或內容；只有自身靜態頁面資產。伺服器仍會收到網站載入的連線資訊，不宣稱完全沒有任何連線。正式隱私說明必須符合真Network觀察，不能只靠source承諾。

user文字只textContent/value；不innerHTML、eval、new Function、script URL、動態import使用者內容。所有上限、格式與schema固定驗證；不把錯誤raw值寫console/log/report。報告只由使用者顯式輸出，本機測試證據只用假資料。

所有輸出由current revision生成；來源變更立即使舊輸出無效。clipboard promise晚到不可覆蓋新狀態；Blob URL及timer在清除/離頁回收。下載失敗有可見錯誤，不能把Node mock成功當原生下載成功。

建議固定CSP：default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'。不加入unsafe-inline/unsafe-eval或遠端origin來消除console問題；若真需要某能力先對照PRODUCT。favicon自家檔可選；不依賴data/blob圖片，下載Blob不是img資源。

正式HTTP另有nosniff、no-referrer及Permissions-Policy停用camera/microphone/geolocation/payment。靜態託管Insights注入也在檢查範圍，包括/cdn-cgi/rum，不只看第三方domain。分別記錄script注入、CSP阻擋、實際request/payload，沒有觀察能力就NOT_RUN，不把CSP當傳輸證據。

部署token只有主對話已審查loader可按既有明確授权使用，本功能對話不讀token文件/環境/密碼庫、不擴權、不透過新token繞過。source publication可沿用gh既有登入，但禁止輸出token。公開副本不含.runs、node_modules、私人內容、秘密或其他工具。
