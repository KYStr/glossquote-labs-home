# 入學年度與年級推算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（run 4 規格作者），規格任務 `labs-school-entry-year-spec-20261109` 由主代理登記。**這是作者本人的文件檢查，不是獨立審查**；ready 與否由非作者 reviewer 對同一固定候選判定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

## 查重

已比對本 repo `docs/specs/` 全部 101 份既有規格、`sources/legacy/` 與 registry 規格清單：沒有入學學年、cohort 或年級推算的既有規格或工具。最相近者與差異已寫入 SPEC scope：

- legacy `date-calculator`：通用日期差與加減，沒有學年度、足歲劃分與年級語義。
- `pregnancy-due-date-calculator`：同為日期推導，對象是孕期與預產期，與入學 cohort 無關。

## Fixtures 複核

13 筆核心案例先依 SPEC 固定規則逐案手算（入學年 E、入學月齡 M、幼兒園四年、目前 g/a 與十二年表逐列），寫入 fixtures.json 後再以一份獨立重算（不共用手算路徑）逐欄位深度比對：13/13 全部一致，含三個錯誤順序案例與五個錯誤案例。重算時同時交叉核對入學年的兩種等價定義（(月,日) ≤ (9,1) 字典序定義，與「9 月 1 日 ≥ 滿六歲屆滿日 A6 的最小年」定義），逐案相符。3 筆 controller 案例內嵌的 lateResult 與 `sep1-exact` 的 result 逐欄位相同，已核對。fixtures.json 已驗證可解析（16 案：13 core + 3 controller）。

邊界覆核點：9 月 1 日出生（E = 出生年+6、M = 0）與 9 月 2 日出生（E = 出生年+7、M = 11）僅差一天差一屆；2020-02-29 出生者 A6 = 2026-03-01（2026 非閏年）、M = 6；出生 2026-08-10、查詢 2026-08-20 時所屬學年度起始年為 2025、g = −6、ageAtStartYears = null。

## 概念筆記未固定、由作者決定並寫入 SPEC 的事項

1. **日期範圍**：兩欄固定 1912-01-01 至 2199-12-31。概念筆記未給界線；取 1912 起使輸入年份的民國年恆 ≥ 1，上限 2199 為任意但固定的實作界線。
2. **錯誤碼**：範本工具無日期欄位；新增 DATE_FORMAT（語法）、DATE_INVALID（非真實曆日）、DATE_ORDER（出生晚於查詢）三碼，沿用全組 `{code, field, row}` 形狀與先欄位後跨欄的驗證順序。
3. **入學時年齡形狀**：固定輸出 `ageYears`（構造上恆為 6 的不變量）加 `ageMonths`（自滿六歲屆滿日至入學年 9 月 1 日的足月數，0–11），概念筆記只要求「age at entry」未定形狀。
4. **ageAtStartYears 的 null 規則**：a = g + 5 為學年度起始足歲；a < 0（出生晚於該學年度 9 月 1 日）時固定輸出 null 而非負數，案例 `newborn-before-first-september` 固定此行為。
5. **已畢業狀態**：g ≥ 13 固定 stage=`graduated`、名稱「已畢業（高中）/ Graduated (Senior High School Completed)」，概念筆記只說 beyond = 已畢業，未定 stage 碼與英文。
6. **幼兒園四班別入學年**：任務書班別含幼幼班（足 2 歲），概念筆記 #30 只提小班／中班／大班入學年；依任務書輸出四班別（E−4 至 E−1）。
7. **「使用今天」**：固定為只填入 asOfDate 的草稿編輯（使舊結果失效、不自動執行），核心永遠只收明確 asOfDate，確保 fixtures 可重現；重設預設為兩欄皆空。
8. 報告檔名 `school-entry-year-report.json`、規劃 origin `https://school-entry-year.glossquote.com`（尚未配置）比照範本慣例固定。

## 與概念筆記／實務的出入（依事實與任務固定，並記錄）

- **學年度起訖**：概念筆記 #30 寫「學年度 starting Aug 1」（教育部學年度確為 8 月 1 日至次年 7 月 31 日，國小實際開學日在 8 月底至 9 月 1 日前後）。本次任務書明確固定學年度為 9 月 1 日至次年 8 月 31 日、並以「asOf 月份 ≥ 9」推導所屬學年度，故 SPEC 依任務書固定 9 月 1 日邊界。法定入學劃分點本身即為 9 月 1 日足六歲，cohort、入學年與各年級歸屬在兩種學年度定義下結論相同；差異只在對照表 span 的起訖日期呈現，已在 SPEC 固定為 09-01 至次年 08-31。
- **2 月 29 日屆滿日**：依任務書固定為非閏年 3 月 1 日（民法期間計算與年齡屆滿的通行解釋）；另有以 2 月 28 日為屆滿的少數見解，本規格不採用，並已在 SPEC 固定單一規則。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
