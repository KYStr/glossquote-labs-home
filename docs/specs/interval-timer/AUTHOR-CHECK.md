# 間歇計時器 — 作者檢查

作者為本輪 run-5 規格作者（cloud-dot），本文是作者對自己文件的檢查紀錄，**不是**獨立審查；readiness 須由非作者 reviewer 對同一固定候選另行核對。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 repo 既有 specs 與 sources/legacy：最相近為 legacy `focus-timer`（已逐檔讀其 README 與 `public/js/core/timer.mjs`：單段 1–180 分鐘倒數，phase 只有 ready／running／paused／completed，事件只有 START／TICK／PAUSE／RESUME／CANCEL／SET_DURATION，無段表、回合與段界事件）與 legacy `metronome`（連續等距拍點，無段落與總時長）。`docs/specs/` 全目錄核對無 interval／tabata／hiit／多段計時規格。實質差異已寫入 SPEC scope 節。
- fixtures 共 21 筆：15 筆字面核心案例（7 成功、8 錯誤）、3 筆 session 狀態機案例、3 筆 controller 案例。

## 雙重推導紀錄

每一筆 expected 先由作者依 SPEC 釘死的規則手算，再以獨立撰寫的 Python 實作（驗證、逐段累加建表、狀態機逐步推進）重算，兩邊深度比對一致才定稿；重算結果 21/21 全數相符（含 session 案例逐步 snapshot 與 cues、controller 案例內嵌 lateResult 與獨立 run 結果比對）。

- 段表：`tabata-classic` 16 段由作者逐段手寫起訖（準備 0–10，之後每回合 work 20 秒、rest 10 秒，rest 只在第 1–7 回合後），總長以公式 10 + 8×20 + 7×10 = 240 秒交叉核對；重算以游標逐段累加獨立產生並逐段比對。
- `rounds-max`（99 回合、每段 1 秒、197 段）：手算採閉式圖案——work 第 k 段起點 2(k−1)、rest 第 k 段起點 2(k−1)+1、末段 work 第 99 回合 196–197、總長 99 + 98 = 197；fixtures 的字面段表即按此圖案寫出，重算改以逐段累加（不用閉式）獨立產生後全表比對一致。兩法方法不同，非同式自證。
- 總時長公式兩路核對：每筆成功案例的 totalSeconds 同時等於公式值（prepare + rounds×work + rests×rest，rests 依 finalRest 取 rounds 或 rounds−1）與末段 endSeconds，重算時逐案斷言。
- 顯示 ceil 與段界：`session-full-run` 手算逐步核對——tick 9,999 時段剩餘 ceil(1/1000) = 1、總剩餘 ceil(70,001/1000) = 71；tick 恰 10,000／40,000 落入下一段且剩餘為完整段長並發 segmentStart；tick 39,999 總剩餘 ceil(40,001/1000) = 41。重算以 math.ceil 逐步推進狀態機比對每步 snapshot 與 cues。
- 暫停不計時：同案 pause 45,000 後 resume，次一 tick 只送 46,000（活動毫秒），段剩餘由 5 → 4，證明暫停期間的牆鐘時間不進核心；此為核心／controller 契約的釘法（核心只吃活動毫秒），非事後假設。
- 多段跳躍與夾取：`session-pause-at-end-and-skips` 手算——tick 25,000 一次跨 work 第 1 回合與 rest 第 1 回合、恰落 work 第 2 回合起點，只發落點段一筆 cue；pause 讀數 50,000 = 總長直接 finished 且 activeElapsedMs 夾到 50,000（非沿用原讀數）；paused 中 skip 保持 paused、末段 skip 發 programEnd。
- 忽略規則：`session-invalid-events-ignored` 手算——ready 中 tick／pause、running 中重複 start 與 resume、倒退讀數 2,000（小於已消耗 3,000）、finished 中 skip 皆不改變 snapshot 且 cues 為空。
- 錯誤案例核對驗證順序：`input-limit`（9 單位先於數值範圍）、`leading-zero` 與 `decimal-work`（文法先於範圍）、`work-zero`（文法合法但低於下限 1）、`empty-rest`（EMPTY 先於文法）、`bad-final-rest`（ENUM）、`prepare-over` 與 `rounds-over`（各欄上限 +1）。

## 釘版決定與分歧明示

- 最後一回合休息：以選項欄 finalRest 讓使用者決定，預設 skip（與 Tabata 等主流間歇慣例一致）；概念備註只要求「可選」，本規格釘為欄位而非寫死，並在 FAQ 雙語明示。
- 核心時間模型：核心**不**採 focus-timer 的 deadline（now + remaining）模型，而採「controller 供給活動毫秒數、核心純函數映射位置」的模型。理由：暫停排除、段界歸屬、顯示 ceil 都必須能以字面 fixtures 逐步斷言；deadline 模型把牆鐘讀數混入核心會使案例依賴起始時刻。controller 改以累積 + 時間戳重算供給活動毫秒，抗漂移要求（不得以單一 setTimeout 排整段）已釘入 implementation。
- cue 事件只含 segmentStart 與 programEnd 兩種（依任務釘法）；不另設「剩餘 3 秒警告」等事件，避免核心事件面擴張；聲音／震動的實際呈現屬 controller，核心不承諾。
- 報告訂為節目摘要（result 的 canonical JSON），在 success 後、計時開始前即可下載；計時進行中不另產即時報告（進度屬畫面呈現），已在 SPEC 明示。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，九面向分數 null。未固定候選或未獨評前不計 ready。
