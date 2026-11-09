# 工程契約：文字分段與字數限制

狀態：SPEC_ONLY；命令、測試與工具鏈均 NOT_RUN。

產品是原生 browser ESM，靜態雙語 HTML/CSS，無 runtime dependencies；Node >=24，Node built-in node:test。正式運算完全在使用者 browser。dev server 固定 127.0.0.1:4203，GET/HEAD、只公開 public、嚴格路徑 containment、拒絕 traversal/hidden files/symlink/junction escape、非 GET/HEAD 方法。4203 被占用時保留既有服務，改由 OS 分配 loopback 暫用 port，輸出並記錄實際 URL。

scripts/dev/test/check/build 先建立再執行。check 要真實 parse modules、驗 required files/兩語 parity/active URL refs/local-only，不能以 regex 冒充完整安全審計。build 只複製 reviewed public allowlist 到本工具 dist；防 hardlink、junction、未知 stale target 與外部 sentinel 變動。

source <=100000 UTF-16 units，需拒絕不成對 surrogate；有效 source 轉 Array.from 以 scalar value 計數，max 10000，最多 1000 chunks。chunks 原文 slice join 必須等於 input。同步 core 無 Worker/cancel，因硬上限令迴圈最多約 1001 段操作。Clipboard 是 user gesture 後 async：一次一個 request，忙碌時鎖編輯，保存 immutable snapshot，revision/request ID 控制回傳，不讓 late result 污染新 UI。瀏覽器不能保證人工拒絕或 promise 卡住時能中斷底層 API；要如實記錄。

所有自動測試使用合成文字、離線；fake clipboard 不等於 native evidence。禁止來源寫 log/network/URL/storage。pagehide 清理應用程式持有的 source/result reference。

長測試/建置前後執行根 AGENTS 提供的 persistent environment guard，保存 PATH hash/type/length/ephemeral entries/full Environment fingerprint；不得改 User/Machine env、registry、PATH、TEMP/TMP。不得讀憑證、修改根 git state、force push 或影響其他專案。

Port fallback: try 127.0.0.1:4203 first. On EADDRINUSE do not stop the existing service; bind to an OS-assigned free loopback port, print/record the actual URL. Do not silently use public interfaces.
