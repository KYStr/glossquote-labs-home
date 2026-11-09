# 隱私與安全：文字分段與字數限制

狀態：SPEC_ONLY；尚未有 browser Network/Storage 證據。

貼入來源往往是私人草稿；全文與所有切段只在分頁記憶體，不上傳、不進 URL、不寫 localStorage、IndexedDB、cookie、cache、console、telemetry 或 crash report。沒有帳號、雲端、外部 API、第三方字型/CDN/套件。

計算純同步、最大 100000 UTF-16 units 與 1000 chunks；不以未受限正規表示式處理內容，不把 input 注入 HTML。錯誤只回固定碼，不回顯 source。clipboard 僅在使用者明確點擊一段時呼叫 native API，傳送內容是已選片段；不得暗中 copy 或每次輸入同步。

所有 source/mode/limit 修改同步失效舊 output。async copy single-flight；busy lock 限制 source edits 到 request settles，revision + request ID 再檢查 UI result。若 API 永不 settle，保持明示忙碌，不宣稱完成。clipboard fallback 只選取片段等待使用者手動操作。

Dev server loopback only、public-only，正式頁無 server-side processing。真實 Network/Storage 檢查如能力不足標 NOT_RUN；source review 不可冒充 network pass。refresh/pagehide 釋放應用程式引用；不宣稱抹除 OS clipboard/history。
