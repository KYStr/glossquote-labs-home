# 工程契約：行李清單與重量試算

狀態：SPEC_ONLY。沒有命令結果；遵循根 repo 的作者/交付契約，並在此完整列出本工具要求。

Node 24+、ESM、原生 HTML/CSS/browser modules；runtime 無套件。package.json 為 private。Node 只負責本機 server、檢查、build 和離線測試。server 僅 127.0.0.1:4202，只提供 public/，只允許 GET/HEAD；拒絕 traversal、hidden path、symlink/junction escape、寫入方法和未知 MIME 猜測。4202 被占用時不停止既有服務，改由 OS 分配 loopback 暫用 port，啟動後輸出並記錄實際 URL；不得靜默使用非 loopback 介面。

M1 scripts 建立後才可跑：npm run dev、npm test、npm run check、npm run build。test 使用 Node built-in node:test、node:assert/strict，全離線/假資料。Check 真正驗 HTML/ESM、語系頁 parity、active URL 資源和允許引用；不能用固定成功或正則結果宣稱安全。Build 只由 allowlist 複製 public 到本工具 dist，先驗 source/target。外部 sentinel、hardlink/junction、未知 stale files 不可被覆蓋或刪除；所有解析路徑須在預期 repo 下。

Core 數字使用 bounded ASCII grammar 和安全整數；JSON 用 strict schema v1 / unknown-key deny / fatal UTF-8。UI 名稱一律 textContent。Import async 需 request-id、revision 與取消失效，預覽確認之前不覆蓋；Object URL cleanup 需可觀察。匯入/下載的 Node mocks 只驗 schema/呼叫參數，不代表瀏覽器原生功能通過。

長時間 build/test/tool operation 前後依根 AGENTS 指示使用 check-persistent-environment.ps1 記錄 hash/type/length/entry count/fingerprint。禁止持久改 User/Machine env、PATH、TEMP/TMP、registry、services；如 guard 顯示未知差異先停止。若用 PS 互相啟動，完整路徑且 child-only module path；本工具不需要 dotnet。

保留其他工作與 processes。禁止 destructive git、根 repo publish/commit/push、讀取任何 credential、把 .runs/tests/docs/cache/secrets 打包。T00 allowed paths 由 TASKS 限制；發布只用 M2 專用 reviewed copy。

Server port contract: default 127.0.0.1:4202. If occupied, never stop or kill the existing process; ask the OS for a free loopback port, print and record the actual URL. Keep the fixed port as first choice.
