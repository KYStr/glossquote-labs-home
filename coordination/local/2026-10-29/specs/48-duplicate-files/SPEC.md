# 重複檔案找出來 — 既有規格保存

Task ID: `labs-48-duplicate-files` · Spec ID: `spec-48-duplicate-files`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：重複檔案找出來

M1 必須完成本機端完整工作：選擇檔案、掃描、檢視重複群組、改選 keeper、下載 keep/duplicate 清單並重設。任何輸出都是報告；來源檔不被刪除、修改或上傳。

## Job、result、contract、oracle

Job v1 是不可持久化的一次分析：

    {
      schemaVersion: 1,
      jobId: "job-1",
      files: [
        { sourceIndex: 0, file: File, name: "a", sizeBytes: 3 }
      ]
    }

sourceIndex 是加入時零起始的固定位置；相同檔名仍靠 sourceIndex 區分。新增、移除、替換或重排來源會使整個舊結果 stale；使用者需重新分析。Keeper 選擇只改報告映射，不改內容分組。

成功 Result v1：

    {
      schemaVersion: 1,
      jobId: "job-1",
      status: "ready",
      algorithm: "size-sha256-byte-verify-v1",
      files: [
        {
          sourceIndex: 0,
          name: "a",
          sizeBytes: 3,
          sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
          status: "keep",
          keeperSourceIndex: 0
        },
        {
          sourceIndex: 1,
          name: "b",
          sizeBytes: 3,
          sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
          status: "duplicate",
          keeperSourceIndex: 0
        }
      ],
      groups: [{
        groupId: "group-001",
        sizeBytes: 3,
        sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        keeperSourceIndex: 0,
        memberSourceIndexes: [0, 1],
        duplicateSourceIndexes: [1],
        savedBytes: 3
      }],
      summary: {
        selectedFileCount: 2,
        uniqueContentCount: 1,
        duplicateFileCount: 1,
        savedBytes: 3
      }
    }

SHA-256 是每個來源檔的 64 位小寫 hex。Groups 按其最小 sourceIndex 排列，members 和 duplicates 均按 sourceIndex 遞增；files 永遠按 sourceIndex 排列。單一檔案也有 singleton group，duplicateSourceIndexes 為 []、savedBytes 為 0、keeper 為自身。不同內容即使測試 digest provider 回傳相同 SHA 也必須分成不同 groups。報告不含檔案內容、路徑或時間戳。

JSON 下載為 duplicate-report.json，exact keys 是 schemaVersion、kind="glossquote-duplicate-report"、algorithm、files、groups、summary。Object 欄位和順序符合上述 Result；不准額外 keys。TXT 下載為 duplicate-report.txt，UTF-8；第一段列 file count、unique count、duplicate count、saved bytes，之後以固定欄名表格列每一檔案的 status、sourceIndex、JSON-quoted name、sizeBytes、sha256、keeperSourceIndex。空 keeper 寫 null；JSON quoting 使 tab/newline 和引號不會破壞欄位。兩份報告都只在使用者點下載時生成。

固定 error codes：NO_FILES、TOO_MANY_FILES、FILE_TOO_LARGE、TOTAL_SIZE_LIMIT、READ_FAILED、DIGEST_FAILED、VERIFY_FAILED、CANCELED。錯誤結果為 {schemaVersion:1, jobId, status:"error", error:{code,fileIndexes,messageKey}, files:[], groups:[], summary:null}；read/digest error 的 indexes 升序，不含內容或 stack trace。

## 功能需求

**FR-01 選擇檔案。** 多檔選取及可選拖放，初始空清單；最多 200 檔。顯示選取順序、檔名和 size。空檔案可以選取。名稱只是標籤，永不當路徑或 HTML。

**FR-02 驗證上限。** 每檔最多 33,554,432 bytes，合計最多 134,217,728 bytes。檔案數、單檔和總量都在讀內容前驗證。遇超限顯示明確原因和相關 sourceIndex，沒有部分報告。檔名相同不構成衝突或重複。

**FR-03 依大小及 SHA-256 篩候選。** 固定依 sourceIndex 順序逐檔分析，對每檔計算 SHA-256。候選鍵是 (sizeBytes, sha256)。空檔 SHA-256 是 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855。

**FR-04 逐 byte 確認。** 任何 size+SHA 候選都需以二進位 bytes 全量比對後才能同組。比較採 64 KiB chunks，遇第一個不同 byte 即判不同；全長和 bytes 都相同才屬重複。hash 僅是縮小候選的線索，不是內容相同證明。

**FR-05 進度與取消。** UI 顯示 hashing/byte verification 階段以及 completedFiles/totalFiles；每處理完一個檔案更新一次。取消由 Worker terminate，立即作廢 jobId epoch、釋放所有 buffer/hash 暫存且不產生部分報告。開始另一次分析也取消舊 job。

**FR-06 預設 keeper 和手動選擇。** 每個 group 預設 sourceIndex 最小的成員為 keeper。重複群組只可將 keeper 改成該 group 的 member；不能指定外部檔案，也不能把同一組標成全保留或全刪除。keeper 變更只重算 status、keeperSourceIndex 和 JSON/TXT preview。來源集合變化會清除全部分析和選擇。

**FR-07 結果與下載。** Ready 狀態顯示群組成員、keeper、重複檔、大小、hash、總檔案數、unique contents、duplicate count、savedBytes。下載 JSON 或 TXT 前產生當下 keeper mapping。報告只列檔名、sourceIndex、size、hash、group 和分類，不含內容、目錄路徑或可還原 bytes。

**FR-08 不改來源。** 沒有刪除、移動、重命名、覆寫按鈕。任何檔案改變須由使用者在檔案系統另行處理；工具只下載報告。

**FR-09 安全名稱顯示。** 檔名作 untrusted text，以文字節點呈現；不可 innerHTML、eval、URL 或 HTML parser。控制字元和 bidi 控制以可見 escape 顯示，JSON 仍保存原字串並由 JSON serializer escape。名稱相同時每個視覺列和報告都顯示 sourceIndex。

**FR-10 記憶體生命週期。** File、hash、buffer、結果和 object URLs 僅在目前分頁。取消、來源修改、reset、pagehide 清除暫存並 revoke URL。Ready 結果沒有時間期限，直到上述清理事件發生。沒有 localStorage、IndexedDB、Cache API、服務端或網路請求。

**FR-11 雙語頁面導覽。** 繁中版 /index.html 與英文版 /en/index.html 是獨立靜態頁面。語言選項為普通連結；切頁會失去目前的選檔、分析結果和未下載報告，連結旁必須明示。不得用 storage、query、hash 或跨頁 state 保存資料。

## 核心 Oracle

選取 a=ASCII abc、b=ASCII abc、c=ASCII abd、d=empty、e=empty 時，groups 依 sourceIndex 首見順序為 [0,1]、[2]、[3,4]；兩個 duplicate groups，c 是 singleton。uniqueContentCount=3，duplicateFileCount=2，savedBytes=3。相同檔名但內容不同屬不同 singleton。更多精確情境見 ACCEPTANCE.md。


---

## 原文件 TECHNICAL.md

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


---

## 原文件 UX-SEO.md

# UX 與 SEO：重複檔案找出來

候選 slug duplicate-files；候選 domain duplicates 只是提案。M1 noindex,nofollow,noarchive，沒有未驗證 canonical。

| 欄位 | 繁體中文 | English |
|---|---|---|
| Title | 重複檔案找出來｜本機檔案比對 | Find Duplicate Files — Local File Comparison |
| Description | 在瀏覽器本機找出內容完全相同的檔案，確認要保留哪一份，再下載清單。 | Find byte-identical files in your browser, choose which copy to keep, and download a report. |
| H1 | 找出內容相同的檔案 | Find files with identical content |
| 短說明 | 逐 byte 驗證相同檔案；你決定保留項目，工具不會刪檔。 | Byte-verify matches. You choose what to keep; this tool never deletes files. |
| Primary action | 選取檔案 | Choose files |
| Candidate status | 本機候選版；尚未部署 | Local candidate; not deployed |

繁中頁為 /index.html，英文頁為 /en/index.html。語言選項是普通 anchor；切頁後目前 memory-only 的檔案選取、分析結果與未下載報告會遺失。連結旁固定顯示繁中「切換語言會離開此頁；未下載的報告和分析結果會遺失。」英文「Changing language leaves this page. Selected files and undownloaded reports will be lost.」不跨頁保存輸入。每頁各自使用正確 title/description/H1、錯誤、empty/progress/result/FAQ。檔名是 untrusted text；控制與 bidi 字元以可見 escape 顯示。

桌面工作區（>=75rem）：

    ┌ 品牌 | 重複檔案找出來 | 語言連結 ────────────────┐
    │ H1 / 在瀏覽器本機分析，不會刪除來源檔             │
    ├────────────────────────────┬──────────────────────┤
    │ [選取檔案] / drop           │ 上限 200 files       │
    │ 來源清單：順序、名稱、大小  │ 合計 128 MiB/單檔32 │
    │ [移除]                      │ [開始掃描]           │
    ├────────────────────────────┴──────────────────────┤
    │ hashing 12 / 40  [取消]                            │
    │ 群組 1：keeper ○ a.txt | duplicate ○ b.txt         │
    │ 群組 2：唯一內容 c.txt                              │
    │ 3 unique | 1 duplicate | saved 3 bytes              │
    │ [下載 JSON] [下載 TXT] [重新開始]                  │
    └───────────────────────────────────────────────────┘

中版（48–74.999rem）單欄，選檔和限制在結果上方。窄版（<48rem）單欄；結果群組可摺疊，但 keeper radio/input 不可隱藏或只用顏色表示。行動版長檔名可折行，並保留 sourceIndex。

    ┌ 品牌 | 工具 | EN ┐
    │ H1 / 短說明      │
    │ 警語：離頁會失去未下載報告 │
    │ [選取檔案]       │
    │ 已選 3 / 200     │
    │ 0 a.txt 3 B [移除] │
    │ 1 b.txt 3 B [移除] │
    │ [開始掃描]       │
    │ hashing 2 / 3    │
    │ [取消]           │
    │ ○ 保留 a.txt     │
    │ ○ 重複 b.txt     │
    │ [JSON] [TXT]     │
    └──────────────────┘

empty 提供 file input 和拖放提示。selected 顯示檔數和總量。hashing/verifying 顯示階段和逐檔進度，取消明顯。ready 每組顯示 keeper 選項、重複項和 summary。錯誤精確指出檔案/限制；取消後可重試；source change 清除舊分析並提示重跑；reset 回 empty。結果不會因時間自動失效，只於清除/新工作/來源變更/pagehide 清理。只有一個 primary action，progress/error 使用 live region。

無障礙：原生 input/button/radio/fieldset/legend；keeper 用 radio group 且 label 讀出檔名和索引；focus ring 明顯，targets >=44px；320px 無水平捲動，200% zoom 所有動作可用；檔名文字不可引發 HTML；對比依 docs/DESIGN-SYSTEM.md；reduced motion。不以動畫作進度唯一提示。

FAQ：
繁體中文：
1. **工具會刪除重複檔嗎？** 不會，只產生報告；你可自行決定是否處理來源檔。
2. **檔名相同就算重複嗎？** 不會。工具先按大小與 SHA-256 找候選，再逐 byte 比對內容。
3. **不同檔名但內容相同會找到嗎？** 會；名稱不參與判斷，報告用選取順序索引區分。
4. **空檔案會被忽略嗎？** 不會，空檔案可分組；重複空檔不會產生 bytes 節省。
5. **檔案會上傳嗎？** 不會，候選版在目前分頁本機分析。

English:
1. **Does the tool delete duplicates?** No. It creates a report; you decide what to do with the source files.
2. **Do matching names count as duplicates?** No. Candidates are grouped by size and SHA-256, then compared byte for byte.
3. **Can it find identical files with different names?** Yes. Names do not determine matches; the report uses selection indexes to distinguish them.
4. **Are empty files ignored?** No. Empty files can form a duplicate group, though removing one saves zero bytes.
5. **Are files uploaded?** No. The candidate analyzes files locally in the current tab.

Candidate 不加入虛構評價、使用者數或「保證安全」聲明。公開 source、hosting、domain 與首頁連結由 parent 依 M2 gate 決定。


---

## 原文件 ACCEPTANCE.md

# 驗收 oracle：重複檔案找出來

## 狀態與分類

本表定義實作者需要的行為；規格作者未執行產品、tests、check、build 或 browser，狀態為 **NOT_RUN_SPEC_ONLY**。互動瀏覽器、file picker、下載、鍵盤、320px/200% 項目維持 **NOT_RUN_USER_FOCUS_INCIDENT**。Node tests 只能驗 core bytes 和 worker 協議，不能冒充 browser PASS。所有自動 fixtures 是合成內容，不讀真實使用者檔案。

| ID | FR | 輸入 | 精確預期 |
|---|---|---|---|
| D48-01 | FR-02 | 200 個 0-byte descriptors，唯一 sourceIndex | count 通過；total=0；初始 result=null。 |
| D48-02 | FR-02 | 201 個合法 empty descriptors | TOO_MANY_FILES；files/groups=[]；不讀任何 bytes。 |
| D48-03 | FR-02 | 一檔 size=33,554,432 | 單檔上限通過；可進 hashing。 |
| D48-04 | FR-02 | 一檔 size=33,554,433 | FILE_TOO_LARGE，列該 index；read count=0。 |
| D48-05 | FR-02 | 四檔各32 MiB | 合計134,217,728 bytes，總量通過。 |
| D48-06 | FR-02 | 四檔各32 MiB，再加1 byte | TOTAL_SIZE_LIMIT；read count=0，無部分結果。 |
| D48-07 | FR-03,04 | a=ASCII abc,b=ASCII abc,c=ASCII abd,d=empty,e=empty | groups members [0,1],[2],[3,4]；兩個 duplicate groups；unique=3、duplicates=2、savedBytes=3。 |
| D48-08 | FR-03,04 | source0 name=same content=abc，source1 name=same content=abd | 兩個 singleton；duplicateFileCount=0。 |
| D48-09 | FR-03,04 | name one/content=abc 與 name two/content=abc | 一組 [0,1]；預設 keeper=0、duplicate=1。 |
| D48-10 | FR-03,04 | 兩份 empty bytes | 一組 [0,1]；savedBytes=0、duplicateFileCount=1、hash=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855。 |
| D48-11 | FR-04 | 注入 digest provider，使 abc 與 abd 回傳相同固定 32-byte digest | byte compare 分開兩個 singleton；不得因 hash 相同而合併。 |
| D48-12 | FR-03 | bytes ASCII abc | SHA-256=ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad。 |
| D48-13 | FR-06 | group members source [2,5]，操作者選 source 5 | keeper=5；source2 status=duplicate、keeperSourceIndex=5；members/hash/bytes 不變。 |
| D48-14 | FR-06 | 操作者將 singleton source 8 設為 keeper source 2（不在此組） | 選擇拒絕，原結果與 keeper 值不變。 |
| D48-15 | FR-07 | D48-07 成功 JSON export | exact keys/schemaVersion=1/kind/algorithm；summary={selectedFileCount:5,uniqueContentCount:3,duplicateFileCount:2,savedBytes:3}；source/group order 固定；不含內容和路徑。 |
| D48-16 | FR-07,09 | 檔名 <img src=x onerror=alert(1)> | UI 顯示純文字且沒有 img element/event；TXT name 欄是 JSON-quoted string，JSON parse 還原原名。 |
| D48-17 | FR-09 | 檔名含 tab、LF、bidi override | DOM 不執行 markup；控制字元顯示 escape；TXT 表格恰有 6 欄；JSON serializer 合法。 |
| D48-18 | FR-05,10 | job A hashing 時取消、啟動 B，最後送 A complete | A result 忽略，不覆蓋 B，不可下載；A worker terminated。 |
| D48-19 | FR-05 | progress completedFiles=0..N | 顯示單調不減且不大於 total；每檔完成恰發一次；不傳檔名或內容。 |
| D48-20 | FR-06,10 | Ready 後改變來源順序或移除一檔 | 舊 result 和 keeper state 清除，報告下載按鈕消失，提示重跑。 |
| D48-21 | FR-10 | Ready 後 reset 或 pagehide | 每個 object URL 恰 revoke 一次；result/hash/buffer 清除。 |
| D48-22 | FR-08 | 任意 successful result | 所有來源 File size/name 未變；沒有 delete/move/write API 或 source mutation。 |
| D48-23 | FR-07 | 完成後下載 TXT | 檔名 duplicate-report.txt；UTF-8 固定標題/summary/header；rows 按 sourceIndex。 |
| D48-24 | FR-01,09 | 兩個同名檔案 | 兩列分別顯示 index 0、1；使用者可分辨和選擇。 |
| D48-25 | FR-10,11 | Ready 後 fake clock 前進 20 分鐘，無來源操作 | 不設 auto-expiry timer；結果和 URL 仍有效。 |
| D48-26 | FR-11 | 在 /index.html 點 English link | anchor 到 /en/index.html；點擊前有未匯出資料遺失警語；新頁沒有舊 files/result，URL 無 query/hash 狀態。 |

D48-01–15、18–23、25 用 Node 24 node:test；D48-16–17、24、26 需 browser evidence，目前 NOT_RUN_USER_FOCUS_INCIDENT。Core tests 用 injected digest 明確模擬 collision，並測 byte compare 差異在 offset 0、65535、65536、最後一 byte 和全等。至少測 size buckets、progress、read/digest error、取消 stale、report escaping、失敗時零 partial result。

Browser gates 待 parent 核准隔離方式後：file input/drop、keeper keyboard radio、language link 導頁與警語、重選檔 invalidation、JSON/TXT downloads、320px、200% zoom、focus/live regions。不可觸發 native dialogs 或控制使用者桌面。


---

## 原文件 TASKS.md

# 實作任務：重複檔案找出來

M1 僅修改 package.json、.gitignore、public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、本工具 evidence/m1/**。六份規格及共同 docs 唯讀。不開 chat、不遞迴委派、不 npm install、不執行 browser/native UI、不部署或公開 GitHub。Node 24 ESM 原生 APIs；offline 合成資料。dev 只綁 127.0.0.1:4228（4180+48），port 衝突回報 parent，不殺程序。

## T00 — Scaffold

Prerequisite：讀本工具 AGENTS.md、START-HERE.md、HANDOFF.md、docs/ENGINEERING.md、docs/PRIVACY-SECURITY.md、docs/DESIGN-SYSTEM.md 和六份規格。

Allowed：package.json、.gitignore、public/index.html、public/en/index.html、public/css/**、public/js/**、scripts/**、test/**。

建 private ESM package、兩份獨立雙語靜態頁、普通語言 anchor 及未匯出資料遺失警語、title/description、noindex、loopback-only static server、Node24 node:test/check/build skeleton。Server 只 serve public/，拒絕 traversal、非 GET/HEAD、未知 MIME。不得 remote resource、persistent storage、service worker。

scripts 建好後執行 node --version、npm test、npm run check、npm run build；不要 npm install。若 script 不存在先建立，不能標不存在命令為通過。

完成條件：Node major 24、dev/test/check/build 四個 scripts、127.0.0.1:4228、M1 noindex、clean dist 僅含 public；記錄實際命令和 exit；browser 未跑。

## T10 — Limits、hash、byte proof

Prerequisite：T00 gates 全通過。

Allowed：public/js/core/**、public/js/analysis-worker.js、test/**，必要時 scripts/check.mjs。

實作 count/size validation、SHA-256 adapter、size bucket、hash candidate、64 KiB byte comparator、stable groups/default keeper、JSON/TXT serializers。digestProvider 可注入模擬碰撞；production 用原生 SHA-256。測 D48-01–15、D48-18–23、D48-25 和 comparator 邊界；建立 all-or-nothing result 及 worker progress/cancel/epoch protocol。

執行 npm test、npm run check、npm run build。完成條件：SHA fixture、exact groups/stats、forced collision byte split、empty file、limits、schema/TXT escaping、無 partial results 全過；無 network。

## T20 — 雙語群組和 keeper UI

Prerequisite：T10 tests/check/build 通過。

Allowed：public/index.html、public/en/index.html、public/css/**、public/js/**、test/**。

建立 file input/drop、source order list/remove、hash/verify progress+cancel、duplicate groups/singletons、每組 keeper radio、summary、JSON/TXT downloads、empty/error/cancel/stale/reset states。source change 全面 invalidates 結果；keeper change 只重建報告。不提供檔案刪除操作。檔名以文字節點和 escape 顯示。語言 anchor 導頁會清除未下載結果並展示 warning；不做跨頁保存。

執行 npm test、npm run check、npm run build。完成條件：兩頁各自完整雙語文案；stale worker/keeper/reset cleanup 有自動測試；keeper 只能選同組成員；不設結果 auto-expiry。

## T30 — 邊界和 M1 收尾

Prerequisite：T20 gates 通過。

Allowed：public/**、scripts/**、test/**、dist/**、HANDOFF.md、TASK-ENTRY.md、evidence/m1/**。

補 200 files、32 MiB、128 MiB 上下界、same-name-different-content、hash collision、control/bidi/markup escaping、multi-chunk byte differences、worker read/digest error、cancel stale、report exact keys 和 no-auto-expiry checks。確認兩個語言頁、離頁警語、noindex、中英 title/description/H1/FAQ。build candidate；記錄 SHA-256、命令/exit、browser NOT_RUN 和剩餘限制。

執行 node --version、npm test、npm run check、npm run build；只依真實結果標 CLI PASS；browser 仍 NOT_RUN_USER_FOCUS_INCIDENT。完成條件：可操作雙語本機 candidate、byte-verified duplicates、keeper 選擇、JSON/TXT 報告、M1 CLI gates 通過；回報 parent。M2 另等 parent 放行。

