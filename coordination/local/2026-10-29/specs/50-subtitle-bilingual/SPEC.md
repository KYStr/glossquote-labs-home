# 雙語字幕合併 — 既有規格保存

Task ID: `labs-50-subtitle-bilingual` · Spec ID: `spec-50-subtitle-bilingual`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品需求：雙語字幕合併

M1 是可操作的本機字幕對齊工具：載入兩份 SRT、指定主/副語言、對齊/手動修正、預覽雙行字幕、下載新 SRT。來源檔保持不變，所有 cues 要保留或由使用者明確排除。

## Job、result、contract、oracle

Job v1：

    {
      schemaVersion: 1,
      jobId: "job-1",
      main: { sourceIndex: 0, name: "main.srt", cues: [...] },
      secondary: { sourceIndex: 1, name: "secondary.srt", cues: [...] },
      threshold: { numerator: 1, denominator: 2 }
    }

Cue v1: {sourceIndex,startMs,endMs,textLines}. sourceIndex 是該檔案內從0開始的順序。Parsed source cue number 不作 ID，輸出重新編號。Time 全是安全整數毫秒。

OutputCue v1: {startMs,endMs,lines,origin:{mainCueIndex,secondaryCueIndex}}。Matched cue 的兩個 origin 都是整數；main-only cue 的 secondaryCueIndex 為 null；secondary-only cue 的 mainCueIndex 為 null。lines 是輸出的逐行純文字陣列。

Match 與 ambiguous edge 的 intersectionMs/unionMs 保留未約分毫秒值；iou 是將 intersectionMs/unionMs 約成最簡分數後的 {numerator,denominator}。IoU 為零時表示為 0/1。

成功 Result v1：

    {
      schemaVersion: 1,
      jobId: "job-1",
      status: "ready",
      mainCueCount: 1,
      secondaryCueCount: 1,
      matches: [{
        mainCueIndex: 0,
        secondaryCueIndex: 0,
        intersectionMs: 1500,
        unionMs: 2000,
        iou: { numerator: 3, denominator: 4 },
        kind: "automatic"
      }],
      ambiguous: [],
      unmatchedMain: [],
      unmatchedSecondary: [],
      keptSeparateMain: [],
      keptSeparateSecondary: [],
      outputCues: [{
        startMs: 0,
        endMs: 2000,
        lines: ["A", "B"],
        origin: { mainCueIndex: 0, secondaryCueIndex: 0 }
      }]
    }

matches[].kind 固定為 automatic、manual 或 manual-override。ambiguous item 是 {mainCueIndex,secondaryCueIndex,intersectionMs,unionMs,iou:{numerator,denominator},reasons:["main-tie"|"secondary-tie"|"non-mutual"]}。每條尚未解決的 eligible edge 恰列一次。status="review" 表示 ambiguous 非空，outputCues=[] 且下載停用。unmatchedMain/Secondary 是目前 residual graph 中沒有 eligible edge 的 cues；keptSeparateMain/Secondary 是使用者明確選為獨立輸出的 cues，永遠不再配對。使用者可對含 ambiguous edge 的 connected candidate component 中任一 cue（包括顯示在歧義候選旁的 automatic-match endpoint）配一個候選或明確選擇保留分開。既有 manual/manual-override matches 與 kept-separate 決策是固定結果；只對其餘所有 cues 的 full residual graph 重算 mutual unique best。選擇已被 automatic match 占用的候選或把 automatic match cue 保留分開時，先顯示取代確認；確認後只移除衝突的 automatic match，釋出的另一 cue 回到 residual graph 並重算。確認取消時 Result 完全不變。全部歧義解決才 status="ready"、ambiguous=[] 並生成 outputCues：matches 每項一個雙行 cue、unmatched 與 keptSeparate cues 各自成單行 cue；任何來源 cue 均恰出現一次，除非使用者另行明確排除並確認。錯誤 Result 為 {schemaVersion:1,jobId,status:"error",error:{code,fileIndex,offset,messageKey},matches:[],ambiguous:[],unmatchedMain:[],unmatchedSecondary:[],keptSeparateMain:[],keptSeparateSecondary:[],outputCues:[]}。固定 errors：NO_FILES、TOO_MANY_FILES、FILE_TOO_LARGE、INVALID_ENCODING、INVALID_SRT、INVALID_TIMECODE、INVALID_CUE_ORDER、CANDIDATE_LIMIT、CANCELED、MATCH_CONFLICT、BUILD_FAILED。候選邊數超限時 fileIndex/offset 為 null，messageKey 提示縮短字幕片段後重試；全批不輸出 partial matches、preview 或 SRT。任何輸入 parse 失敗都不輸出 partial SRT。

## 功能需求

**FR-01 載入兩檔。** 選取兩份 SRT，初始第一檔為 main、第二檔 secondary；可交換主副。各檔最多1,048,576 bytes、3000 cues，總輸入至多2,097,152 bytes。若只選一檔，不開始配對。上限精確接受，超出拒絕整檔。

**FR-02 SRT profile。** 只接受 UTF-8，可有一個 BOM；fatal decode。可接受 CRLF、LF、CR。每 cue 為正整數序號、下一行精確時間行 start --> end、至少一行不為空的文字、其後空白分隔。Cue number 必須從1連續遞增。Timestamp 小時為2至8位十進數、分鐘/秒各00–59、毫秒三位；時間轉整數毫秒。startMs<endMs。拒絕額外 settings、非標準時間、小數位數錯、文字缺失和 malformed block。所有 cue text 都是不可信純文字，UI 永不當 HTML。

**FR-03 重疊計算。** 區間是半開 [startMs,endMs)。intersection=max(0,min(endA,endB)-max(startA,startB))；union=durationA+durationB-intersection；IoU=intersection/union。閾值固定 0.5，當且僅當 intersection×2 >= union 為 eligible。用 BigInt 交叉相乘比較 ratio，禁止浮點作配對決策。整批 eligible edge 上限 50,000；第 50,001 條 edge 觸發 CANDIDATE_LIMIT，立即停止建構並回傳零部分結果，提示縮短字幕片段後重試。

**FR-04 自動配對與歧義。** 建立所有 eligible edges。每個尚未被固定決策消耗的 main 和 secondary cue 各自找 IoU 唯一最高對象；相同最高分是 tie unresolved。僅在一對 cues 互相選為唯一最高時自動配對。自動配對後仍有 eligible edge 的未配對 cues 列 ambiguous，包含指向已自動配對對象的 non-mutual 提案；不能以遍歷順序自動選。若兩個 main 競爭同一 secondary 且 IoU 不同，較高者可成互為唯一最佳而自動配對，較低者留 ambiguous；若 IoU 相等造成 equal-best，該競爭邊不自動配對，列人工決定。ambiguous reasons 按 main-tie、secondary-tie、non-mutual 固定順序標記。使用者可對含 ambiguous edge 的 connected candidate component 中任一 cue（包括歧義候選旁的 automatic-match endpoint）選候選配對或「保留為分開字幕」；分開選擇將該 cue 固定為獨立輸出，不會靜默排除。配對候選若碰到 automatic match，或把 automatic match cue 保留分開，先請使用者確認取代；取消不變，確認後釋出原配對另一 cue 至 residual graph。manual pair 與 keep-separate 是固定決策，不會被後續重算覆蓋。每次確認後在排除固定決策的 full residual graph 重算自動配對、歧義和 unmatched，直到無 ambiguous；候選列表按精確 IoU 降序、再按對方 sourceIndex 排序。未決圖中無 eligible edge 才是 unmatched。不得把同一 cue 配多次。

**FR-05 手動配對。** 使用者可在未決 cues 間手動建立一對一配對，或對未固定手動配對的 cue 明確選「保留為分開字幕」；此操作也可從 ready 狀態的 automatic-match row 執行。eligible pair 標記 kind=manual；低於0.5也可明確 override，需顯示精確 IoU 並二次確認，確認後標記 kind=manual-override。若選擇的 cue 目前已有 automatic match，確認需列出將被取代的自動配對及其被釋出 cue；取消維持相同 Result，確認後建立 manual/manual-override match 或固定 keep-separate 決策，並對 residual graph 重算。已確認手動配對和保留分開選擇固定，不會被重算取代。對話框等待或取消不得改動 Result；只在確認後原子套用決策。解除手動配對後回到 residual graph 並重算。未處理 ambiguous 時不產生 SRT；不可覆寫 cue text 或時間。

**FR-06 未配對保留。** 未決圖無候選的 unmatched main 輸出 main-only；unmatched secondary 輸出為副語言獨立 cue。使用者明確選「保留分開」的 main/secondary 也各自輸出獨立 cue，並列於 keptSeparateMain/Secondary，不算排除。兩種保留狀態在預覽中明確標示；任何排除都必須逐項操作並確認。不得靜默捨棄 cue。

**FR-07 輸出時間與排序。** matched cue 用 main start/end；文字行先放 main textLines，再放 secondary textLines。Unmatched main 使用自己的時間/文字；unmatched secondary append cue 使用自己的時間/文字。最後輸出以 startMs 升冪排序；相同 startMs 時 main-origin 優先，再按主/副原始 sourceIndex 穩定排序。輸出 SRT cue number 重新由1連續編號，timestamp 格式 HH:MM:SS,mmm（hours 至少兩位，超過兩位不截斷）；每 cue 空行分隔。

**FR-08 進度、取消與 stale cleanup。** Parsing、pairing、輸出分成明確階段；取消、重選、swap main/secondary、重新開始或 pagehide 會終止舊 job，epoch 遞增，清除暫存。Stale worker event 不改 UI、不下載。配對確認對話框的取消只清除 pending decision，既有 Result 逐欄不變；確認時一次提交並重算。結果不設自動時間期限；待頁期間可反覆下載。

**FR-09 雙語頁面導覽。** /index.html 與 /en/index.html 為獨立靜態頁，語言 anchor 導頁。未下載的字幕工作會遺失，旁邊明示；不得 storage/query/hash/跨頁保存。

## Oracle 範例

main cue [0,2000] 文本 A；secondary cue [500,2000] 文本 B。intersection=1500、union=2000、IoU=3/4，符合唯一 mutual best；輸出 cue [0,2000]、兩行 A 然後 B。候選比較最多保留 50,000 edges；更多時 CANDIDATE_LIMIT 不回 partial result。更完整情境見 ACCEPTANCE.md。


---

## 原文件 TECHNICAL.md

# 技術契約：雙語字幕合併

## 執行環境與樹

Node.js 24、ESM、零 dependencies，不 npm install。Candidate /index.html、/en/index.html；M1 noindex,nofollow,noarchive。Node dev server 僅綁 127.0.0.1:4230（4180+50），只 serve public/。無 network、upload、remote fonts、telemetry、storage、ASR、translation service、media conversion。自動 tests 用 synthetic cues。

    package.json
    .gitignore
    public/index.html
    public/en/index.html
    public/css/app.css
    public/js/app.js
    public/js/ui.js
    public/js/merge-worker.js
    public/js/core/decode.js
    public/js/core/parse-srt.js
    public/js/core/iou.js
    public/js/core/match.js
    public/js/core/merge.js
    public/js/core/serialize-srt.js
    scripts/serve.mjs
    scripts/check.mjs
    scripts/build.mjs
    test/parse-srt.test.mjs
    test/iou.test.mjs
    test/match.test.mjs
    test/merge.test.mjs
    test/worker-state.test.mjs

## Parser contract

parseSrt(bytes:ArrayBuffer) returns {ok:true,cues} or {ok:false,error:{code,offset}}. Check byteLength<=1,048,576 before decode. Strip only one UTF-8 BOM; fatal UTF-8 TextDecoder. Normalize CRLF and lone CR to LF. Ignore trailing empty lines. Every non-empty block requires exact sequential decimal cue number starting at1, timestamp line, one or more nonblank text lines. No cue settings or position tags accepted. Empty file/cue text invalid. Time regex hours [0-9]{2,8}, minutes and seconds [0-5][0-9], comma plus exactly3 digits. Compute hours*3,600,000 + minutes*60,000 + seconds*1,000 + milliseconds; ensure Number.isSafeInteger and end>start. Preserve source cue order and text lines byte-decoded as Unicode strings. Parse error means zero cues leave parser.

## Exact IoU and matching API

    intersectionMs(a,b): safe integer
    unionMs(a,b): safe integer > 0
    eligible(a,b): BigInt(intersectionMs)*2n >= BigInt(unionMs)
    normalizeRatio(numerator:number,denominator:number): {numerator:number,denominator:number} // gcd-reduced; 0 becomes 0/1
    compareRatio(a:{numerator:number,denominator:number},b:{numerator:number,denominator:number}): -1|0|1 using BigInt cross-products
    type AmbiguousCandidate = {
      mainCueIndex:number,
      secondaryCueIndex:number,
      intersectionMs:number,
      unionMs:number,
      iou:{numerator:number,denominator:number},
      reasons:Array<"main-tie"|"secondary-tie"|"non-mutual">
    }
    type Match = {mainCueIndex:number,secondaryCueIndex:number,intersectionMs:number,unionMs:number,iou:{numerator:number,denominator:number},kind:"automatic"|"manual"|"manual-override"}
    type OutputCue = {startMs:number,endMs:number,lines:string[],origin:{mainCueIndex:number|null,secondaryCueIndex:number|null}}
    type Decision = {type:"pair",mainCueIndex:number,secondaryCueIndex:number}|{type:"keep-separate",side:"main"|"secondary",cueIndex:number}
    type Analysis = {
      schemaVersion:1, jobId:string, status:"review"|"ready",
      mainCueCount:number, secondaryCueCount:number,
      matches:Match[],
      ambiguous:AmbiguousCandidate[],
      unmatchedMain:number[], unmatchedSecondary:number[],
      keptSeparateMain:number[], keptSeparateSecondary:number[],
      outputCues:OutputCue[]
    }
    type ErrorResult = {
      schemaVersion:1, jobId:string, status:"error",
      error:{code:string,fileIndex:number|null,offset:number|null,messageKey:string},
      matches:[], ambiguous:[], unmatchedMain:[], unmatchedSecondary:[],
      keptSeparateMain:[], keptSeparateSecondary:[], outputCues:[]
    }
    type PendingDecision = {
      jobId:string, decision:Decision,
      reasons:Array<"replace-automatic-match"|"below-threshold">,
      replacedAutomaticMatches:Match[], releasedMain:number[], releasedSecondary:number[],
      exactIou?:{numerator:number,denominator:number}
    }
    matchCues(main,secondary): Analysis
    resolveDecision(analysis,decision:Decision): {kind:"applied",analysis:Analysis}|{kind:"confirmation-required",pending:PendingDecision,analysis:Analysis}
    confirmDecision(analysis,pending:PendingDecision,accepted:boolean): Analysis

MAX_ELIGIBLE_EDGES = 50_000 for the complete two-file job.

Input intervals are half-open and valid start<end. Since durations can be up to the maximum timestamp, compute differences in safe integers; convert to BigInt before cross multiplication. normalizeRatio uses Euclid's algorithm on the nonnegative numerator and positive denominator, divides both by their greatest common divisor, and represents zero as 0/1. Do not use rounded floating IoU to rank or make equality decisions. UI percent is presentation only.

Matching and decision steps:
1. Iterate cue pairs in main sourceIndex then secondary sourceIndex order; generate eligible edges (IoU>=1/2) and retain raw intersectionMs/unionMs integers. In public Match/AmbiguousCandidate, expose iou as the gcd-reduced ratio; 0 is 0/1. Before retaining edge 50,001, abort the whole matching job with CANDIDATE_LIMIT, fileIndex=null, offset=null, messageKey=shorten-subtitles-and-retry; stop pair iteration and return no partial matches, ambiguous list, outputCues, preview, or downloadable Blob. Exactly 50,000 eligible edges is accepted. Check cancellation at least every 1,024 pair comparisons, including before the next pair.
2. Remove source cues already consumed by fixed manual/manual-override pairs or fixed kept-separate decisions. On the full remaining graph, each main and secondary cue finds its maximum ratio. Multiple equal maxima are ties; otherwise the unique max is its proposal.
3. Pair automatically only mutual unique max. Any remaining eligible edge is ambiguous, including a non-mutual proposal to a cue already in an automatic pair. For each edge add reason main-tie if its main has multiple equal-best edges, secondary-tie if its secondary has multiple equal-best edges, and non-mutual if endpoints did not mutually select this edge as unique best. Include all applicable reasons in fixed order main-tie, secondary-tie, non-mutual. Never resolve ambiguity by iteration order. If two main cues have different eligible IoU values to one secondary cue, the stronger unique mutual-best pair may be automatic and the lower non-mutual edge remains ambiguous. If both main cues have equal-best IoU to the same secondary cue, the secondary has a tie and neither competing edge auto-pairs. Ambiguous candidate lists sort ratio descending with exact compare, then opposing sourceIndex ascending.
4. A keep-separate decision may apply to any cue not already consumed by a fixed manual pair. It removes that cue from the residual graph, records its index in keptSeparateMain or keptSeparateSecondary, and fixes it as a standalone output cue. If it currently has an automatic match, require confirmation to remove that automatic pair; return the other endpoint to the residual graph. A cue with no eligible edges in the residual graph is unmatched and becomes a standalone output cue by default.
5. A pair decision may select an eligible ambiguous edge or two otherwise unmatched residual cues. If either endpoint is part of an automatic pair, resolveDecision returns confirmation-required with the exact automatic pair(s) that would be replaced and each released endpoint. If IoU is below 1/2, it also requires confirmation and includes the exact ratio. One confirmation lists both reasons when applicable. An eligible confirmed pair has kind=manual; a below-threshold confirmed pair has kind=manual-override. Until confirmDecision(...,true), analysis is unchanged. confirmDecision(...,false) clears only the pending proposal and returns the exact previous analysis. On acceptance, atomically remove only conflicting automatic pair(s), add the chosen manual or manual-override match, and return released endpoints to the residual graph. All prior manual/manual-override matches and kept-separate cues are fixed decisions and never reconsidered or overwritten. Recompute mutual unique max on the full residual graph after excluding fixed decisions; every released cue remains eligible for reclassification as automatic, ambiguous or unmatched. Manual pairing is one-to-one.
6. After every accepted decision, rebuild automatic matches, ambiguous edges and unmatched arrays from the full residual graph. In review status outputCues is empty and download disabled. Once no ambiguous edges remain, create outputCues per PRODUCT.md from automatic/manual matches, unmatched cues and kept-separate cues; preserve every source cue exactly once unless a separate explicit exclusion is confirmed.

## SRT serialization

serializeSrt(outputCues) orders as specified, assigns numbers 1..N, formats integer milliseconds as hours (minimum 2 digits), two digit minutes/seconds, three digit comma milliseconds. No rounding. For matching, main cue start/end defines interval; unmatched cue preserves its own. Text is opaque line text; UI uses textContent, never HTML parsing. SRT styling-looking strings remain source text and are not interpreted by this app. Writer joins cue lines with LF and one blank line between blocks, adds final LF if non-empty. Encode UTF-8 without BOM.

Output file name bilingual-subtitles.srt. No network or storage. Always include unmatched main and secondary cues in output; if user explicitly excludes any, show count and confirm before download. Output archive/result available until reset/source change/new job/pagehide; no auto-expiry timer.

## Worker and job cleanup

State: empty -> selected -> parsing -> matching -> review -> ready; tasks can transition to cancelling -> selected; parse error -> error with zero result; reset/source change/pagehide -> empty or selected. Only one pending decision dialog may exist; while it is open, other matching decisions are disabled. Starting/resetting a job invalidates it by jobId/epoch. A manual decision may enter awaiting-confirmation; acceptance applies atomically, cancellation restores the exact prior analysis, and any stale confirmation is ignored. merge-worker receives {type:"run",jobId,mainBytes,secondaryBytes}; sends progress stage/file; success returns full ResultV1; error returns code and offset. Cancel by terminate worker, increment epoch, clear byte buffers. Stale events are ignored. Swapping tracks is a new job and clears all previous automatic/manual matches and kept-separate decisions. Download URLs are created on explicit button, revoked on source change/reset/pagehide. No timed expiry.

## References and scripts

SRT has no single authoritative normative specification. The Library of Congress Sustainability of Digital Formats description records the common numbered cue/timecode/text-block profile and UTF encodings: [SubRip Subtitle format description](https://www.loc.gov/preservation/digital/formats/fdd/fdd000569.shtml). This candidate intentionally defines the stricter UTF-8 profile above; it does not claim universal SRT support.

package scripts dev=node scripts/serve.mjs, test=node --test, check=node scripts/check.mjs, build=node scripts/build.mjs. Build copies public/ to dist/. Check verifies noindex/no remote resource/storage and syntax/invariants; static checks are not security proof.


---

## 原文件 UX-SEO.md

# 介面、雙語文案與搜尋摘要

## 語言頁面與搜尋資訊

繁中頁為 /index.html，英文頁為 /en/index.html。兩者是內容一致、獨立載入的靜態頁面，語言連結使用一般 anchor 導頁；每個連結旁都要顯示「切換語言會離開本頁，尚未匯出的字幕與結果會遺失」。不使用 storage、URL 參數或 hash 保存狀態。兩頁都設 noindex、nofollow、noarchive，不載 remote fonts、analytics 或第三方資源。

繁中 title：雙語字幕合併｜Gloss Tools

繁中 description：在本機合併兩份 SRT 字幕，按時間重疊配對、檢查歧義並保留未配對字幕，再下載雙語 SRT。

繁中 H1：把兩份 SRT 合成雙語字幕

English title: Merge Bilingual Subtitles | Gloss Tools

English description: Match two SRT files by timeline, review ambiguous and unmatched cues, then download a bilingual SRT locally.

English H1: Merge two SRT files into bilingual subtitles

繁中 FAQ：

- 會自動翻譯字幕嗎？不會，只按時間配對兩份既有字幕。
- 什麼情況會自動配對？交集／聯集比例至少 0.5，且兩側都是唯一最佳配對時才自動配對。
- 有歧義時可以直接下載嗎？不行。逐一配候選或明確保留分開字幕後，才會建立下載結果。選擇已自動配對的候選會先說明要取代哪一對；取消保留原結果。
- 可以手動配對低於 0.5 的句子嗎？可以，但確認前會顯示精確 IoU 與警告；取消不會改動既有配對。
- 可以把自動配對的句子保留為分開字幕嗎？可以。確認會列出被釋出的另一句；取消不改動原配對。
- 未配對字幕會消失嗎？不會；預設保留。若要排除，需逐句選擇並確認。
- 支援哪些字幕檔？本版定義受限 UTF-8 SRT 格式，不承諾支援所有 SRT 變體。
- 候選配對太多怎麼辦？超過 50,000 組符合時間門檻的候選時，整批停止並提示縮短字幕片段；不提供部分結果。
- 字幕會上傳嗎？不會。檔案在本機記憶體處理，沒有上傳、AI 或轉檔。

English FAQ:

- Does it translate subtitles? No. It only matches two existing subtitle files by time.
- When are cues matched automatically? Only when timeline IoU is at least 0.5 and each cue has a unique mutual best match.
- Can I download while matches are ambiguous? No. Pair each ambiguous cue or explicitly keep it separate before an output is created. If a candidate replaces an automatic pair, the confirmation names that pair; canceling preserves the existing result.
- Can I manually pair cues below 0.5 IoU? Yes, after reviewing the exact ratio and warning. Canceling leaves existing matches unchanged.
- Can I keep an automatic match as separate cues? Yes. The confirmation names the released cue; canceling keeps the original match.
- Are unmatched cues discarded? No. They stay in the output by default; excluding one requires an explicit choice and confirmation.
- Which subtitle files are supported? This release defines a strict UTF-8 SRT profile and does not claim support for every SRT variant.
- What if too many subtitle cues overlap? More than 50,000 eligible candidate pairs stops the whole job with a clear prompt to shorten the subtitle segments; no partial result is offered.
- Are my files uploaded? No. Files are processed in local memory without upload, AI, or conversion.

## 工作區線框

Desktop，至少 1024 CSS px：

    ┌──────────────────────────────────────────────────────────────┐
    │ Gloss Tools / 雙語字幕合併           語言：繁中 | English     │
    │ 切換提醒：尚未匯出的字幕與結果會遺失                      │
    ├──────────────────────────────────────────────────────────────┤
    │ 主字幕 [選擇 SRT] 檔名／大小／解析狀態                      │
    │ 次字幕 [選擇 SRT] 檔名／大小／解析狀態                      │
    │ [開始配對] [取消] [清除全部]   進度與明確錯誤                 │
    ├────────────────────────────┬─────────────────────────────────┤
    │ 配對摘要／歧義候選          │ 預覽：主句在上、次句在下        │
    │ 候選配對／保留分開／取代確認│ 主時間軸、輸出順序與排除確認    │
    │ 未配對逐列選對象／低分手動配對│ 待決時無結果下載，狀態明確提示│
    ├────────────────────────────┴─────────────────────────────────┤
    │ [下載雙語 SRT]；下載名稱 bilingual-subtitles.srt             │
    └──────────────────────────────────────────────────────────────┘

Mobile，寬度 320–767 CSS px，單欄，順序為主檔、次檔、動作／進度、摘要、逐列審閱、預覽、下載。按鈕全寬且文字換行不遮住狀態；每列不以顏色作唯一狀態標記。檔案選擇使用標準網頁 input，不觸發額外原生 dialog。鍵盤可到達配對、取消、選擇與下載控制；錯誤以文字關聯至對應檔案。

## 錯誤與狀態文案

繁中明確區分：檔案超限、不是有效 UTF-8、SRT 區塊格式錯誤、時間無效、線程已取消、配對需人工決定、自動配對取代確認、低於門檻配對確認、沒有任何輸出字幕。確認對話框等待或取消時原結果維持不變；取代確認列出原配對與將返回候選審查的 cue。錯誤不回傳部分結果，並保留使用者原始檔案選擇以便更正或清除。

English copy must preserve the same actions, limits, warnings, and status meanings as the Traditional Chinese page. Do not claim universal player or subtitle compatibility, translation, upload, privacy beyond the implemented local-only candidate, or a match that the algorithm did not make.

## 實際瀏覽器狀態

M1 靜態頁面與瀏覽器互動檢查為 NOT_RUN_USER_FOCUS_INCIDENT。只可在不影響使用者鍵盤、IME、剪貼簿、焦點或原有分頁的隔離機制已由主代理驗證後重開該檢查；文件與 Node CLI 測試不等於瀏覽器驗收。


---

## 原文件 ACCEPTANCE.md

# 驗收規格：雙語字幕合併

## Job / Result / Contract / Oracle

Job：使用者已經有兩份不同語言的 SRT，希望按時間合併成可再播放的雙語 SRT，並人工處理不確定配對。

Result：主字幕時間軸的輸出 SRT；每句依使用者確認的配對呈現主文、次文，所有未配對句預設仍保留；同時提供可檢視的匹配摘要與錯誤。

Contract：兩個輸入各不超過 1,048,576 bytes、各最多 3,000 cues；僅受限 UTF-8 SRT profile；精確整數毫秒、start < end。eligible interval IoU 候選邊最多 50,000；超過整批回 CANDIDATE_LIMIT、無 partial output，提示縮短字幕片段。只有互為唯一最佳才自動配對；歧義須人工選。不得靜默丟句或做翻譯、上傳、ASR、轉檔。

Oracle：主 0..2000 A 與次 500..2000 B 的 IoU 為 0.75，輸出時間維持 0..2000，文字為 A 換行 B。兩個主 cue 競爭同一副 cue 時，IoU 不同由較高 mutual unique pair 自動配、較低者留 ambiguous；equal-best collision 時雙方都等待人工決定。

## 精確驗收案例

1. 解析有效 UTF-8、LF、CRLF、單獨 CR SRT；每種格式解析為相同 cue 序列。
2. 允許一個 UTF-8 BOM；兩個 BOM、無效 UTF-8、空檔案、空 cue 文字均拒絕且回傳明確錯誤碼與位移，不產生部分 cues。
3. 解析器拒絕非序號起始 1、序號跳號、非十進位序號、缺 timestamp、時間行含不支援設定、缺 cue 文字或非空多餘區塊。
4. 時間戳 00:00:01,000 至 00:00:02,003 解析為 1000 與 2003 ms；分鐘或秒 60、毫秒非三位、end 等於或早於 start 均拒絕。
5. 時間小時至少兩位並最多八位；超出安全整數範圍拒絕，不溢位或 round。
6. 輸入恰為 1,048,576 bytes 可進入解析；多一 byte 拒絕。每檔 3,000 cues 接受；3,001 cues 拒絕。
7. 區間主 [0,2000)、次 [500,2000) 的 IoU 精確為 3/4，可配對；輸出主時間與主先次後文字符合規格。
8. IoU 恰 1/2 的邊建立候選；小於 1/2 的邊不建立候選，顯示為未配對而非近似配對。
9. 用同一最大 IoU 的兩個次 cue 測試，主 cue 有 tie，不能自動配對；候選按精確比例再按來源 index 排序。
10. Main A=[0,1000)、Main B=[0,800)、Secondary X=[0,1000)：IoU(A,X)=1、IoU(B,X)=4/5；A-X 是 mutual unique 並自動配對，B-X 是 non-mutual ambiguous，不得依遍歷順序讓較低比例勝出。
11. Main A=[0,1000)、Main B=[0,1000)、Secondary X=[0,1000)：兩邊 IoU 均 1，X 有 equal-best tie；A-X 與 B-X 都不自動配對，均列人工處理。
12. 不相交 cues 分別列為 unmatchedMain 與 unmatchedSecondary；初始 Result 保留兩邊所有 cues。
13. 手動配對不得重複使用同一主或次 cue；低於 0.5 的手動覆寫需再次確認並標記 manual-override。
14. 最終輸出先按主時間軸 startMs，再按主 cue 優先、次 cue 次之及 sourceIndex 穩定排序；匹配輸出主句後接次句。未配對 cue 使用自己的時間與文字。
15. 明確排除未配對句後顯示排除數量並要求確認；取消確認維持包含狀態。
16. 輸出序號由 1 連續遞增；時間精確格式為 HH:MM:SS,mmm，至少兩位小時；UTF-8 無 BOM，區塊間一空白行，非空檔有 final LF。
17. 字幕字串如 <script>alert(1)</script> 只以純文字呈現並在 SRT 文字中保留，不解析或執行標籤；檔名與標籤不進入可執行 HTML。
18. 第三方字幕超過 byte/cue 限制時拒絕整個檔案，不以截斷方式略過 cue。
19. 執行中取消後 worker 終止、epoch 更新、byte buffers 清空；取消後不得產生 SRT 或把狀態標成 Ready。
20. job 甲取消後啟動 job 乙，再收到甲的延遲 success/error/progress 訊息；UI 必須忽略甲事件，不覆寫乙結果。
21. 新來源、清除或 pagehide 使舊輸出失效，撤銷本 app 建立的下載 ObjectURL；沒有 15 分鐘計時或背景自動過期。
22. 兩份來源相同或同名不自動推斷語言，不更動來源標記、不生成翻譯。
23. 使用者在選來源後切換靜態語言頁會離開目前頁面；連結旁有未匯出資料將遺失警告，且沒有 storage、query、hash 傳狀態。
24. 每個可操作控制有繁中與英文等價文字；載入英文頁直接呈現英文 H1、錯誤、進度、按鈕與 FAQ。
25. 320 px viewport 頁面單欄、不水平溢出；至少 1024 px 桌面畫面能同時看見檔案／摘要與預覽區域。
26. 檢查 package scripts 可執行 test/check/build，build 輸出靜態 dist/；無 npm runtime dependency、無 server-side upload、無 remote request。
27. 實際瀏覽器與真實媒體播放不屬此字幕合併核驗範圍，明確記為 NOT_RUN_USER_FOCUS_INCIDENT；不得標成 PASS。
28. MAX_ELIGIBLE_EDGES=50,000：250 identical main intervals × 200 identical secondary intervals 建立正好 50,000 edges，完成且 edge count 不超限；250×201 的第 50,001 edge 必須立刻回 CANDIDATE_LIMIT，停止 pair scan，error fileIndex/offset 為 null，matches/ambiguous/unmatched/keptSeparate/outputCues 均空、不顯示 preview、不建立 Blob。
29. ambiguous edge reasons 依 main-tie、secondary-tie、non-mutual 固定順序精確標記。status=review 時 outputCues=[]、下載 disabled；每個歧義 cue 必須配一個 eligible/manual-confirmed candidate 或明確 keep-separate。keep-separate 將該 cue 加入對應 keptSeparate 陣列並輸出為單行 cue，不算排除；既有 manual pair 與 kept-separate 是固定決策。每次確認後只在排除固定決策的 full residual graph 重算；automatic match 可被明確確認取代，釋出的另一 cue 返回圖內重分類。所有歧義消失後 status=ready 並輸出每個未排除來源 cue 恰一次，不能漏掉已保留分開項目。
30. Main A=[0,1000)、B=[0,800)、Secondary X=[0,1000)、Y=Z=[0,600)：初始 A-X IoU=1 automatic，B-X IoU=4/5 為 ambiguous；B-Y/B-Z=3/4，A-Y/A-Z=3/5。使用者選 B-X 時，pending confirmation 必須列出將取代 A-X 及釋出 A；在對話框 Cancel 後，原 analysis 各欄（A-X automatic、B-X ambiguous、outputCues 空）逐欄不變。確認後 B-X kind=manual；A 返回 residual graph，A-Y/A-Z 並列為 3/5 tie ambiguous，故 A 仍可見於 review 且沒有被丟失。後續重算不覆蓋固定 B-X。所有 cue 最終各只出現一次，沒有遍歷順序決勝。
31. Main M=[0,1000)、Secondary S=[0,400) 的 IoU=2/5，初始為兩個 unmatched standalone cue。選擇手動配對須顯示精確 2/5、低於 1/2 警告及確認按鈕；Cancel 完全維持原 ready Result 與兩個 standalone outputCues。確認後一次建立 kind=manual-override match，輸出一個 M 時間軸雙行 cue；此固定手動配對不被後續 residual graph 重算取代。
32. Main A=[0,1000)／Secondary X=[0,1000) 初始為 ready 的 automatic match。從該結果列選「保留 A 分開」時，先確認將移除 A-X 並釋出 X；Cancel 後 analysis 完全不變。確認後 A 進 keptSeparateMain，X 回 residual graph 並重分類為 unmatched standalone；ready 輸出 A、X 各一個獨立單行 cue，沒有 cue 遺失或重複。已固定 keptSeparateMain 不會由下一次 matching 重算配回 X。

## 命令與證據

Node.js 24、Windows PowerShell，於工具目錄執行：

    node --version
    node --test
    node scripts/check.mjs
    node scripts/build.mjs

不執行 npm install、不啟動網站、不使用瀏覽器。交付紀錄須逐條記錄命令退出碼及失敗輸出摘要；所有命令使用合成 SRT，不讀取使用者實際字幕。M1 若無可用 Node 24，列為 BLOCKED 並說明，不以其他版本冒充通過。


---

## 原文件 TASKS.md

# 實作任務：雙語字幕合併

僅供 M1 candidate；每個任務在本資料夾允許的實作路徑內完成。Node.js 24 ESM、內建模組與瀏覽器原生 API；不 npm install、不新增 runtime dependency、不連網、不開 browser、不部署。M2 公開 GitHub 與 deploy 需主代理另行安排。

## T00 — Scaffold

- 建立 package.json scripts: dev、test、check、build；不定義 dependencies。
- 建立 docs 已列出的 public、scripts、test、dist 結構及 .gitignore。
- server 使用 Node built-in http，只綁 127.0.0.1:4230，只供本機 public 靜態檔；本任務不啟動 server。build 複製 public 到 dist 並確認 noindex。
- 建立繁中 /index.html 與英文 /en/index.html 兩份獨立頁，普通 anchor 切換，連結旁有未匯出資料遺失提醒；不得補跨頁狀態保存。
- 完成 node scripts/check.mjs 的離線靜態結構檢查。

## T10 — Parser 與精確 matching core

- 按 TECHNICAL.md 實作 UTF-8 SRT strict parser、timestamp 毫秒轉換與序列化。
- 實作 half-open interval intersection/union、BigInt 精確 ratio comparison、候選與互為唯一最佳分類。
- 僅保留至多 50,000 eligible edges；第 50,001 條即整批 CANDIDATE_LIMIT、停止建構、零 partial result，pair scan 每 1,024 次檢查取消。
- 保留人工歧義候選的排序穩定性；禁止浮點 tie 判斷。
- 寫 parser、IoU、matching、serialization 合成資料測試，涵蓋 ACCEPTANCE.md 1–18、28，含不同IoU競爭、equal-best collision 與 50k/50,001 edge 界線。

## T20 — Job 與取消

- 建 merge worker 的 jobId/epoch 狀態、進度、cancel、stale message 過濾與來源變更清理。
- 合併時維持來源 cue index，Result 明列 automatic/manual matches、帶 reasons 的 ambiguous edges、current residual no-edge unmatched 與 kept-separate；review 時不產生 SRT。每次決策只在排除 fixed manual pairs/kept-separate cues 的 full residual graph 重算；取代 automatic pair 需確認、釋出對端重新參與分類；低於門檻的 manual override 需顯示精確 IoU 二次確認。
- 寫 worker-state 測試覆蓋取消、延遲事件、重跑、review gate、keep-separate standalone 保留、automatic pair replacement、manual override 確認/取消、取消確認零狀態變更、released cue 重返圖內、fixed decisions 不被重算覆蓋與 no auto-expiry；涵蓋 ACCEPTANCE.md 19–27、29–32。

## T30 — 可操作雙語 UI

- 提供雙檔選擇、檔案大小／解析狀態、明確開始、取消、清除、配對摘要、歧義及未配對逐列人工選擇；取代自動配對或低於 IoU 門檻時顯示精確確認內容，Cancel 不改 Result。
- 依既定主時間軸輸出預覽；排除任一句都需逐句選擇並確認；低門檻人工配對要再次確認。
- 下載 SRT 前顯示輸出 cue 數與排除數；keep-separate cue 以獨立字幕列輸出，來源改動使結果清除，沒有逾時清除。
- 使用 textContent、安全的 DOM API、關聯 label/error、鍵盤可用、320px 單欄與桌面雙區；不將字幕字串當 HTML。
- 確認中英文兩頁提供對等操作與精確 FAQ、title、description、H1、noindex。

## T40 — Wrap-up 與 M1 驗證

- 按 ACCEPTANCE.md 對最終內容執行 node --version、node --test、node scripts/check.mjs、node scripts/build.mjs，記錄真實輸出與退出碼。
- 修復範圍內問題後重跑受影響的命令；確認 dist 只含靜態檔，git diff 只限允許路徑，source tree 沒有 npm lockfile、credential、使用者資料或 build cache。
- 將真實瀏覽器互動狀態記為 NOT_RUN_USER_FOCUS_INCIDENT；不要開 browser 或宣稱瀏覽器驗收完成。
- 更新 HANDOFF 與 TASK-ENTRY/evidence/m1 由主代理管理；spec 六份不得改寫。
- 停在 M1 candidate。不得建立公開 GitHub repository、push、設定 hosting 或部署；等待主代理後續 milestone 授權與 review。

