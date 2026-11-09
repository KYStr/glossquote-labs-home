# 嬰兒奶量計算 — 作者檢查

作者 `cloud-dot`（Muse，第五批規格作者工作；父層負責登記與送審，作者未執行任何 registry／coordination 指令）。作者文件核對，待非作者 readiness。本文件不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

## 醫療來源核實（本件最重要的檢查）

概念備註 #38 把「150 ml/kg/day」寫為 commonly cited guideline 並要求對醫療來源核實。核實結果：**來源給的是範圍，不是單一數字**，已照「從來源不從概念備註」原則處理並在此記錄更正。

- 主來源（已直接讀取原文頁面）：NHS 111 Wales, “Infant formula: common questions”, https://111.wales.nhs.uk/doityourself/pregnancy/bottleformulacommonquest/ ，頁面最後更新 2021-04-19，本次查閱 2026-11-09。原文逐字： “By the end of their first week, most will need around 150 to 200ml per kilo of their weight a day until they're 6 months old. This amount will vary from baby to baby.” 同頁另有：新生兒初期奶量較小、依饑餓訊號餵食、不要強迫喝完。
- 釘版處置：指引範圍 150–200 ml/kg/day（足月兒、第一週結束後至約 6 個月）照來源全文揭露於 SPEC scope、來源釘版字串與 FAQ；預設係數 150 取範圍下限（與概念備註數字一致，且為臨床與多數公開計算工具最常用的單一估算值）；可調範圍釘版為恰 150–200、步進 1。不取中點 175 為預設，因為來源未指定中點，取下限與概念備註及通行實務一致。
- 旁證（僅記錄，未採用）：AAP HealthyChildren.org “Amount and Schedule of Baby Formula Feedings” 為每日每磅約 2.5 oz（≈165 ml/kg/day，落在 NHS 範圍內）與 24 小時通常不超過約 32 oz（960 ml）；澳洲 Pregnancy, Birth and Baby 為月齡分段速率（5 天–3 個月 150、3–6 個月 120、6–12 個月 100 ml/kg/day）。兩者屬不同指引體系，不混入：本工具不設每日上限、不用月齡調整係數（本批簡報只允許與主來源同一出處的月齡表，主來源無月齡表）。
- 每餐警示帶：不做。主來源未公布每餐容量數字；坊間每餐量為月齡分段表，與本工具「月齡僅標示」釘版衝突，依任務規則整體省略，不自創胃容量數字。
- 免責聲明：雙語全文釘版於 SPEC inputsOutputs（一般指引估算、不是醫療建議、依寶寶訊號餵食、遵循兒科醫師／健康訪視員個別建議、早產／低出生體重／生病者完全依醫療人員指示），並在 acceptance 釘版「聲明缺失或被改寫即擋下交驗」。

## 案例雙重推導

16 筆核心案例（9 成功、7 錯誤）與 3 筆 controller 案例。成功案例先以手算依釘版整數公式推導，再以獨立 Python 實作（同一釘版公式、整數運算、含 perFeedMl 加總不變量斷言）重算，9/9 逐值一致：

| 案例 | 手算 | 重算 |
| --- | --- | --- |
| typical-4kg-8feeds | 400×150=60000 → 600 ml；600÷8=75 整除 | 600；[75×8]；平均 75 |
| remainder-split-half-up-tie | 455×150=68250 → 682.5 進位 683；683=7×97+4 → 前 4 餐 98 | 683；[98,98,98,98,97,97,97]；97.6 |
| half-up-tie-6kg35 | 635×150=95250 → 952.5 進位 953；953=6×158+5 → 前 5 餐 159 | 953；[159×5,158]；158.8 |
| factor-max-200 | 320×200=64000 → 640；640=6×106+4 → 前 4 餐 107 | 640；[107×4,106,106]；106.7 |
| min-boundary | 100×150=15000 → 150；150=24×6+6 → 前 6 餐 7 | 150；[7×6,6×18]；6.3（6.25 進位） |
| max-boundary | 1500×200=300000 → 3000；單餐 | 3000；[3000]；3000 |
| age-newborn-notice | 350×150=52500 → 525；525=8×65+5 → 前 5 餐 66；月齡 0 只加提醒 | 525；[66×5,65×3]；65.6 |
| age-beyond-notice | 800×150=120000 → 1200；1200÷5=240；月齡 9 只加提醒 | 1200；[240×5]；240 |
| mid-factor-175 | 505×175=88375 → 883.75 捨為 884；884=8×110+4 → 前 4 餐 111 | 884；[111×4,110×4]；110.5 |

錯誤案例依釘版驗證順序（INPUT_LIMIT → UNICODE → EMPTY → 文法 → RANGE、欄位序 weight → factor → feedsPerDay → ageMonths）逐一推導：weight 空字串 EMPTY；`4.555` 文法 DECIMAL_FORMAT；`0.99` 過文法後 RANGE；`123456789` 9 單元 INPUT_LIMIT（先於文法與範圍，即使其數值亦超範圍）；factor `149` RANGE；feedsPerDay `25` RANGE、`8.5` INTEGER_FORMAT。另以不變量論證釘版「每餐 ≥ 6 ml」：最小總量 1 kg × 150 = 150 ml、最多 24 餐，base ≥ ⌊150/24⌋ = 6，0 ml 餐在合法輸入下不可能出現。

## 查重

已比對 checkout 內 `docs/specs/` 全部 101 份規格，無 baby／infant／feeding／milk 主題。最相近者：同批概念 #39 寵物餵食量（獸醫 RER／DER 餵食量、犬貓對象）與本件（嬰兒、體重×ml/kg 指引）領域與公式皆不同；成人活動熱量類工具不涉嬰兒餵食。差異已寫入 SPEC scope。

## 未驗證

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
- NHS 111 Wales 頁面為 2021 年更新版本；reviewer 送審時應再讀一次現行頁面文字，若指引範圍或適用期間已改版，本規格須跟著修訂，不得沿用本文件數字。
