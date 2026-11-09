# 咖啡因代謝計算機 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格任務 `labs-caffeine-half-life-spec-20261109`（由主代理登記，作者未執行任何 registry 指令）。這是作者本人對文件的檢查，**不是獨立審查**；待非作者 readiness。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：於基線 commit `1ecd5c4babd6aa2877add049fa5281370f534ac9` 全文檢索 `docs/specs/`（101 份）、`tools/`、`sources/candidates/`、`sources/legacy/`，無任何 caffeine／咖啡因 相關工具或規格。最相近者為 `sleep-cycle-calculator`（由就寢／起床時間反推睡眠週期），與本案（已攝取咖啡因的衰減殘留）輸入、模型、輸出皆不同，差異已寫入 SPEC scope。

- 字面案例 12 筆：9 核心（正常 2、邊界 3、錯誤 4）＋ 3 controller。毫克 expected 全數以兩種獨立算法重算——`mg × 2^(−elapsed/H)` 與 `mg × exp(−ln2 × elapsed/H)`——捨入後逐值相同，並深比對 fixtures 內嵌結果一致。捨入邊界距離：初版 `two-entries` 有一值距 0.05 mg 決策邊界僅 0.0009 mg，已把第二筆時間由 10:00 改為 10:10，全案最小邊界距離提升為 0.0056 mg（以 ×10 單位計 0.0559）；兩個「恰好一個半衰期」案例（50.0、100.0）在二進位浮點下精確（2^−1）。`exact-half-life` 核對點為「恰好一個半衰期後剩一半」；`query-before-intake` 涵蓋查詢早於攝取的 TIME_ORDER 語義。

- 概念筆記未定、由作者固定並寫入 SPEC 的決策：
  1. 單日時間模型：評估時刻早於某筆攝取時該筆貢獻 0 且標示 notYet，不回捲前一日；數列時刻以算術分鐘越過 1439 並以 nextDay 旗標顯示；就寢採「今晚」語義（B ≥ Q 用 B，否則 B + 1440）。
  2. 每筆為 `{time, preset, mg}`：preset 與自訂 mg 互斥（同時給為 CONFLICT），使預設表成為核心可測契約而非僅 UI 行為。
  3. 就寢時間為選填（`""` → `atBedtime: null`），預設空。
  4. 半衰期文法至多一位小數，`halfLifeMin = 小時 × 60` 必為整數。
  5. 毫克輸出為一位小數字串，捨入 `floor(x×10+0.5)/10`；總量由未捨入值加總後捨入，逐筆和可能差 0.1 mg，已在 SPEC 明示。
  6. 無吸收延遲（攝取當下即全量起算）；計算同步且短，不用 Worker，以次一事件迴圈工作項作 busy／取消邊界；本工具無下載／匯出，controller checkpoint 以 `resultAvailable` 取代範本的 `reportAvailable`。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage 及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
