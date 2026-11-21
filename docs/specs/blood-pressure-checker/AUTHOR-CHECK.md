# 血壓分級 — 作者檢查

作者 subagent（run 6 規格作者，分支 `muse/spec-blood-pressure-checker-20261121`），來源工作 run 6 概念第 2 條。作者文件核對，待非作者 readiness。作者不得稱自己的文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 已比對 run 6 概念清單 40 項。最相近的 `cholesterol-checker`（血脂四項／NCEP ATP III）與 `hba1c-converter`（單位換算）實質差異見 scope。registry 全量比對由家長在登記時執行（作者不跑 registry 指令）。

- 20 筆字面案例：17 筆核心、3 筆 controller。`crisis-boundary-not` 核對點為「180/120 不屬危象（嚴格大於），為第二期」；`stage1-diastolic` 與 `stage2-diastolic` 核對「取較高者」規則。

## 來源核實（概念筆記 vs 一手來源）

概念筆記的 AHA/ACC 2017 五級閾值，經核對一手來源全部正確，無需修正：

- Whelton PK et al., 2017 ACC/AHA Guideline, *Hypertension* 2018;71(6):e13–e115，Table 4 "Categories of BP in Adults"：Normal <120 and <80；Elevated 120–129 and <80；Stage 1 130–139 or 80–89；Stage 2 ≥140 or ≥90；並註明 "Individuals with SBP and DBP in 2 categories should be designated to the higher BP category."；危象 SBP >180 and/or DBP >120（Section 11.2）。
- AHA 公開說明頁 https://www.heart.org/en/health-topics/high-blood-pressure/blood-pressure-explained/（2026-11-21 核對）：同一張表，危象為 "HIGHER THAN 180 and/or HIGHER THAN 120"。
- 採用 AHA/ACC 2017，未改用台灣指引：概念筆記首選即 AHA/ACC 2017，且台灣高血壓指引（2022 台灣高血壓指引）分級閾值與 AHA/ACC 2017 一致（130/80 為高血壓切點），無衝突需要取捨。

## 兩種推導（手算 → 獨立重算）

方法一（手算）：逐案對照 SPEC §5 釘版表，以「危象 → 第二期 → 第一期 → 偏高 → 正常」順序判定，先中即停；邊界案逐值比對閾值符號（<、≥、>）。例如：

- `normal-boundary` 119/79：119 < 120 且 79 < 80 → normal；任一值 +1 即跨級。
- `elevated-boundary-low` 120/79：120 ≥ 120 且 79 < 80 → elevated。
- `stage1-diastolic` 118/85：118 < 120（正常帶），85 落 80–89 → 取較高者 stage1。
- `stage2-boundary` 140/90：140 ≥ 140 → stage2。
- `crisis-boundary-not` 180/120：180 不 > 180、120 不 > 120 → 非危象；180 ≥ 140 → stage2。
- `crisis-diastolic` 150/125：125 > 120 → crisis（收縮壓僅 stage2 帶，舒張壓決定）。
- `diastolic-above-systolic` 110/120：兩值各自在範圍內，但 120 > 110 → 跨欄 RANGE，field diastolic。
- `decimal-systolic` "120.5"：含小數點，非 ASCII 整數字串 → INTEGER_FORMAT，field systolic。
- `systolic-out-of-range` 310：整數文法通過，超出 40–300 → RANGE，field systolic。

方法二（獨立 script 重算）：以 Python 另寫一份分類器（`/tmp/bp-second-check.py`，直接取用公開分級表、不共用手算推導），對 fixtures.json 全部 17 筆核心案例逐一比對 expected。結果：17/17 一致，0 失敗。3 筆 controller 案例為狀態流程描述，script 不覆蓋，留待產品測試以假 Worker 驗證。

## 釘版事項

- 分級表字面數據與出處見 SPEC §5；危象採嚴格大於；「取較高者」由判定順序實現。
- 免責聲明原文（中英）釘版於 SPEC §5，結果區與報告皆顯示；每級一般性提醒一字不差取自同一節的表。
- 輸入範圍：收縮壓 40–300、舒張壓 20–200 mmHg，整數字串，raw 每欄最多 4 單元；舒張壓不得高於收縮壓（跨欄 RANGE，field diastolic）；驗證順序 systolic → diastolic → 跨欄；預設兩欄皆空。
- 下載檔名 `blood-pressure-report.json`，canonical JSON 規則同既有規格（keys 按 UTF-16 code units 升序、末尾一個 LF、UTF-8 無 BOM、上限 2,097,152 bytes）。

## 未驗項

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
