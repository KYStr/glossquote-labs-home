# 年齡計算機 — 作者檢查

作者為本輪 run-5 規格作者（cloud-dot），本文是作者對自己文件的檢查紀錄，**不是**獨立審查；readiness 須由非作者 reviewer 對同一固定候選另行核對。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 repo 既有 specs 與 legacy：最相近為 `school-entry-year`（同採 2 月 29 日以 3 月 1 日為非閏年觀察生日的足歲慣例，輸出為學年度／年級，無年齡拆解）、legacy `date-calculator`（只有日期差與加減，無借位與生日語義）、`pregnancy-due-date-calculator`（孕期推導）。實質差異已寫入 SPEC scope 節。
- fixtures 共 17 筆：14 筆字面核心案例（10 成功、4 錯誤）與 3 筆 controller 案例。

## 雙重推導紀錄

每一筆成功案例的 expected 先由作者依 SPEC 釘死的規則手算，再以 Python 標準庫 `datetime` 獨立重算，兩邊一致才寫入 fixtures：

- totalDays：手算以 JDN（Fliegel & Van Flandern）公式逐案求差；重算以 `date.toordinal()` 差核對，10/10 一致（例：1990-05-15 → 2026-11-09 = 13,327 天）。
- 出生星期：手算以 (JDN+1) mod 7；重算以 `date.weekday()` 核對，10/10 一致（例：1990-05-15 為星期二、2020-02-29 為星期六、2026-11-09 為星期一）。
- 下一個生日與倒數：手算以觀察生日定義（2 月 29 日非閏年為 3 月 1 日）逐案判定；重算以「自參考日起逐日掃描、找第一個觀察生日」的暴力法核對，10/10 一致（例：feb29-day-before 倒數 1 天、next-birthday-next-year 跨年倒數 6 天）。
- 年／月／日借位：手算依 SPEC 步驟（日不足向參考月前一個月借其月長、月不足年退月補 12）；重算以第二份獨立撰寫的 Python 實作（月長以 ordinal 差求得、不用查表）核對，10/10 一致。

慣例分歧的明示：作者另以「逐月步進、月底夾日」的常見替代慣例試算，其中 3 案（`feb29-day-before`、`borrow-february-length`、`month-end-leap`）結果與借位慣例不同（例：2023-01-31 → 2023-03-30，逐月夾日得 1 個月 30 天，借位得 1 個月 27 天）。年齡的月／日拆解本質是慣例定義而非絕對量，SPEC 已釘死借位慣例並在 inputsOutputs 明示不得改採他種慣例；fixtures 依借位慣例。絕對量（總天數、星期、下一個生日）則與任何慣例無關，已用 datetime 完全獨立核對。

- 2 月 29 日觀察生日慣例與 run-4 `school-entry-year` 規格的足歲慣例一致（同日已在該規格釘死並製作驗證），本規格沿用，不另創慣例。本案無外部法規或費率事實需查證；閏年規則與 JDN 公式為標準曆法定義，並已由 datetime 重算交叉驗證。
- 錯誤案例核對驗證順序：`format-slashes`（10 單位、DATE_FORMAT 先於曆法檢查）、`invalid-date`（文法合法但日期不存在）、`range-low`（日期存在但早於 1900-01-01）、`date-order`（兩欄合法後才觸發的跨欄檢查）。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，九面向分數 null。未固定候選或未獨評前不計 ready。

2026-11-10 維修補記。原作者的 10 筆成功案例維持原預期。新增四筆二次借位，以人工拆解月長 28／29 天再加 31 天，另用 Gregorian 日期差核對總天數、生日倒數與星期。
