# 股票平均成本計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格任務 `labs-stock-average-cost-spec-20261109`（由主代理 register-spec，作者未執行任何 registry 指令）。作者文件核對，待非作者 readiness。本文件是作者自己的檢查，**不是**獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對本 repo `docs/specs/` 全部 101 份預案與 `tools/` 既有工具 slug，沒有股票、持股、投資組合或平均成本類工具。最相近者為 `compound-interest-calculator`（複利成長推估）與 `mortgage-amortization`（負債攤還），實質差異見 SPEC scope 節。概念來源稱 nearest 為 none，與盤點結果一致。

- 案例重算：10 筆字面核心案例的 expected 先由作者依 SPEC 固定規則手算（µ 整數模型、手續費與攤提公式逐筆驗算），再以一份獨立撰寫的試算腳本依同一固定規則重算一次，10/10 完全一致；其中 `fifo-sell-two-lots` 為跨兩批次攤提、`oversell` 為賣超錯誤案例。3 筆 controller 案例比照範本的狀態檢查點撰寫。

- 作者自行決定的規格細節（概念說明未固定者）：(1) 買賣合併為一份依序處理的清單，合計上限 20 筆；(2) 手續費模型固定為全清單共用一個基點費率（0–1000 bps，預設 0），每筆 fee = round-half-up(成交金額 × bps / 10000)，買進計入批次成本、賣出自所得扣除，不含證交稅；(3) 金額內部單位固定為 10⁻⁴（µ）整數、禁止浮點，輸出為恰 4 位小數字串；(4) 部分攤提以 round-half-up 比例計算、整批結清時恰以剩餘成本結算，避免殘差；(5) 持股為零時 averageCostPerShare 為 null。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
