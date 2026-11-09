# 分租電費分攤 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格任務 `labs-shared-electricity-split-spec-20261109`（由主代理登記，作者未執行任何 registry 指令）。本文件是作者本人的文件檢查，**不是**獨立審查；ready 與否由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對 base commit `910002e9` 的 `docs/specs/`（101 個目錄）、`tools/`、`sources/candidates/`、`sources/legacy/`，無 `shared-electricity-split` 同名或改名重複。最相近者 `electricity-cost-calculator` 是由用電度數與費率級距「算出」一張帳單的金額，本案是帳單總額已知、依分電表「分配」到各房，輸入輸出相反，差異見 SPEC scope。另有 sources/legacy 的 `bill-splitter`，處理人與人之間的墊款結算（平均／份數、誰付給誰），沒有電表、度數權重或總表公共用電概念，亦不重複。

- 案例重算：9 筆字面核心案例的 expected 皆由作者依 SPEC 固定管線手算（十分之一度整數、權重 `usage×N + common`、最大餘數、同餘數依輸入順序、roundHalfUp 顯示捨入），並以獨立算術第二次重算，兩次一致。重點核對：`largest-remainder-tie` 三房同餘數、剩餘 1 元給第一房（34/33/33）；`common-area-equal-first` 公共 50 度先均分併入權重 350/290/260、餘數 700/400/700、金額 778/644/578；每個成功案例的金額加總都恰等於 totalBill。另有 3 筆 controller 案例（dirty-error、cancel-late、replace-late）。

- 概念筆記未固定、由作者決定並寫入 SPEC 的事項：度數精度固定最多一位小數、內部以十分之一度整數運算；公共均分以「權重 = 各房度數×N + 公共度數」的單次最大餘數分攤實現（與先均分再按比例等價且全程整數）；總權重為 0 時固定回退均分、餘元依輸入順序；總表度數小於各房合計固定為 `TOTAL_DELTA_UNDER` 錯誤；房名正規化後重複固定為 `DUPLICATE` 錯誤；金額與讀數上限（99,999,999 元／999,999.9 度）、房名 24 code points 上限；占比顯示一位小數、不要求加總 100，金額加總恆精確；比照本批範本加入固定檔名的 JSON 報告下載；實作配置依 IMPLEMENTATION-CHECKLIST 採 `public/js/core/`（範本 SPEC 的 src/ 寫法從之調整）。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
