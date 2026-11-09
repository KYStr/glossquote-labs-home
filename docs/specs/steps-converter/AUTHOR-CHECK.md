# 步數換算 — 作者檢查

作者：cloud-dot（run 5 規格撰寫，登記與送審由主統籌執行）。這是作者對自己文件的核對，**不是**獨立審查；未經非作者 reviewer 實核八節與字面案例前，本規格不計 ready。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：於 base `81dbb04e` 列出 `docs/specs/` 全部 101 份並以 step/calor/walk/pace/stride 關鍵字核對。最相近者為 `steps-easing`（CSS 動畫 timing function，與步行無關）與 `running-pace-calculator`（距離＋時間→配速，無步數輸入）；無既有「步數＋步幅→距離」規格。實質差異已寫入 SPEC 的 scope。

- 係數查證（2026-11-09 以公開來源核對，概念備註的兩值皆成立，無更正，僅補揭露）：
  - 步幅 0.414：與概念備註一致。公開來源普遍以 0.414 × 身高估步幅，並溯源至 ACSM 迴歸（Hoeger et al., ACSM Health & Fitness Journal 2008 一英里步數研究）；性別值男性 0.415、女性 0.413。SPEC 釘版不分性別的 0.414（精確分數 207/500），並在揭露與 FAQ 註明 0.413–0.415 範圍與隨步速變動。
  - 熱量 0.75 kcal/kg/km：概念備註原寫「0.75...」待查證。查得 Compendium of Physical Activities（2011）平地步行 MET 推得的每公里總成本 = MET ÷ 步速：3.5 @ 4.8 km/h ≈ 0.73、4.3 @ 5.6 km/h ≈ 0.77，一般步速約 0.73–0.77；0.75 是此範圍的中點、也是公開計算器常用的總消耗經驗值。淨消耗（扣休息代謝）約 0.5。SPEC 釘版 0.75 為「總消耗（含休息代謝）」，揭露原文與 FAQ 同時註明範圍與淨值，避免被讀成精確測量。

- 雙重推導（先手算、後獨立重算，兩者一致才定稿）：
  - 手算：每筆成功案例以精確分數逐步推導。例如 `height-basic`：步幅 170 × 207/500 = 70.38（顯示 70.4）；距離 10,000 × 70.38 / 100,000 = 7.038 → 7.04；每公里步數 50,000,000 / 35,190 = 1420.858… → 1421。`calories-from-height`：熱量以未捨入距離計，3/4 × 60 × 5.4648 = 245.916 → 246。半數進位案例刻意納入：`measured-basic` 距離 3.275 → 3.28、`calories-tie` 熱量 49.5 → 50、`measured-calories-2dp-stride` 步幅顯示 72.25 → 72.3。
  - 獨立重算：另以 Python `fractions.Fraction` 從 SPEC 文字重寫驗證順序（SCHEMA → 欄位序 → 容量/UNICODE/EMPTY/文法/範圍，未啟用欄位只查容量與 surrogate）與公式（步幅 207/500、熱量 3/4、half-up 只捨入一次），不經手算路徑。結果：19 筆核心案例 expected 全部深度相等（19/19），3 筆 controller 的 lateResult 物件與 `height-basic` 結果逐值相等。
  - 報告 bytes：`height-basic` 結果依釘版 canonical 序列化為 `{"caloriesKcal":null,"distanceKm":7.04,"stepsPerKm":1421,"strideCm":70.4}` 加一個 LF，共 74 bytes，SHA-256 為 `4489db044b31e62ef7cd6ee2748de127590b4788d0f641feb2ad3c274939fdcd`，已釘入 SPEC 的 tests 節。

- 19 筆字面核心案例、3 筆 controller 案例。核心含 10 成功（兩種步幅來源、熱量開關、零步數、上限、顯示捨入不回饋、未啟用欄位忽略）與 9 錯誤（INTEGER_FORMAT ×2、ENUM、RANGE ×2、DECIMAL_FORMAT ×2、EMPTY、SCHEMA）。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
