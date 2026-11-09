# 驗收規格：報價單快速製作

狀態：規格，尚未實作。下列為固定 oracle，expected 不能由被測函式動態推導。核心測試使用假資料與 Node `node:test`；瀏覽器、真實下載、視覺、Network/Storage 需獨立記錄，不能把 Node/HTTP 證據寫成 browser PASS。

## 純核心測試

| ID | 輸入 / 步驟 | 明確預期 | 關聯 |
|---|---|---|---|
| A01 | 一列 quantity=`2.5`, unitPrice=`19.99` | `quantityMilli=2500`, `unitPriceMinor=1999`, `lineMinor=4998`，顯示 `49.98`。 | FR-03 |
| A02 | quantity=`0.001`, unitPrice=`5.00` | `1×500/1000=0.5` 分，half-up 得 `lineMinor=1`，顯示 `0.01`。 | FR-03 |
| A03 | quantity=`1000000`, unitPrice=`1000000000.00` | 解析成功、以 BigInt 計算；列分數為 `100000000000000000`，不得轉 Number 或溢位。 | FR-02/03 |
| A04 | quantity=`0.001`, unitPrice=`0` | 合法，列金額 `0`；數量為正與金額為零可同時成立。 | FR-02/03 |
| A05 | 兩列 `2.5×19.99` 與 `1×10.00`，discount=`9.98`，taxRate=`5.00` | 小計 `5998` 分、折後 `5000` 分、稅 `250` 分、總額 `5250` 分。 | FR-03 |
| A06 | 一列 `0.01` 元，taxRate=`50.00` | 折後一分的半分稅額 half-up 為一分；總額兩分。 | FR-03 |
| A07 | quantity=`0.000` 或 `1000000.001` | 分別拒絕低於最小值與高於最大值；不產生輸出。 | FR-02 |
| A08 | quantity=`1.0000`, `1e3`, ` 1`, `+1`, `-1` | 全部拒絕；不得 trim、按科學記號解析或寬鬆轉數字。 | FR-02 |
| A09 | unitPrice=`1000000000.00` 與 `1000000000.01` | 上界接受；超出 0.01 拒絕。單價 `1.001` 也拒絕。 | FR-02 |
| A10 | 折扣恰等於小計，再試折扣多 0.01 | 等於小計接受、折後 0；多 0.01 拒絕，稅基不能變負。 | FR-02/03 |
| A11 | taxRate=`0`, `100.00`, `100.01`, `1.001` | 前兩個接受；後兩個分別因超上界及小數位超限拒絕。 | FR-02/03 |
| A12 | 50 筆合法項目，逐筆一分 | 接受、保留輸入順序、總小計 `50` 分；再加第 51 筆整份拒絕。 | FR-01/02 |
| A13 | 文字 `</td><script>alert(1)</script>&"'` 作為項目說明及備註 | 預覽資料節點只呈現文字；HTML 含 `&lt;/td&gt;&lt;script&gt;` 等編碼，沒有 script element/attribute、遠端 URL 或事件 handler。 | FR-04/05 |
| A14 | 備註含 CRLF 與字面 `END:VCARD` / `<img onerror=x>` | CR/LF 按允許的文字換行留在同一備註；HTML 仍只產生固定文字節點，沒有新標籤或額外結構。 | FR-02/05 |
| A15 | 合法 schema 1 JSON；再各加未知 key、錯誤 version、JSON 字串 `\ud800`、重複 `"note"` key | 合法輸入可匯入並重算；其他四種拒絕，原草稿不變。重複 key 必須在 tokenizer 層拒絕。 | FR-05 |
| A16 | 合成經驗證的極端輸出，使 HTML+JSON UTF-8 總和剛好 524288 bytes、再增加 1 byte | 等於上限可建立兩份；多 1 byte 回 `EXPORT_LIMIT`，兩份都不建立/不返回，不截斷且不保留舊產物。 | FR-02/05 |
| A17 | 成功預覽後改一個單價，再輸入無效值 | 第一次輸入同步撤下舊預覽/兩個下載鍵並撤銷 URL；無效值不會使舊結果復活。 | FR-04/06 |
| A18 | 匯入讀取中取消；再於讀取完成後取消待確認 | 兩次取消均維持原草稿、無新 Blob；過期 generation 的 load 事件不能改畫面。 | FR-05/06/07 |
| A19 | 點「清除」及模擬 `pagehide` | 撤銷每個已建立 Blob URL、中止 FileReader、清空預覽/草稿引用；不得聲稱刪除已下載檔案。 | FR-07 |
| A20 | 試 51 項、超限 JSON、錯誤匯入、輸出超限各自重試成功 | 每個失敗都沒有部分或先前成功下載物；有效重試才建立同一版本的 HTML/JSON。 | FR-01/05/06 |

## M1 工具鏈與離線驗收

在 Node 24+ 執行 `npm test`、`npm run check`、`npm run build`。`npm test` 必須執行所有固定 oracle；`check` 驗必要檔案、ESM 語法、local-only 資源與危險 DOM API；`build` 只複製 allowlist 且 preview 必為 noindex。以檢查結果記錄實際 Node 版本及每條命令退出碼。測試僅假資料，不讀取使用者檔案或憑證。

`npm run dev` 僅允許綁定 `127.0.0.1:4237`，只 serve `public/`。可用離線 HTTP client 檢查 GET/HEAD、未知路徑 404、非 GET/HEAD 405、Host/path traversal 拒絕和安全 headers；不得為測試打開 browser 或 native app。

## 瀏覽器手動 gate（目前未執行）

| ID | 檢查步驟 | 預期 | 記錄 |
|---|---|---|---|
| B01 | 320 CSS px 寬度，完成一列報價、切換預覽、逐一觸發兩種下載控制 | 欄位與按鈕皆可達，沒有頁面水平溢出；預覽與內容完整。 | `NOT_RUN_USER_FOCUS_INCIDENT`，等待主代理已核可隔離 gate |
| B02 | 200% 縮放、鍵盤 Tab/Shift+Tab/Enter | 欄位標籤與 focus 可見、序順合理、第一個錯誤可到達。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B03 | 瀏覽器 Network/Storage 面板觀察建立、編輯、下載、清除 | 無外部 request；無 local/session storage、IndexedDB、service worker、輸入 URL/query 或持久草稿。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B04 | 以瀏覽器打開下載 HTML，輸入包含 `<script>` 的假資料 | 只顯示編碼後文字，沒有執行或網路載入；檔名固定 `quote.html`。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B05 | 原生下載/另存對話框和其他裝置 | 此工作不觸發 OS 對話或讀取使用者資料；真實檔案保存與不同手機匯入由使用者後續手動驗證。 | `NOT_RUN_USER_FOCUS_INCIDENT` |

## 完成判準

M1 自動測試/Node 工具鏈全部通過、每個 oracle 都有固定 expected、候選所有頁 noindex、實際 diff 僅落在本產品 TASKS 授權的實作路徑，且未完成的 browser gate 明確保持 NOT_RUN。M1 不能標成正式發布或完整瀏覽器驗收。
