# 檔案校驗產品需求

SPEC_ONLY。所有限制是首版決策，不能實作時悄悄縮限或擴充。

## FR-01 單檔明確選取

原生 file input，不設accept類型、不設multiple；只處理使用者明確選取的一個File。接受任意bytes/MIME/副檔名，包含0 bytes。上限134217728 bytes（128 MiB），邊界包含；大一byte立即拒絕，不能建立Worker或讀取內容。先移除舊檔/結果才驗新檔，不能讓非法選擇沿用舊成功。選檔後只顯示檔名、精確bytes與MiB，按「計算SHA-256」才開始。取消系統選檔對話不等於新選擇，維持既有結果。

## FR-02 原始bytes與固定算法

只使用瀏覽器 crypto.subtle.digest('SHA-256', buffer)。Worker內File.arrayBuffer，不做文字解碼/換行/BOM/EXIF/壓縮或名稱轉換。輸出32bytes轉64位小寫hex。檔名、mtime、MIME不參與digest。同bytes改名相同，換行或一byte變動不同。空檔有真實hash，不判空輸入錯誤。

## FR-03 可選預期碼

預期碼輸入上限256 UTF-16碼元，在trim前檢查，超限保留草稿並顯錯，不能截短變合法。只去除兩端ASCII space/tab/CR/LF。空字串為未提供；非空必須剛好64個ASCII hex大小寫不限，正規化小寫。內部空白、前綴0x、SHA256:、檔名/checksum列表、Unicode空白/零寬字元都拒絕並說明只貼64位碼。無效預期碼不阻止計算檔案hash，但不能显示匹配/不匹配。

## FR-04 比對狀態

hash尚未就緒：待計算。hash就緒而碼空：未提供預期碼；碼非法：格式錯誤；合法且相等：校驗碼相符；合法但不同：校驗碼不符。後兩者除顏色也有文字。預期碼每次input立即重新驗證與比對，不重讀檔案；有效檔案hash與複製仍保留。計算中修改預期碼以完成當下最新值比對，不用起始快照。

## FR-05 工作與取消

一次一項工作；開始後進「讀取檔案」再「計算校驗碼」，不虛構百分比或速度。取消、清除、新選檔與pagehide時讓舊jobId立即失效並terminate它的Worker；所有延後success/error/status均不能改新狀態。取消按鈕保留所選File及預期碼供重算，清空hash/比對，顯示已取消；清除則全部移除與重置input，焦點回選檔。pagehide採全部清除但不移焦點，BFCache返回仍空白idle。僅切換背景分頁不清除工作。60秒總deadline（含Worker建立/讀取/計算），到期停止、顯示重試錯誤；前景恢復/收到消息亦核對deadline，不能以背景timer延誤接受過期成功。

## FR-06 支援及故障

安全context、Worker/Blob/ObjectURL、Worker內WebCrypto/File.arrayBuffer皆需實際可用；無支援顯示說明，不能退到雲端或自製hash。初始化/讀取/digest/worker通訊/timeout分別固定錯誤碼，可重試，不輸出檔名或raw exception到console。檔案變更/讀取拒絕時整項失敗，不能顯示部分hash。

## FR-07 明確輸出

只有目前File/job成功產生hash才可複製/下載；只copy64位小寫hex（無LF）。下載固定glossquote-sha256.txt，UTF-8無BOM，內容恰為hash加一個LF，共65 bytes；不含檔名、預期碼或「安全」判定。兩語輸出同bytes。clipboard權限拒絕有可選文字fallback，晚到成功/失敗不能覆蓋清除/新工作狀態。下載按下只稱「已請求下載」，由原生落盤證據才證明實際檔案；ObjectURL用後及清除/pagehide回收。

## FR-08 隱私與資源

沒有上傳/telemetry/storage/service worker/自動剪貼簿/URL保存。File只在頁面/當前Worker內引用，舊Worker完成/失敗都終止；清除放棄所有工作File/hash/expected引用。結果及來源不寫log。不能承諾OS記憶體抹除或已複製/下載內容被刪除。一般靜態網站載入仍有網路連線。

## FR-09 離線與可操作性

頁面完成初始模組載入後，第一次運算、取消後重算與更換檔案可不依賴新網路請求；不承諾關閉/重載頁面仍離線可開。Worker程式隨初始本機模組載入，不能每次工作新fetch；詳TECHNICAL。主頁面保持可取消/清除，128 MiB邊界必測；裝置記憶體不足安全報錯，不偷偷放寬或縮小限制。

## FR-10 雙語、導覽與發布

獨立繁中/英文HTML、label/status/error/FAQ/SEO完整。320px、200%不截必要操作，hash可換行，鍵盤選取/計算/取消/輸出皆可用，live region報狀態不逐byte播報。語言切換為一般連結，不搬資料；提示切換會離開當前結果。各返回同語首頁。正式來源/hosting/外部驗收依RELEASE，預覽noindex，不保證搜尋排名。
