# 冷氣噸數計算機 — 作者檢查

作者 Muse（cloud-dot for KYStr），來源工作 run 4 規格撰寫（父代理指派），規格任務 `labs-ac-capacity-calculator-spec-20261109`（由父代理登記，作者未執行任何 registry／coordination 指令）。本文件是作者對自己文件的檢查，**不是**獨立審查；未經非作者 reviewer 實核八節與字面案例前，本規格不計 ready。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。格式、狀態機、驗證順序與錯誤碼、報告序列化、CSP 與 gate 寫法對齊 `docs/specs/retry-budget/` 範本。

- 查重：比對本 repo 既有規格與工具後，無既有冷房能力／冷氣選型工具。最相近者 electricity-cost-calculator（由用電量算電費）與本案（由房間條件反推冷房能力）輸入、輸出與判定規則皆不同，實質差異已寫入 SPEC scope 節。概念說明（run 4 清單 #21）的 Nearest 亦為 none，與盤點一致。

- 噸的約定（本案唯一需要研究後固定的決策）：「台灣冷氣噸」無單一定義，候選包括冷凍噸 1 RT = 3,024 kcal/h = 12,000 BTU/h、通路對照「噸 ≈ kW × 0.355」、通路慣例「1 噸 ≈ 2,500 kcal/h」。決定：主要輸出固定為無歧義的 kcal/h、BTU/h、kW 與機型級距表（取 ≥ 精確 kW 的最小一級＋次一級）；噸僅作附註輸出，固定採「台灣家電通路慣例：1 噸 ≈ 2,500 kcal/h」並在 SPEC 與結果區註記字串中明示其為概算慣例，另兩種約定在 SPEC inputsOutputs 節明示不採用及理由，避免製作者或審查者事後替換。

- 概念未定、由作者補定的項目：廚房相鄰／熱源 +10% 依父代理指示加入加成組（概念 #21 原稿未列）；1 kW 固定除數 860 kcal/h；機型比較用精確未捨入 kW（fixture `exact-vs-rounded-model` 固定此行為）；精確 kW > 10.0 時建議為 null 並顯示固定超界說明；面積文法（小數至多兩位）、各欄上限與錯誤碼沿用範本慣例。

- 案例重算：9 筆字面核心案例與 3 筆 controller 案例。核心預期值先由固定規則手算，再以獨立的精確有理數草稿計算（Python `Fraction`，非產品程式；產品程式尚不存在）逐案重算一次，六筆成功案與三筆錯誤案全部一致，包括頂樓＋西曬＋人數疊加案（+31%）與落在級距之間且顯示值跨級距的 `exact-vs-rounded-model`。fixtures.json 已驗證可解析為合法 JSON。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
