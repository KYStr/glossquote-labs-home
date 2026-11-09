# 兒童身高預測 — 作者檢查

作者 `cloud-dot:e3105f7c-4816-4540-ab77-ddfae167dde5:/home/hatch/workspace/glossquote-factory/build5/specs/child-height-predictor`，run-5 規格作者（cloud-dot）。本文件為作者文件核對，**不是獨立審查**；readiness 須由非作者 reviewer 對同一固定候選實核。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。基線為 FETCH_HEAD `50b1b59e19529f0fa4a452d98833ae4845ccac37`（`codex/initial-publication`）。

- 查重：已比對 checkout 內 `docs/specs/` 全部目錄（以 height／growth／child 關鍵字與完整清單核對），無兒童身高或成長預測既有規格。最相近者 `bmi-tdee-calculator`（本人目前 BMI／熱量，不輸入父母身高、問題不同），實質差異已寫入 SPEC scope。

- 字面案例 17 筆：核心 14 筆（成功 6、錯誤 8）、controller 3 筆。

- 公式與區間的來源核對（2026-11-09 以 web 搜尋查證）：
  - 父母身高中值法出自 Tanner JM, Goldstein H, Whitehouse RH. "Standards for children's height at ages 2–9 years allowing for heights of parents." Arch Dis Child. 1970;45(244):755–762。男孩 (父 + 母 + 13) / 2、女孩 (父 + 母 − 13) / 2，與 run-5 共用簡報釘版一致，無更正。
  - ±8.5 cm 為 Tanner 1970 原始目標區間，約涵蓋第 3 至第 97 百分位；2025 年 BMC Pediatrics 回顧（Ciancia et al.）與 2024 年 Children 研究（Zeevi et al.）均如此描述（經搜尋結果引文核對）。變體揭露：Tanner 後來曾放寬為女孩 ±9 cm、男孩 ±10 cm，美國兒科學會教學材料用 ±10.2 cm。本規格依簡報釘版 ±8.5 cm（原始帶寬），變體已揭露於本文件，FAQ 只陳述釘版值與其百分位含義。
  - 首個案例（父 178、母 165、男孩 → 178.0，區間 169.5–186.5）與公開教學範例（solvetutor.com 的 mid-parental height 說明頁，同組輸入同結果）交叉核對一致。

- 雙重推導（成功案例，第一法為十進位手算）：
  - `boy-typical`：(178 + 165 + 13) / 2 = 356 / 2 = 178.0；178.0 − 8.5 = 169.5；178.0 + 8.5 = 186.5。
  - `girl-same-parents`：(178 + 165 − 13) / 2 = 330 / 2 = 165.0；156.5；173.5。
  - `decimal-half-up`：(175.5 + 168.0 + 13) / 2 = 356.5 / 2 = 178.25 → half-up 178.3；178.25 − 8.5 = 169.75 → 169.8；178.25 + 8.5 = 186.75 → 186.8。
  - `exact-tenth`：(172 + 160 − 13) / 2 = 319 / 2 = 159.5；151.0；168.0。
  - `min-endpoints`：(100.0 + 100.0 − 13) / 2 = 187 / 2 = 93.5；85.0；102.0。
  - `max-endpoints`：(230.0 + 230.0 + 13) / 2 = 473 / 2 = 236.5；228.0；245.0。
  - 第二法：另以獨立 Python 指令稿（Fraction 精確算術、獨立文法 regex 與驗證順序、二十分之一公分整數模型）重算全部 14 筆核心案例並與 fixtures.json 深度比對，**14／14 一致、0 不符**，才定稿。錯誤案例 8 筆另逐筆依 SPEC 釘版順序手算核對（SCHEMA 整體先行；欄位序 fatherHeightCm → motherHeightCm → childSex；欄內 INPUT_LIMIT → UNICODE → EMPTY → 文法 → RANGE），含 `input-limit` 的「容量先於文法」與 `schema-missing` 的 field=null。

- 範圍決定與依據：
  - 捨入釘版一位小數 round-half-up、只在輸出時捨入一次；區間由未捨入預估值 ±8.5 後各自捨入。因區間端點與預估值同為二十分之一公分整數且端點差恰 340，已捨入區間寬恆為 17.0、同父母男女差恆為 13.0，SPEC tests 已列為可斷言性質。
  - 身高接受範圍 100.0–230.0 cm 為作者釘版的合理性守衛（非醫學界限，SPEC 已明示）；查得同一方法的公開實作（recatools）接受 120–230 cm，本規格下限放寬至 100.0 為刻意的產品選擇，端點與剛好越界（99.9／230.1）皆有案例。
  - 依孩子目前年齡／身高的生長百分位模式：run-5 共用簡報概念 #17 明列為範圍外（無生長表資料），本規格列為非目標並在 FAQ 說明，未釘版任何未查證的生長表。
  - 聲明文字（統計估計、非醫療建議、遺傳只是因素之一、個別兒童可能落在區間外）依簡報要求兩語釘版常駐結果旁，不得摺疊。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，九面向分數 null。未固定候選或未經非作者獨評前不計 ready。
