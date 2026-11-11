# 工作日計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，run 5 補庫規格；作者未執行任何 registry／coordination 指令，register、claim 與 submit 由主統籌辦理。作者文件核對，待非作者 readiness；本文不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- §6 已預宣告九個產品面向（functionality、boundaries、privacy、security、usability、accessibility、localization-seo、toolchain-provenance、compatibility），產品分數全 null、狀態 NOT_RUN。

## 不重複核對

- legacy `date-calculator`（`sources/legacy/date-calculator/`，已讀其 README）：做日期差（結束日減開始日）與加減「日曆天」，README 明示無工作日／假日功能。本案核心是工作日計數與步進＋使用者假日清單，I/O 與語義不重疊，差異已寫入 SPEC scope。
- `spec-59-project-backplan`：多任務依賴倒排；本案為單一區間／單一起日，無任務概念。run 4 的 `annual-leave-calculator` 是特休「天數權利」計算（依年資），不做日期區間運算，亦不重疊。

## Fixtures 雙重推導（23 核心 + 3 controller）

方法一（手算，依本文釘死規則）：以 2026-01-01 為週四作錨點（星期編號 4），逐日推星期；計數用整週分解（連續 7 天恰 5 個平日）加尾段逐日列舉；步進逐日列舉落點。

- `basic-week`：區間 (01-02, 01-09] = 01-03 六、01-04 日、01-05 一、01-06 二、01-07 三、01-08 四、01-09 五 → 平日 5、週末 2、日曆 7。
- `full-year-2026`：(2026-01-01, 2026-12-31] 共 364 天 = 52 整週 → 平日 52×5 = 260、週末 52×2 = 104；訖日與起日同為週四（364 mod 7 = 0）。
- `holiday-mixed`：區間 (01-05, 01-12] 平日為 06、07、08、09、12 共 5 日；假日 01-07（三）扣 1 → 4；01-10（六）在區間內且落週末計 1；01-20 在區間外計 1；01-07 重複一行計 1；空行跳過但占行號。
- `leap-day-span`：2028-02-28 一、02-29 二（閏日）、03-01 三 → 工作日 2。
- `shift-ten-days`：自 01-07（三）逐日落點 08、09、12、13、14、15、16、19、20、21 → 第 10 個落在 01-21（三），移動 14 日曆天。
- `shift-max-forward`：3660 = 732×5，每 5 個工作日恰跨 7 日曆天（無假日）→ 732 整週 = 5124 天，落在同星期一 2040-01-16。
- 其餘案例同法逐日列舉或直接依驗證順序（欄位順序 → 容量 → UNICODE → EMPTY → 文法 → INVALID_DATE → RANGE；假日逐行、row 含空行計數）判定首個錯誤。

方法二（獨立重算）：Python scratch 腳本以 `datetime` 的 ordinal／weekday 逐日迭代實作同一套釘死語義（半開區間、假日去重與分類、步進），與手算逐案比對，23 個核心案例全數一致；`shift-max-forward` 另以「整週換算」與「逐日 brute force」兩路徑互核，皆得 2040-01-16、移動 5124。組成不變量亦由腳本抽驗：shift(2026-01-02, count = 5) = 2026-01-09 成立。腳本為一次性驗算，未入庫、未當產品程式使用；expected 未由產品程式產生（本輪只有文件，無產品程式）。

## 已釘死、易歧義處

- 端點：起日不計、訖日計入（有向半開區間）；反向起訖恰反號；揭露欄位（週末／假日分類）以正向區間計且非負。
- 假日落週末不重複扣，只揭露；區間外假日容忍並計數；重複行計數；空行跳過但占行號；第 401 筆 ROW_LIMIT 的 row 指該行行號且先於該行內容檢查。
- mode 的 ENUM 檢查先於欄位集合 SCHEMA 檢查（與 run 4 trip-time 的模式前置驗證一致）。
- days=0 原樣回傳、不吸附到最近工作日，resultIsBusinessDay 如實回報。
- 概念備註與一手來源無衝突：週末六／日、公曆閏年規則為通行曆法定義；legacy date-calculator 的區隔已讀其來源 README 核實。

## NOT_RUN

產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
