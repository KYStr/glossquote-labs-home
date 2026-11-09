# 烤箱溫度換算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格任務 `labs-oven-temperature-converter-spec-20261109`。這是作者本人對文件的檢查，不是獨立審查；是否 ready 由非作者 reviewer 對同一固定候選判定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：在本 repo 的 docs/specs、tools 與 sources 快照中沒有 oven／gas-mark 既有規格或工具。最相近者為通用單位換算 `spec-unit-converter`（docs/specs/unit-converter，legacy）：它做一般單位換算，沒有 Gas Mark 對照表，也沒有旋風烤箱調整慣例；本案只做烤箱溫度並釘死這兩件事，實質不同，不重複。

- 對照表：採用任務簡報釘死的廣泛刊載標準表（Gas ¼–10）。作者核對過：Gas 3 一列各家刊載有 160°C 與 170°C 兩種版本，本表依簡報釘死 170°C／325°F 並在 SPEC 標明來源與「不得另查改值」。表的 °F 欄是刊載慣用成對值、不是公式結果（例如 Gas 1 的 140°C 以公式算是 284°F，表列 275°F；Gas ½ 是 250°F，公式為 248°F）——SPEC 已釘死：gas 輸入時表列成對值優先，其餘情況 °F 一律走公式，fixtures 的 `gas-half-table-pair` 與 `celsius-formula` 兩案就是為固定這個不對稱而設。

- 作者自行決定、簡報未釘死的三點（已寫入 SPEC 作為固定規則，請 reviewer 特別核對）：
  1. 旋風調整的套用順序：簡報只給 −20°C／−25°F 並要求釘死順序。作者釘為「先在輸入單位的領域調整一次，再換算」——°C 輸入減 20、°F 輸入減 25，兩者不疊加，也不先換算到 °C 再減 20。理由：−25°F 本就是 °F 食譜圈的慣用值，這樣 °F 食譜使用者得到的旋風 °F 與食譜慣例一致。
  2. Gas 平手取較高溫列：中點（如 185°C 在 Gas 4／5 之間）取較高 °C 的列；十個中點在 tests 一節全數列出要求驗證。
  3. Gas 輸入搭配旋風基準回固定錯誤 FAN_GAS（而非靜默忽略基準），因為 Gas 刻度沒有旋風設定，忽略會給出錯誤的一般／旋風對照。

- Fixture 重算：14 筆字面案例（11 核心 + 3 controller）。核心案例的 expected 由作者先依 SPEC 規則手算，再以一份獨立寫的精確有理數小程式（非產品程式）逐案重算比對，11 案全數一致；平手點 160°C 與 185°C 另行單獨核對取較高溫列。controller 案例的 lateResult 與首案 expected 逐字相同。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
