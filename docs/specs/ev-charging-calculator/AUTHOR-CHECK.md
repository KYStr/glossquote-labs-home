# 電動車充電試算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（executor cloud-dot），來源工作 `labs-ev-charging-calculator-spec-20261109`。本文件是作者對自己文件的檢查，**不是**獨立審查；是否 ready 須由非作者 reviewer 對固定候選重算案例、核對八節後決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對本 repo `docs/specs/` 全部 101 份既有規格，無 ev-charging 或同名／改名重複。最相近者為 `fuel-cost-calculator`（汽油行程油費；不同能源、輸入與時間模型）、`electricity-cost-calculator`（由度數與費率級距算家庭電費帳單；不算單次充電時間）、`battery-swap-plan`（換電排程；非插槍充電），實質差異已寫入 SPEC scope。

- 8 筆字面核心案例、3 筆 controller 案例。每筆核心 expected 由作者依 SPEC 管線以精確十進手算，再以獨立的第二遍十進運算（Python Decimal、ROUND_HALF_UP）逐筆重算比對，11 筆全數一致，包括：`home-ac` 牆端 40.00 kWh、時間 2400÷7＝342.857…→343 分；`dc-fast-charge` 牆端 4875÷92＝52.9891…→52.99、費用 476.902…→477；`small-topup` 電池端 0.825 精確半進位 →0.83（此案專為擋二進浮點誤差而設）。錯誤案例的文法／範圍／跨欄順序亦逐筆核對（`60.123` 不合 2 位小數文法、效率 101 超出 50–100、目標 50 < 目前 80 觸發 SOC_ORDER）。

- 概念未固定、由作者決定並寫入 SPEC 的事項：(1) 目標等於目前電量 → 零充電成功（`needsCharge:false`，全零輸出），不是錯誤；目標低於目前電量 → SOC_ORDER 錯誤。(2) 時間模型固定為「充電器全程以額定功率自牆端取電」，故時間以牆端電量 ÷ 功率計算，效率同時影響電量與時間。(3) 效率範圍固定 50–100 整數 %、預設 90。(4) 電量輸出為恰好 2 位小數的十進字串，時間為總分鐘整數（四捨五入），費用為整數（四捨五入），全部只在輸出端由精確值捨入一次。(5) 容量上限 500 kWh、功率上限 1000 kW、電價上限 100／kWh。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
