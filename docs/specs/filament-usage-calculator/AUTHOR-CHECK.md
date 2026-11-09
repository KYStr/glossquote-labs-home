# 3D 列印線材用量換算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格任務 `labs-filament-usage-calculator-spec-20261109`（由主代理登記）。這是作者本人對文件的檢查，**不是獨立審查**；ready 與否由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：於 base `ce8931f2` 全文檢索 `docs/specs/`（101 份預案）、`tools/`、`sources/` 與 registry 的 filament／3D 列印相關項目，無同功能工具。最相近為 `parcel-billable-weight`（包裹尺寸→貨運計費重量，無密度表、無線軸語意）與 `concrete-bag-calculator`（體積→預拌袋數，離散包裝），實質差異已寫入 SPEC scope。

- 案例複算：11 筆核心案例的 expected 先以手算公式推導，再以兩條獨立路徑各重算一次——(1) Python `math.pi` 雙精度浮點、(2) Python `Decimal` 50 位高精度 π——兩路結果逐值相同；寫入 fixtures.json 後另以第三支獨立腳本讀回檔案逐案重跑比對，11/11 一致（含 3 筆 controller 的 lateResult 與核心案例 1 完全相同）。全部輸出值距最近 round-half-up 平局點 ≥0.0024（最小為 `length-pla-175` 的 gramsPerMetre 2.9825…→「2.98」，距 2.985 尚有 0.00245），遠大於 double 誤差，具跨引擎重現性。核心案例含任務必備三案：2.85 mm（`length-petg-285`、`spool-tpu-custom`）、線軸剩餘（preset／自訂／恰為零／負值四態）、重量換長度（`weight-pla-175`、`weight-abs-175`）。

- 與概念筆記 #40 的出入（以任務指示與一致性為準，已固定於 SPEC 並在此揭露）：
  1. 材料表：概念筆記列 PLA-CF 1.30，任務指示固定六種材料為 PLA／PETG／ABS／TPU／ASA（1.07）／PC（1.20）。從任務指示；碳纖維複合線材密度隨纖維含量差異大，不列入固定表。
  2. 空軸 preset：概念筆記為 140／175／220 g，任務指示為 140／200／250 g。從任務指示，另保留自訂。
  3. 長度捨入：概念筆記為 0.1 m，任務指示為小數 2 位。從任務指示（重量 1 位、長度 2 位、成本 2 位）。
  4. 成本模式：概念筆記未列，依任務指示新增為第四模式（整軸價格 × 用量 ÷ 整軸淨重，線性；幣別僅顯示）。

- 密度表來源：PLA 1.24、PETG 1.27、ABS 1.05、TPU 1.21、ASA 1.07、PC 1.20 g/cm³ 為業界切片軟體材料設定與線材商公布的常用標稱值，SPEC 明定為固定資料並附「實際因品牌與配方而異」的揭露句，不宣稱為量測真值。

- 八節完整度自查：goal 有具體情境與裝置；scope 列明 MVP 與非目標及與近似工具差異；userFlow 含六狀態表、重設預設值與範例入口；inputsOutputs 固定 12 欄位文法／上限／值域、生效欄位規則、驗證順序、固定錯誤碼與 field、公式與捨入點；implementation 定核心／controller／DOM 分層、Worker 世代、離線與 CSP；acceptance 預宣告九面向與證據；tests 有 14 筆字面案例表與額外邊界清單；handoff 記任務 id、目標目錄與交驗責任。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
