# 手提行李規定檢查 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格 task `labs-cabin-baggage-checker-spec-20261109`（由主代理登記，作者未執行 registry 指令）。本文件是作者對文件的自我檢查，**不是獨立審查（NOT an independent review）**；八節是否完整、案例是否正確，仍待非作者 reviewer 對同一固定候選重算核可。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 查重：已比對本 repo `docs/specs/` 既有 101 份預案、`tools/` 5 件實作與本批概念清單，無手提行李／登機規定比對工具。最相近者 `spec-parcel-billable-weight-20261109`（自填服務規則算包裹計費重，明文排除預設業者）與 `spec-card-sleeve-fit-20261109`（兩軸牌套相容與庫存分配），實質差異已寫入 SPEC scope：本件是寫死的六家航空公司登機規定、三邊排序逐邊 pass/fail、主行李制／合計制兩種重量語意。
- 規定表查核（2026-11-09，作者以公開來源核對各航空公司現行公告；主行李尺寸與重量六家皆與概念筆記一致）。概念筆記未定或與公告有出入、由本文固定下來的事項：
  1. **星宇重量為合計制**：概念筆記只寫「7 kg」。星宇官網規定經濟艙主行李與個人物品**合計**不得超過 7 kg，故固定為 `total` 7 kg；長榮與中華的 7 kg 只計主行李一件，固定為 `main`。這是全表最容易誤判的一格，已另寫入 FAQ。
  2. **中華個人物品 40×30×15 cm**：依中華航空官網現行公告（40 × 30 × 15 cm，或三邊和 85 cm 的替代寫法）；部分第三方彙整寫 40×30×10，未採用，以官網為準。
  3. **長榮個人物品 40×30×10 cm、星宇個人物品 40×30×10 cm**：兩家官網均有公告，照公告固定。
  4. **全日空個人物品 40×30×20 cm**：依 ANA 官網現行公告固定（主行李 55×40×25、合計 10 kg 與筆記一致）。
  5. **日本航空與台灣虎航個人物品尺寸未公告**：兩家只要求能放前座下方，無公告尺寸，故固定為 null，判定狀態為 `notSpecified`（不影響該家 pass），不自行編造數字。
  6. **三邊總和替代判定列為非目標**：長榮、中華、星宇公告有「每邊上限或三邊和 ≤115 cm」的替代寫法，ANA/JAL 亦公告三邊和 ≤115 cm 併行條件。概念指示的判定語意是排序後逐邊比較，故本工具只採逐邊比較並在 scope 明列非目標；採總和制會讓部分逐邊不合格的行李變合格，屬於不同產品語意，留待日後如要支援時以修訂流程處理。
  7. ANA/JAL 以國際線 100 座以上機型公告為準；小機型（55×40×25 改 45×35×20 等）列非目標。
- 案例重算：fixtures 共 12 筆（9 核心＋3 controller）。全部 expected 先以十分位整數手算（排序、逐邊差、兩種重量模式、總覽計數逐格核對），定稿後再以一份依 SPEC 規則獨立寫的核對腳本重算 9 筆核心案例並深比對，9/9 一致；`fits-five-of-six`、`long-side-fails-japan`、`heavy-main-light-total`、`unsorted-dimensions`、`exact-fit` 的每家 margins 與 checkedKg 均經兩次計算。fixtures.json 已驗證可解析為合法 JSON。
- 概念筆記未固定、由作者決定並寫入 SPEC 的事項：輸入契約採全字串欄位＋`airlines` 字串陣列（沿用本批範本的嚴格文法風格，尺寸／重量一位小數、十分位整數運算、輸出恰一位小數字串）；個人物品採「四欄全空＝無此物品、任一欄有值則四欄必填」；航空公司子集預設全選、至少一家、輸出順序固定為表定順序；驗證順序與固定錯誤碼（SCHEMA／INPUT_LIMIT／UNICODE／EMPTY／DECIMAL_FORMAT／RANGE／ENUM／DUPLICATE）；固定下載名 `cabin-baggage-report.json`；免責聲明逐字固定並要求每次結果必附、不可摺疊。
- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，九面向分數 null。未經非作者獨評前不計 ready。
