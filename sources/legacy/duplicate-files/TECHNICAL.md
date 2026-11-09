# 技術契約：重複檔案找出來

## 執行邊界與檔案樹

Node.js 24、原生 ESM、零 dependencies；不 npm install。靜態本機 candidate 的 Node server/check/test/build 只跑 loopback，server 綁 127.0.0.1:4228（4180+48），只 serve public/。M1 HTML 設 noindex,nofollow,noarchive。不能有遠端 fetch、analytics、fonts、CDN、帳號、上傳、持久 storage、source delete 或 console 檔案內容。所有自動 fixtures 合成且 offline。

    package.json
    .gitignore
    public/index.html
    public/en/index.html
    public/css/app.css
    public/js/app.js
    public/js/ui.js
    public/js/analysis-worker.js
    public/js/core/limits.js
    public/js/core/analyze.js
    public/js/core/compare.js
    public/js/core/report.js
    scripts/serve.mjs
    scripts/check.mjs
    scripts/build.mjs
    test/limits.test.mjs
    test/analyze.test.mjs
    test/compare.test.mjs
    test/report.test.mjs
    test/worker-state.test.mjs

候選實作只允許 TASKS.md 列出的路徑；六份規格與共同 docs 唯讀。

## API 和演算法

    validateSelection(files: FileDescriptor[])
      -> { ok: true, files: ValidatedFile[] }
       | { ok: false, errors: [{ code, fileIndexes }] }

    sha256Hex(bytes: ArrayBuffer, digestProvider = webCryptoDigest)
      -> Promise<string>

    compareFilesBytewise(fileA: File, fileB: File, chunkBytes = 65536)
      -> Promise<boolean>

    analyze(files, { jobId, digestProvider, onProgress })
      -> Promise<AnalysisResultV1>

FileDescriptor 為 {sourceIndex:number,file:File,name:string,sizeBytes:number}。最多200 files、每檔<=33,554,432、總和<=134,217,728；size 都是 safe integer。sourceIndex 唯一且連續、從0開始；輸入錯誤歸 READ_FAILED 並列 indexes。空 file 有合法 SHA-256。

分析固定順序：
1. 先驗證 file count 和所有 size，超限不讀任何 bytes。
2. 在專用 module Worker 中按 sourceIndex 遞增處理檔案；每次只為一檔呼叫 file.arrayBuffer()，用內建 Web Crypto SubtleCrypto digest("SHA-256", buffer) 產生 64 lowercase hex。進度每完成一檔發一次。
3. 將檔案依 sizeBytes 建 bucket，再依 SHA 候選；不能只按 hash 或檔名分組。
4. 對各候選 bucket 的 File objects 以 65,536-byte slice 分片比較。讀入兩個等長 slice 後逐 byte 比對；若不等，該檔案成為另一個 content group，不繼續比其後 chunks。全 length 相同且所有 chunks 全等才為 duplicate。
5. 每個 exact-byte group 的 members 按 sourceIndex 排序，預設 keeper=最小 sourceIndex。Groups 按最小 sourceIndex 排序。hash collision 時允許兩個 groups 有同一 hash，groupId 仍唯一。
6. result 順序及 counts 按 PRODUCT.md 建立。duplicate count 是超過 keeper 以外的檔案數；savedBytes 為 Σ(group.sizeBytes × duplicate member count)，空檔 duplicates 對 bytes savings 貢獻0。

digestProvider 是 core 參數，production 預設使用標準 SHA-256。Node tests 注入固定 32-byte digest 以模擬 collision；不同 bytes 仍由 byte compare 分開。digest 回傳非32 bytes或錯誤，fail closed 為 DIGEST_FAILED。

Web Crypto digest 一次處理一檔整個 ArrayBuffer，最大額外單檔 buffer 32 MiB；依序處理、不平行讀取。候選 byte verification 用固定 64 KiB slice，不建立整檔重複副本。cancel 按鈕 terminate worker；epoch/jobId 丟棄 stale event；partial hashes 不可進 UI 或下載結果。

## 報告 schema

JSON key 集合固定：schemaVersion、kind、algorithm、files、groups、summary。algorithm 固定 size-sha256-byte-verify-v1。files sourceIndex 順序，每項 key 順序 sourceIndex,name,sizeBytes,sha256,status,keeperSourceIndex。groups 按最小 sourceIndex；member indexes 順序；groupId 為 group-001 起。summary 欄位和定義如 PRODUCT.md。不含路徑、File.type、lastModified、來源 bytes 或 timestamp。

TXT UTF-8 固定：
第一行 Duplicate file report
第二至五行 Files: N、Unique contents: N、Duplicate files: N、Potential space saved: N bytes
空行後表頭 STATUS<TAB>SOURCE_INDEX<TAB>NAME_JSON<TAB>SIZE_BYTES<TAB>SHA256<TAB>KEEPER_SOURCE_INDEX
每檔一列按 sourceIndex。STATUS 是 KEEP 或 DUPLICATE；NAME_JSON 為 JSON.stringify(name)；keeper 為 null 時寫 null。Tab/newline 用實際欄位分隔，名稱透過 JSON string escaping。

檔名渲染時，C0/C1 控制和 bidi format controls 顯示為字面 escape（例如 U+000A 顯示字面反斜線-u000a）；其他 Unicode 以 text node 顯示。不可解讀為 markup。下載檔名固定 duplicate-report.json 和 duplicate-report.txt。

## Worker 狀態與清理

狀態：empty -> selected -> validating -> hashing -> verifying -> ready；任務中 -> cancelling -> selected；錯誤 -> selected；任何狀態 -> reset -> empty；sources changed 使舊結果 invalid 並回 selected。Worker 訊息固定為 {type:"start",jobId,files}、{type:"progress",jobId,stage,completedFiles,totalFiles}、{type:"complete",jobId,result} 或 {type:"error",jobId,code,fileIndexes}。cancel 使用 terminate()；main thread epoch 遞增後才接受事件，stale job 不能覆蓋新狀態。

Keeper change 不重做 hash/byte compare，只產生新的結果和 report preview。Result URL 只在下載時建立；來源集合改變、reset、cancel、pagehide 時 revoke。Ready 結果無自動期限。不得在跨頁導覽中保存或傳遞 File/results。

## 驗證與參考

SHA-256 使用 Web Crypto digest API；算法標準參照 NIST FIPS 180-4：[NIST Secure Hash Standard](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)。Node 自帶 node:test 和 crypto 可用於離線 oracle，但瀏覽器 candidate 使用內建 Web Crypto；不引入 npm dependency。

package scripts：dev=node scripts/serve.mjs、test=node --test、check=node scripts/check.mjs、build=node scripts/build.mjs。build 複製 public/ 到 dist/；不打包來源檔或 evidence。check 驗 noindex、沒有 remote origin 和 persistent-storage API，並執行 syntax/invariant tests；靜態搜尋不是安全證明。
