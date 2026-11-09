# 混凝土用量計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格工作 `labs-concrete-bag-calculator-spec-20261109`（由主代理登記）。這是作者自己的文件核對，**不是**獨立審查；ready 與否由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對 `tools/`、`sources/candidates/`、`sources/legacy/` 與 `docs/specs/` 既有清單，無混凝土或袋裝預拌工具。最相近的是 tile-estimator（磁磚，面積→片數）與 paint-coverage-calculator（油漆，面積→罐數），本案是體積→袋數，公式、單位管線（公分→m³→yd³）與對照表（預拌產量）皆不同；parcel-billable-weight 是物流材積重，無關。本案非改名重複。

- 袋裝產量表查證（重要）：概念筆記給的概算（40 lb ≈ 0.011 m³、60 lb ≈ 0.017 m³、80 lb ≈ 0.022 m³）與廠商公布的英制產量換算**不一致**，故未採用。主要預拌廠商公開產品資料的常用產量為 40 lb ≈ 0.30 ft³、60 lb ≈ 0.45 ft³、80 lb ≈ 0.60 ft³；以 1 ft³ = 0.028316846592 m³ exact 換算得 0.0084950539776／0.0127425809664／0.0169901079552 m³，三者同源、比例一致（0.30：0.45：0.60）。SPEC 已寫死此一致表並註明來源，實作者不得改用概念筆記的概算。概念筆記與事實衝突時依指示從事實，此差異在此揭露。

- 案例重算：7 筆字面核心案例、3 筆 controller 案例。全部 expected 由作者以規格的有理數管線手算，並以獨立的精確有理數計算（分數運算，非產品程式）複核一次，兩次一致。關鍵核對點：slab-default-waste 袋數比例 155.384534／103.589689／77.692267 → ceil 156／104／78；cylinder-four 單件 π×0.15²×2 = 0.1413716694 m³，含損耗後比例 73.223236／48.815491／36.611618 → 74／49／37；waste-crossing 在損耗 0% 時比例 11.771556／7.847704／5.885778 → 12／8／6，損耗 10% 後 12.948711／8.632474／6.474356 → 13／9／7，三種袋數各跨一個整數邊界；slab-decimal-nowaste 淨體積恰 1.0125 m³，顯示 half-up 進位為 1.013；yd³ 換算 1 yd³ = 0.764554857984 m³（0.9144³，exact）。

- 概念筆記未固定、由作者決定的事項：尺寸輸入固定為公分（小數至多 2 位、上限 10000 cm），件數上限 999，損耗率上限 100%；袋數無下載／匯出產物；錯誤物件形狀採 `{code,path}`（JSON Pointer）；顯示體積固定 3 位小數 half-up，袋數由未捨入體積計算；π 固定小數 30 位常數。理由皆為讓管線可精確重算且與範本格式一致，已在 SPEC 寫死。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
