# 工程約定：食譜份量換算

Node.js 24 ESM 與內建模組；瀏覽器為原生靜態頁。核心以 BigInt 做精確數值運算；不把原量轉 Number 再乘比例，不用分數 regex 接受未定義格式。

驗證層必須純函式且回傳穩定錯誤 code/row/field；每次有效提交使用獨立 immutable snapshot。UI 改值立即 revision++ 並淘汰輸出。clipboard callback 同時檢查 revision 和 request ID。

測試 expected 為手工固定 fixture。server loopback only，固定公開檔案 allowlist；GET/HEAD 和對應 MIME；method錯誤405、未知路由404；拒絕 path traversal、junction/hardlink/symlink escape、未知 stale build 檔。

check/build 離線執行；不新增外部 packages，不向任何服務傳食譜資料。source manifest 排除本機證據、build cache 和使用者資料。
