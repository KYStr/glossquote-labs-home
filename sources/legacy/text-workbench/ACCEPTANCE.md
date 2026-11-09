# 驗收案例

這是需求與預期，實際結果看 HANDOFF／docs/VERIFICATION.md；U01 新版不沿用舊版外部通過。

測試只用下列合成字串；反斜線表示 JS escape，不是字面反斜線。預設選項三項均 false。Node 只測純函式；真實瀏覽器項目另記版本、作業系統、結果於 HANDOFF。

| ID／類型 | 需求 | 輸入或步驟 | 精確預期 |
|---|---|---|---|
| TX-01 自動 | FR-01,05 | "" | text:""；before/after 皆 codePoints:0,lines:0,utf8Bytes:0 |
| TX-02 自動 | FR-03,05 | "A\r\nB\rC" | text:"A\nB\nC"；before 與 after 均 5 碼點、3 行、5 bytes |
| TX-03 自動 | FR-05 | "甲😀\n" | 3 碼點、2 行、8 bytes；文字不變 |
| TX-04 自動 | FR-05 | "e\u0301" | 2 碼點、1 行、3 bytes；不得正規化為 é |
| TX-05 自動 | FR-04 | "  A\t\n\tB  "；trimAscii:true | "A\nB" |
| TX-06 自動 | FR-04 | "\u3000A\u3000"；trimAscii:true | 全形空白原樣保留，3 碼點、7 bytes |
| TX-07 自動 | FR-04 | "A\n\n \nB\n"；dropEmpty:true | "A\n \nB"；空格那行保留 |
| TX-08 自動 | FR-04 | " A \nA\n\nB\nB"；全部 true | "A\nB" |
| TX-09 自動 | FR-04 | "A\na\nA\n"；deduplicate:true | "A\na\n"；尾端空行保留一次 |
| TX-10 自動 | FR-02 | "a".repeat(200000)；再以 200001 重試 | 前者成功，後者 INPUT_TOO_LARGE |
| TX-11 自動 | FR-02 | "甲".repeat(87381)+"a"；再增加 "a" | 前者 262144 bytes 成功；後者 INPUT_TOO_LARGE |
| TX-12 自動 | FR-02 | "\uD800" 與 "\uDC00" | 各 INVALID_UNICODE；不得變 U+FFFD |
| TX-13 自動 | FR-04 | options 多出 sort:true | INVALID_OPTIONS；不執行額外功能 |
| TX-14 自動 | FR-07 | session running jobId:2，收到 jobId:1 | session 不變且不可採用舊輸出 |
| TX-15 自動 | FR-08 | encodeOutput("甲\nA") | bytes [231,148,178,10,65]；無 BOM、無尾端額外 LF |
| TX-16 瀏覽器 | FR-10 | "<img src=x onerror=alert(1)>" | 原文／結果顯示同一文字；無 img 節點、彈窗或請求 |
| TX-17 瀏覽器 | FR-06,07,09 | 啟動後立刻取消；再啟動後清除；測試 harness 延遲 worker 回覆 | 狀態依序 dirty、idle；清除後原文/結果為空、選項皆 false；延遲回覆不復活結果 |
| TX-18 瀏覽器 | FR-09,10 | 載入完成後開 DevTools Network，離線，再處理；檢查 storage | 運算成功且處理無請求；沒有工具寫入的 cookie/storage/IDB；clear 撤銷 Blob URL |
| TX-19 瀏覽器 | FR-08 | 拒絕 clipboard；下載非空範例 | 顯示固定複製失敗提示；仍可選取結果；下載名 cleaned-text.txt，內容與 TX-15 相同 |
| TX-20 瀏覽器 | FR-10 | 測試頁禁用 Worker；另使 worker 超時 | 分別 UNSUPPORTED、TIMEOUT；不提交網路請求 |
| TX-21 瀏覽器 | FR-01,04,08 | 僅鍵盤完成貼上、選選項、整理、選取結果 | 無鍵盤陷阱、焦點可見、label 完整，readonly 結果可複製 |
| TX-22 瀏覽器 | FR-01,04,08 | 320 CSS px 與 200% 縮放，使用長行 | 頁面無橫向溢位，所有控制可達；文字區可局部捲動 |

最終命令只在 T00 建立腳本後執行：npm test、npm run check、npm run build；若工作目錄是 Git repository 另跑 git diff --check。瀏覽器流程需 npm run dev；人工停掉預覽服務。安全與存取檢查不能以正則掃描成功替代。

## U01 新版 gates（2026-10-13）

精確 U01-01–12 以 OUTCOME-UPGRADE-2026-10-13.md 為準。focused：node --test test/text.test.mjs test/session.test.mjs test/provenance.test.mjs；settled：npm.cmd test／check／build，另 build／check --production --cloudflare --site-url https://text.glossquote.com/。兩 production 頁唯一 x-default 指繁中 index；preview noindex、沒有正式 text origin／x-default。

純函式／DOM mock、實際瀏覽器假 Worker harness、原生 Worker／下載、真正裝置證據分別標示。最大 200,001 段落不得用模擬或人工例外跳過；OS clipboard、完整原生競態、Network／Storage、真 200% zoom／跨裝置缺能力時保持 NOT_RUN，不當 PASS 或 bug。source-only 候選不是新版本已上線；主代理發布／外部複驗仍獨立。
