# 專案期限倒排 — 既有規格保存

Task ID: `labs-59-project-backplan` · Spec ID: `spec-59-project-backplan`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：專案期限倒排

狀態：規格，尚未實作。M1 候選網頁與 dist 都 `noindex,nofollow`；正式網域和 canonical 待主代理 release 決定。

## 使用者與工作

活動負責人或小型團隊已有固定交件日，但工作彼此依賴，想知道最晚可開始時間、各任務的浮動天數，以及哪些任務會直接影響交件。工具先確定一個可重現的「全案起點」，再顯示完整日程，不會要求使用者任意填開始日期去掩蓋期限缺口。

## MVP 需求

### FR-01：專案日曆

- 必填交件日，ISO `YYYY-MM-DD`，輸入年份 2000–2099，必須是真實 Gregorian 日期。
- 工作週預設週一至週五，可勾選一週七天中的任何非空集合。至少一個星期日型別必須是工作日，否則拒絕。
- 可貼入使用者已確認的休假日期，最多 366 個、輸入年份 2000–2099、日期唯一。重複與無效日期拒絕；落在非工作星期的日期可保留但不額外改計算。沒有外部假日查詢、國家/地區日曆或自動推測休假。
- 若有效截止日不是工作日（週休或明列休假），將其調整至前一個工作日，顯示原截止日、調整後日期與原因。即使調整多日也不能靜默忽略。
- 每天是離散工作日；任務起迄都計工作日，finish 包含當日。依賴任務在最晚前置任務完成後的下一工作日開始。

### FR-02：任務與依賴

- 1–100 項任務。ID 必填、`[A-Za-z0-9._-]{1,32}` 且唯一；名稱必填 1–120 Unicode scalar，拒絕控制字元與行分隔符。ID/名稱不暗中改寫；前置以 ID 多選。
- 工期必填整數 1–260 工作日。表單以 ASCII digit 字串輸入，僅接受 `^[1-9][0-9]*$`，因此表單字串 `2.0` 拒絕；內部已解析的數字只在 `Number.isSafeInteger` 且範圍有效時接受。若 JSON lexer 已把數字字面 `2.0` 解析成 JS number `2`，它與 `2` 無法再區分並視為整數 2；M1 沒有 JSON 匯入介面。每個依賴關係從 predecessor 指向 successor；最多 500 條。未知 ID、相同前置重複、超量/錯型態拒絕。自我依賴保留為明確循環錯誤，不能當成一般順序。
- DAG cycle 時不輸出任何日期；列出一條或多條實際 cycle path（包含回到起點的閉環），而非把所有後續受阻 task 錯稱為 cycle。
- 最長鏈長 `D` 是 DAG 任一路徑上的工期總和最大值，包含路徑上的每項工作日工期。彼此獨立的根任務仍全部從同一個起點開始。

### FR-03：無開始日期的起點規則

全案沒有開始日期輸入欄位。先把截止日正規化為工作日，再取「倒數第 D 個工作日」作全案起點：截止日若是工作日算第 1 天，往前再數 D−1 個工作日。這和把截止日當作結束日、工期含起日的規則一致。

固定 oracle：週一至五、無假日，截止日 2026-10-23（週五），A=2日、B=3日且 B 依賴 A，D=5；全案起點為週一 2026-10-19，而非 10-16。A ES/EF=10-19/10-20；B=10-21/10-23。

### FR-04：Forward pass 與 backward pass

1. **Forward ES/EF**：所有根 task 的 ES 都等於全案起點。非根 task ES 為前置 tasks EF 中最晚日期的下一個工作日。EF 為 ES 起算、含 ES 在內的第 `duration` 個工作日。
2. **Backward LS/LF**：所有 sink tasks 的 LF 都等於正規化交件日。LS 為以 LF 為第 1 天往前數 duration 個工作日。對有 successor 的 task，LF 是所有 successor LS 中最早日期的前一個工作日；LS 同樣由 LF 往前倒數含 LF 的 duration 個工作日。
3. **Slack**：`workdayIndex(LS) − workdayIndex(ES)`，即可延後的工作日數，ES=LS 時為 0。零 slack task 列入一個或多個關鍵路徑集合。任何 task LS 早於 ES 代表內部計算錯誤，拒絕完整輸出。
4. Deadline 是全案終點上界，不保證每項任務都正好在 deadline 完成。與最長路徑較短的獨立支線會得到正 slack；所有根 task 的 ES 仍相同。

### FR-05：結果、匯出與錯誤

- 主畫布表格每列顯示 ID/名稱、工期、前置 ID、ES、EF、LS、LF、Slack、關鍵標記；日期在本機時區之外以日期字串展示，不做轉換。另有項目數、D、計算起點、原/正規化 deadline 及調整說明。
- JSON schema 1：`{"schema":"gq.backplan","version":1,"settings":{"deadline":"2026-10-23","effectiveDeadline":"2026-10-23","deadlineAdjusted":false,"workweek":[1,2,3,4,5],"holidays":[]},"anchor":"2026-10-19","longestPathWorkdays":5,"tasks":[{"id":"A","name":"準備","durationWorkdays":2,"predecessors":[],"ES":"2026-10-19","EF":"2026-10-20","LS":"2026-10-19","LF":"2026-10-20","slackWorkdays":0,"critical":true}],"criticalTaskIds":["A"]}`。日期均為 ISO civil date；工作日 0=Sunday 至 6=Saturday。
- TXT 以明確欄名輸出同一完整表格。固定檔名 `project-backplan.txt`、`project-backplan.json`，UTF-8 bytes 合計上限 2 MiB；超限整批不建立下載。
- 任何輸入/圖錯誤、cycle、超限或內部結果違反依賴/期限時，不輸出部分計畫或沿用舊成功結果。錯誤指到欄位、ID或 cycle path，並保留使用者可修正的草稿。

### FR-06：工作量與取消

- 規模 100 tasks/500 dependencies/260 workdays/task；最長路徑 26,000 workdays。日曆可跨入輸入年份範圍外的計算起始年；按上限，最早日期仍落在 1400 年後。所有日期使用 proleptic Gregorian civil arithmetic，不因 JS `Date` 的 0–99 年慣例誤算。
- 建置依賴 DAG、倒算工作日、forward/backward 結果在可終止 Worker 執行；UI 顯示實際進度（已走訪日期/任務階段）及「取消計算」。按取消立刻 terminate 該 Worker 並清除該 generation；不得同步算完才顯示取消成功。
- 修改來源、重設或重新計算前遞增 generation，取消目前 worker、撤下產物；晚到的 message/error 不得更新 UI。Worker 若錯誤或非預期死亡，顯示固定失敗訊息與重試方式，沒有舊結果。

### FR-07：記憶體、隱私與非目標

- 任務、日曆、worker payload 與結果僅存在目前頁面記憶體，不使用 storage/URL/query/網路/API/帳號/telemetry/console 記錄，也不載外部資源。
- 清除、取消、來源改動、`pagehide` terminate worker、清除引用、revoke 產物 Blob URL。無法保證清除瀏覽器程序記憶體或已下載檔。
- 不做人力/成本/資源容量、依賴自動推論、任務分割、工時/曆日推算、風險預測、法律或金融判斷，也不連外取得工作日曆。


---

## 原文件 TECHNICAL.md

# 技術規格：專案期限倒排

狀態：規格，尚未實作。Node.js 24+ ESM/內建模組與原生 HTML/CSS/browser ESM，零套件、不安裝依賴、不開 browser。遵循 `docs/ENGINEERING.md`、`docs/PRIVACY-SECURITY.md`、`docs/DESIGN-SYSTEM.md`。

## 檔案樹

```text
package.json
.gitignore
public/index.html
public/en/index.html
public/styles/app.css
public/js/app.js
public/js/planner-worker.js
public/js/core/validate.mjs
public/js/core/graph.mjs
public/js/core/calendar.mjs
public/js/core/backplan.mjs
public/js/core/output.mjs
scripts/check.mjs
scripts/build.mjs
scripts/serve.mjs
test/validate.test.mjs
test/graph.test.mjs
test/calendar.test.mjs
test/backplan.test.mjs
test/output.test.mjs
dist/                        # preview only; noindex
```

## Core interfaces and exact passes

```js
validateProject(raw) -> { ok, input, errors }
findCyclePaths(tasks, edges) -> CyclePath[]
topologicalOrder(tasks, edges) -> TaskId[]
buildWorkdayCalendar(deadline, workweek, holidays, countBack) -> WorkdayIndex
calculateBackplan(validatedInput) -> { anchor, effectiveDeadline, tasks, criticalTaskIds }
serializePlan(plan, { maxBytes: 2097152 }) -> pair | OUTPUT_LIMIT
```

純核心不讀 DOM/network/storage，不用 locale timezone。表單 task duration 先驗 ASCII 數字字串 `^[1-9][0-9]*$` 再轉成整數；內部已解析 number 可用 `Number.isSafeInteger` 檢查。JSON 數字 `2.0` 一旦 parse 成 JS number 2 就無法與 `2` 區別，視為整數 2；M1 不提供 JSON 匯入。驗證先拒不合法資料，再建 adjacency lists；所有 task 以使用者 row order 作 stable tie-break。

### DAG 與 longest path D

1. Build `preds[id]`/`successors[id]`，拒 unknown IDs/duplicate edges，保留 self-edge 到 cycle 檢查。
2. Kahn topo sort，以輸入 row index 當穩定優先順序。若未處理完，對未處理 induced graph 執行 tri-color DFS，輸出實際 `A→B→…→A` cycle path；不把單純 downstream blocked node 標成 cycle。回傳 cycle error 並停止計算。
3. 按 topo order 計 `longestTo[id]=duration[id]+max(longestTo[pred])`，根節點最大值預設0。`D=max(longestTo[id])`；最多26000，整數精確。

### Civil date 與工作日 index

- 輸入 parser 僅接受 `YYYY-MM-DD` 且 year 2000–2099、真實 leap day。weekday 以 UTC/civil integer 算星期索引 0=Sunday，不用本機 timezone。
- 年表輸出使用 proleptic Gregorian day ordinal 和 inverse conversion（支援至少 year 1400–2099），避開 `Date.UTC(0..99)` 特例；輸入年界線仍只有 2000–2099。
- `isWorkday(d) = selectedWeekday(d) && !holidaySet.has(d)`。先從原 deadline 向前逐 civil day 找最近工作日，回傳 `effectiveDeadline` 及調整天數；日曆按日期排序、去重且不查外部假日。
- 為 anchor 從有效 deadline 向前數 D 個工作日，deadline 自身若工作日算第 1 個；第 D 個是 anchor。將 `[anchor,effectiveDeadline]` 內的每個工作日建立 `workdayDates[index]` 與 ordinal→index Map。此區間依建構應恰有 D 個 workdays，assert 不符即 internal error。
- 任務工期映射 `[startIndex, finishIndex]`，finish index `start+duration-1`，後繼 start index `previousFinish+1`。日期以索引取回，未把曆日差錯當工期。

### Forward / backward / slack

```text
for id in topo:
  ESIndex[id] = root ? 0 : max(EFIndex[p] for p in preds[id]) + 1
  EFIndex[id] = ESIndex[id] + duration[id] - 1

for id in reverse(topo):
  LFIndex[id] = sink ? D - 1 : min(LSIndex[s] for s in successors[id]) - 1
  LSIndex[id] = LFIndex[id] - duration[id] + 1
  slack[id] = LSIndex[id] - ESIndex[id]
```

`ESIndex=0` 為全案 anchor，`D-1` 為 effective deadline index。對每個非根 task，`ESIndex = max(EFIndex[pred] for all preds)+1`；等價地，每條 incoming edge 只要求 `ESIndex[successor] >= EFIndex[pred]+1`，只有達到最晚 predecessor 的邊必定等號。多個前置不能要求 successor 緊接每一個較早完成的 predecessor。若任何 index 越界、slack<0、EF>deadline、ES 不等 `max(pred EF)+1`、edge constraint 未滿足或其他內部不變式失敗，拒絕整份結果並回 fixed internal error。日期欄以 ISO civil date 輸出。零 slack task 依 stable topological order 列入 `criticalTaskIds`。

### Worker、cancel、stale

- Worker 接受 exact keys `{type:'calculate', generation, input, locale}`，locale 必填且為 `zh-Hant` 或 `en`，generation 為正安全整數。UI 與離線 protocol 測試都使用此格式；格式不符的非本次請求忽略。先驗一次 payload caps，再同步跑 deterministic core。日期歷程最多約185k civil days（26000 workdays加366 holidays與週間日期），在 worker 不阻塞介面。worker 將已驗證階段訊息（`validate`, `calendar`, `forward`, `backward`, `serialize`）回傳；階段進度只報實際完成量，不計畫百分比假進度。
- UI 每次提交先撤銷舊 Blob URLs、遞增 generation、建立單一 worker；按取消同步呼叫 `worker.terminate()`、清引用和輸出區，狀態回編輯。輸入改動同樣 terminate、generation++、清舊結果。
- `message`、`error`、`messageerror` 都比對 generation；舊結果忽略且不建立 Blob。worker 成功後立刻 terminate/revoke handler；失敗只顯示固定錯誤，不顯示 raw exception。`pagehide` terminate、清引用和 URLs。
- Core Node tests 對 pure functions；真實 browser Worker / terminate gate 分開，不能用 Node 測試宣稱瀏覽器 Worker 已驗證。

### Export and boundaries

- JSON schema 固定 `gq.backplan/1`，TXT 為完整欄名報告。所有 id/name 作文字或 JSON 字串，不輸出 HTML。bytes 以 TextEncoder 統計，兩檔合計 >2 MiB 全部拒絕，固定下載檔名。
- Inputs、worker messages、exports 只記憶體；不寫 log、storage、URL、IndexedDB、service worker；不連外抓工作日曆。
- `package.json` private/type=module/engines >=24；`npm test`=`node --test test/*.test.mjs`; `npm run check/build/dev` 指向 `scripts/*.mjs`。Dev 僅 `127.0.0.1:4239`，GET/HEAD，404/405/Host/traversal guard，只 serve public，不 SPA fallback。build 閉合 allowlist、拒 symlink/junction/unknown/stale、preview noindex。


---

## 原文件 UX-SEO.md

# 介面與搜尋規格：專案期限倒排

狀態：規格，尚未實作。Product App 模式下日程表與關鍵路徑是主畫布；任務依賴和日曆設定緊鄰輸入。正式 URL 由主代理核定，M1 noindex。

## 雙語頁面文字

### 繁體中文

- `title`: `專案期限倒排｜Gloss Tools`
- `description`: `輸入交件日、工作週、休假與任務依賴，計算最早/最晚日期、工作日餘裕和關鍵路徑。`
- `H1`: `從交件日倒排一份可檢查的日程`
- 副標：`先用最長依賴工期決定全案起點，再查看每項工作可延後幾天。`
- 主按鈕：`計算日程`；執行中：`正在計算工作日與依賴…`；取消：`取消計算`。
- 提示：`假日由你輸入；不提供人力容量或資源排程。`

FAQ：

1. **為什麼不用我輸入開始日？** 工具先求出 DAG 最長工期，再由截止日倒數，以該日作為所有根任務的最早起點。
2. **週末或假日截止會怎麼處理？** 截止日向前退到上一個你設定的工作日，並在結果中同時顯示原日期和調整後日期。
3. **關鍵路徑代表一定會延遲嗎？** 不代表。它只標示本模型中 slack 為 0 的工作；不估算人力、風險、任務中斷或其他資源限制。

### English

- `title`: `Deadline Back-Planner | Gloss Tools`
- `description`: `Enter a deadline, workweek, holidays, tasks, and dependencies to calculate early/late dates, workday slack, and the critical path.`
- `H1`: `Work backward from a deadline to a reviewable plan`
- Supporting text: `Use the longest dependency path to set the project anchor, then see how much each task can move.`
- Primary action: `Calculate plan`; running: `Calculating workdays and dependencies…`; cancel: `Cancel calculation`.
- Notice: `You provide the holidays. This tool does not model team capacity or resource constraints.`

FAQ:

1. **Why is there no start-date field?** The tool finds the longest dependency path first, then counts back from the adjusted deadline to set the earliest start for every root task.
2. **What happens when the deadline falls on a weekend or holiday?** It moves to the previous workday in your calendar. The result shows both the entered and adjusted dates.
3. **Does the critical path guarantee a delay?** No. It marks tasks with zero slack under this model. It does not estimate staffing, risk, interruptions, or other resource limits.

## 工作區線框

Desktop：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 專案期限倒排 / Deadline back-planner       狀態：編輯中   語言切換 │
├───────────────────────────┬──────────────────────────────────────────┤
│ 專案設定（左側）          │ 日程表（主畫布）                         │
│ 交件日 [2026-10-23]       │ Anchor 2026-10-19 → Deadline 10-23      │
│ 工作日 ☑一 二 三 四 五     │ ID 任務   工期 ES     EF     LS     LF  │
│ 休假 [日期清單]           │ A  準備    2  10-19  10-20  10-19  10-20│
│                           │ B  審稿    3  10-21  10-23  10-21  10-23│
│ 任務依賴                  │ Slack      0          0  Critical A → B│
│ ID 名稱 工期 前置         │                                          │
│ A  準備  2    —           │ [下載 TXT] [下載 JSON]                  │
│ B  審稿  3    A           │                                          │
│ [+ 加任務]                │                                          │
│ [計算日程] [取消計算]     │                                          │
└───────────────────────────┴──────────────────────────────────────────┘
```

Mobile（設定/結果有標籤頁；操作時可隨時切回）：

```text
┌─────────────────────────────┐
│ 專案期限倒排     語言切換  │
│ [日曆與任務] [日程結果]     │
├─────────────────────────────┤
│ 交件日 ________             │
│ 工作日 [一][二][三][四][五]│
│ 休假日期 …                  │
│ 任務 A / 名稱 / 工期 / 前置 │
│ [+ 加任務]                  │
│ [計算日程]                  │
│                             │
│ 結果頁：anchor/deadline     │
│ 每任務一張直向日期列        │
│ Slack / Critical            │
│ [下載 TXT] [下載 JSON]      │
└─────────────────────────────┘
```

## 真實狀態、操作與可讀性

- 初始：提供一列可編輯任務，不填入虛構案例；截止日空白時按鈕有明確 disabled 理由。
- 編輯：表格編輯原始任務與依賴，不用 drag-only 操作；來源改動立即 stale、撤下載。未計算前不顯示假日程。
- Running：Worker 文字階段和已走訪日期數可觀察；取消按鈕可終止 worker。取消後明確回到編輯，不保留舊結果。
- Success：先顯示 anchor、effective deadline、D，再顯示全部任務表。關鍵任務以文字 `Critical` 和圖示標示，零 slack 數值可直接看見；不只用紅/綠顏色。
- Error/blocked：cycle 將閉環 ID 依序顯示並可定位任務；輸入錯誤有修正方向；worker 失敗可重新計算。前一次結果不可留在旁邊誤導。
- 鍵盤順序：日曆→workweek→holiday→任務 row fields→計算→結果摘要→表格→下載。每列依賴欄以可讀 label 選擇；focus 不因 worker message 失焦。
- 320px 寬表格改成每任務直向數據列；不要求整頁橫向捲動。支援 200% zoom、可見雙層 focus、對比、44px target/reduced motion。

## 搜尋/發布

- 建議路徑 `/backplan/`、`/backplan/en/`；不自行指定正式 domain。
- M1 中英頁互鏈但 `noindex,nofollow`；正式 canonical/hreflang/sitemap 等待主代理 release 確認。
- 不宣稱「專案一定準時」、「AI預測」或最短資源排程；文案清楚標示使用者自填日曆和零 slack 模型限制。
- 真 Worker 取消、browser layout、320px、200% zoom、Network/Storage gate 目前記 `NOT_RUN_USER_FOCUS_INCIDENT`，不以 Node/HTTP 取代。


---

## 原文件 ACCEPTANCE.md

# 驗收規格：專案期限倒排

狀態：規格，尚未實作。核心測試使用固定日期/假任務與手寫 expected。工作日為離散 inclusive 工期；不以曆日差代替工作日 index。瀏覽器 worker 和真 UI gate 分開記錄。

## 純核心 oracle

| ID | 輸入 / 步驟 | 精確 expected | 關聯 |
|---|---|---|---|
| A01 | Mon–Fri、無假日、due 2026-10-23 Fri；A duration2 root，B duration3 predecessor A | D=5、anchor=2026-10-19；A ES/EF/LS/LF=`19/20/19/20`, slack0；B=`21/23/21/23`, slack0；critical `[A,B]`。 | FR-03/04 |
| A02 | Mon–Fri、due 2026-10-23；獨立 roots A=2日、B=4日 | 同一起點 `2026-10-20`；A EF=10-21、LS=10-22、LF=10-23、slack2；B EF/LF=10-23、slack0。 | FR-03/04 |
| A03 | Mon–Fri、due 2026-10-24 Sat，A1日 | deadline 調整為 2026-10-23 Fri，`deadlineAdjusted=true`，anchor=10-23，A ES/EF/LS/LF=10-23，slack0。 | FR-01 |
| A04 | Mon–Fri、due 2026-10-23，holiday=10-23，A2→B2 | effective deadline=10-22 Thu；D4；anchor=10-19 Mon；A 10-19..10-20、B 10-21..10-22；兩者 slack0。 | FR-01/03/04 |
| A05 | Mon/Tue/Wed/Thu/Fri、due 2026-10-23 Fri，A2→B3 | FR-03 固定 oracle：anchor10-19；A10-19..20，B10-21..23。 | FR-03/04 |
| A06 | 工作日僅週二/週四、due 2026-10-23 Fri，單 task A=2日 | effective deadline=10-22 Thu；D2；anchor=10-20 Tue；A ES/EF/LS/LF=10-20/10-22/10-20/10-22，slack0。 | FR-01/03/04 |
| A07 | Mon–Fri、due 10-23、holiday 10-20 Tue，A2→B2 | D4、anchor=10-19；A 10-19..10-21（跳過20）；B 10-22..10-23；全部 slack0。 | FR-01/04 |
| A08 | 有效截止日、D=1，但選定工作週為空集合 | 在日期運算前拒絕 `NO_WORKDAYS`，無 anchor/output。 | FR-01 |
| A09 | DAG `A→B→A`；另試 self-edge `A→A` | 第一例錯誤回實際閉環 `[A,B,A]`；第二例回 `[A,A]`。不開始日期/forward pass、不 loop。 | FR-02 |
| A10 | B predecessor=`MISSING`；另試同一 predecessor 重列兩次 | 各回 unknown-ID / duplicate-edge 錯誤，沒有 plan。 | FR-02 |
| A11 | 100-task chain，每個260工作日，due=2000-01-07，workweek僅週一、無假日 | 接受 D=26000；使用廣域 Gregorian ordinal，anchor 在 year 1500–1504；結果有限、每鄰接 task ES=前任 EF 的下一個 Monday。不得用 year 0–99 Date 特例或 overflow。 | FR-02/03/06 |
| A12 | 101 tasks 或 501 edges；duration string `0`、`261`、`2.0` | 分別拒超任務數、超依賴數、工期邊界/非整數文法；無部分 schedule。 | FR-02 |
| A13 | holiday list 366 個唯一日期與 367 個；另有重複、無效 `2026-02-30`、year1999 | 366 個合法日期接受；367/重複/不存在日/輸入年份範圍外拒絕。 | FR-01 |
| A14 | 兩任務 A2→B3、deadline Fri；把一個task名設為 `<script>alert(1)</script>` | 日期照常；TXT/JSON 只含文字/JSON-escaped string，沒有 HTML renderer 或可執行內容。 | FR-02/05 |
| A15 | plan 經序列化合計剛 2 MiB，再增加 1 byte | 2 MiB 成功；超 1 byte 兩份都拒絕、不截斷、不保留前次 Blob。 | FR-05 |
| A16 | 一個已完成 task ES=LS | `slackWorkdays=0`,`critical=true`；其他正 slack task 不進 critical IDs。 | FR-04 |
| A17 | deadline=2000-01-01，但在限制 366 holiday 與指定 workweek 下退至最近工作日 | 有效日必須是截止日之前或當日最接近的實際工作日；JSON 顯示原/調整日期及 day delta，不可靜默延後 deadline。 | FR-01 |
| A18 | 兩條支線：A1→B1 與 C1，Mon–Fri、due Fri2026-10-23 | D=2，anchor=10-22 Thu；A/B 對鏈全 slack0；根 C 的 ES=10-22，EF=10-22、LS=10-23、LF=10-23、slack1。全部 roots 同 anchor。 | FR-03/04 |
| A19 | A duration2、B duration5 均為 roots，C duration1 且依賴 A、B；Mon–Fri、due 2026-10-23 | D=6、anchor=10-16 Fri；A ES/EF=`10-16/10-19`, LS/LF=`10-21/10-22`, slack3；B ES/EF=`10-16/10-22`, LS/LF=`10-16/10-22`, slack0；C ES/EF/LS/LF=`10-23`, slack0。C ES 等於 max(A EF,B EF) 下一工作日；A 的較早 EF 不要求 C 緊接 A。critical `[B,C]`。 | FR-03/04 |
| A20 | 表單 duration string `2.0`；再以 core API 提供 number literal `2.0` | 表單字串因 decimal punctuation 拒絕；JS number literal 已等於 number `2`，通過 `Number.isSafeInteger` 並按 2 工作日處理。不可聲稱可辨識 parse 前的 JSON 數字字面形式。 | FR-02 |

## 工具鏈與 worker 邊界

Node 24+ 執行 `npm test`、`npm run check`、`npm run build`；每條記錄版本與 exit code。測試包含 A01–A18 的 fixed expected 及純核心 cycle/calendar/property invariants。`npm run dev` 只綁 `127.0.0.1:4239`；以 offline HTTP 測 GET/HEAD、404、405、Host/path traversal guard。browser Worker 在這些 Node 命令中不算已驗證。

## 瀏覽器手動驗收（目前未執行）

| ID | 步驟 | 預期 | 狀態 |
|---|---|---|---|
| B01 | 建立100-task/26k-day 計畫，計算時取消，之後再算成功 | Worker 真正終止；取消後無舊結果，重跑只顯示新 generation；progress 是實際階段。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B02 | 輸入 cycle 後計算 | 顯示實際閉環 IDs 並保留可編輯草稿；無日期表。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B03 | 320px、200% zoom、鍵盤完成日曆/任務/依賴/結果/下載 | 所有欄位、結果欄位和操作可到達、無頁面水平裁切、focus 可見。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B04 | 瀏覽器 Network/Storage 面板觀察計算、取消和清除 | 無外部 request、storage、service worker 或輸入在 URL/query。 | `NOT_RUN_USER_FOCUS_INCIDENT` |

M1 完成條件是核心與 Node 工具鏈通過且 diff 只在授權路徑。Browser gate 受 focus incident 阻擋時保持 NOT_RUN，不得宣稱整體 browser PASS。


---

## 原文件 TASKS.md

# 實作任務：專案期限倒排

狀態：規格，尚未實作。一次依序一項。所有更動只限本工具 `AGENTS.md` 允許的 package/public/scripts/test/dist/HANDOFF/TASK-ENTRY/evidence 路徑。不可修改六份規格或共通契約，不安裝套件、不開 browser、不發布。

## T00 — Node24 scaffold

- 前置：讀本工具 AGENTS、六份規格、共通 engineering/privacy/design docs。
- Allowed paths：`package.json`, `.gitignore`, `public/**`, `scripts/**`, `test/**`, `TASK-ENTRY.md`。
- 建 ESM/private/Node>=24 manifest、`test/check/build/dev` 命令骨架、worker/page/core skeleton、noindex zh/en 頁；dev 固定 `127.0.0.1:4239`。
- 驗收：24+ version；四 command scripts 已建立並可執行；build 有 public allowlist。
- 完成：記錄版本和實際出口碼，回寫 HANDOFF。

## T01 — Input/calendar validation

- 前置：T00。
- Allowed paths：`public/js/core/validate.mjs`, `public/js/core/calendar.mjs`, `test/validate.test.mjs`, `test/calendar.test.mjs`。
- 嚴格 ISO/date/year/workweek/holiday/task/dependency limits；實作 proleptic Gregorian ordinal 和 weekday index，不依賴 locale/timezone。
- 驗收：ACCEPTANCE A03–A08、A12–A13、A17、A20 fixed outputs；表單 string grammar 與已解析 number 分開測。
- 完成：錯誤 code 有欄位/ID，不帶原始 exception；回寫 HANDOFF。

## T02 — DAG、cycle path、longest duration

- 前置：T01。
- Allowed paths：`public/js/core/graph.mjs`, `test/graph.test.mjs`。
- Stable Kahn topo、DAG longest path D、cycle path DFS；不要把 cycle 下游 blocked tasks 說成 cycle。
- 驗收：A09–A12、100-task chain D=26000，手寫期望；另對隨機 seed-free small DAG 用固定資料驗 longest path 與 cycle invariants。
- 完成：圖錯誤不進日期傳播；回寫 HANDOFF。

## T03 — Anchor、forward/backward、slack

- 前置：T02。
- Allowed paths：`public/js/core/backplan.mjs`, `test/backplan.test.mjs`。
- deadline nonwork adjustment；以 deadline 做 day1 數 D 個工作日；roots同 anchor；forward inclusive finish; backward sink LF=deadline，predecessor LF=next successor LS 的 previous workday；slack by workday index。
- 驗收：A01–A08、A11、A16–A19；自洽時間指標、multi-predecessor 及所有 edge constraints。
- 完成：內部一致性失敗不產出 schedule；回寫 HANDOFF。

## T04 — Worker progress/cancel 和 UI

- 前置：T03。
- Allowed paths：`public/js/planner-worker.js`, `public/js/app.js`, `public/index.html`, `public/en/index.html`, `public/styles/app.css`。
- 建立任務/依賴表單、工作週/假日輸入、真實進度 Worker 和 terminate cancel、完整結果主畫布。Worker 僅本地 ESM module，不網路。
- 驗收：source edit/cancel/stale/error 無舊結果復活；按 selection 完成 A01 故事，不使用靜態假報表。
- 完成：輸入與輸出均留在記憶體；回寫 HANDOFF。

## T05 — TXT/JSON 原子匯出和清理

- 前置：T04。
- Allowed paths：`public/js/core/output.mjs`, `public/js/app.js`, `test/output.test.mjs`。
- schema1完整輸出、固定檔名、2MiB byte cap、手動下載、Blob URL revoke。清除/pagehide/新計算終止 worker、generation++ 和清引用。
- 驗收：A14–A15、B01由 browser gate NOT_RUN；Node tests only checks core output.
- 完成：不得部分輸出、舊 URL 或 stale worker commit；回寫 HANDOFF。

## T06 — 雙語內容/響應版面/noindex

- 前置：T04。
- Allowed paths：`public/index.html`, `public/en/index.html`, `public/styles/app.css`, `public/js/app.js`。
- 實作 UX-SEO 兩語 copy、desktop 主表格和 mobile 任務/日程 tab、現場狀態、accessibility。Candidate noindex/no canonical。
- 驗收：320px/200%/keyboard/focus 等 browser gate 留真實狀態記錄。
- 完成：不暗示外部假日/資源最佳化；回寫 HANDOFF。

## T07 — check/build/dev 安全基線

- 前置：T00–T06。
- Allowed paths：`scripts/check.mjs`, `scripts/build.mjs`, `scripts/serve.mjs`, `test/**`, `package.json`, `.gitignore`。
- 驗 ESM/import、必要檔案、外部資源/危險 DOM；build allowlist/no stale delete；dev only `127.0.0.1:4239`、GET/HEAD、404/405/Host/traversal。
- 驗收：`npm test`, `npm run check`, `npm run build`、offline HTTP cases；長測前後依 Windows contract 記錄 persistent environment fingerprints。
- 完成：無 env drift，命令輸出和狀態回寫 HANDOFF。

## T08 — M1 evidence

- 前置：T00–T07。
- Allowed paths：`HANDOFF.md`, `TASK-ENTRY.md`, `evidence/m1/**`。
- 逐條抄錄 ACCEPTANCE oracle PASS/FAIL/NOT_RUN；worker/ui/browser gate 受 focus incident 限制保持 `NOT_RUN_USER_FOCUS_INCIDENT`。
- 驗收：最終 Node test/check/build 各一次，diff path reviewed；不 commit/push/deploy，不建立 production bundle。
- 完成：向主代理交實際產物/exit codes/未跑 gate/風險，等待 M2 指示。

