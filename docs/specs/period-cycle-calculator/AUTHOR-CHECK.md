# 生理週期計算 — 作者檢查

作者 `cloud-dot:ea83d61d-6573-4b46-9971-cc014df3e2b3:/home/hatch/workspace/glossquote-factory/build5/specs/period-cycle-calculator`，run-5 規格作者（cloud-dot）。本文件為作者文件核對，**不是獨立審查**；readiness 須由非作者 reviewer 對同一固定候選實核。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。基線為 FETCH_HEAD `81dbb04eade03cf1fe20dd631f01039d7787f51d`（`codex/initial-publication`）。

- 查重：已比對 checkout 內 `docs/specs/` 全部 101 個目錄與 registry 規格名稱，無 menstrual／period-cycle 既有規格。最相近者與實質差異已寫入 SPEC scope：`pregnancy-due-date-calculator`（懷孕後以 LMP 推預產期）、legacy `date-calculator`（一般日期加減，無週期模型）、`sleep-cycle-calculator`（睡眠週期，非生理週期）。

- 字面案例 21 筆：核心 18 筆（成功 7、錯誤 11）、controller 3 筆。

- 雙重推導（成功案例）：先以日曆逐日手算 7 筆成功案例的全部 28 列（開始日、經期結束、排卵、易孕期起訖），再以獨立的 Python `datetime` 腳本依釘版規則（start 遞推 +cycleLength、ovulation = start + cycleLength − 14、fertile = ovulation −5／+1、periodEnd = start + periodLength − 1）重算並逐欄比對，**28／28 列完全一致、0 不符**，才寫入 fixtures.json。錯誤案例 11 筆逐筆依 SPEC 釘版驗證順序（欄位序 lastPeriodStart → cycleLength → periodLength；欄內 INPUT_LIMIT → UNICODE → EMPTY → 文法 → INVALID_DATE → RANGE）手算核對，含 `extra-field` 的 SCHEMA（field=null）。

- 範圍決定與依據：
  - cycleLength 21–35 天：依 run-5 共用簡報釘版，為成人週期在消費型健康資訊中最常引用的範圍；超出者回 RANGE 而非外推，因固定 14 天黃體期假設在範圍外誤差顯著放大。揭露：FIGO 2018 將正常週期頻率列為 24–38 天，與本工具接受範圍不完全相同；此差異已寫入 SPEC 的 FAQ（兩語），由 reviewer 裁量。
  - periodLength 1–10 天：典型經期 2–7 天、FIGO 正常上限 8 天；1–10 為涵蓋短／長但合理輸入的接受界線，超出回 RANGE。
  - 黃體期 14 天與易孕期 −5／+1 天為簡報釘版慣例，已在 SPEC 的 scope、FAQ 與常駐聲明中揭露為估計慣例，非生理量測。
  - 聲明文字（不可作避孕依據、非醫療建議、異常請諮詢婦產科醫師）依簡報要求兩語釘版常駐，不得摺疊。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，九面向分數 null。未固定候選或未經非作者獨評前不計 ready。
