# 多軌議程衝突檢查 — 既有規格保存

Task ID: `labs-61-agenda-conflicts` · Spec ID: `spec-61-agenda-conflicts`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：多軌議程衝突檢查

狀態：規格，尚未實作。M1 候選頁與 dist 均 `noindex,nofollow`；正式網域與 canonical 待主代理 release 決定。

## 使用者與工作

研討會或校園活動有多個平行軌道，主辦人在公告前要查出共用房間撞期、講者同時出現和講者轉場太短。成功結果是一份完整的 pair 清單、房間/講者行程，以及未指派欄位的明確清單，而不是只檢查相鄰列或顯示一句「沒有問題」。

## MVP 需求

### FR-01：輸入同日議程

- 只檢查單一 civil day、同一民用時區的 `HH:mm` 本地時刻；不輸入時區、不做 DST 或跨日轉換。所有場次 `start`/`end` 為 24 小時制 ASCII `00:00`–`23:59`，且 `end > start`；跨午夜/零長度/無效分鐘拒絕。整數分鐘解析為 `0..1439`，結束 23:59 可用。
- 至少 1、最多 200 場次。每場 `id` 必填且唯一，格式 `[A-Za-z0-9._-]{1,32}`；標題必填 1–160 Unicode scalar。拒絕 C0/C1 controls、未配對 surrogate、U+2028/U+2029。使用者資料保留為文字，不作 markup。
- 可建立 0–20 個房間、0–100 個講者。房間/講者名稱 NFC+trim 後 1–80 Unicode scalar，區分大小寫唯一，拒控制字元。UI 以明確 registry 與選單選取，不靠輸入字串 delimiter 拆人名。
- 每場必須選一個已建房間或明確 `未指派`；講者為 0–5 個已建講者。0 講者顯示 `講者未指派`，不被當成「已檢查且沒有講者衝突」。每場房間未指派顯示 `房間未指派`。
- `transitionMinutes` 全活動共用，整數 0–120，預設 10 並在輸入區明示。更改值需重新分析。

### FR-02：衝突與轉場定義

- 時間使用半開區間 `[start,end)`；交集條件為 `max(startA,startB) < min(endA,endB)`。剛好前一場結束/下一場開始相同分鐘不算 overlap。
- 對每個不同 session pair（row index `i<j`）完整比較；不只排序後檢查相鄰場次。若兩場在同一已指派房間且時間重疊，reason 加 `room_overlap`。若兩場有至少一位共同已指派講者且時間重疊，reason 加 `speaker_overlap`。
- Pair 有任一 overlap reason 時輸出一筆 `overlap` error pair，理由集合可能包含上述兩種，講者只列共同者。若同 pair 既共享房間又有多位共同講者仍只輸出一筆；不得按資源或理由重複列該 pair。
- 只有兩場不重疊、共用至少一位講者、兩個房間都已指派且不同時，才檢查轉場。Gap 是較晚場 start − 較早場 end；若 `gap < transitionMinutes` 輸出一筆 `transition_short` warning，列時間方向、所有共同講者、from/to room、gap 和設定值。恰等於設定不警告。兩場 overlap 不得再重覆列轉場警告。
- 同一房間不需換場，兩場不同房間但沒有共同講者亦不做轉場判斷。房間未指派時不能推斷轉場是否可達。
- `transitionMinutes=0` 時非負 gap 不可能小於 0，因此無轉場警告。

### FR-03：全 pair 演算法與不變式

- 每次分析完整列舉所有 `n(n−1)/2` 個無序 pair（n≤200，最多19,900）。過濾需比較原輸入的每一個 `i<j`；排序只供結果顯示，不能取代配對檢查。
- 對每 pair 合併原因與共同講者，先判 overlap，再判 transition；overlap pair 永不追加 transition warning。Pair 結果按原 session row index lexicographic 排序，穩定可重現。
- Room schedule 包含所有已指派該房間的 sessions，按 start 分鐘、end 分鐘、原列序排序；Speaker schedule 同理。未指派場次不從總表消失，並列在 coverage summary。
- 不修改原始場次、沒有自動改排或建議移動時間。工具只指出問題，由主辦人修正來源後重新分析。

### FR-04：未指派與摘要

- 結果頂端分別顯示：overlap error pair 數、轉場 warning pair 數、房間未指派場次 ID、講者未指派場次 ID、已檢查 pair 總數。
- 未指派房間的兩場不會被計作 room-clear；沒有指派講者的場次不會被計作 speaker-clear。若存在未指派欄位，摘要必須說明相應 dimension 未能判定。
- 完全沒有 pair issue 且沒有未指派維度時可顯示「在已填資料中未找到衝突」。如有未指派則顯示「已指派資源未找到衝突；N 場未指派，該資源未能檢查」，禁止單獨顯示「無衝突」。

### FR-05：輸出 schema 與上限

- JSON schema1 的完整例子：`{"schema":"gq.agenda-check","version":1,"settings":{"transitionMinutes":10},"coverage":{"checkedPairs":1,"roomUnassignedSessionIds":[],"speakerUnassignedSessionIds":[]},"sessions":[{"id":"A","title":"開場","room":"Room 1","speakers":["Alex"],"startMinute":540,"endMinute":600},{"id":"B","title":"問答","room":"Room 1","speakers":["Blair"],"startMinute":570,"endMinute":630}],"overlapPairs":[{"sessionIds":["A","B"],"reasons":["room_overlap"],"sharedSpeakers":[]}],"transitionWarnings":[],"roomSchedules":[{"room":"Room 1","sessions":[{"id":"A","startMinute":540,"endMinute":600},{"id":"B","startMinute":570,"endMinute":630}]}],"speakerSchedules":[{"speaker":"Alex","sessions":[{"id":"A","startMinute":540,"endMinute":600}]},{"speaker":"Blair","sessions":[{"id":"B","startMinute":570,"endMinute":630}]}]}`。
- JSON sessions 保留輸入 order；pair IDs 按 row index 排；room/speaker schedule entries 依 registry order，其 sessions 按 start/end/input index 排。空維度輸出空陣列，不省略 schema 欄位。room/speaker schedule item structure 和 coverage fields 依 TECHNICAL.md。
- TXT 為可讀修正清單：先 coverage，接著每個 overlap pair（含全部 reasons），每個轉場 pair，最後按房間/講者列時間表。固定檔名 `agenda-conflicts.txt`、`agenda-conflicts.json`；兩檔 UTF-8 合計最多2MiB。超限整批拒絕，不截斷或留舊下載物。

### FR-06：狀態、worker 取消與清理

- 初始空白/編輯狀態沒有衝突結果。按「檢查議程」後，將已驗證資料送入同頁 local module Worker，最多19,900 pair 分批掃描；每批最多512 pair，回報已檢 pairs/總 pairs。顯示真實進度及「取消檢查」。不連網、不載外部 Worker。
- 取消同步 terminate worker、遞增 generation、清 progress/結果/Blob；回到保留來源欄位的編輯狀態。換任何來源值、room/speaker registry、transitionMinutes 或 clear 都先 terminate、generation++、隱藏舊結果及 revocation URLs，再改輸入。
- worker message/error/messageerror 必須 generation 相同才可更新；過期結果不建立 Blob。失敗固定說明「檢查沒有完成；你的輸入仍在」，沒有舊結果。
- Clear/pagehide terminate worker、清 room/speaker/session arrays、結果、Blob references 並 revoke URLs。已由使用者下載的檔案不能由本工具移除。
- 原始資料與結果只在當前頁面記憶體；無 storage、network、API、account、telemetry、console PII、外部日曆或字型。

### FR-07：非目標

不接收多日/跨時區/DST/重複日議程；不自動改排、移動場次、優化休息、解決場地衝突、估算步行時間、安排設備/工作人員或替使用者通知講者。工具不把 unassigned 當作無衝突，也不提供註冊、報名或雲端共編。


---

## 原文件 TECHNICAL.md

# 技術規格：多軌議程衝突檢查

狀態：規格，尚未實作。Node.js 24+ ESM builtins、瀏覽器原生 HTML/CSS/ESM，零依賴；不 npm install、不開 browser。遵循 `docs/ENGINEERING.md`、`docs/PRIVACY-SECURITY.md`、`docs/DESIGN-SYSTEM.md`。

## 檔案樹與 core API

```text
package.json
.gitignore
public/index.html
public/en/index.html
public/styles/app.css
public/js/app.js
public/js/conflict-worker.js
public/js/core/validate.mjs
public/js/core/analyse.mjs
public/js/core/output.mjs
scripts/check.mjs
scripts/build.mjs
scripts/serve.mjs
test/validate.test.mjs
test/analyse.test.mjs
test/output.test.mjs
dist/                          # preview noindex
```

```js
validateAgenda(raw) -> { ok, agenda, errors }
toMinuteOfDay(hhmm) -> integer | TimeError
analysePair(a, b, transitionMinutes) -> null | OverlapPair | TransitionWarning
createPairJobs(agenda) -> iterator of all [i,j], 0<=i<j<n
aggregateAgenda(agenda, pairResults) -> { conflicts, warnings, resourceSchedules, coverage }
serializeAgendaReport(result, { maxBytes: 2097152 }) -> pair | OUTPUT_LIMIT
```

`analysePair` 必須先算 overlap；有 overlap 原因便回一個 overlap object（room/speaker reasons 合併），不再計 transition。若無 overlap 才查同講者、兩房已指派且不同、gap小於門檻。核心純函式只用整數分鐘和已驗證 registry indexes，不依賴時區、DOM、網路、storage、時間或隨機值。

## Input validation

- `hhmm` regex `^(?:[01][0-9]|2[0-3]):[0-5][0-9]$`; exact `HH:mm` 轉 `hour*60+minute`。Reject `24:00`, `9:00`, `09:60`, blank. End must be strictly greater than start; no midnight wrap.
- 1–200 sessions; session ID unique pattern, title 1–160 scalar. Registry rooms0–20, speakers0–100; names NFC+trim+unique exact/case-sensitive; refer to registry by bounded integer index. Session room index null means unassigned, else valid room index; speakerIndexes distinct length0–5 and each valid. Empty list means speakers unassigned.
- `transitionMinutes` integer 0–120, default 10 only when raw field omitted; malformed values reject. Counts and strings preflight before allocating pair/result arrays. Reject unpaired surrogate, C0/C1 controls, and U+2028/U+2029 line separators in all names/titles/IDs.
- Duplicate session IDs, registry names, duplicate speaker assignment in a session, out-of-range indexes, malformed time/date, invalid title, 201+ sessions, 21+ rooms, 101+ speakers, 6+ speakers/session all block entire analysis. No invalid row dropped.

## Pair scan: complete, deterministic, no duplicates

For `i=0..n-2` and `j=i+1..n-1`, examine each pair exactly once. Maximum `200*199/2=19,900`:

1. `overlap = max(a.start,b.start) < min(a.end,b.end)`; touching endpoints are not overlap.
2. If overlap, create `reasons=[]`. Add `room_overlap` iff both `roomIndex!==null && equal`. Compute intersection of speaker indexes once; if length>0 add `speaker_overlap`. If `reasons.length>0`, append one object for this pair with reasons in fixed order `[room_overlap,speaker_overlap]` and all shared speaker names; do not emit transition warning.
3. If no overlap, shared speakers nonempty, both rooms assigned and unequal, determine chronological `earlier`, `later`; `gap=later.start-earlier.end` (guaranteed >=0). If `gap < transitionMinutes`, append one warning for pair, listing all shared speakers and directed from/to rooms. Equality is sufficient, not short.
4. If a pair has same room but no common speaker and no overlap, no issue. Same speaker/same room nonoverlap has no transition issue. Different room but no shared speaker has no transition issue. Null room/speaker does not mean no conflict; it becomes coverage gap.
5. Output pair order is input nested-loop order; each issue pair has unique canonical `[sessionId_i,sessionId_j]` according to input row index. No pair is multiplied by number of shared speakers/reasons.

Room and speaker agendas sort by startMinute, endMinute, original session index. The full sessions list remains in input order. The worker may process pair batches, but results are joined by stable pair index, not completion order.

## Worker status/cancel/stale

- UI validates synchronously then creates a module worker from local `./conflict-worker.js`, passes a structured clone with generation. Worker processes at most512 pairs then `setTimeout(continueScan,0)` so it can send genuine progress and yield; reports `checkedPairs` actual count and `totalPairs=n(n−1)/2`. Even when a session has no checks because resources are unassigned, pair count is still accounted for.
- Main-thread Cancel calls `terminate()` synchronously, generation++, clears progress/result/downloads. Input mutation does same before changed values can be submitted. Worker errors use fixed code; no raw errors/PII.
- All progress/result messages compare generation; only matching completed scan builds aggregates and serialized report. Any stale/error/OUTPUT_LIMIT deletes partial arrays, no Blob and no old result.
- Clear, replacement input and `pagehide` terminate worker, clear source/result references, revoke Blob URLs. Worker holds only current event records and pair buffers, no persistence.

## Output/toolchain

- Fixed JSON schema `gq.agenda-check/1`: root fields are `schema`, `version`, `settings`, `coverage`, `sessions`, `overlapPairs`, `transitionWarnings`, `roomSchedules`, and `speakerSchedules`. A session has `{id,title,room,speakers,startMinute,endMinute}` with `room` string or null; an overlap pair has `{sessionIds,reasons,sharedSpeakers}`; a transition warning has `{sessionIds,sharedSpeakers,fromRoom,toRoom,gapMinutes,requiredMinutes}`. A room schedule has `{room,sessions:[{id,startMinute,endMinute}]}`; a speaker schedule has `{speaker,sessions:[{id,startMinute,endMinute}]}`. Resource schedule arrays follow registry order; their session arrays sort by startMinute, endMinute, then input row. Coverage has `checkedPairs`, `roomUnassignedSessionIds`, and `speakerUnassignedSessionIds`. All original titles/names are JSON/text content, never HTML. `TextEncoder` counts combined 2 MiB. Exceed cap rejects both files; only a deliberate button click builds `Blob(type='application/json;charset=utf-8'|'text/plain;charset=utf-8')` and an `<a download>` with fixed names.
- UI preview uses safe DOM `textContent` and fixed elements. No arbitrary HTML, external resources, remote fonts, browser storage, network, calendar lookup, account, or analytics.
- Node tests call pure validator/pair core/output. `package.json` private/type=module/engines>=24; `npm test`=`node --test test/*.test.mjs`; check/build/dev via scripts. Dev only `127.0.0.1:4241`, GET/HEAD, exact public routing, 404/405/Host/traversal checks; no SPA fallback. Build closed public allowlist/no symlink/unknown/stale-delete; preview noindex.


---

## 原文件 UX-SEO.md

# 介面與搜尋規格：多軌議程衝突檢查

狀態：規格，尚未實作。Product App 主畫布顯示完整 schedule 及 pair 結果；registry 和 session editor 是窄設定區。M1 noindex，正式網址由主代理確認。

## 雙語頁面文字

### 繁體中文

- `title`: `多軌議程衝突檢查｜Gloss Tools`
- `description`: `檢查同日多軌議程的房間重疊、講者撞期和轉場不足，並查看每房間、每位講者的完整時間表。`
- `H1`: `在發布前找出多軌議程撞期`
- 副標：`完整比對場次對；未指派房間或講者會清楚列出，避免誤以為已檢查。`
- 主按鈕：`檢查議程`；執行中：`正在檢查已填資源…`；副按鈕：`取消檢查`。
- 提示：`時間採同一天、同一民用時區的本地時間；不接受跨午夜場次。`

FAQ：

1. **相接的兩場算重疊嗎？** 不算。若一場在 10:00 結束、下一場在 10:00 開始，時間區間相接但沒有共同分鐘。
2. **空白房間或講者會怎麼顯示？** 標成未指派；該資源的衝突不能判定，不會當作「沒有衝突」。
3. **轉場警告會和講者撞期重複出現嗎？** 不會。同一對重疊場次只列一筆錯誤原因；只有不重疊、共用講者且換房 gap 小於設定時才有轉場警告。

### English

- `title`: `Multi-Track Agenda Conflict Checker | Gloss Tools`
- `description`: `Check a single-day multi-track agenda for room overlaps, speaker clashes, and short room transitions, with room and speaker schedules.`
- `H1`: `Find multi-track schedule clashes before publishing`
- Supporting text: `Compare every session pair. Unassigned rooms or speakers stay visible so they are not mistaken for checked.`
- Primary action: `Check agenda`; running: `Checking assigned resources…`; secondary: `Cancel check`.
- Notice: `Times use one local civil day and time zone. Sessions cannot cross midnight.`

FAQ:

1. **Do back-to-back sessions count as overlapping?** No. If one ends at 10:00 and the next starts at 10:00, their half-open intervals do not share a minute.
2. **What happens when a room or speaker is blank?** It is marked unassigned. Conflicts for that resource cannot be determined; the tool does not report it as conflict-free.
3. **Will a transition warning duplicate a speaker clash?** No. An overlapping pair appears once with all error reasons. A transition warning is only for a non-overlapping pair with a shared speaker and a gap below the configured threshold.

## 工作區線框

桌面圖以假資料示意一次檢查完成的結果；手機圖示意編輯狀態。實際初始頁面保持空白，不預載這些場次或衝突。

Desktop：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 多軌議程衝突檢查 / Agenda checker      檢查完成 · 3/3 pairs 語言切換│
├────────────────────────────┬─────────────────────────────────────────┤
│ 設定與場次（約 40%）       │ 檢查結果（主畫布，約60%）               │
│ 轉場 [10] 分鐘              │ 1 組重疊錯誤 · 1 組轉場提醒             │
│ 房間：R1 / R2               │ 房間未指派：無   講者未指派：無         │
│ 講者：S / T                 │                                          │
│ ID 名稱 房間 講者 起 迄    │ 重疊  A ↔ B  房間                     │
│ A 開場 R1   S   09:00 10:00│ 轉場  A → C  S · R1→R2 · gap 5/10 min│
│ B 講題 R1   T   09:30 10:00│                                          │
│ C 問答 R2   S   10:05 11:00│                                          │
│ [+ 加場次]                  │ [依房間] [依講者] [完整場次]            │
│ [檢查議程] [取消檢查]       │ [下載 TXT] [下載 JSON]                  │
└────────────────────────────┴─────────────────────────────────────────┘
```

Mobile（顯式 tabs 進入資料或結果，場次每列改直向表單）：

```text
┌──────────────────────────────┐
│ 多軌議程衝突檢查   語言切換│
│ [場次與資源] [檢查結果]     │
├──────────────────────────────┤
│ 轉場不足門檻 [10] 分鐘      │
│ 房間清單 …                  │
│ 講者清單 …                  │
│ 場次 A · 開場               │
│ 房間 [R1 ▾]                 │
│ 講者 [S ▾]                  │
│ 開始 [09:00] 結束 [10:00]   │
│ [+ 加場次]                  │
│ [檢查議程] / [取消檢查]    │
│                              │
│ 結果頁：摘要/coverage       │
│ 每個錯誤 pair 一條直向項目  │
│ [依房間] [依講者]           │
│ [下載 TXT] [下載 JSON]      │
└──────────────────────────────┘
```

## 狀態、可讀性和錯誤復原

- Idle：空白工作區告訴使用者先建房間/講者，再加場次；無示例假衝突。
- Editing：未分析時顯示「尚未檢查」；改任何來源欄位同步撤下舊結果/download。
- Checking：顯示 `checkedPairs / totalPairs` 實際數字與 Cancel；未完成不發布部分 findings。
- Results：摘要以 icon+文字+數字顯示 overlap、transition、unassigned coverage。Overlap 有錯誤文字；transition 是 warning；unassigned 在相應資源視圖保留。
- Clear：有內容時確認；清除後 empty。Validation blocked 顯示 session ID/row/field，不把錯誤字串插入 HTML。
- Pair detail 顯示雙方時刻、所有重疊資源或 shared speakers；不按一位講者拆成多條重複 alert。Transition 明示先後順序、gap、要求分鐘、兩個房間。
- 鍵盤順序：轉場→rooms registry→speakers registry→session rows（id/title/room/speakers/start/end）→check/cancel→summary→pair list→resource tabs→download。Select有可見標籤；結果用可導航 headings/list，不用 color-only status。
- 320px 每 session 改直向欄位；pair 清單不排寬矩陣；200% zoom/keyboard/focus/contrast/44px/reduced motion 符合共通規格。

## SEO 與發布

- 路徑候選 `/agenda-check/`、`/agenda-check/en/`；正式網址由主代理 release 核定後再寫 canonical/hreflang/sitemap。
- M1 bilingual pages 互鏈但 `noindex,nofollow`，不把候選 subdomain 說成 production。
- 文案精確限定單日、同一民用時間；不聲稱自動修復、最優行程、步行距離或所有衝突都能判斷。
- Browser worker 真取消、版面、Network/Storage、鍵盤/320px/200% 由隔離 gate 驗；目前記 `NOT_RUN_USER_FOCUS_INCIDENT`，Node tests不算UI PASS。


---

## 原文件 ACCEPTANCE.md

# 驗收規格：多軌議程衝突檢查

狀態：規格，尚未實作。輸入全部使用假場次、房間和講者。所有 pair expected 按 input row index 明列，驗收必測完整 `i<j` pair 列舉，不得以排序相鄰兩場代替。

## 純核心 oracle

| ID | 輸入 / 步驟 | 明確 expected | 關聯 |
|---|---|---|---|
| A01 | A/R1/S 09:00–10:00；B/R1/T 09:30–09:45；門檻10 | 唯一 pair `[A,B]`，`overlapPairs=[{reasons:[room_overlap]}]`；無 speaker overlap、無 transition warning。 | FR-02 |
| A02 | A/R1/S 09:00–10:00；B/R2/S 10:00–11:00；門檻10 | 不算 overlap；gap=0，唯一 pair 為一筆 warning `transition_short`, `fromRoom=R1,toRoom=R2,gapMinutes=0,requiredMinutes=10`。 | FR-02 |
| A03 | A/R1/S 09:00–10:00；B/R1/S 10:00–11:00；門檻10 | 半開區間端點相接，不重疊；同 room不需轉場，conflicts/warnings皆空。 | FR-02 |
| A04 | A/R1/S 09:00–10:00；B/R2/S 10:09–11:00；門檻10 | gap=9，僅一筆 transition warning；若 B 改為10:10，gap恰10則無 warning。 | FR-02 |
| A05 | A/R1/S 09:00–10:00；B/R2/S 09:30–10:30；門檻10 | 同 pair只輸出一筆 `overlap` error，reasons恰 `[speaker_overlap]`，不得另外報轉場不足。 | FR-02 |
| A06 | A/R1/S 09:00–10:00；B/R1/S 09:30–10:30 | 同 pair一筆 overlap item，reasons恰 `[room_overlap,speaker_overlap]`，sharedSpeakers=`[S]`；不按理由/資源重複。 | FR-02 |
| A07 | A/R1/S 09:00–12:00；B/R2/T 10:00–11:00；C/R1/U 11:00–13:00 | Pair順序完整為 A-B、A-C、B-C；只有巢狀 `[A,C]` 是 room_overlap。相鄰檢查 A-B/B-C 會漏案，測試必須抓出。 | FR-03 |
| A08 | A/R1/S,T 09:00–10:00；B/R2/S,T 10:05–11:00；門檻10 | 一筆 transition warning，`sharedSpeakers=[S,T]`、gap5；不依兩個講者重覆成兩筆。 | FR-02/03 |
| A09 | A/room=null/speakers=[] 09–10；B/room=null/speakers=[] 09–10 | 沒有可判定的 overlap pair；coverage 精確列 roomUnassigned `[A,B]` 和 speakerUnassigned `[A,B]`，摘要不能說「無衝突」。 | FR-04 |
| A10 | A/R1/S 09–10；B/room=null/S 10:02–11；門檻10 | speaker已知且共用，gap2；因第二房間 unassigned，既不能算轉場不足，也必須列 B 房間未指派。 | FR-01/02/04 |
| A11 | start=`00:00`, end=`23:59` | 合法，分鐘 `[0,1439)`，最長單日 span 23:59。 | FR-01 |
| A12 | `24:00`,`9:00`,`12:60`,`09:00–09:00`,`23:00–01:00` | 全部拒絕：invalid lexical time、zero duration 或 forbidden overnight；沒有部分分析。 | FR-01 |
| A13 | 201 sessions/21 rooms/101 speakers/每場6 speakers | 逐一超過所對應上限即整份拒絕；200 sessions/20 rooms/100 speakers/5 speakers 接受邊界。 | FR-01 |
| A14 | duplicate session ID; NFC+trim後重複room；同場同speaker index兩次；unknown room index | 每種拒絕整份分析，指出重複/無效 registry reference；不默默去重。 | FR-01 |
| A15 | `transitionMinutes=0`, 0/120/121 | 0和120接受；121/非整數拒絕；0時任何 gap≥0 都沒有 transition warning。 | FR-01/02 |
| A16 | title=`<script>alert(1)</script>`，其他輸入合法 | JSON/TXT保留為文字；預覽以 textContent顯示，不建立 script/HTML。 | FR-01/05 |
| A17 | 產生200場：每場同用R1、無speaker；第i場（i=0..199）開始於自00:00起第i分鐘並於第i+1分鐘結束，ID=`S${i+1}` | 所有200個一分鐘區間首尾相接且不重疊；完整檢查 `200×199/2=19,900` pairs，summary `checkedPairs=19900`，不得只比相鄰或提前縮減pair集合。 | FR-03/06 |
| A18 | JSON/TXT合計恰 2 MiB，再增加1 byte | 恰上限完整建立；多1 byte `OUTPUT_LIMIT`，兩檔皆不下載、不截斷、不保留舊產物。 | FR-05/06 |
| A19 | A/R1/S,T 09:00–12:00；B/R1/S,T 09:30–10:00；C/R2/T 11:00–13:00；門檻10 | Pair順序 A-B、A-C、B-C。A-B恰一筆 `reasons=[room_overlap,speaker_overlap]`,`sharedSpeakers=[S,T]`；A-C恰一筆 `reasons=[speaker_overlap]`,`sharedSpeakers=[T]`；B-C無issue。不得把理由或共同講者拆成重複pair。 | FR-02/03 |
| A20 | worker progress到512 pair後取消，再讓舊 generation結果送達 | terminate同步生效、輸出區清空；晚到 progress/result不改畫面或建 Blob，原始輸入仍保留。 | FR-06 |

## 工具鏈與輸出檢查

Node24+ 執行 `npm test`、`npm run check`、`npm run build`，每個 oracle 以固定 expected、假資料測。對 200 sessions 核 pair count；對相同 pair multi-reason核一筆；序列化 JSON parse 後 schema/排序/coverage和原始 schedule對照。dev只 `127.0.0.1:4241`，offline GET/HEAD、404/405、Host/traversal guards。Node測試不宣稱 Worker/browser 測試通過。

## Browser gate（未執行）

| ID | 檢查 | 預期 | 狀態 |
|---|---|---|---|
| B01 | 真瀏覽器建立 A01/A07、觀察 pair結果/取消 | 巢狀 pair A-C顯示；cancel worker即終止，沒有partial/late結果。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B02 | 320px、200% zoom、鍵盤建 room/speaker/session、切 resource tabs、下載 | 表單直向 reflow，所有欄位/結果/下載可鍵盤操作，focus顯示。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B03 | Network/Storage 面板在分析/清除前後檢視 | 無外部 request、storage、service worker、URL/query資料。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B04 | 真實 browser Worker 取消、re-run、改輸入使 stale | 只顯示當前 generation結果；進度為真實 pair數。 | `NOT_RUN_USER_FOCUS_INCIDENT` |

M1完成條件是純測試與Node工具鏈通過、文件以對照表區分browser未跑項目；Browser gate目前保持 `NOT_RUN_USER_FOCUS_INCIDENT`，不得推論PASS。


---

## 原文件 TASKS.md

# 實作任務：多軌議程衝突檢查

狀態：規格，尚未實作。依序完成。僅限本工具 AGENTS 授權的 package/public/scripts/test/dist/HANDOFF/TASK-ENTRY/evidence 路徑；不能改六份規格、共通 docs、兄弟工具或共享首頁。不安裝、不開 browser、不發布。

## T00 — scaffold

- 前置：讀 AGENTS、六份規格、共通 engineering/privacy/design docs。
- Allowed paths：`package.json`, `.gitignore`, `public/**`, `scripts/**`, `test/**`, `TASK-ENTRY.md`。
- 建 ESM/private/Node>=24 scaffold、雙語 noindex pages、core/worker/test skeleton、check/build/dev scripts；dev `127.0.0.1:4241`。
- 驗收：Node24+，test/check/build/dev命令可實際執行；未先引用不存在腳本。
- 完成：記版本與 exit codes到HANDOFF。

## T01 — validate bounded agenda

- 前置：T00。
- Allowed paths：`public/js/core/validate.mjs`, `test/validate.test.mjs`。
- 嚴格驗 HH:mm/同日區間/registry/name/id/session/resource caps/transition，拒錯誤不刪列；room/speaker refs用index。
- 驗收：A11–A15固定 boundary/invalid cases、duplicate canonical tests。
- 完成：所有 issue有 session/field/code，不帶raw details到log；回寫HANDOFF。

## T02 — pair analysis core

- 前置：T01。
- Allowed paths：`public/js/core/analyse.mjs`, `test/analyse.test.mjs`。
- 列舉每個 `i<j` 一次；先overlap合併理由再轉場判定；stable pair ordering和resource schedules。
- 驗收：A01–A10、A17、A19；特別含 A/B/C巢狀 case，不只比相鄰。
- 完成：多理由pair恰一項；unassigned dimension coverage正確；回寫HANDOFF。

## T03 — safe full JSON/TXT report

- 前置：T02。
- Allowed paths：`public/js/core/output.mjs`, `test/output.test.mjs`。
- 完整 schema1/coverage/room speaker agendas、固定檔名、2MiB combined byte cap；no HTML output。
- 驗收：A16、A18；JSON roundtrip assertions與手寫預期。
- 完成：超限全失敗，無partial artifact；回寫HANDOFF。

## T04 — real worker and direct-manipulation UI

- 前置：T03。
- Allowed paths：`public/js/conflict-worker.js`, `public/js/app.js`, `public/index.html`, `public/en/index.html`, `public/styles/app.css`。
- 建room/speaker registries、session list/table、local module worker 每512 pairs yield+progress、真正terminate cancel；結果畫布顯示 all pair findings / unassigned / room/speaker schedules。
- 驗收：A20 generation/cancel semantics；真實瀏覽器worker保留browser gate，不可用Node偽裝。
- 完成：不自動改排，不遺失資料/結果；回寫HANDOFF。

## T05 — stale handling, cleanup, downloads

- 前置：T04。
- Allowed paths：`public/js/app.js`, `public/js/core/output.mjs`, `test/output.test.mjs`。
- Input mutation/Clear/pagehide先 terminate/generation++/撤舊Blob；成功分析才以固定名稱由按鈕下載；不把資料放URL/storage。
- 驗收：A18、A20，clear/pagehide/retry不復活舊報告。
- 完成：reader/worker/URL引用清理且不宣稱刪除已下載檔；回寫HANDOFF。

## T06 — two-language app and responsive states

- 前置：T04。
- Allowed paths：`public/index.html`, `public/en/index.html`, `public/styles/app.css`, `public/js/app.js`。
- 落實UX-SEO實際title/description/H1/FAQ、desktop主畫布/mobile tabs/直向pair rows/狀態copy與noindex。
- 驗收：320px、200% zoom、keyboard/focus/contrast/reduced-motion由browser gate分開記錄。
- 完成：unassigned/overlap/warning不用顏色單獨表達，不聲稱自動修復；回寫HANDOFF。

## T07 — check/build/dev boundaries

- 前置：T00–T06。
- Allowed paths：`scripts/check.mjs`, `scripts/build.mjs`, `scripts/serve.mjs`, `test/**`, `package.json`, `.gitignore`。
- check必要檔案/ESM/unsafe DOM/external assets；build allowlist拒unknown/symlink/path traversal；dev loopback GET/HEAD/404/405/Host/path guards。
- 驗收：`npm test`, `npm run check`, `npm run build`, offline HTTP；執行長測按global environment fingerprint規則。
- 完成：全部命令 exit codes與環境狀態回寫HANDOFF。

## T08 — M1 acceptance handoff

- 前置：T00–T07。
- Allowed paths：`HANDOFF.md`, `TASK-ENTRY.md`, `evidence/m1/**`。
- 抄錄每個ACCEPTANCE ID結果及證據；Browser/worker/layout/Network/Storage gates保留 `NOT_RUN_USER_FOCUS_INCIDENT`。
- 驗收：最終test/check/build各一次；diff只在允許路徑；不commit/push/deploy。
- 完成：交主代理固定 M1 證據和未跑項，等M2指示。

