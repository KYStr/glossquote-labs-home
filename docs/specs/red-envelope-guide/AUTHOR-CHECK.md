# 紅包金額指南 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格 task `labs-red-envelope-guide-spec-20261109`（由主代理登記；作者未執行任何 registry／coordination 操作）。這是作者本人對文件的檢查，**不是獨立審查**；ready 與否由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對 `docs/specs/` 全部既有預案與概念清單。沒有任何紅包／禮金行情工具；主題最接近的是 `gift-exchange-match`（交換禮物配對，不查金額）與 `cash-float-tray`（零錢盤點算，不給禮俗建議），實質差異已寫入 SPEC scope 節。本案不是任何既有工具的改名或子集。

- 字面案例 16 筆（核心 13、controller 3），全部由作者依 SPEC 固定規則手算，每筆至少重算兩次，未使用任何產品程式產生 expected。複核重點：`wedding-midpoint-tie` 中點 3,700 百位 7 不合規、上下等距 tie 向上 3,800；`wedding-avoid-four` 高點 4,800 含 4 → snapDown 跨 4,700（百位 7）至 4,600、中點 4,000 含 4 且 tie 向上 4,200；`wedding-not-attending` 六成整數式 ⌊(6x+5)/10⌋ 得 1,920／4,320，對齊 2,000／4,200，中點 3,120 取近端 3,200；`new-year-elder-student` snapUp 自 1,300 跨 1,400（含 4）與 1,500（百位 5）至 1,600、距離 300 > snapDown 1,200 的 100。每筆成功結果的 rangeLow／rangeHigh／recommended 都通過有效金額謂詞且 recommended ∈ [rangeLow, rangeHigh]。

- 作者自行定的規則（概念 note 未完全指定者，已在 SPEC 固定並在此揭露）：(1) 有效金額採單一明確謂詞——100 的倍數、十進位字串不含 4、未滿 10,000 看百位 ∈ {0,2,6,8}、10,000 以上看千元數 T 不含 4 且 T 尾數 ∈ {0,2,6,8}；(2) 婚禮五星級距以每端再 +600 推得（飯店 +600 為 note 指定，五星沿用同一級距）；(3) 同行增額依場地固定 1,000／1,200／1,600（note 建議約 1,200，取場地級距中值為飯店值、兩側對稱）；(4) 春節長輩學生階段 600–2,000 低於 note 給的 2,000–6,600 下限，理由是學生未就業、行情慣例只包象徵額，2,000–6,600 由新鮮人與穩定階段涵蓋；(5) 入學／其他祝賀列為非目標（note 標 optional）；(6) 紅包語意固定為「每份（出席單位）」，未出席以驗證保證 attendeeCount=1 且不套同行增額。

- 完整性自查：五種場合的表全數寫入 SPEC（婚禮 12 格、彌月 4、喬遷 4、長輩 3 階段、晚輩 5 年齡帶）；驗證順序（容器 → 逐欄型別／容量／surrogate／列舉 → 適用性 → 婚禮一致性）與錯誤 code／field 固定；流程六狀態、重設預設值、下載序列化、雙語字串（含習俗差異揭露句）與 FAQ 皆已固定；九面向已在 acceptance 預宣告。喪禮白包明列非目標且以 `error-funeral-enum` 固定其不在 occasion 值域。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
