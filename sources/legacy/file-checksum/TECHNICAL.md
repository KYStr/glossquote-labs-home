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
