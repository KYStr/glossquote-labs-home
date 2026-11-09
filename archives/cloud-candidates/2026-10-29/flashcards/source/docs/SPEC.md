# 問答卡候選契約

本檔描述本包既有問答卡的有限產品契約；不是正式發布或授權聲明。

## 功能及界限

- 原生繁中 `/index.html`、英文 `/en/index.html`。初始輸入空白；按範例才填合成 CSV。不提供檔案選擇，使用者貼上 CSV 文字。
- 原始 CSV 同時 ≤200,000 UTF-16 code units 與 ≤262,144 UTF-8 bytes；先驗原始上限及配對 surrogate。不可 maxlength 靜默截短。
- 接受一個開頭 U+FEFF BOM；CRLF/CR 統一為 LF（包含引號內換行）。不 trim、大小寫轉換、Unicode NFC/NFKC 或去重。
- 逗號分隔，第一筆必須精確兩欄 `question,answer`（可合法引號包覆）；其後 1–200 筆，每筆精確兩欄。單欄可用雙引號包覆以含逗號/換行；內部雙引號以兩個雙引號跳脫。不接受引號後雜字、裸引號、未閉合引號或空白記錄。
- 檔尾一個 LF 是記錄終止符，不多算空記錄；額外空行拒絕，不略過。每面 1–2,000 Unicode 碼點，且不可全是 JavaScript trim whitespace；原空白保持。拒絕 C0/C1 控制碼，但 TAB/LF 可作題答內容。每個來源記錄分配穩定 ID 1..N，重複題答獨立保留。
- 驗證失敗不部分收卡、不回顯原始例外或題答，僅固定雙語錯誤與 1-based CSV 記錄號（不是實體行號）。
- 預設依來源順序練習。勾選洗牌後以瀏覽器 crypto.getRandomValues 與 rejection-sampled Fisher–Yates；每個 index 最多 128 次取值。沒有 Math.random/時間/種子 fallback，不保證兩次不同。固定 callback 僅明確 test seam，app 不匯入。
- 開始或重新開始清除所有舊自評。每卡預設 unreviewed，先顯示題目，按顯示答案後才允許自評 `again` 或 `remembered`。自評不自動翻到下一卡；同卡可修正自評，統計不累加重複次數。前/後卡不環繞，換卡時答案隱藏；卡號同時顯示位置與來源 ID。沒有自動判分、間隔重複排程或學習效果承諾。
- 任一 CSV/洗牌變更、compositionstart、重新開始、載入範例立即清練習、錯誤與新匯出權；已啟動下載的有限URL lease保留至60秒；輸入改回舊值也不能復活。visibilitychange 本身不清除。pagehide 清輸入與引用，persisted pageshow 再初始化空頁。語言切換清資料。
- 清除用原生 dialog 確認。取消/Escape 完整保留資料及結果，焦點回清除鈕；確認清空輸入與練習、洗牌回關閉，焦點回 CSV。dialog 不支援時保留工作並顯示固定錯誤，不擅自清空。

## 兩種明確匯出

- `flashcards-progress.json`：UTF-8、無 BOM、兩空格縮排、尾 LF。固定 schemaVersion=1，cards 來源順序含 id/question/answer/rating，order 是當次來源 ID 排列，position 是當前 1-based 位置，revealed 為 boolean。自評 enum 固定英文，跨語言相同；純資料，不可執行。本版不匯入進度；保存檔可供人工核對。
- `flashcards-print.txt`：UTF-8、無 BOM、LF、尾 LF，按來源順序列全體題答，可用文字編輯器列印。每個題答實體行縮排兩格（LF/U+2028/U+2029後皆縮排，保留原分隔碼點，不改原題答），避免使用者文字冒充結構標題；不產出 HTML 或 CSV，不聲稱有裁切線/雙面對位。下載前畫面提供同一可選取唯讀文字預覽。
- 下載只在明確 click。text/plain 或 application/json Blob；固定安全檔名。最多 4 個已啟動下載 URL lease，每個 60 秒後撤銷；到上限停用新下載並提示等候。編輯/重啟/clear立即清工作內容與新下載權，但不過早回收已交接lease；新練習也共用4筆配額。只有pagehide/語言退出立刻撤銷全部。click 同步堆疊不撤銷；API 例外保留練習並固定錯誤。無 clipboard 功能。

## 隱私、工具鏈、非目標

只本頁記憶體與 DOM；無帳號、儲存、URL/history、後端、AI、同步、遙測或使用者資料網路請求。首次靜態資源載入仍需網路；不保證離線重開或 OS 記憶體安全抹除。所有題答用 textContent/value，禁止 HTML sink、動態執行、自由文字 URL/樣式。無真正部署，沒有 canonical、sitemap、虛構正式網址。

Node 24+；零 runtime/development 依賴。精確 source/public/dist allowlist，拒絕 symlink/hardlink/未知檔/缺檔，建置先驗再置換，不 rm 未知 dist。未知旗標拒絕。不提供啟動服務或 production/publish 命令。

自動測試須含 CSV literals、大小/數量/Unicode/控制碼、exact schema/accessors、shuffle rejection/order、自評與狀態/IME/lifecycle、XSS、Blob bytes/延遲撤銷、toolchain fail-closed、雙語。controlled DOM 不等於真 browser。真 320px、200%/鍵盤/IME/AT/下載/BFCache/Network/Storage/print、正式 HTTP/部署保持 NOT_RUN，直到另有實測。

## r2 可靠性修正

普通record只允許Object.prototype/null prototype與exact own enumerable data fields；陣列只允許Array.prototype、dense enumerable indices與原生non-enumerable length。未知keys/Symbol/accessor/custom prototype/hidden fields拒絕，不執行普通getter。任意Proxy反射trap副作用仍不保證可避免。下載lease grace屬靜態風險預防，不是已經原生證實的下載bug；它可短暫保留已匯出Blob資料直到60秒或離頁，而不是清除後所有記憶體即被抹除。

## r3建置修正

check/build必須共用同一source snapshot語意驗證（零依賴、noindex、無不允許API、雙語與headers）及runtime syntax。build驗證失敗在stage建立前返回，不得覆寫既有dist或印出成功；成功只複製已驗snapshot。
