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
