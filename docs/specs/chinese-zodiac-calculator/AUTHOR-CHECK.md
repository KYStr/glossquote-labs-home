# 農曆生肖查詢 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格 task `labs-chinese-zodiac-calculator-spec-20261109`（由主代理登記）。這是作者本人對文件的檢查，**不是獨立審查**；readiness 須由非作者 reviewer 對固定候選重算案例、核對八節後判定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

## 查重（dedupe）

已比對本 repo 101 份既有預案（`docs/specs/` 全目錄與內容檢索「生肖」無命中）與本批概念清單。無既有農曆生肖工具。最相近者為西洋星座查詢 zodiac-sign-finder（本批平行預案）：該案以國曆月／日查熱帶黃道十二宮，日期表與年份無關、不處理農曆年界；本案以農曆春節為年界、需逐年春節表，且同月日不同年可屬不同生肖，輸入／輸出／資料表皆不同，不重複。其餘近似：moon-phase-calculator（天文公式推月相，非曆表查表）、school-entry-year（9 月 1 日法定年齡線，非農曆年界），差異已寫入 SPEC scope。

## 春節表查核

- 全表 78 列（生肖年 1960–2035 共 76 列＋1959、2036 邊界列）取自公開曆表（ZodiacTales「Chinese New Year Dates and Zodiac Year Cutoffs 1900–2049」全表逐列抄錄），並抽查與其他公開來源交叉核對一致：1960-01-28、1969-02-17、1970-02-06、1979-01-28、1980-02-16、1984-02-02、1990-01-27、1992-02-04、2000-02-05、2001-01-24、2024-02-10、2025-01-29、2026-02-17、2027-02-06、2028-01-26、2029-02-13、2030-02-03、2035-02-08、2036-01-28（MoonAstro、ChineseFortuneCalendar、ChinaHighlights、KarmaWeather、曆年 zodiac 年起訖表等）。其中 1999-02-16 一列在抄錄來源的擷取中遺漏，由同表 1998 列的結束日（1999-02-15）反推並與通行曆表（1999 兔年始於 1999-02-16）核對一致後補入。
- 表自洽複核（作者以腳本對 SPEC 內嵌表逐列驗證）：78 列齊全（1959–2036 無缺年）；每列落在 01-21 至 02-20；相鄰間隔分布 353×1、354×32、355×16、383×1、384×26、385×1，皆為合法農曆年長。初版自洽規則誤寫間隔不含 353，複核發現 1965→1966 間隔為 353 天（合法短年）後已修正 SPEC 兩處文字。
- 公式錨交叉核對：對表內每一年以 (Y−4) mod 12 與 (Y−4) mod 10 計算，與公開生肖／干支稱呼抽查一致——1960 庚子鼠、1984 甲子鼠、2000 庚辰龍、2024 甲辰龍、2025 乙巳蛇、2035 乙卯兔、2036 丙辰龍皆符。

## 與概念筆記／任務簡報的出入（依事實修正）

1. **2036 年春節日**：任務簡報提示「published 2036 CNY is 2036-02-19」與事實不符。多個公開來源（ChinaHighlights、StarWalk、KarmaWeather、HerongYang 曆表、ZodiacTales）一致為 **2036-01-28**（丙辰龍年，訖 2037-02-14）；02-19 是 **2034** 年春節（甲寅虎年）。SPEC 採 2036-01-28。
2. **新增 1959 邊界列**：簡報固定出生日期下限 1960-01-01，但 1960-01-01 至 1960-01-27 出生者屬生肖年 1959（己亥豬），其 spanStart 需要 CNY(1959)=1959-02-08。故比照 2036 邊界列作法加入 1959 列，僅作下界邊界，不開放 1960-01-01 以前的出生日期查詢。

## 概念未固定、由作者決定並寫入 SPEC 的事項

1. 輸入契約：核心只收 `birthDate`（必填）與 `asOfDate`（選填，空字串 = 未提供）兩個國曆日期字串；不收「今年」之類相對值，UI 若要帶入今天日期只能先填入欄位再執行，核心維持確定性。
2. 本命年語意：以「asOfDate 落入的生肖年動物 == 出生動物」判定；下一個本命年定義為正在本命年時取 +12 年、非本命年時取下一個同動物生肖年；其開始日僅在 ≤2036（表內）時給出，否則只給年、日期為 null。
3. asOfDate 有效範圍 1960-01-01 至 2036-12-31（比出生日期多含 2036 年，使「下一個本命年」判定可用到表上界）；asOfDate 與 birthDate 不做先後跨欄檢查。
4. 錯誤碼沿用本批慣例並新增日期專用三碼 DATE_FORMAT、DATE_INVALID、OUT_OF_RANGE；驗證順序寫死（SCHEMA → INPUT_LIMIT → UNICODE → EMPTY → DATE_FORMAT → DATE_INVALID → OUT_OF_RANGE，欄位序 birthDate 先於 asOfDate）。
5. 羊的英文固定 Goat；生肖象徵文字採地支單字（子丑寅卯…），不用 emoji；干支拼音只作英文介面化妝層對照，不進核心結果。
6. 下載報告沿用本批固定格式 `chinese-zodiac-report.json` 與序列化規則。

## Fixtures 複核

12 筆核心案例（8 成功、4 錯誤）與 3 筆 controller 案例。成功案例的預期全部先依 SPEC 的表與公式手算，再以一次性獨立腳本（直接解析 SPEC.md 內嵌春節表、以 (Z−4) mod 12／mod 10 錨重算每個結果欄位，含 spanEnd = 次年春節前一日）逐案比對，12/12 完全一致；兩個 controller 案例內嵌的 lateResult 與 `pre-cny-2025` 的 result 逐欄相同。含簡報要求的三類：春節前案例（`pre-cny-2025`，2025-01-15 → 龍）、春節當天案例（`cny-day-2025`）、1960 年代案例（`sixties-rat`、`jan-1960-prev-year`）。fixtures.json 已驗證可解析為合法 JSON。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
