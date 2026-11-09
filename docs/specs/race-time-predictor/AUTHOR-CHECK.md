# 完賽時間預測 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（run 5 規格作者）。本文件是作者文件核對，**不是**獨立審查；待非作者 reviewer 對固定候選逐節實核後才可 mark-spec-ready。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- §6 已預宣告九個產品面向（functionality／boundaries／privacy／security／usability／accessibility／localization-seo／toolchain-provenance／compatibility），產品分數皆 null、狀態 NOT_RUN。

## 查重與概念備註的更正

- 已比對 checkout 內 `docs/specs/` 全部既有預案，無 `race-time-predictor` 同名或同題規格。
- 最相近者為 `running-pace-calculator`。上層概念備註把它描述為「pace/splits for one distance」，**與其 SPEC 實際內容不符**：該工具除配速／時間／距離三欄求解與等速分段表外，還含一個以 Riegel 公式推四個固定目標距離的預測功能。本規格照其實際內容寫 scope 區隔，並把重疊面在此明示：兩者對 5K／10K／半馬／全馬都用 Riegel 1.06。本工具的實質差異為：(1) 輸入是一筆比賽成績本身，已知距離可選預設或自訂公尺數（400–42,195 m），不經通用求解器、不用公里／英里小數；(2) 輸出含每列的每公里等值配速；(3) 輸出含一個選填的自訂目標距離列；(4) 無求解器、無分段表、無英里。若獨評認為重疊仍過高，應退回本規格而非放行，作者不自行判定不重複。
- 自訂距離上限 42,195 m 與 `running-pace-calculator`「預測不超過全馬」的既有限制對齊，避免兩工具對外口徑衝突。

## Fixtures 雙推導紀錄

fixtures.json 共 18 筆（15 核心＋3 controller）。所有成功案例的數值經兩種獨立方法推導且逐值一致：

- **手算推導（第一法）**：以 50 位十進位高精度運算（mpmath）直接計算 `T1 × (Dt/D1)^1.06`，再依 SPEC 釘版順序捨入：predictedSeconds = floor(raw + 0.5)；paceSecPerKm 由未捨入 raw 除以公里數後 floor(x×10 + 0.5)/10。共 25 列預測（6 成功案例 × 4–5 列）加 6 個 knownPaceSecPerKm。
- **獨立重算（第二法）**：另一支腳本以 IEEE-754 雙精度 `math.pow` 完全照 SPEC 的計算順序（ratio → pow → 乘 T1 → 捨入）重算全部案例，逐值斷言與第一法相同才寫入 fixtures；產生 fixtures 的腳本內含此斷言，任一不一致即中止。
- **捨入邊界餘裕**：全部預測列的 raw 值與最近 .5 邊界的最小距離為 0.0059 秒（`half-with-custom-target` 的 5k 列），配速（×10 尺度）最小餘裕 0.0071（`marathon-source` 的 half 列）；雙精度 pow 的實作差異在此量級約 1e-12 秒，餘裕至少高出六個數量級，fixtures 在釘版精度策略下穩定可重現。`min-custom-boundary` 原擬用 110 秒以外之值時 10k 列餘裕僅 0.0003，已改用 110 秒（該案例最差餘裕 0.166）。
- 錯誤案例（8 筆）的 expected 依 SPEC 的欄位順序與每欄檢查順序（容量→UNICODE→EMPTY→文法→範圍）逐筆手核；`inactive-custom-ignored` 的 expected 與 `five-k-source` 完全相同，驗證未啟用欄被忽略的釘版語義。

## 未驗項

- 產品交驗、Chrome/Edge 真實瀏覽器、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN。
- 本文件未經任何非作者審查；未固定候選或未獨評前不計 ready。
