# 循環賽賽程表 — 既有規格保存

Task ID: `labs-58-tournament-scheduler` · Spec ID: `spec-58-tournament-scheduler`

這是原本已開始製作的工作，非新預案。原文件以本機原路徑/雜湊記錄，正文僅移除使用者絕對路徑。未經新協議獨立完整度確認，不標ready；歷史PASS不是新協議逐項90分。所有原必要驗收要求保留，NOT_RUN仍是NOT_RUN。


---

## 原文件 PRODUCT.md

# 產品規格：循環賽賽程表

狀態：規格，尚未實作。候選 URL 待發布流程確認；M1 不設 production canonical，頁面與 dist 皆 `noindex,nofollow`。

## 使用者與工作

社團、校園活動或桌遊聚會主辦人有一組隊伍和有限場地，想讓每個組合按循環賽規則交手，同時知道輪空、場地和時段。成功產物是一份可檢查、可下載且可依隊伍檢索的完整賽程，不是只列出賽程演算法或手工範例。

## MVP 需求

### FR-01：輸入隊伍與模式

- 每行一個隊名，至少 2 隊、最多 32 隊；最多接受一個結尾換行，內部空白列拒絕。
- 每個名稱先做 Unicode NFC 正規化再 `trim()`，正規化後作為顯示與比對名稱；長度 1–80 Unicode scalar。拒絕 C0/C1 控制字元及 U+2028/U+2029，因名稱不能跨行。重複名稱（NFC+trim 後完全相同、區分大小寫）整份拒絕，不自動編號或去重。
- 單循環預設；可切換雙循環。單循環每個無序隊伍對出現一次；雙循環出現兩次，第二次交換主客標籤。這些標籤是賽程欄位，不代表實際主場或場地優勢。
- 場地數必填整數 1–16；高於每輪比賽數沒有額外效果，故不接受大於 16。
- 每次「產生賽程」均重新驗證全份輸入；任何錯誤都不顯示舊賽程或部分對戰。

### FR-02：輪次與不變式

- n 隊時，每循環輪數為 `N−1`，其中 `N=n`（偶數）或 `n+1`（奇數，加入內部 BYE）。每輪正好 `floor(n/2)` 場；奇數隊每輪 1 隊輪空。
- 每循環比賽總數 `n(n−1)/2`；雙循環為兩倍。circle method 的穩定生成順序以輸入隊伍順序開始，不隨機洗牌。
- 對同一輪，任一隊最多出賽一次。當場地數不足時，依該輪固定生成順序切成 `ceil(該輪場數 / 場地數)` 個 slot；一個 slot 最多填滿場地數場。
- 每個 slot 的場地由 1 起按場次順序編號。該輪最後一個 slot 若不足場地數，未用的場地格保持不存在/空白，不產生虛構比賽，也不把下一輪的比賽搬來填滿。
- 下一輪開始時點精確為上一輪最後一個實際 slot 最後一場結束後加一次 changeover；不額外等待未使用場地的完整時段。整個賽程最後一場之後沒有尾端換場時間或「休息 gap」。隊伍輪空時該輪沒有該隊比賽；不以虛構場次填補休息時間。
- 不做公平休息、排序優化、裁判、淘汰賽、排名或積分判定。

### FR-03：選配時間

- 預設只產生輪次、slot、場地與對戰，不生成時間。
- 若使用者要排時間，必須一次提供完整組：本地民用起始日期 `YYYY-MM-DD`（2000–2099）、起始時間 `HH:mm`（00:00–23:59）、每場分鐘數 1–1440、slot 間換場 0–120 分鐘。只填部分欄位則拒絕產生，不猜預設。
- 時間以純整數分鐘從輸入起點累加，不套用時區資料、夏令時間、休息或外部日曆。每個 slot 起點為前一實際 slot 起點 + 場長 + 換場；一個 slot 的場次同時開始。
- 任何跨午夜時間以日期和 `+N day` 明示，不能把時間回捲成同日。最後一個 slot 後不計尾端換場；總結束時間就是最後一場結束。

### FR-04：對手表與輸出

- 預覽依輪次顯示比賽、slot、場地、主客標籤；奇數隊顯示該輪輪空。可用「選隊伍」切到該隊所有對手、輪次、slot、場地及輪空資訊。
- JSON schema 1 形狀：`{"schema":"gq.round-robin","version":1,"options":{"cycles":1,"courts":2,"timing":null},"teams":["A","B"],"rounds":[{"round":1,"cycle":1,"bye":null,"matches":[{"id":"C1-R1-S1-M1","home":"A","away":"B","slot":1,"court":1,"startOffsetMinutes":null,"endOffsetMinutes":null}]}],"opponents":[{"team":"A","entries":[{"opponent":"B","round":1,"cycle":1,"status":"played"}]}]}`。輪次/場次依穩定產生順序編號；在有時間模式時 offset 為相對起始時間的整數分鐘，無時間時兩欄為 null。
- TXT 是同一賽程的逐輪閱讀版；隊名只作純文字，不當 HTML、公式或檔名。固定下載檔名 `round-robin.txt`、`round-robin.json`。兩檔 UTF-8 bytes 合計最多 2 MiB；實算超限時整批不下載。
- 輸出涵蓋所有比賽、輪空、slot 和對手資訊；不只下載目前選中的隊伍。

### FR-05：上限、拒絕與狀態

- 每次輸入最多 32 行隊名；雙循環最多 62 輪、992 場。生成內容必須包含全部對戰；不提供「只顯示前 N 場」的靜默截斷。
- 拒絕隊伍不足/超量、空白中間列、NFC+trim 重名、隊名控制字元、場地非整數或超界、不完整時間組、錯誤日期/時間/分鐘、檔案/輸出超限。錯誤列出欄位和修法，不改原始輸入，不保留上一版下載物。
- 狀態：空白→編輯→生成中→已生成；錯誤為 blocked；編輯新值立即使既有產物過期；清除為 empty。最多 32 隊和 992 場的核心是短同步工作，M1 不放假的取消/進度。若序列化分批非同步實作，才提供真實可取消按鈕並遵循 generation 規則；預設仍為短同步。
- 輸入與賽程僅在當頁記憶體。清除、改來源、`pagehide` 撤銷 Blob URL、清空引用；不能承諾刪除已下載檔。

### FR-06：非目標

沒有網路/API/帳號/多人同步、賽事報名、比分、排名、隨機抽籤、場地衝突編輯器、裁判分配、最少休息最佳化、真實主場推論或手機推播。circle method 提供完整循環對戰，不聲稱符合未輸入的組織規則。


---

## 原文件 TECHNICAL.md

# 技術規格：循環賽賽程表

狀態：規格，尚未實作。Node.js 24+ ESM 內建模組、瀏覽器原生 HTML/CSS/ESM，零依賴，不安裝套件、不開 browser。遵循本專案 `docs/ENGINEERING.md`、`docs/PRIVACY-SECURITY.md` 與 `docs/DESIGN-SYSTEM.md`。

## 檔案樹

```text
package.json
.gitignore
public/index.html
public/en/index.html
public/styles/app.css
public/js/app.js
public/js/core/teams.mjs
public/js/core/circle.mjs
public/js/core/timing.mjs
public/js/core/output.mjs
scripts/check.mjs
scripts/build.mjs
scripts/serve.mjs
test/teams.test.mjs
test/circle.test.mjs
test/timing.test.mjs
test/output.test.mjs
dist/                        # M1 preview only; noindex
```

## 核心介面

```js
parseTeams(multilineText) -> { ok, teams, errors }
generateRounds(teams, { cycles, courts }) -> Round[]
scheduleRounds(rounds, { startDate, startTime, matchMinutes, changeoverMinutes } | null)
  -> Round[]
validateSchedule(schedule, { teams, cycles, courts }) -> InvariantError[]
buildOpponentIndex(schedule, teams) -> TeamOpponent[]
serializeSchedule(schedule, options, teams, { maxBytes: 2097152 })
  -> { ok, txtBytes, jsonBytes } | { ok: false, code: 'OUTPUT_LIMIT', actualBytes }
```

Pure core uses no DOM/network/storage/random/timezone database. Input order determines deterministic match order. To avoid hidden side effects, clock/date values are explicit parameters only.

## Circle algorithm與輪次拆 slot

1. 名稱逐行讀取。只忽略最後一個由結尾換行產生的空字串；其他空列拒絕。名稱 `normalize('NFC').trim()` 後為 canonical/display name；以區分大小寫的 exact Set 檢查重複。
2. 偶數 n 組成固定 ring；奇數 n 將 `BYE` 放入 ring。Ring 長度 `N` 為偶數。每輪配對 `ring[i]` 與 `ring[N−1−i]`，`i=0..N/2−1`；遇到 BYE 記為輪空而不是比賽。下一輪固定保留 `ring[0]`，將最後一個位置旋至 index 1，其餘位置順移一格。
3. 每 cycle 共 `N−1` 輪。單循環做一次；雙循環再做同一輪組，對每場交換 `home/away`，循環標記加 1。標籤僅代表輸出左右欄。
4. 每輪先驗證隊伍各自最多出現一次，再按穩定配對順序每 `courts` 場切出 slot。Slot 中 court 為 1..該 slot 實際場數；末 slot 未用場地不生成空 match。每輪 slots 不跨輪補齊。
5. 測試和開發時以完整 pair counter 驗證每對 count=cycles、雙循環兩個 home/away 方向各 1；全量測試必須對所有 `n=2..32`、cycles 1/2、courts 1..16 驗不變式，不能只看相鄰 pair 或範例。

## 時間與 gap 定義

- Parse `startDate` as validated civil Gregorian date; `startTime` 變成 day-local minute；內部 offset 為 `0..` 的整數分鐘，沒有 timezone/DST/locale API。
- Slot 序列全賽事單調遞增。`slotStart[0]=0`；後續 `slotStart[i]=slotStart[i−1]+matchMinutes+changeoverMinutes`。每場 start=`slotStart`，end=`start+matchMinutes`。下一輪以上一輪最後一個實際 slot 為前項，公式不重置時間。
- 這精確表示每個前置 slot 後一次換場（包括輪間）；末 slot 的未用 court 格只是空白，不增加時間；最後一個 slot 結束後不加換場，最後總時間停在最後一場 end。
- 以 Gregorian civil-date integer arithmetic 將 `startDate+floor(offset/1440)` 和 `offset mod 1440` 格式化。跨日顯示完整日期與相對起始日 `+N day`，時間不能回捲成原日期。輸入起始年限制 2000–2099；依最大 992 場、1440 分鐘場長與 120 分鐘換場，上界可跨到 2102 年。純日曆顯示不代表時區轉換。
- Timing group 缺一欄即拒絕。無 timing 時 start/end offset 為 null，不建立假的時程或 gap 數字。

## 不變式、輸出與生命週期

- 一輪恰有 `floor(n/2)` 場；奇數隊恰一 bye。每隊在每輪至多一場；slot 的每個 court 唯一，slot 內隊伍不重複；對戰 pair 完整無重複漏失。
- 依賴、輸入與產物上限先驗後生成。JSON schema/version 精確；TXT 只組純文字；兩份輸出經 TextEncoder 計 bytes，合計超過 2 MiB 則整批拒絕。固定檔名、手動點擊才下載。
- UI 生成同步且短；狀態更新同步。輸入改動先遞增 generation、清掉 schedule/download URLs，再驗證；有 generation mismatch 的非同步序列化結果丟棄。如果實際實作選擇 worker 分批，取消必須 terminate worker 並清除舊結果；不可只在同步計算後假裝 yield。
- 清除、換來源、`pagehide` 清引用並 revoke URLs。沒有 localStorage、IndexedDB、service worker、URL/query、網路、分析或 console data logging。

## 工具鏈

`package.json` private/type=module/engines `>=24`; `npm test`=`node --test test/*.test.mjs`; `npm run check`=`node scripts/check.mjs`; `npm run build`=`node scripts/build.mjs`; `npm run dev`=`node scripts/serve.mjs`。Dev 僅 `127.0.0.1:4238`，只 serve `public/`，GET/HEAD、404、405、Host 和 traversal guard、無 SPA fallback。Build 只接受 public allowlist，拒絕 symlink/junction、unknown/stale/traversal，preview noindex。詳細 security/Windows/Git 邊界依 AGENTS 和共通 docs。


---

## 原文件 UX-SEO.md

# 介面與搜尋規格：循環賽賽程表

狀態：規格，尚未實作。Product App 工作區優先顯示完整賽程和輪次；輸入控制緊鄰其影響結果。候選 URL 待主代理確定，M1 noindex。

## 雙語頁面文字

### 繁體中文

- `title`: `循環賽賽程表｜Gloss Tools`
- `description`: `輸入 2–32 隊與場地數，產生單循環或雙循環賽程、輪空、分時場地和每隊對手表。`
- `H1`: `把每隊對戰排成完整循環賽`
- 副標：`先確認對戰與輪空，再依場地數分配每輪時段。`
- 主按鈕：`產生賽程`；次要：`清除全部`、`下載 TXT`、`下載 JSON`。
- 安全提示：`賽程在此頁產生；只有按下載時，才由瀏覽器建立檔案。`

FAQ：

1. **奇數隊會怎麼排？** 每一輪有一隊輪空；單循環中每隊恰好輪空一次。
2. **場地不夠會少掉比賽嗎？** 不會。每輪依固定次序拆成多個時段，完整保留所有對戰。
3. **雙循環的主場代表真的主場嗎？** 不代表。第二次對戰只交換賽程的主客欄位，工具不知道實際場地或優勢。

### English

- `title`: `Round-Robin Schedule | Gloss Tools`
- `description`: `Enter 2–32 teams and the number of courts to create single or double round-robin fixtures, byes, time slots, and team opponent lists.`
- `H1`: `Build a complete round-robin schedule`
- Supporting text: `Review the matchups and byes, then assign slots based on your available courts.`
- Primary action: `Create schedule`; secondary actions: `Clear all`, `Download TXT`, `Download JSON`.
- Data notice: `The schedule is created in this page. A file is created only when you choose to download it.`

FAQ:

1. **What happens when there is an odd number of teams?** Each round has one bye; in a single round robin, every team receives one bye.
2. **Will limited courts remove any matches?** No. Each round is split into additional slots in a fixed order, and all matchups remain in the schedule.
3. **Does the home/away label mean a real home venue?** No. The second meeting in a double round robin swaps the labels. The tool does not know the actual venue or advantage.

## 工作區線框

Desktop：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 循環賽賽程表 / Round-robin schedule          草稿狀態   語言切換   │
├─────────────────────────────┬────────────────────────────────────────┤
│ 設定區（固定、窄）          │ 完整賽程（主畫布，隨寬度成長）         │
│ 隊伍（每行一隊）            │ 第 1 輪  ─  1 slot / 2 場               │
│ A                            │ 場地 1  A vs D   09:00–10:00            │
│ B                            │ 場地 2  B vs C   09:00–10:00            │
│ C                            │ 第 2 輪  ─  1 slot / 2 場               │
│ D                            │ ...                                    │
│ 循環 [單循環 / 雙循環]       │ [選隊伍查看對手 ▾]                      │
│ 場地數 [2]                   │ [下載 TXT] [下載 JSON]                  │
│ [選配時間設定 ▾]             │                                        │
│ [產生賽程]                   │                                        │
└─────────────────────────────┴────────────────────────────────────────┘
```

Mobile（單欄；設定與完整賽程使用有文字標籤的頁籤）：

```text
┌─────────────────────────────┐
│ 循環賽賽程表       語言切換 │
│ [輸入與設定] [完整賽程]     │
├─────────────────────────────┤
│ 隊伍（每行一隊）            │
│ A                           │
│ B                           │
│ C                           │
│ [單循環 / 雙循環]           │
│ 場地數 [2]                  │
│ [選配時間設定 ▾]            │
│ [產生賽程]                  │
│                             │
│ 賽程頁：每輪以直向比賽列顯示│
│ slot、場地、輪空、日期時間  │
│ [下載 TXT] [下載 JSON]      │
└─────────────────────────────┘
```

## 狀態與互動

- 空白/編輯：預設 4 行空隊名只作輸入列，不放假結果。可直接貼上隊伍清單。
- 生成中：核心不超過 992 場、M1 預期同步完成；不要顯示假百分比或不可工作的取消。
- 成功：輪次清單為主 canvas；當選某隊時對手表出現在明確 panel，完整輪次仍可回看。穩定輪次和 slot 序號輔助定位，不用裝飾性卡片網格。
- 驗證失敗：摘要標出錯行/欄位，聚焦只在提交後輔助復原；舊賽程與下載鍵同步撤除。
- 清除前若已有隊名或產物，做可撤回/明確確認；清除後畫面空白。
- 鍵盤順序：隊伍文字區→循環模式→場地→選配時間→產生→賽程列→隊伍篩選→下載。所有 select/button 可用鍵盤，焦點可見；表格內容在窄螢幕改直向資訊列。
- 符合共通 320px、200% zoom、對比、44px 觸控目標及 reduced motion；狀態不只以色彩表示。使用本工具真實生成賽程作畫面，禁止假 dashboard/KPI。

## SEO 與發布

- 建議路徑 `/round-robin/` 與 `/round-robin/en/`；實際 URL、canonical/hreflang/sitemap 只在主代理確認 release 後建立。
- M1 中英頁互鏈且 `noindex,nofollow`；不寫 production canonical，不把候選網域當正式網址。
- title/description/H1 直接說明對戰、輪空與場地分時；不宣稱「最公平」、「最佳休息」、「自動化所有賽事規則」或無證據的搜尋排名。
- 瀏覽器 320px、200% zoom、鍵盤及真下載驗收按 `NOT_RUN_USER_FOCUS_INCIDENT` 保留；Node/HTTP 檢查不是 browser PASS。


---

## 原文件 ACCEPTANCE.md

# 驗收規格：循環賽賽程表

狀態：規格，尚未實作。所有純核心 expected 固定手寫；以全量 pair counter/invariant 驗對戰完整性，禁止只驗例子或僅與相鄰賽次比較。測試資料全為假隊名，不需網路或 browser。

## 純核心 oracle

| ID | 輸入 / 步驟 | 精確預期 | 關聯 |
|---|---|---|---|
| A01 | 隊伍 A,B,C,D，單循環，場地 2 | 3 輪、每輪 2 場、總 6 場；依生成順序 pair 為 `(A,D),(B,C) / (A,C),(D,B) / (A,B),(C,D)`；六個無序 pair 各一次，每隊 3 個不同對手。 | FR-01/02 |
| A02 | A,B,C,D,E，單循環，場地 2 | 5 輪、總 10 場；每輪 1 個 bye；五隊各輪空一次、各遇其餘四隊一次。 | FR-02 |
| A03 | A,B,C,D，雙循環，場地 2 | 6 輪、12 場；每個無序 pair 恰兩次，第二次 home/away 與第一次相反。 | FR-02 |
| A04 | A,B，單循環，場地 1 | 1 輪、1 場、無 bye；唯一對戰 A/B 一次。 | FR-01/02 |
| A05 | 32 隊、單循環，場地 16 | 31 輪、每輪 16 場、496 場；任兩隊恰一次。 | FR-02/05 |
| A06 | 33 隊或只有 1 隊 | 各拒絕，沒有部分 schedule，也沒有前一次成功結果。 | FR-01/05 |
| A07 | ` e\u0301 ` 與預組字元 `é` 同時輸入 | NFC+trim 後重複，整份拒絕。`Team` 與 `team` 則可作不同名稱，因比對區分大小寫。 | FR-01 |
| A08 | `A\n\nB`；另試 `A\nB\n` | 內部空白列拒絕；單一最後換行忽略，結果只有 A/B。 | FR-01 |
| A09 | 6 隊單循環、場地 1 | 每輪 3 場拆 3 個 slot，每隊每輪只出賽一次；slot 內無重複隊名，場地編號均為 1。 | FR-02 |
| A10 | 6 隊、場地 2 | 每輪 3 場拆 2 slots，第二 slot 僅 1 場；該 slot 的第二個 court 不輸出，下一輪不搬場填空。 | FR-02 |
| A11 | 4 隊、場地1，start `2026-10-23 09:00`, 每場60分鐘、changeover10 | slot 起點依穩定配對序為 `09:00`,`10:10`,`11:20`,`12:30`,`13:40`,`14:50`；每輪第2 slot 應為前輪最後一場結束後10分；末場結束 `15:50`，不加尾端換場。 | FR-03 |
| A12 | 2 隊，起始 `2026-10-23 23:30`, 每場90、changeover15 | 唯一場 `23:30–次日01:00`，日期為 `2026-10-24` 並標 `+1 day`；不得顯示同日 `01:00`。 | FR-03 |
| A13 | 只提供時間組中的 startTime，其餘缺失 | 拒絕完整賽程生成，指出時間設定缺欄位。無 timing 時 start/end offset 必為 null。 | FR-03 |
| A14 | courts=`0`,`1.5`,`17` | 全部拒絕；`1`、`16` 接受。 | FR-01 |
| A15 | 隊名含 `\u0000`, newline 內嵌或 U+2028 | 拒絕行控制字元；不得把單一隊名拆成多列或輸出表格注入。 | FR-01/04 |
| A16 | 每組 n=2..32、cycles=1/2、courts=1..16 的笛卡兒組合 | 每輪 matches=`floor(n/2)`、奇數時恰1 bye；每隊每輪至多一次；所有 pair count 精確等於 cycles；雙循環兩向各一次；slot/court 完整且唯一。 | FR-02 |
| A17 | TXT/JSON 內容用 `<script>alert(1)</script>` 作合法隊名文字 | 核心只輸出純文字與 JSON 字串，無 HTML markup/可執行內容；固定檔名不含隊名。 | FR-04 |
| A18 | 輸出總 bytes 恰 2 MiB，再多一 byte | 等上限成功產兩份完整檔案；超限 `OUTPUT_LIMIT`，整批不建 Blob、不截斷。 | FR-04/05 |
| A19 | 已有成功排程後編輯隊伍並立即提交重名 | 預覽與下載 URL 先失效；錯誤狀態無舊賽程；修正後的結果 generation 才可下載。 | FR-05 |
| A20 | 雙循環中選單一隊查看 opponent index | 對手表涵蓋 n−1 對手各兩筆、cycle 1/2，方向相反；完整 round schedule 同時保留。 | FR-04 |

## 工具鏈

Node 24+ 執行 `npm test`、`npm run check`、`npm run build`。測試報出 Node 版本、每條命令退出碼；build 只包含 public allowlist 且 noindex。dev 驗證僅 loopback `127.0.0.1:4238`、GET/HEAD、其他 method 405、未知 path 404、Host/path traversal reject，不能開 browser 或原生 app。不得把靜態 regex 掃描當成安全證明。

## 瀏覽器手動 gate

| ID | 檢查 | 預期 | 狀態 |
|---|---|---|---|
| B01 | 實際瀏覽器完成5隊單循環和下載 | 5 輪/10場/每隊1 bye；兩份下載與預覽一致。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B02 | 320px、200% zoom、Tab 完整操作隊伍設定/選隊伍/下載 | 沒有頁面橫向裁切，所有功能可鍵盤到達且 focus 可見。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B03 | 瀏覽器 Network/Storage 面板觀察產生/清除 | 無外部 request、storage、service worker、URL/query 輸入資料。 | `NOT_RUN_USER_FOCUS_INCIDENT` |
| B04 | 產生跨日 timed schedule，檢查實際畫面和下載 | 日期、`+N day`、slot/gap 定義與 bytes 內容相符。 | `NOT_RUN_USER_FOCUS_INCIDENT` |

完成 M1 需所有純測試和 Node 工具鏈通過；上述 browser gate 維持未執行標記，等待主代理確認隔離驗證方式，不准宣稱已 browser 驗收。


---

## 原文件 TASKS.md

# 實作任務：循環賽賽程表

狀態：規格，尚未實作。任務依序完成；任何實作只限本工具 `AGENTS.md` 明列的 package/public/scripts/test/dist/HANDOFF/TASK-ENTRY/evidence 路徑。不得修改本六份規格、共通 docs、兄弟工具或共享首頁；M1 不發布、不開 browser、不安裝套件。

## T00 — scaffold 與命令

- 前置：讀本工具 AGENTS、六份規格與共通 docs。
- Allowed paths：`package.json`, `.gitignore`, `public/**`, `scripts/**`, `test/**`, `TASK-ENTRY.md`。
- 建 Node24+ ESM/private manifest、`npm test/check/build/dev`、最小繁中/英文頁、core/test skeleton、check/build/dev skeleton。固定 dev `127.0.0.1:4238`。
- 驗收：`node --version` 為24+；四個命令入口皆已建立；先後不假設尚未建立的 scripts。
- 完成：記錄實際版本及 scaffold，回寫 HANDOFF。

## T01 — team input canonicalization

- 前置：T00。
- Allowed paths：`public/js/core/teams.mjs`, `test/teams.test.mjs`。
- 每行讀一隊，唯一忽略終端單一換行；NFC+trim canonicalization；空列、字元、筆數及名稱長度驗證。
- 驗收：ACCEPTANCE A06–A08、A15 的固定結果。
- 完成：輸入錯誤不會變成空白隊伍或靜默去重；回寫 HANDOFF。

## T02 — circle core 與完整 pair oracle

- 前置：T01。
- Allowed paths：`public/js/core/circle.mjs`, `test/circle.test.mjs`。
- 實作單/雙循環固定 ring rotation、odd bye、雙循環交換主客；再切 courts slots、分配 court。
- 驗收：ACCEPTANCE A01–A06、A09–A10、A16、A20；對全 n/cycles/courts 檢查所有 unordered pairs，不用相鄰匹配近似。
- 完成：配對數及各輪隊伍唯一性完全符合 oracle；回寫 HANDOFF。

## T03 — timed slots 與輸出格式

- 前置：T02。
- Allowed paths：`public/js/core/timing.mjs`, `public/js/core/output.mjs`, `test/timing.test.mjs`, `test/output.test.mjs`。
- 完整 timing group 驗證、local civil-minute arithmetic、跨日日期偏移、TXT/JSON exact schema、pair bytes cap。
- 驗收：A11–A14、A17–A18；固定 case 預期手寫，不用測試函式自己的輸出產 expected。
- 完成：末 slot、下一輪起點、最後一場 end/gap 對應 FR-02/03；回寫 HANDOFF。

## T04 — 真實預覽和隊伍篩選 UI

- 前置：T03。
- Allowed paths：`public/index.html`, `public/en/index.html`, `public/styles/app.css`, `public/js/app.js`。
- 完成隊伍貼上/調整、mode/courts/timing、完整逐輪對戰、bye、court、slot、隊伍 opponent view 及狀態。預覽結果來自純 core，不是 fixture 假資料。
- 驗收：Tab 流程、錯誤摘要、結果穩定順序、編輯使結果即時 stale，清除經確認。
- 完成：所有場次與對手皆可看見；回寫 HANDOFF。

## T05 — 下載及 stale/cleanup

- 前置：T04。
- Allowed paths：`public/js/app.js`, `public/js/core/output.mjs`, `test/output.test.mjs`。
- 只由使用者按鈕建立 TXT/JSON 下載；固定檔名、原子總上限、generation guard、URL cleanup。
- 驗收：A17–A20；不得留下部分或舊版本產物。
- 完成：clear/edit/pagehide 清引用和 revoke URL；回寫 HANDOFF。

## T06 — 雙語產品界面與 noindex

- 前置：T04。
- Allowed paths：`public/index.html`, `public/en/index.html`, `public/styles/app.css`, `public/js/app.js`。
- 落實 UX-SEO 的兩語 title/description/H1/FAQ、desktop/mobile canvas、頁籤和手動下載；所有候選頁 noindex，不自訂正式 canonical。
- 驗收：固定 copy 都在文件和對應頁面；320px/200%/keyboard/focus/accessibility 留 browser gate 記錄。
- 完成：不宣稱最公平或涵蓋外部賽規；回寫 HANDOFF。

## T07 — check/build/server hardening

- 前置：T00–T06。
- Allowed paths：`scripts/check.mjs`, `scripts/build.mjs`, `scripts/serve.mjs`, `test/**`, `package.json`, `.gitignore`。
- 真正 parse ESM/檢必要路徑/危險 DOM/外部資源；閉合 build allowlist；dev 只 loopback，GET/HEAD、404/405、Host/traversal guards。
- 驗收：`npm test`, `npm run check`, `npm run build` 和 offline HTTP cases；按 Windows contract 記錄長測前後 persistent-env fingerprint，不改 system state。
- 完成：每個命令退出碼與版本回寫 HANDOFF；保留未識別程序。

## T08 — M1 acceptance evidence

- 前置：T00–T07。
- Allowed paths：`HANDOFF.md`, `TASK-ENTRY.md`, `evidence/m1/**`。
- 依 ACCEPTANCE oracle 記錄純測試和工具鏈結果；瀏覽器、真下載、視覺、Network/Storage 一律保持 `NOT_RUN_USER_FOCUS_INCIDENT`，除非主代理另確認隔離 gate。
- 驗收：最終 `npm test/check/build` 各執行一次；審核 diff 僅在 allowed paths；不 commit/push/deploy、不宣稱 M2/M3。
- 完成：清楚列 PASS/FAIL/NOT_RUN、證據及風險交主代理複核並等待 M2 指示。

