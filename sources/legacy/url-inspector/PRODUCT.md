# 網址工具產品規格

這是規格，尚未實作。所有顯示、匯出與錯誤遵守 [安全](docs/PRIVACY-SECURITY.md)。

## 工作及非目標

一個工作區完成「貼入 → 檢視 → 選擇修改/移除 → 產生新網址 → 自行複製/下載」。不下載、開啟、ping、預取、解析 DNS 或展開任何輸入網址，不做來源安全或去識別化保證。不批次、不讀剪貼簿、不將內容寫入本頁 URL 或 storage。沒有 query 的網址同樣可檢視。

## 可觀察需求

- FR-01 輸入與拒絕：文字來源最多65,536個UTF-16 code units。只去除字串兩端 ASCII space(U+0020)，再拒絕內部 ASCII U+0000–0020、U+007F、反斜線及不成對 surrogate。必須是明示 http:// 或 https:// 的絕對網址（scheme大小寫可接受），URL parser 成功且 hostname 非空。原始 authority 明確定義為緊接 scheme:// 到第一個 /、?、# 之前；它必須非空，拒絕多餘slash修復路徑如 https:////@example.com。原始 authority 有 @ 或 parser 有 username/password 一律拒絕，避免接受登入憑證；不接受相對、protocol-relative、file/data/javascript/mailto。error不回顯輸入。
- FR-02 檢視：顯示原始已修剪來源與 parser 的 scheme/hostname/port/path/fragment 欄位，清楚區分「原始字串」和「瀏覽器解析值」。不把 parser 的 href 直接當輸出。國際化主機显示 parser ASCII hostname，旁邊提醒不是連結安全檢查。
- FR-03 Query列：在第一個 # 前尋找第一個 ?；query以 & 切段，第一個 = 分開key/value；保留重複key、顺序、原始大小寫/percent escapes、裸key、空片段及有無等號。空query是零列，非空query中的空片段也算一列，最多256列。界面顯示序號、原始片段、解碼名稱/值和移除選項；空片段明示，不偷偷丟棄。
- FR-04 解碼/編輯：只對query key/value按表單規則將 + 解為空白，然後嚴格decodeURIComponent。壞percent或非法UTF-8以「無法解碼，保留原始片段」表示，仍可選擇刪除，但不可編輯那列。不遞迴解碼。有效列可編輯解碼後名稱/值；只對真正變更的列重新編碼；把編輯值恢復原解碼值即恢復原始片段。值/名稱可空；編輯值禁止孤立surrogate，含換行/tab時編碼而非當HTML。全部edited Map及additions內key/value的UTF-16長度合計≤65,536（包括尚勾選移除的edited草稿），超過時保留草稿、拒絕生成，不截斷。新增列總計仍≤256。
- FR-05 選擇清理：提供「選取常見追蹤參數」按鈕，只標記解碼後ASCII不分大小寫等於 utm_source、utm_medium、utm_campaign、utm_term、utm_content、gclid、fbclid、msclkid 的列；不刪未知key、不自動全選、不推斷 token 等敏感欄位。清理在按「產生新網址」前不生效；說明簽名/驗證連結可能因任何修改失效，不承諾完全去除追蹤。
- FR-06 產生：原始prefix（?前或#前）、未修改raw query片段和fragment逐字保留；編輯/新增列用 URLSearchParams([[key,value]]).toString() 序列化，順序固定，不排序。若未做任何有效修改，輸出完全等於已修剪來源（包含空 ?）。所有原列刪除且無新增才移除 ?，保留 # 及其內容。非空保留列join('&')後保留 ?，即使只剩一個空片段。新網址再次執行FR-01及字數/列數限制，超限不截斷/不輸出部分結果。固定顯示改動列數，不宣稱改後仍有效。
- FR-07 狀態：初始空 → 檢視成功 → 草稿變更 → 產生成功。修改來源立即清空舊解析/草稿/輸出並停用複製下載，必須重新檢視；修改選項/參數立即使舊輸出失效。解析/生成失敗沒有上一輪有效結果可複製。同步有界處理，取消不適用；不加入假progress。
- FR-08 輸出/清除：明確按鈕才呼叫 clipboard.writeText；拒絕時保留可選取readonly結果並提示手動複製，不謊報成功。下載固定檔名 glossquote-url.txt，UTF-8無BOM、內容為exact輸出+一個LF；Blob URL最遲30秒回收，新結果/清除/離頁也回收。清除移除所有本工具輸入/結果、焦點回来源，不讀寫其他分頁，不聲稱OS安全抹除。
- FR-09 安全/本機：任何输入只textContent/form value呈現，不產生可點的使用者URL、HTML、資源url或動態import。腳本/追蹤/遠端字型為零；除了自家靜態資產，操作不產生網路。工作資料不入日志、storage、history、URL或語言切換連結；離頁會失去內容，語言連結旁揭露。
- FR-10 可及性/語言：兩語所有控制、錯誤、結果、說明及FAQ完整對應；320px與200%缩放功能可用，鍵盤順序清楚，每列移除/編輯有含序號的名稱，status區不每次敲字大聲宣讀。長URL用可換行或有名稱的局部捲動區域，不撐破頁面。
- FR-11 發布：依 [RELEASE](docs/RELEASE.md) 產生正式canonical/hreflang/x-default/robots/sitemap、404及headers。原始碼獨立公開，主代理驗正式部署/首頁後才可對外標「可用」。

## 說明內容

把query中的token當可能敏感資料；頁面不要求貼憑證，用假例子教學。只在記憶體處理的功能不是安全連結認證。一般瀏覽器格式化可能改hostname、default port、dot segments，所以必須同時展示原始和解析結果，不靜默以標準化輸出替換原串。
