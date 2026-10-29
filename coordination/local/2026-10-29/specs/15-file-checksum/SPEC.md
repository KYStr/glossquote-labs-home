# 檔案 SHA-256 校驗 — 既有規格保存

Task ID: `labs-15-file-checksum` · Spec ID: `spec-15-file-checksum`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

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


---

## 原文件 TECHNICAL.md

# 檔案SHA-256校驗技術契約

SPEC_ONLY。原生HTML/CSS/ESM與Node24+開發測試，零runtime依賴。Web Crypto完成hash，不寫SHA256算法或加入WASM。

## 檔案與API

public/index.html、en/index.html、styles/**、js/app.mjs、js/i18n.mjs、js/core/checksum.mjs、js/core/session.mjs、js/hash.worker.mjs、js/worker-source.mjs（產生檔）。scripts/serve.mjs/check.mjs/build.mjs/build-worker.mjs；test/scaffold.test.mjs、checksum.test.mjs、session.test.mjs、worker.test.mjs、release.test.mjs；wrangler.jsonc。

- validateFileSize(size:number) -> size；只接受非負safe integer且<=134217728，失敗throw ProductError，code為SIZE_INVALID或SIZE_LIMIT；message只含固定code。
- parseExpected(source:string) -> {state:'empty'|'invalid'|'valid',hex:string|null,code:null|'EXPECTED_LENGTH'|'EXPECTED_FORMAT'}；先256碼元上限，再ASCII trim，再hex64。純函式不mutate。
- bytesToHex(bytes:Uint8Array) -> string；必須恰32bytes，否則HASH_LENGTH。不能省略前導0。
- compareHash(hash:string|null, expectedResult) -> 'pending'|'not-provided'|'invalid'|'match'|'mismatch'；hash非null時驗小寫hex64。
- serializeHash(hash:string) -> hash+'\n'；只接受合法小寫hex64。
- session reducer處理選檔/開始/讀取狀態/完成/失敗/取消/清除/預期碼更新，具jobId與fileRevision；輸出副作用由controller持有Worker/File/ObjectURL，不把File轉JSON或儲存。

## 固定錯誤集合

| Code | 來源與判定 | 使用者可見處理 |
|---|---|---|
| FILE_REQUIRED | main未選File而嘗試運算 | 請先選檔；不建Worker |
| SIZE_INVALID | File.size非非負safe integer | 無法確認檔案大小；拒絕 |
| SIZE_LIMIT | size>134217728 | 說明128MiB上限；拒絕 |
| EXPECTED_LENGTH | expected原始碼元>256 | 預期碼太長；comparison invalid |
| EXPECTED_FORMAT | trim後非空且不是hex64 | 只接受64位SHA-256；不撤掉合法hash |
| HASH_FORMAT | 純compare/serialize收到非小寫hex64 | controller視為內部結果無效，不輸出 |
| HASH_LENGTH | digest bytes不是32bytes | 計算失敗，不輸出部分碼 |
| UNSUPPORTED_ENVIRONMENT | 缺安全context或必要API | 說明瀏覽器功能不支援，無fallback |
| WORKER_START_FAILED | 建立Blob URL/Worker或postMessage失敗 | 清理本次資源，允許重試 |
| WORKER_PROTOCOL | 當前工作收到未知/非法request或reply | 終止該工作並顯示通訊錯誤 |
| WORKER_FAILED | 當前Worker觸發error | 終止並顯示計算工作失敗 |
| WORKER_MESSAGE_FAILED | 當前Worker觸發messageerror | 終止並顯示通訊錯誤 |
| READ_FAILED | File.arrayBuffer拒絕 | 無法讀取檔案，請重新選取 |
| READ_SIZE_MISMATCH | buffer.byteLength不等於File.size | 檔案讀取不完整，請重新選取 |
| HASH_FAILED | digest拒絕 | 計算失敗，可重試 |
| TIMEOUT | elapsed>=60000ms | 終止並說明超時，可重試 |

parseExpected以return狀態回報兩個EXPECTED碼，其餘純函式throw固定ProductError。取消是cancelled狀態而非error code。worker error reply只允許UNSUPPORTED_ENVIRONMENT、SIZE_INVALID、SIZE_LIMIT、WORKER_PROTOCOL、READ_FAILED、READ_SIZE_MISMATCH、HASH_FAILED、HASH_LENGTH；不接受其他字串。非法request若無合法jobId可回覆則直接close，main以error/timeout收斂；不自行捏造jobId。兩語所有上表碼有對應文案；詳細stack/原始輸入不顯示或記錄。

## Worker程式來源與協定

hash.worker.mjs是一份無import/fetch/動態程式碼的第一方自足模組。build-worker.mjs以完整UTF-8原檔生成worker-source.mjs，唯一export WORKER_SOURCE = JSON字串。check必須比對生成字串與原檔byte-for-byte，不能測試原檔卻發布過期bundle。不能引用兄弟工具或從user字串組成Worker代碼。

app初始靜態import WORKER_SOURCE；每次calculate以這個固定字串建立type:'text/javascript'的Blob、ObjectURL及type:'module'的Worker。worker-src blob:，connect-src 'none'；不放寬成unsafe-eval/inline，不從網路fetch Worker。初始頁面/ESM載入後重建Worker不需要新HTTP。不用ServiceWorker/Cache API保存應用或來源。

Request唯一schema {type:'hash',jobId,file}，jobId正safe integer，file為File，未知keys拒絕。Worker重驗File與size，一生只接一項合法工作，其餘拒絕。main在傳前驗File，傳File（structured clone）而非main讀arrayBuffer，不加入transferList中的File。

Reply依階段exact schema：{type:'stage',jobId,stage:'reading'|'hashing'}；{type:'done',jobId,hex,bytes}；{type:'error',jobId,code}。bytes須等於所選File.size，hex小寫64位；未知type/欄位/錯誤jobId不接受為結果。當前Worker非法訊息終止並WORKER_PROTOCOL；舊Worker延後任何訊息忽略。error code白名單，不把err.message/stack/File/name放response。

Worker await file.arrayBuffer()後確認byteLength==file.size，再await crypto.subtle.digest('SHA-256', buffer)，轉hex後回done。arrayBuffer及digest的API rejection分別映射READ_FAILED及HASH_FAILED；長度不符則保留READ_SIZE_MISMATCH或HASH_LENGTH，不能被廣泛catch改成其他碼。開頭實際檢查crypto.subtle.digest，不用主視窗可用推定worker可用。main在所有結束路徑（done,error,error event,messageerror,timeout,cancel,clear,pagehide）移除監聽、terminate、revoke worker Blob URL、清timer並放棄自身worker引用。

## 時序与結果有效性

fileRevision在新選檔/清除遞增，jobId每次開始或作廢單调递增。每個回呼同時捕獲worker實例/activeJobId/fileRevision；只有三者仍當前且未過deadline才可寫入。取消/清除先作廢再terminate，不能讓排隊消息重現成功。超過Number.MAX_SAFE_INTEGER重建session而不重用活躍ID（可作防守拒絕，正常使用不會達到）。

expected變更只影響compare，不取消有效hash；來源與預期碼是不同資料依賴。複製狀態另用outputRevision/request序號，避免同hash兩次剪貼簿互相蓋提示。copy純hash不受expected改變影響，但新選檔/清除/重算令舊copy提示失效。

deadline以performance.now()+60000記錄；setTimeout僅提示，回覆處理與pageshow/visibilitychange也核對時間。pagehide一律取消現有工作並清空File/hash/expected、file input及output URL引用，回idle且不移焦點。BFCache回來仍idle/空白，不恢復busy或舊File；只按取消按鈕時才保留當前File供重算。visibilitychange到hidden本身不清除工作，返回visible核對deadline。

digest不是streaming，會需要整份bytes與瀏覽器內部拷貝；128MiB上限是產品資源邊界，不宣稱固定峰值。取消保障失效/終止，不聲稱立刻抹除OS全部native記憶體。測試用假資料，不能讀私人檔案當fixture。

## 已查核技術與替代方案

- [MDN digest](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest)：需安全context，可在Worker用，輸入須完整置於記憶體。
- [W3C Web Crypto](https://www.w3.org/TR/webcrypto/)：SHA-256與digest語義。
- [MDN Worker terminate](https://developer.mozilla.org/en-US/docs/Web/API/Worker/terminate)：終止不等待worker清理，故main持有的timer/ObjectURL應由main清理。
- [MDN Blob arrayBuffer](https://developer.mozilla.org/en-US/docs/Web/API/Blob/arrayBuffer)：原始bytes讀取。
- [Microsoft Get-FileHash](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/get-filehash)：現有命令列替代方案，預設SHA256。網站驗證不可用shell結果冒充瀏覽器Worker測試。


---

## 原文件 UX-SEO.md

# 檔案校驗介面與SEO

SPEC_ONLY。依[設計系統](docs/DESIGN-SYSTEM.md)，沿用家族tokens，建立單一檔案核對工作區；不複製表格工具。首頁連結、語言切換、工具H1後立即工作區；下方才放說明FAQ。

桌面：左欄選檔/128MiB限制/名稱與bytes，右欄可選預期码；兩欄下方計算、處理時取消、清除；結果全寬64hex可選文字，下方明確比對狀態及copy/download。手機兩欄直排，按鈕換行；不依hover，不將長hash省略。檔名使用bdi/textContent，控制字元轉可見的U+XXXX標記、過長可視省略但有完整文字展開；檔名只展示不改hash或加入下載檔名。

初始：選擇檔案，最多128MiB。就緒：已選檔，按計算。處理：讀取檔案／計算SHA-256，無假進度條。成功：hash與比對文字。取消：已取消，可重新計算。失敗：固定翻譯錯誤，不直接顯示raw例外。unsupported顯示需要支援Web Crypto與Worker的安全瀏覽器；不讓使用者輸入私密金鑰。

所有input有可見label，預期碼錯誤用aria-describedby/invalid，status aria-live polite。完成不搶走鍵盤焦點，清除回選檔、取消回計算；busy仍可用清除與選新檔。只有hash有效時copy/download可用，預期碼invalid不撤掉合法hash輸出。200%原生縮放與320px均需真瀏覽器；不可用CSS zoom假充瀏覽器縮放。

## 兩語靜態內容

zh-Hant title：檔案 SHA-256 校驗與比對｜GlossQuote
description：在瀏覽器本機計算檔案 SHA-256，貼上預期校驗碼立即比對。支援單檔最多128 MiB，可複製或下載校驗碼，無需上傳檔案。
H1：檔案 SHA-256 校驗
說明：選擇檔案後計算校驗碼，也可貼上來源提供的64位SHA-256。比對能幫助確認內容一致，不能判斷檔案是否安全或證明發布者身份。

en title：File SHA-256 Checksum & Verification | GlossQuote
description：Calculate a file's SHA-256 locally in your browser and compare an expected checksum. Files up to 128 MiB; copy or download the result without uploading the file.
H1：File SHA-256 Checksum
說明：Choose a file and calculate its checksum. Optionally paste the 64-character SHA-256 supplied by its source. A matching checksum checks content consistency; it does not establish who published the file or whether it is safe.

主要英文label/status：Choose file / Expected SHA-256 (optional) / Calculate SHA-256 / Cancel / Clear / Copy checksum / Download checksum / Reading file / Calculating checksum / Checksums match / Checksums do not match / No expected checksum / Invalid expected checksum / Cancelled。

兩語FAQ至少四組：檔案會上傳嗎（No, file bytes are processed in this browser; page assets still load from the website）；128MiB上限為何（Web Crypto需完整讀入記憶體，不支援本產品的串流大檔）；改名是否影響（No, only file bytes count; changes to content, including line endings, do）；相符代表安全嗎（No, use a checksum obtained from a trusted source; no malware or signature check）。中英文皆完整可見，不只翻按鈕。

固定候選https://hash.glossquote.com/index.html與/en/index.html。正式canonical/hreflang/zh-Hant/en/x-default、WebApplication JSON-LD、robots/sitemap由[RELEASE](docs/RELEASE.md)生成。兩語返回https://glossquote.com/index.html及/en/index.html。預覽noindex，未發布不顯示已上線，不編造評論/評分/流量或相容性。


---

## 原文件 ACCEPTANCE.md

# 檔案SHA-256驗收

SPEC_ONLY。全部產品案例NOT_RUN。A表示可自動測純邏輯/協定；B表示真瀏覽器，不得用Node或mock代替。fixture由Node內建fs/crypto產生固定假bytes，絕不讀私人檔案。

| ID | 需求 | 層 | 輸入/步驟 | 預期 |
|---|---|---|---|---|
| H01 | FR-01,02 | A+B | 0-byte檔案，點計算 | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 |
| H02 | FR-02 | A+B | bytes 61 62 63（abc，無換行/BOM） | ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad |
| H03 | FR-02 | A+B | abc改名/改MIME/mtime | hash與H02完全相同 |
| H04 | FR-02 | A+B | abc+LF bytes61 62 63 0a | edeaaff3f1774ad2888673770c6d64097e391bc362d7d6fb34982ddf0efd18cb |
| H05 | FR-01,02 | A+B | [00,ff,80,0d,0a,ef,bb,bf]二進位 | ef7599427575c12d74a02c29d770363b67b7b4ab158aa04464938118c8f13003；不解碼或移除BOM |
| H06 | FR-03,04 | A+B | H02結果，預期碼大寫並加兩端ASCII空白 | match且hash保持小寫 |
| H07 | FR-03,04 | A+B | 預期64個0，已算abc | mismatch，不顯示「有病毒」 |
| H08 | FR-03,04 | A+B | 63/65hex、64字含g、0x前綴、內部空白、U+200B、兩端NBSP | invalid無match徽章；合法hash仍可copy |
| H09 | FR-03,04 | A+B | 空碼或只有space/tab/CR/LF | not-provided；不當作錯誤或match |
| H10 | FR-03 | A+B | 原始碼元256與257界線，64hex外ASCII空白 | 256可trim判合法，257先EXPECTED_LENGTH，不能截斷 |
| H11 | FR-01 | A+B | 128MiB零bytes假檔 | 允許、真Worker結果等於獨立Node hash，畫面可取消；記瀏覽器/時間 |
| H12 | FR-01,05 | A+B | 成功後選128MiB+1byte | SIZE_LIMIT；舊hash立刻移除，未新建worker且未讀File bytes |
| H13 | FR-01,02 | B | 選檔但不按計算、取消選檔dialog | 選檔不讀內容；取消dialog維持既有狀態 |
| H14 | FR-04,05 | A+B | 計算中改expected；完成後match→invalid→mismatch | 比對最新值，無舊徽章；預期碼變更不重新hash |
| H15 | FR-05 | A+B | 讀取/計算兩階段取消，再重算 | 原job失效、worker終止、無舊结果，重新算正確 |
| H16 | FR-05 | A+B | A工作未完成改選B，再讓A晚到done/error | 僅B結果；A任何狀態/錯誤無法覆蓋 |
| H17 | FR-05,08 | A+B | 開始後清除、再發舊消息 | inputs/hash/expected空、無busy、無結果復活 |
| H18 | FR-05,06 | A+B | 60秒production deadline；晚成功/visibility恢復 | TIMEOUT且worker終止，超時success不得接受；真60秒harness和快速unit分開 |
| H19 | FR-06 | A+B | unavailable WebCrypto/Worker、讀取reject、digestreject、worker error/messageerror | 分別安全失敗，可重試，無雲端fallback/洩露raw錯誤 |
| H20 | FR-02,06 | A | 31byte digest、超限File size、未知協定key、bytes不符、hex格式錯誤 | fail closed，不返回部分hash；舊job消息則忽略 |
| H21 | FR-07 | A+B | 成功copy；clipboard拒絕；clear後舊promise resolve/reject | copy恰64字；拒絕fallback；舊提示不回寫 |
| H22 | FR-07 | A+B | zh/en下載H02結果，實際讀落盤文件 | 固定檔名、65bytes、hash+LF、無BOM/名稱/預期碼；Blob URL清理 |
| H23 | FR-08 | B | 假檔名含HTML/control/bidi；比對欄惡意文字 | 只文字顯示且檔名隔離方向，無執行、無動態連結 |
| H24 | FR-08,09 | B | fresh頁面Network/Storage完整觀察；計算/取消/輸出/hidden | 無檔案或hash傳輸、無storage新增，检查同源/cdn-cgi/rum；證據缺則NOT_RUN |
| H25 | FR-09 | B | 完整頁面載入後真DevTools Offline，首次計算+取消後重算+換檔 | 全部正確，沒有worker/依賴HTTP缺檔；不以serverstop代替真Offline |
| H26 | FR-05,09 | A+B | pagehide/bfcache返回、clear後返回 | File/hash/expected/input為空且idle；單純visibility hidden→visible不當pagehide清除，改核deadline；實測與reducer模擬分開 |
| H27 | FR-10 | B | Chrome/Edge鍵盤、320px、真200%zoom、兩語切換/首頁往返 | 可操作/可讀、有focus、同語URL；Firefox/真機/讀屏未做列NOT_RUN |
| H28 | FR-10 | A+B | preview與固定origin production | noindex隔離；正式canonical/雙語/x-default/robots/sitemap/404/CSP無誤，真HTTP另驗 |
| H29 | FR-02,09 | A | worker-source與hash.worker逐bytes，篡改生成檔後check | 一致通過；過期/篡改失敗，不發布舊worker |
| H30 | FR-01,05 | A+B | 連點開始10次、計算完成重算3次 | 最多一個活躍worker；完成每次terminate/revoke；無多份同時讀buffer |

T00建立npm test/check/build；T04後才存在build:production/check:production。必要演算法/協定/競態/發布FAIL不得略過。真瀏覽器主要選檔/hash/錯誤/取消/最大檔及實際下載必做；能力缺口不得寫PASS，告知主對話。完整Network、真Offline、讀屏/其他裝置等人工NOT_RUN依使用者既有許可可逐條披露，但不能稱全面隱私/所有瀏覽器驗收通過。

先跑受影響gate；最終必要checks對固定輸入/源碼一次，未變不要反覆全重跑。交接每例輸入bytes與SHA/瀏覽器版本、觀察、PASS/FAIL/NOT_RUN、證據路徑；主代理另獨立驗收，外部確認才能完成版本。


---

## 原文件 TASKS.md

# 檔案 SHA-256 校驗任務佇列

2026-10-13 現況：T00／T01 已正式主驗 PASS；T02 互動 UI 已實作，最終自動 gate 130/130、check/build exit0，已凍結供主驗。Edge 瀏覽器 API 23 項 PASS，Chrome／原生選檔／實體下載／200% zoom／舊頁 pagehide 資源觀測有明確 NOT_RUN，T02 尚未完整主驗接受。T03–T06 未放行。規格建立時「全部未開始」為歷史。每項先聲明範圍/非目標/驗收，通過後依主對話實際里程碑指示前進。所有任務共通允許本工具HANDOFF.md、project.json狀態、docs/RELEASE-CANDIDATE.md與dist生成物；證據/發布副本以TASK-ENTRY為界。失敗在原owning task修正，不能更動別人的工具。

## T00 靜態骨架與開發工具

- 前置：讀入口/契約，檢查現狀與Node24，持久環境guard。
- allowed：package.json、必要package-lock.json（零deps可不建）、.gitignore、public/index.html、public/en/index.html、public/styles/**、public/js/app.mjs、scripts/serve.mjs/check.mjs/build.mjs/validation.mjs、test/scaffold.test.mjs。
- 實作：原生ESM兩語停用預覽骨架、public-only loopback server、真check/build/test；noindex/no remote assets。安全server拒絕穿越/hidden/symlink、只GET/HEAD、404正確，build先驗內容再只更新本工具dist，不能清root。
- 驗收：npm test覆蓋server allow/deny、404/MIME/HEAD/405及copy隔離，npm run check，npm run build；記錄命令/exit。非目標：此步不是核心產品與正式SEO。
- 納入已發現的共通回歸：build目的hardlink不能覆寫外部sentinel，stale dist拒絕且不刪，來源/目的任一ancestor junction拒絕；HTML檢查不能被單引號/大小寫/註解中的meta或remote script蒙混。可自包含validation helper，不引用兄弟工具source。失敗不能以放寬check修正。

## T01 純邏輯與精確案例

- 2026-10-12 正式派工 CHECKSUM-T01-CORE-WORKER：T00 主驗 69/69、check/build、active robots repro 4/4 及最終 10 檔匹配後放行。T00 證據保留。此輪停在 T01，T02 尚未批准。
- 本輪交付：純 API、session/協定與自足 Worker／byte-preserving 生成檔完成；npm test 112/112（保留 T00 69 項）、check/build exit 0，guard 完整指紋未變。owner 釋放供主驗，固定 manifest／未驗項見 HANDOFF；不直接進 T02。
- 主代理補足 allowed：本節任務紀錄、test/scaffold.test.mjs 的核准資產／fixture／數量更新，以及 scripts/build.mjs 為 Worker 生成檔一致性必要的接線。既有安全／HTML／filesystem 負例不能刪除或弱化。
- 前置：T00 PASS。
- allowed：public/js/core/checksum.mjs、session.mjs、public/js/hash.worker.mjs、worker-source.mjs、scripts/build-worker.mjs、test/checksum.test.mjs、session.test.mjs、worker.test.mjs，必要test假fixture與PRODUCT/TECHNICAL/ACCEPTANCE中的明確勘誤（不改需求）；scripts/check.mjs只加入新模組實際檢查。
- 實作：TECHNICAL API、Worker協定與固定error codes，對照H01–H20、H29–H30的自動部分，無DOM/network，輸入不mutation；NodeWebCrypto與合成blob只作自動證據，真Worker在T02測。build-worker產物一致性納入check/build。
- 驗收：npm test、npm run check；每個error/邊界/不變量有獨立expected，不用被測函式計算expected。失敗先修T01，不進UI假成功。

### T01 session 接口（T02 沿用）

`createSession()`／`reduceSession(state, action)` 回傳不可變的新 state，未改變或舊回呼可回傳原 state。state 不含 File／Worker／URL：`phase` 為 idle/ready/reading/hashing/done/cancelled/error；`fileSize` 為 null 或已驗 size；`fileRevision`、`jobId`、`outputRevision` 為非負 safe integer；`activeJobId`／`deadline` 為 null 或当前工作 ID／performance.now()+60000；`hash`、`error`、`expectedSource`、已解析 `expected` 與 `comparison` 為其餘欄位。expected 原稿保留，未合法時不截短；expected 更新不使同檔 hash/outputRevision 失效。

Exact actions：`{type:'select',size}`（controller 有真 File 才 dispatch，取消 dialog 不 dispatch）；`{type:'expected',source}`；`{type:'start',now}`；`{type:'reply',jobId,fileRevision,message,now}`；`{type:'fail',jobId,fileRevision,code,now}`；`{type:'check-deadline',now}`；`{type:'cancel'}`、`{type:'clear'}`、`{type:'pagehide'}`。select 先作廢舊結果再驗 size；busy 重複 start 不建新 job。reply/fail 的兩個 ID 是 controller 回呼捕獲值，舊值先忽略；目前 callback 的 payload jobId 不符或 schema 非法則 WORKER_PROTOCOL。done 必須在 hashing 階段、bytes 等於 fileSize、hex 合法。reading 不可從 hashing 倒退。deadline 在回呼／check-deadline 核對，>=60000ms 即 TIMEOUT，不接受過期 success。未知 action/schema／counter overflow 以固定 ProductError('WORKER_PROTOCOL') 防守拒絕，不回繞 ID。

完成／失敗／取消使 activeJobId/deadline 清空並遞增 job/output revision；取消保留已選 size/expected，清除/pagehide 另遞增 fileRevision 並清空全部內容。controller 負責真正 File 引用、Worker 實例身份、terminate/listener/timer/ObjectURL／focus／copy request 序號；reducer 不執行副作用。controller 只在新 start 產生 activeJobId 時建 Worker，dispatch 前核對捕獲 Worker 仍當前。visibility hidden 不作清除；返回 visible 及 pageshow 使用 check-deadline；pagehide 使用其全部清除 action，BFCache idle。

`validateWorkerReply(message,{jobId,fileSize})` 是純 exact-schema validator；目前不提供成功結果 fallback。Worker 自足模組另 export `createWorkerHandler(scope)` 與 `validateWorkerRequest` 供 Node 自動層注入合成 File/API 失敗；真 Worker global 會安裝 message listener。scope 測試是自動證據，不能稱真瀏覽器驗收。一個 handler lifetime 只接受一個 job；忙碌時第二請求令原工作失效、protocol error 後 close；所有 await 之後核對內部 generation，close 後遲到 read/digest 結果不再發出。Worker 回覆完全不含檔名、raw error 或 stack。

生成流程：`node scripts/build-worker.mjs` 用完整 UTF-8 原 bytes 生成唯一 WORKER_SOURCE 字串 export（不正規化 CRLF/BOM）。check 與 build 驗原檔／生成內容逐 bytes 一致；stale/tampered 產物必拒絕，build 不靜默修復。T01 128MiB/+1 僅驗 size，不配置大型 buffer 或執行瀏覽器 benchmark。驗收仍跑所有保留的 T00 regression。

## T02 雙語互動工作區

- 2026-10-13 本輪交接：真 Blob Worker controller、完整兩語互動、expected 比對／取消／換檔／清除／copy fallback／65-byte TXT serializer／資源清理完成。最終 npm test 130/130（保留原112，新增18個 UI contract）、check/build exit0；原 HTML 34 個集中回歸保留，guard 全部 snapshots 相等。Edge 真 Worker 小bytes及控制流程、原生64字元copy、兩語實際CSS320px／英文鍵盤共23項PASS；原生選檔不擴權、Chrome API不可用、download事件未回傳、200% zoom未曝露、舊頁pagehide觀測未保留均NOT_RUN，不拿Node替代。詳見 HANDOFF／T02專用證據。Owner已釋放、runtime/tests凍結，等待主代理親驗及補驗；不自行進T03。
- 2026-10-13 主代理正式放行：T01 親驗112/112、check/build、27檔固定manifest一致、環境完整指紋不變；證據孵化器 .runs/new-tools-2026-10-13/checksum-t01-primary.md。只推進T02，T03/正式發布未放行。本次額外允許 scripts/check.mjs、scripts/validation.mjs、test/scaffold.test.mjs 與 test/worker.test.mjs 中使已啟用雙語UI/新核准資產可驗的必要接線；不能刪除或弱化原HTML/路徑/硬連結/stale/原bytes負例。所有者須凍結後回報，主代理再驗收。
- 前置：T01 PASS。
- allowed：public/**、test/ui-contract.test.mjs（如必要）、本工具UX-SEO及相關core/test缺陷。
- 實作：按UX設計兩語完整UI、真實成功/錯誤/空狀態、新File/清除/重算使舊hash失效，expected草稿只重算comparison；一次一Worker、取消與60秒deadline、keyboard/focus、copy拒絕fallback、65byte原生校驗碼TXT下載及ObjectURL清理、清除。使用textContent/value，不用innerHTML；不加入無需求的功能。
- 驗收：npm test/check/build；真Chrome及Edge執行主要/錯誤/舊結果/清除/複製/實際下載；320px/200%實測。Node UI靜態檢查不可代替瀏覽器；不能跑的項目標NOT_RUN給主對話補，不虛報。

## T03 邊界與隱私驗收

- 前置：T02功能可測。
- allowed：本工具public/**、test/**、scripts/**與docs/TEST-RESULTS.md；只修ACCEPTANCE範圍相關缺陷。
- 實作：對照全部案例、最大輸入、惡意字串、真Network/Storage/頁面hidden與回復、輸出race。若工具缺少完整Network觀測，記錄精確缺口，不以CSP/ResourceTiming冒充。
- 驗收：受影響自動gate，真瀏覽器案例逐條PASS/FAIL/NOT_RUN附版本/輸入/觀察/證據。必要gate缺口交主對話補完，不靜默跳過；明確允許人工待驗者可列在候選包，但未達完整驗收不叫MVP全過。

## T04 正式發布工具鏈與SEO

- 前置：T03無未處理必要FAIL；待補人工觀察保持可見。
- allowed：scripts/build.mjs/check.mjs、test/release.test.mjs、public/**的staticSEO/404/headers、wrangler.jsonc、package.json scripts、docs/RELEASE.md。
- 實作：按RELEASE固定origin的production/preview build、self canonical/zh-Hant/en/x-default、sitemap/robots、靜態安全headers、雙語首頁互連、strict404、可重現資產清單。首次做Workers配置讀適用官方/skill，保持免費靜態託管，不server運算。
- 驗收：npm test/check、npm run build、npm run build:production、npm run check:production；preview仍noindex，prod URL/meta/header/content精確匹配，絕不出包personal/docs/tests/node_modules；本步不執行正式deploy。

## T05 公開GitHub與候選交接

- 前置：必要自動gate及可執行瀏覽器gate通過，人工缺口明列且不假稱全通過。發布完整可用候選，不公開空骨架當成完成品。
- allowed：本工具README/HANDOFF/project.json/docs/**、必要發布manifest產生腳本，專用發布副本及證據；不修改根repo或其他工具。
- 實作：reviewed source copy、明確allowlist/secret檢查、只包含本工具source及必要文件；使用既有gh授權建立/更新指定PUBLIC repo，不force。核對remote commit/publicity與fixed source ZIP hash；必要node_modules/dist私人證據都不公開。
- 驗收：讀remote visibility/HEAD，發布copy與對應source檔hash一致；記docs/RELEASE-CANDIDATE含命令/版本/所有未驗/正式候選網址。記READY_FOR_INTEGRATION（有必要blocker則BLOCKED），主對話read actual files再部署；不得自己修改首頁/讀token。

## T06 原對話修正與發布配合

- 前置：主對話/使用者提供具體驗收回報。
- allowed：回到缺陷的T00–T05 owning paths，只處理原需求修正；相關文件、測試與source publication一併更新。
- 驗收：重現原失敗→修正→受影響regression→GitHub固定新commit→主對話部署/正式複驗→外部確認。未獲使用者/驗收者確認前不是產品「完成」，也不把主對話等待誤寫成缺使用者發布授權。

