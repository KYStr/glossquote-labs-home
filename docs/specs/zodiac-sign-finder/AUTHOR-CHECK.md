# 西洋星座查詢 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（工作目錄 `build4/specs/zodiac-sign-finder`），來源工作 `labs-zodiac-sign-finder-spec-20261109`。這是作者本人對文件的檢查，**不是獨立審查**；ready 與否由非作者 reviewer 對同一固定候選判定。作者未執行任何 registry／coordination 指令，任務登記由主代理處理。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對基線 `docs/specs/` 全部目錄（101 份）、`tools/` 與 registry 索引，無西洋星座／占星查詢工具或同名預案。概念註記指定之最接近者為「無」；同屬日期輸入的 `pregnancy-due-date-calculator` 只在輸入型態上相鄰，用途與輸出完全不同，差異見 SPEC scope。

- 案例重算：13 筆核心與 3 筆 controller 字面案例。8 筆成功核心案例的 expected 先由作者依 SPEC 固定日期表手算，再以第二條獨立路徑（逐列邊界比對＋循環序相鄰推導）重算一次，8/8 逐欄一致；另以展開表做覆蓋稽核，366 個合法（月，日）組合恰命中一列、無缺口無重疊。閏年規則另核 1900 非閏、2000 閏、2100 非閏。錯誤案例（DATE_INVALID×2、RANGE、EMPTY、INTEGER_FORMAT）依固定驗證順序逐案核對首錯欄位。

- 任務書未固定、由作者決定並寫入 SPEC 的事項：
  1. 輸入形狀：`year` 欄位恒存在、空字串代表未提供（不採缺欄表示），使介面可由 fixture 精確描述。
  2. 日期存在錯誤碼採 `DATE_INVALID`（全組既有錯誤碼無曆法存在性一項），置於逐欄檢查之後的跨欄步驟，field 固定 `day`。
  3. `cuspNeighbor` 語意：首日 → 循環序前一星座、末日 → 次一星座、非交界 → null。
  4. raw 容量統一每欄 8 單元（照範本），不另設月／日／年個別上限；超長數字由文法與 RANGE 把關。
  5. 逐欄驗證順序固定 month → day → year；`year` 跳過 EMPTY（空字串合法）。
  6. 不填年份的 2 月 29 日：依任務指示固定為有效並屬雙魚座（概念註記原留兩案，取「該日於閏年存在」一案）；填非閏年則 DATE_INVALID。
  7. 下載檔名固定 `zodiac-sign-report.json`；結果物件鍵集合與範圍回顯形狀由作者定形。
  8. 交界提示英文文案由作者定稿（中文為任務固定原文）：「Near a cusp — the sign can differ by birth year and time」。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
