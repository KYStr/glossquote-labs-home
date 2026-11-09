# 月相計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（run 4 規格作者），工作目錄 `build4/specs/moon-phase-calculator`。此為作者文件核對，**不是獨立審查**；待非作者 reviewer 對同一固定 head 重算案例、核對八節後才可 mark-spec-ready。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。規格 task id `labs-moon-phase-calculator-spec-20261109` 已寫入 SPEC 交接節，待主代理登記；作者未執行任何 registry 指令。

- 查重。已查本批盤點的 101 份既有預案目錄、`tools/`（5 件）與 registry：無 moon／lunar／月相 既有 spec 或 task，不重複。最相近者為同批補庫的日出日落計算機（sunrise-sunset-calculator，對象太陽、NOAA 幾何模型）與既有的 sleep-cycle-calculator（睡眠週期往返，無天文模型）；差異已寫入 SPEC scope。

- Fixture 推導（兩條獨立路徑，全數一致）。expected 由作者的獨立 scratch 實作（Python）自固定規則推得，不來自任何產品程式：路徑 A 用 Fliegel & Van Flandern 整數 JDN 公式、邊界表分段、Richards 逆演算法換算事件日期；路徑 B 用 `date.toordinal() + 1721425` 求 JDN、以 epoch 日期差求月齡、以相位角（age/S×360°）分段、以 datetime 加減求事件日期。12 筆核心成功案例兩路徑逐欄位深度比對一致；寫入 fixtures.json 後再以路徑 B 對成品檔重算一次，12/12 MATCH。另 5 筆錯誤案例核對錯誤物件形狀，3 筆 controller 案例比照範本狀態機。

- 與真實曆表交叉核對（僅作合理性檢查，fixture 以固定模型為準）。2025-11-05 為真實滿月：模型給月齡 14.6、滿月、照亮比 100.0、距下一個滿月 0.1 天（同日）。2026-10-26、2026-11-24 亦為真實滿月，模型同樣落入滿月段（11-24 距下一個滿月 0.0 天）。參考 epoch 後模型首個滿月 2000-01-21 與真實滿月（當日有月全食）同日。

- 對概念筆記／任務說明的兩處校正（依事實修正，已同步寫入 SPEC 與 fixture）。
  1. 「2026-11-05 為滿月」不成立：滿月的是 2025-11-05；2026 年 11 月的滿月在 2026-11-24。固定模型與真實曆表一致：2026-11-05 為月齡 25.3、殘月。故 fixture 以 `known-full-moon-2025`（2025-11-05）與 `full-moon-2026`（2026-11-24）作已知滿月案例，並保留 `not-full-2026-11-05` 明示此校正，避免日後誤讀。
  2. epoch 的「2000-01-06 18:14 UTC」與 JD 2451550.1 嚴格換算不完全相等（JD 2451550.1 對應 14:24 UTC）；依任務指示，常數 JD_REF = 2451550.1 為通用演算法慣用的已發布值，SPEC 明文以 JD 常數本身為準，不以時刻標籤反推。

- 概念筆記未固定、由作者決定並寫入 SPEC 的事項。
  1. 評估時刻：任務指示固定為輸入日期 12:00 UTC，核心只收日期；概念筆記所列 UTC 偏移保留為輸入欄位，但只用於下一個朔／滿月的「當地日期」顯示，其餘輸出與偏移無關（`model-first-full` 與 `offset-negative-local` 兩案證明此分離），SPEC 與欄位說明均明示。
  2. 日期範圍 1900-01-01 至 2100-12-31；輸出事件日期可溢出至 2101 年，不算錯誤。
  3. 偏移集合以規則定義：±HH:MM、分鐘為 15 的倍數、總分鐘 −720 至 +840，不逐一列舉。
  4. 錯誤碼在範本集合外新增 DATE_FORMAT／INVALID_DATE／OFFSET_FORMAT，驗證順序為 SCHEMA → INPUT_LIMIT → UNICODE → EMPTY → 文法 → INVALID_DATE → RANGE，逐欄 date 先於 utcOffset。
  5. 顯示捨入一律 round half-up 至小數 1 位，且只由未捨入值一次性捨入；月相分段與事件日期不用顯示值反推。
  6. 邊界表數值列至小數 10 位供人讀核對，判定以置中公式為準；epoch 當日（2000-01-06）正午在固定常數下月齡為 29.4 而非 0.0（朔時刻在正午之後 0.1 天），屬常數定義的直接結果，fixture 如實記錄。
  7. 下載報告比照本批範本固定為 `moon-phase-report.json` 與同序列化規則。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，九面向分數 null。未固定候選或未獨評前不計 ready。
