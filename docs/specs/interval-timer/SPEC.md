# 間歇計時器 / Interval Timer

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-interval-timer-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

做間歇訓練的人要先把一整份多段節目算清楚：準備幾秒、每回合運動與休息幾秒、共幾回合、最後一回合後是否再休息、總共多久，並逐段核對節目表；開始後則需要一個不會因暫停而偷走時間、段界判定不含糊的計時核心。本工具先以純函數產生逐段節目表與總時長，再以同一份節目表驅動只吃「活動毫秒數」的狀態機核心。

- 桌面。教練或使用者在訓練前編好節目，核對完整段表與總時長，下載節目摘要留存或分享。
- 行動。手機立在墊子旁，使用者只看目前段的大字剩餘秒數與段名，聽提示音辨識段界，暫停去喝水時計時不前進。

使用情境為設計假設。資料只保留在目前頁面草稿。

## scope

MVP 必做：四個整數欄位（準備秒數、運動秒數、休息秒數、回合數）與一個最後一回合休息選項；純核心 `run(input)` 驗證並產生段表（零長度段省略）與總時長；純狀態機核心（startSession／applyEvent／snapshot）以活動毫秒數推進段落、輸出顯示快照與 cue 事件；雙語靜態頁呈現節目表、計時畫面與報告下載。

非目標：實際合成或播放聲音、震動、系統通知（皆為 controller 依 cue 事件自行決定，核心不碰音訊與裝置 API）；背景執行、鎖屏或休眠下仍精確計時的保證（controller 以時間戳重算可降低漂移，但 OS 節流不在本工具承諾內）；訓練紀錄、歷史、預設節目庫、帳號、雲端同步、跨分頁同步；以真實時鐘直接驅動核心（核心永遠不讀時鐘，只吃 controller 供給的活動毫秒數）。

資料與性能界線：段數上限 199（1 準備 + 99 運動 + 99 休息），總時長上限 716,400 秒；全部運算為安全整數毫秒／秒，無浮點與捨入（顯示 ceil 除外，規則釘於 inputsOutputs）。核心不依賴主機時區、locale 或系統時間。

已比對本 repo 既有 specs 與 sources/legacy，最相近者的實質差異如下。

- legacy `focus-timer`（sources/legacy/focus-timer，已讀 README 與 public/js/core/timer.mjs）：**單段**倒數，1–180 分鐘，只有 ready／running／paused／completed 與開始、暫停、繼續、取消；無段表、無回合、無段界事件。本工具是**多段節目**：核心先產出逐段表（段序、種類、回合、起訖），狀態機沿段表推進並在每段開始與節目結束發 cue 事件；輸入單位為秒且含準備段與每回合休息段。
- legacy `metronome`：連續等距拍點產生器，無段落結構、回合數與總時長／結束概念。本工具的段長可各不相同（準備／運動／休息三種），且節目有限必結束。
- `docs/specs/` 內無 interval、tabata、hiit 或多段計時規格（作者於 checkout 逐目錄核對）。

判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「節目設定：準備、運動、休息秒數與回合數 / Program: prepare, work and rest seconds, and rounds」
- 欄位或說明「最後一回合休息 / Rest after the final round」（選項：不含 / Skip、含 / Include）
- 「建立節目表 / Build program」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例（`tabata-classic`），明示範例並等待手動執行。
- 「節目表與總時長 / Segment schedule and total time」先摘要（總時長、段數、回合數）再逐段列細節，長表在有 label 的區域捲動。成功才顯示「下載報告 / Download report」。文字可手動選取。
- 節目表建立成功後，同頁出現計時面板：目前段種類與回合、大字剩餘秒數、節目總剩餘秒數，以及「開始 / Start」「暫停 / Pause」「繼續 / Resume」「跳過本段 / Skip segment」「重設計時 / Reset timer」操作（可用性依核心階段，見 inputsOutputs 的階段表）。計時中修改任一節目輸入會依 dirty 規則作廢節目表**與**進行中的計時（核心 session 直接丟棄），不保留半套狀態。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果、下載與計時 session。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告與節目表對應目前快照，計時面板處於 ready 階段。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"prepareSeconds":"10","workSeconds":"30","restSeconds":"10","rounds":"8","finalRest":"skip"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

計時面板的階段（ready／running／paused／finished）與上述頁面狀態是兩層：頁面在 success 期間以核心 snapshot 的 phase 呈現計時階段；段切換時以 polite aria-live 播報段名與回合，剩餘秒數每秒更新但不逐秒播報。

## inputsOutputs

### 節目輸入與 `run(input)`

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。

- 欄位順序固定：prepareSeconds、workSeconds、restSeconds、rounds、finalRest。前四者為 ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 每欄最多 8 單位（UTF-16 code units）。範圍：prepareSeconds 0–3,600、workSeconds 1–3,600、restSeconds 0–3,600、rounds 1–99。finalRest 為列舉字串，僅接受恰好 `include` 或 `skip`（小寫、區分大小寫），raw 最多 8 單位。
- 預設 prepareSeconds 10、workSeconds 30、restSeconds 10、rounds 8、finalRest skip。

驗證順序：先 SCHEMA（整體形狀），再依欄位順序逐欄：容量 INPUT_LIMIT、未成對 surrogate UNICODE、缺內容 EMPTY、文法（整數欄 INTEGER_FORMAT、finalRest 為 ENUM）、範圍 RANGE。整份失敗回 `{ok:false,error:{code,field,row}}`，row 恆為 null。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

result 形狀固定為 `{program, segments, segmentCount, totalSeconds}`：

- `program`：解析後的值 `{prepareSeconds, workSeconds, restSeconds, rounds}`（數字）與 `finalRest`（字串），原樣回顯。
- `segments`：逐段陣列，每段 `{index, kind, round, startSeconds, durationSeconds, endSeconds}`。index 為 0 起段序；kind 為 `prepare`／`work`／`rest`；round 為該段所屬回合（1 起；rest 段的 round 是它所跟隨的那一回合；prepare 段為 null）；startSeconds 為自節目開始的累積秒數；endSeconds = startSeconds + durationSeconds。
- 段的產生順序：先 prepare 段（若 prepareSeconds > 0），再對 k = 1..rounds 依序產生 work 段（第 k 回合）與 rest 段（第 k 回合，僅當 restSeconds > 0 且（k < rounds 或 finalRest 為 include））。**零長度段一律省略**：prepareSeconds = 0 不產 prepare 段、restSeconds = 0 不產任何 rest 段。
- `totalSeconds` = prepareSeconds + rounds × workSeconds + rests × restSeconds，其中 rests = (finalRest 為 include ? rounds : rounds − 1)；亦等於最後一段的 endSeconds（無段落不可能發生，因 workSeconds ≥ 1 且 rounds ≥ 1）。`segmentCount` = segments 長度（上限 199）。

固定下載 `interval-timer-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。機器值不隨 locale 改。

### 狀態機核心

以一份成功 result 建立 session：`startSession(result)` 回傳不透明 session 值；`applyEvent(session, event)` 回傳 `{session, cues}`（session 不可變，舊值不被修改）；`snapshot(session)` 回傳顯示快照。核心不讀時鐘、不設任何計時器；時間只來自事件攜帶的活動毫秒數。段界以毫秒計：段 i 的 startMs = startSeconds × 1000、endMs = endSeconds × 1000；totalMs = totalSeconds × 1000。

事件（普通物件，type 為字串）：

- `{type:"start"}`、`{type:"resume"}`、`{type:"skip"}`、`{type:"reset"}`：無其他欄位。
- `{type:"tick", elapsedMs}`、`{type:"pause", elapsedMs}`：elapsedMs 為 controller 供給的**活動毫秒數**（自 start 起算、已扣除暫停期間的累積進行時間，見 implementation 的 controller 契約），須為 0 以上的安全整數（number）；型別不符、非整數、負數或不安全整數的事件整件忽略（session 不變、cues 為空陣列）。未知 type 同樣整件忽略。

session 內部至少持有：phase（`ready`／`running`／`paused`／`finished`）、activeElapsedMs（已消耗的活動毫秒數，0 ≤ activeElapsedMs ≤ totalMs）、與 result 的不可變參照。位置函數 locate(E)：E ≥ totalMs 時為 finished 位置；否則取唯一滿足 startMs ≤ E < endMs 的段 i。**段界恰等於某段 endMs 時屬於下一段**（下一段 startMs 與之相等且 E < 其 endMs），且該段剩餘為完整段長。顯示剩餘一律 ceil：segmentRemainingSeconds = ceil((endMs − E)/1000)，totalRemainingSeconds = ceil((totalMs − E)/1000)；段內剩餘毫秒恆 > 0，故段內顯示永不為 0、不會提前顯示 0。ready 階段 totalRemainingSeconds = totalSeconds（恰整除）；finished 階段為 0。

snapshot 形狀固定：`{phase, segmentIndex, kind, round, segmentRemainingSeconds, totalRemainingSeconds, activeElapsedMs}`。ready 與 finished 時 segmentIndex、kind、round、segmentRemainingSeconds 為 null；其餘階段為目前段的值（round 比照段表，prepare 段為 null）。

cue 事件（applyEvent 回傳的 cues 陣列，只含本次轉換新發出的）：`{type:"segmentStart", segmentIndex, kind, round}` 與 `{type:"programEnd"}`，形狀恰如所列、無多餘欄位。一次 tick 跨越多個段界時，只為**最終落點段**發一筆 segmentStart，中間段不補發。

轉換表（未列出的組
...[truncated 8188 chars]