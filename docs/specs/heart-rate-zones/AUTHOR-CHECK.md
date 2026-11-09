# 心率區間計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格 task `labs-heart-rate-zones-spec-20261109`（由主代理登記，作者未執行 registry 操作）。本文件是作者本人對文件的檢查，**不是**獨立審查；readiness 須由非作者 reviewer 對同一固定候選另行核對。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對基線 checkout 的 `docs/specs/`、`sources/candidates/`、`sources/legacy/`，無心率／心肺類工具存在（`time-zone-converter` 僅名稱含 zone，內容為時區換算）。概念備註的最近項判定為「無」；最接近的健康／運動工具為 `bmi-tdee-calculator`、`running-pace-calculator`、`sleep-cycle-calculator`，實質差異見 SPEC scope 節。

- 案例複算：fixtures 共 10 筆（7 核心 + 3 controller）。作者先依 SPEC 釘死規則手算全部預期值，再以一份獨立寫成的整數十分位算術腳本（未共用任何產品程式）逐案複算比對，7 個核心案例全數一致；controller 兩案的 lateResult 與 `karvonen-basic` 的核心結果逐字相同。涵蓋點：Tanaka 帶小數（age 35 → 183.5 → 184）、Karvonen 基本案、實測覆蓋、僅實測無年齡（Karvonen 邊界 .5 四捨五入）、resting ≥ used 錯誤、年齡範圍錯誤、缺最大心率來源錯誤。

- 概念備註未釘死、由作者決定並寫入 SPEC 的事項：
  1. restingHr 定為選填：未填時 Karvonen 表為 null 並顯示固定說明，不報錯；有填才做 30–120 範圍與 resting < used 檢查。
  2. 欄位範圍：age 10–100 歲、measuredMaxHr 100–230 bpm、restingHr 30–120 bpm，皆整數。
  3. 共享邊界處理：邊界值先各自四捨五入為整數 bpm，第 k≥2 區下限 = 前一邊界 +1，保證五區連續、無縫隙、無重疊，Z5 上限恆等於採用最大心率。
  4. Tanaka 小數結果先四捨五入為整數最大心率，區間再由整數值計算；全程以整數十分位算術避免浮點誤差。
  5. 實測覆蓋優先於公式，且年齡有填但不合法時仍先報錯；僅填實測時 fox/tanaka 為 null。
  6. 本工具不提供下載／複製匯出（區間表為唯讀對照），故 controller 案例以 resultVisible 取代範本的 reportAvailable 檢查點。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage 及部署皆 NOT_RUN，九面向分數 null。未固定候選或未獨評前不計 ready。
