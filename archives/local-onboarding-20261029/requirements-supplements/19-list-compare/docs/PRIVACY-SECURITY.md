# 隱私與安全：名單比對與合併

名單可能包含個資。頁面不得將 A/B 送出本機、記入 log/console、DOM 屬性中的非必要副本、URL、telemetry 或 crash report。沒有 server API、third-party requests、analytics、beacon、remote font、service worker cache 或 persistence。

只在記憶體讀取 textarea 值；輸入、輸出、錯誤詳情及 copy fallback 離頁/pagehide/reload 清空。不得讀取既有瀏覽器保存資料。支援範圍僅使用者明確輸入當前頁面的文字。

所有上限在任何集合運算前執行，避免無界輸入。schema exact、未知欄位拒絕。原文不插入 HTML；錯誤訊息只說錯誤類型、側別和行號。Clipboard 寫入需使用者按鈕觸發，錯誤不帶名單內容。頁面 CSP 應無外部 connect-src，且不得為「修復」錯誤而允許未知來源；實際正式 header 留給 M2/M3 驗證。

Threat boundaries：客戶自己的瀏覽器擴充、螢幕錄影、OS clipboard manager 和手動複製目的地不由此頁控制。說明不可誇大到可抵禦這些環境。
