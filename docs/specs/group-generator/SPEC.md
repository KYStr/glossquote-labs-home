# 隨機分組產生器 / Group Generator

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-group-generator-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

老師、社團幹部或活動主辦者要把一份名單分成小組時，需要分得平均、人人有份，而且事後能重現與核對。

- 桌面。老師上課前把全班名單從試算表貼上，指定 6 組，立即得到每組名單與人數，投影或下載後照組就座。
- 行動。主辦者在活動現場用手機把臨時報名名單按每組 5 人分組，把文字名單傳到群組。

成功結果。每位名單成員恰好出現於一組；各組人數最多差 1；結果旁顯示本次使用的種子；相同名單與種子在任何裝置重跑都得到逐字相同的分組。資料只保留在目前頁面草稿。

## scope

MVP 必做：名單解析（每行一人、修剪、略過空行、同名保留）；兩種分組方式（依組數、依每組人數）；種子化 mulberry32 洗牌（位元級釘版，沿用本廠 lottery-number-picker 的決定論契約）；round-robin 發牌；分組結果與兩種固定下載（JSON 報告與文字名單）。

非目標：依能力、性別、屬性分層或蛇行分組；排除配對（指定成員不可同組）；抽出單一贏家或依序抽出名次；加權或指定種子隊長；儲存、載入、分享或同步名單；公證、博奕或具法律效力的抽籤程序。

資料與性能界線：名單原始文字最多 32,768 個 UTF-16 單位、保留名最多 500 位、每名修剪後最多 40 個 UTF-16 單位；組數與每組人數各 1–500；種子為 uint32。最壞情況（500 人）洗牌僅 500 次取數，同步完成。

已與本 repo 既有規格、產品與來源快照比對，最相近者的實質差異如下。

- 來源快照 `sources/legacy/random-groups`（名單隨機分組舊作）：以 `crypto.getRandomValues` 做不可重現洗牌、僅組數模式（2–50 組）。本案的核心契約改為可重現的種子決定論（同種子同事後可稽核重現）、增加依每組人數模式、組數範圍 1–500，並以現行八節規格入庫；legacy 快照為固定證據，不修改。
- 從清單抽出單一選項並可逐一淘汰，不分組。 [decision-wheel-picker](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/specs/decision-wheel-picker/SPEC.md)
- 一對一錯排配對（交換禮物），不是把全員分割成組。 [gift-exchange-match](https://github.com/KYStr/glossquote-labs-home/blob/codex/initial-publication/docs/specs/gift-exchange-match/SPEC.md)
- 從號碼池抽出號碼組合，不處理名單分割；本案的 PRNG、種子欄文法與「核心不自產種子、app 填入並顯示」契約即沿用其釘版，使全廠隨機工具行為一致。產品核心見 `tools/lottery-number-picker/public/js/core/lottery.mjs`。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「名單（每行一人） / Names (one per line)」、即時顯示保留名筆數。
- 欄位或說明「分組方式 / Grouping mode」，選項「依組數 / By number of groups」與「依每組人數 / By group size」；依模式只啟用對應數值欄，另一欄停用但內容保留。
- 欄位或說明「組數 / Number of groups」、「每組人數 / People per group」。
- 欄位或說明「種子（留空自動產生） / Seed (blank = auto-generate)」，欄旁常駐說明「留空時會自動產生一個種子並顯示出來，之後可用同一種子重現相同分組。 / Leave blank to have a seed generated and shown; reuse it to reproduce the same groups.」。
- 「隨機分組 / Generate groups」是主要操作。執行時若種子欄為空，app 先以 crypto 產生一個 uint32、寫回種子欄並顯示，再以該種子呼叫核心（流程見 inputsOutputs 與 controller 案例 `state-unseeded-fill`）；crypto 不可用時不退用其他熵源，改顯示「此瀏覽器無法自動產生種子，請手動輸入種子。 / This browser cannot generate a seed automatically; enter a seed manually.」且不執行分組。
- 「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「分組結果 / Groups」先摘要（共 N 人、分 K 組、種子 S）再逐組列出（組號、人數、成員）。結果旁常駐公平說明「以種子洗牌後依序輪流發牌，每人恰好一組、各組人數最多差 1；相同名單與種子會得到相同分組。 / Names are shuffled with the seed and dealt round-robin: everyone lands in exactly one group, group sizes differ by at most one, and the same list and seed always give the same groups.」。成功才顯示「下載報告 / Download report」與「下載文字名單 / Download text list」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。結果摘要含本次種子。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"names":"","mode":"count","groupCount":"3","groupSize":"4","seed":""}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes。

欄位順序固定為 names、mode、groupCount、groupSize、seed，驗證依下文順序逐步進行，第一個失敗即整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為名單原始行號（1-based）或 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. **names 原始容量**。raw 超過 32,768 個 UTF-16 單位 → INPUT_LIMIT，row=null。
2. **names 逐行解析**。以 LF 切行（第 1 行起編號）。每行修剪兩端屬於 {U+0020、U+0009、U+3000} 的字元；修剪後為空的行略過，不計入名單、不做後續檢查。保留行依原始順序逐行檢查：修剪後長度超過 40 個 UTF-16 單位 → INPUT_LIMIT，row=原始行號；含不成對 surrogate → UNICODE，row=原始行號（先容量、後 surrogate，同廠通則）。同名保留為不同成員，永不去重。
3. **names 筆數**。保留名筆數 N=0 → EMPTY（field=names）；N>500 → ROW_LIMIT（field=names），row=第 501 位保留名的原始行號。
4. **mode**。非 `count` 或 `size` → ENUM。
5. **groupCount、groupSize**（依此欄位序）。兩欄 raw 超過 3 個 UTF-16 單位皆先回 INPUT_LIMIT（含未啟用欄）。啟用欄（mode=count 時的 groupCount、mode=size 時的 groupSize）續檢：空 → EMPTY；不合 `^(0|[1-9][0-9]*)$` → INTEGER_FORMAT；數值不在 1–500 → RANGE。未啟用欄僅做容量檢查，其餘內容不檢驗、完全忽略（案例 `inactive-field-ignored`）。
6. **seed**。raw 超過 10 個 UTF-16 單位 → INPUT_LIMIT；空 → EMPTY（核心不自產種子；app 於執行前填入，見 userFlow）；不合 `^(0|[1-9][0-9]*)$` → INTEGER_FORMAT；數值不在 0–4,294,967,295 → RANGE。種子欄文法與 lottery-number-picker 釘版相同。
7. **跨欄**。mode=count 且 K>N → RANGE（field=groupCount）。本工具不產生空組。

組數決定。mode=count 時 K=groupCount。mode=size 時 K=ceil(N / groupSize)；groupSize ≥ N 時 K=1（全員一組）。兩種模式之後共用同一洗牌與發牌。

PRNG（位元級釘版，與 placeholder-text-generator 規格書及 lottery-number-picker 產品核心的 mulberry32 相同）。狀態 a 為 uint32，初值=種子。每抽一次：a ← (a + 0x6D2B79F5) mod 2^32；t ← a；t ← ((t XOR (t >> 15)) × (t OR 1)) mod 2^32；t ← t XOR ((t + (((t XOR (t >> 7)) × (t OR 61)) mod 2^32)) mod 2^32)；回傳值 r = ((t XOR (t >> 14)) mod 2^32) / 2^32，r ∈ [0, 1)。所有位移為邏輯（無號）32 位元位移，乘法為 mod 2^32（JavaScript 以 Math.imul 與 >>> 實作）。抽取順序即契約，任何重排都是缺陷。

洗牌（完整 Fisher–Yates，採 lottery 釘版的前向形態延伸至全部位置）。a 為名單複本（解析後順序）。i 從 0 到 N−1：取 r=next()；j = i + floor(r × (N − i))；交換 a[i] 與 a[j]。每個位置恰取一次亂數，包含最後一個位置（span=1 時 j 恆等於 i，仍取數）——與 lottery「每個抽取位置恰取一次、即使只剩一個候選」一致。floor 以精確算術判定：r = k / 2^32（k 為 uint32 分子），k × (N − i) < 2^41，雙精度乘積精確，無捨入歧義。

發牌（round-robin）。洗牌後第 t 位（0-based）成員進入第 (t mod K) + 1 組；組內成員依發牌順序排列；組依編號輸出。採 round-robin 而非連續切塊：切塊會讓洗牌前段集中於前幾組，輪流發牌使每組都均勻取自整個洗牌序列，且自然滿足平衡不變量。不變量：每位保留名恰出現一次；各組大小差 ≤1；大小為 ceil(N/K) 的組是前 (N mod K) 組（N mod K=0 時各組等大），即較大組恆在前；mode=size 時每組大小 ≤ groupSize。

結果 `{seed, mode, groupCount, totalNames, groups}`。seed 為本次使用的種子數值，groupCount 為實際組數 K，groups 為 `[{number, size, members}]`，number 為 1-based 組號，size=members 長度。機器值不隨 locale 改。

兩個固定下載，僅成功後提供，內容由同一次結果產生：

- `group-generator-report.json`：result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。
- `group-generator-groups.txt`：依目前 UI 語言逐組輸出：先標題行（繁中「第 {number} 組（{size} 人）」；英文 size=1 時 `Group {number} (1 member)`、其餘 `Group {number} ({size} members)`），其後每位成員一行（修剪後原文，不加前綴）。組與組之間恰一個空行；全文無結尾 LF；UTF-8 無 BOM。
- 報告上限 2,097,152 bytes，任一產物超過 → OUTPUT_LIMIT 並停用所有產物。

錯誤與狀態訊息（雙語釘版；EMPTY 與 RANGE 依欄位取文）：

| code | 繁中 | English |
| --- | --- | --- |
| SCHEMA | 輸入格式不正確。 | Input is malformed. |
| INPUT_LIMIT（names, row=null） | 名單太長。 | The name list is too long. |
| INPUT_LIMIT（names, row 有值） | 姓名太長（上限 40 字）。 | A name is too long (max 40 characters). |
| INPUT_LIMIT（其他欄） | 輸入太長。 | Input is too long. |
| UNICODE | 姓名含有不完整的字元。 | A name contains an incomplete character. |
| EMPTY（names） | 請先輸入名單。 | Enter at least one name. |
| EMPTY（groupCount） | 組數不可空白。 | Number of groups must not be blank. |
| EMPTY（groupSize） | 每組人數不可空白。 | People per group must not be blank. |
| EMPTY（seed） | 種子不可空白。 | Seed must not be blank. |
| ROW_LIMIT | 名單上限 500 人。 | At most 500 names. |
| ENUM（mode） | 請選擇分組方式。 | Choose a grouping mode. |
| INTEGER_FORMAT | 請輸入不含空白、符號或小數的十進位整數。 | Enter a decimal integer with no spaces, sign, decimals or exponent. |
| RANGE（groupCount） | 組數必須介於 1 到 500，且不可大於人數。 | Groups must be between 1 and 500 and no more than the number of names. |
| RANGE（groupSize） | 每組人數必須介於 1 到 500。 | People per group must be between 1 and 500. |
| RANGE（seed） | 種子必須介於 0 到 4294967295。 | Seed must be between 0 and 4294967295. |
| OUTPUT_LIMIT | 報告太大，無法下載。 | The report is too large to download. |
| INTERNAL | 處理失敗，請重試。 | Something went wrong. Try again. |

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/group-generator/`。src/core.mjs 放純驗證、PRNG、洗牌、發牌、格式化。src/controller.mjs 管草稿、工作世代、種子填入及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 決定論核心與熵源嚴格分離。core 只接受已填好的種子，永不呼叫 Math.random、Date 或 crypto；給定相同輸入必回相同輸出，逐位元可重現。唯一的熵源在 app/controller：種子欄為空且使用者明確執行時，以 crypto.getRandomValues 取得一個 uint32、寫回種子欄並顯示後，才以該數字字串呼叫 core。crypto 不存在時依 userFlow 顯示固定訊息並停止，不以較弱熵源替代。PRNG 常數（0x6D2B79F5 等）在程式中只出現一份定義，且必須與 lottery-number-picker 釘版逐位元一致。
- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 名單與結果用 textContent/value 呈現，姓名不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。

## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「隨機分組」，畫面、JSON 報告與文字名單符合核心 fixtures（含種子重現與留空填入流程），使用者取得對應產物。 |
| boundaries | 合法端點（N=500、K=N、S≥N、種子 0 與上限）、剛好越界（501 人、K=N+1、41 單位姓名）、第一個錯誤、來源列和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log；名單不離開頁面。 |
| security | 敵意姓名 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose；核心路徑無 Math.random/Date/crypto 呼叫。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作；教師貼上名單到取得分組不需說明文件。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯（含公平說明與種子說明）、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴；PRNG 釘版常數與 lottery-number-picker 逐位元對照紀錄。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow；fixtures 輸出跨瀏覽器逐字一致（Math.imul 路徑）。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。17 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `basic-count` | 八人按組數 3 分組，3/3/2；載入範例 |
| `trace-five` | 五人各一組；洗牌逐步追蹤（AUTHOR-CHECK 手算表） |
| `balance-ten-three` | 十人分 3 組，4/3/3，大組在前 |
| `size-mode-balanced` | 每組至多 4 人 → 3 組 4/3/3（平衡，非切塊 4/4/2） |
| `size-single-group` | 每組人數大於名單 → 一組 |
| `duplicates-kept` | 同名保留、空行略過、前後空白修剪 |
| `seed-zero` | 種子 0 合法且可重現 |
| `seed-max` | 種子上限 4294967295 |
| `single-name` | 一人一組 |
| `inactive-field-ignored` | 未啟用欄僅檢容量，內容不影響結果 |
| `empty-names` | 全空白名單 → EMPTY |
| `too-many-names` | 501 人 → ROW_LIMIT 及列號 |
| `count-exceeds-names` | 組數大於人數 → RANGE，不產生空組 |
| `seed-leading-zero` | 種子前導零 → INTEGER_FORMAT |
| `name-too-long` | 41 單位姓名 → INPUT_LIMIT 及列號 |
| `bad-mode` | 未知模式 → ENUM |
| `group-size-zero` | 每組人數 0 → RANGE |
| `state-unseeded-fill` | 種子留空 → app 填入並顯示；同填入種子重跑結果逐字相同。 |
| `state-dirty-error` | 先產出真結果，再清空名單，舊結果及所有下載立即失效，重跑得 EMPTY。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |

狀態測例使用可控制完成時間的假 Worker 與可注入的種子填入替身。state-unseeded-fill 以 fillSeed 替身值 20261109 模擬 crypto 填入，檢查種子欄顯示、結果 seed 及重跑逐字相同。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate 姓名（UNICODE 及列號）、惡意字串、快速改值及晚到訊息。驗證原始名單 32,768／32,769 單位界線、未啟用欄超容量 INPUT_LIMIT、種子 10／11 單位、groupCount=501 RANGE、N=500 成功且全員恰出現一次、K=1 全員同組、重複名出現次數守恆、文字名單 bytes（標題格式、英文單數 member、組間空行、無結尾 LF）、JSON 報告 canonical 序列化與 SHA-256。所有成功結果須滿足：成員多重集與解析後名單相等、各組大小差 ≤1、較大組在前、mode=size 時每組大小 ≤ groupSize。

候選 gate（均 NOT_RUN）

- 於 `tools/group-generator/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入或合成檔、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「隨機分組產生器」，title「隨機分組產生器｜Gloss Tools」，description「貼上名單、選組數或每組人數，用可重現的種子洗牌平均分組，每人恰好一組。」。英文 lang=en，H1 “Group Generator”，title “Group Generator | Gloss Tools”，description “Paste a name list, choose a group count or a group size, and deal everyone into balanced groups with a reproducible seeded shuffle.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。同樣的名單和種子會得到一樣的分組嗎？會。洗牌只由種子決定，重跑或換裝置都相同。 / Do the same list and seed give the same groups? Yes. The shuffle depends only on the seed, so reruns and other devices match.
- FAQ。有兩個同名的人怎麼辦？同名會保留成兩個人，各自獨立分組，不會被合併或刪除。 / What about two people with the same name? Duplicate names are kept as separate people and grouped independently; they are never merged or dropped.
- FAQ。種子留空會怎樣？app 會產生一個種子並顯示出來，之後可用同一種子重現。 / What if I leave the seed blank? The app generates a seed and shows it, so you can reproduce the same groups later.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://group-generator.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/group-generator/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
