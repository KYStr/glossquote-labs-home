# 蛋白質攝取量計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格任務 `labs-protein-intake-calculator-spec-20261109`（由主代理登記）。本文件是作者對自己文件的核對，**不是獨立審查**；readiness 須由非作者 reviewer 對同一固定候選另行核對。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 去重核對：動工前檢查本 repo `docs/specs/`、`tools/`、`sources/candidates/`，無 protein 相關規格或工具，全文搜尋 `protein` 無命中。最相近者為 `spec-water-intake-calculator`（同為體重每公斤換算）：該案輸出飲水毫升區間、模型含活動與氣候加算、只給區間；本案輸出蛋白質克數，含固定係數表、目標值 ±0.2 g/kg 區間與 3／4 餐分配，實質差異已寫入 SPEC scope 節。次近的 bmi-tdee-calculator 算熱量與 BMI，不算單一營養素克數。

- 案例重算：fixtures.json 共 12 筆（9 核心 + 3 controller）。5 筆成功核心案例先以手算（整數十分位：grams(x) = floor((W10·x10 + 50)/100)）逐筆算出，再以一份獨立的整數算術腳本重算一次，兩次結果一致：70 kg × 1.6 → 112（98–126，四餐 28×4）；65 kg × 0.8 → 52（39–65，三餐 18/17/17，餘 1）；80.5 kg × 自訂 1.9 → 152.95 四捨五入 153（137–169，四餐 39/38/38/38，餘 1）；62.5 kg × 2.2 → 137.5 half-up 138（125–150）；20 kg × 1.0 → 20（16–24，三餐 7/7/6，餘 2）。每筆 perMealGrams 合計皆等於 dailyGrams。4 筆錯誤案例對照 SPEC 驗證順序逐一確認 code 與 field。fixtures.json 已驗證可解析為 JSON。

- 概念筆記未固定、由作者決定的事項（皆已寫入 SPEC，reviewer 可挑戰）：(1) 區間由未捨入乘積以係數 ±0.2 各自獨立計算並各做一次 half-up，不由已捨入的目標值加減推導；(2) 捨入點只在克數一步，採 round half-up 並以整數算術定義；(3) 每餐分配的餘數依序加到最前面的餐次；(4) 體重範圍 20.0–300.0 kg、自訂係數 0.1–4.0 g/kg，自訂係數 0.1 時下限係數夾至 0；(5) `factor` 以恰一位小數字串回傳（如 `"2"` 正規化為 `"2.0"`）；(6) 非 custom 時 customFactor 只檢查型別、不驗證值；(7) 預覽候選比照範本 retry-budget：noindex、無 production canonical／hreflang／sitemap、語言連結只帶路徑，正式版才生成絕對 canonical；(8) 沿用範本的固定下載報告 `protein-intake-report.json` 與 Worker／世代號流程。

- 完整性自查：係數表含繁中與英文標籤及代碼；驗證順序與固定錯誤碼（SCHEMA／INPUT_LIMIT／UNICODE／EMPTY／DECIMAL_FORMAT／RANGE／ENUM）與 JSON-Pointer 式 field 路徑齊備；流程六狀態（empty／dirty／busy／success／error／cancelled）含編輯失效、晚到結果丟棄與取消；一般營養資訊聲明已固定繁中與英文原文，並規定緊鄰結果且不可摺疊；九面向已於 acceptance 節預先宣告。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
