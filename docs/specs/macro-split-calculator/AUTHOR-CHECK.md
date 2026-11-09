# 三大營養素分配計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格工作 `labs-macro-split-calculator-spec-20261109`（由主代理登記，作者未執行 registry 操作）。本文件是作者對文件的自查，不是獨立審查；是否 ready 待非作者 reviewer 核對。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：於基線 `ad0dd21` 比對 `docs/specs/` 全部 101 份規格目錄、`sources/candidates/` 與 `tools/`，無 macro-split 或三大營養素同名／同功能規格。最相近的 `spec-bmi-tdee-calculator` 固定規格差異見 SPEC scope（它估算熱量目標，本工具只把已給定的目標換成克數）。同批概念中的蛋白質攝取量採依體重 g/kg 法，與本工具的熱量比例法不同，不構成重複。

- 8 筆字面核心案例、3 筆 controller 案例。每筆核心 expected 先由作者依 SPEC 固定規則手算，再以精確有理數（分數）獨立重算一次，兩次一致後才寫入；產品程式未參與 expected 產生。`balanced-2000` 核對點為「脂肪捨入多 3 kcal、最大營養素碳水吸收 −1 克、最終回算差 −1」；`keto-1800-drift-kept` 核對點為「殘差存在但調整量為 0」；`meals-three-split` 核對點為「餘數配前餐且各餐熱量合計等於全日回算」。

- 概念未固定、由作者決定並寫入 SPEC 者：熱量邊界 800–10,000 kcal；漂移規則的精確形式（最大營養素以熱量占比判定、同值依蛋白質／碳水／脂肪順序、調整量 Δg=⌊R/f+1/2⌋、調整量為 0 時 adjustedMacro=null）；`targetKcal` 僅供顯示、不參與克數計算；分餐為 1–6 餐、逐營養素獨立分配、餘數配最前面餐次；具名預設時 pct 欄位完全忽略；自訂總和錯誤碼 RATIO_SUM（field=null）；下載報告比照同批格式 `macro-split-report.json`。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
