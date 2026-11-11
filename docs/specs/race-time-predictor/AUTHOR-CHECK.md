# 完賽時間預測 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（run 5 規格作者）。本文件是作者文件核對，**不是**獨立審查；現行修訂版為待獨立文件審查的既有工具升級提案。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- §6 已預宣告九個產品面向（functionality／boundaries／privacy／security／usability／accessibility／localization-seo／toolchain-provenance／compatibility），產品分數皆 null、狀態 NOT_RUN。

## 查重與概念備註的更正

- 已比對 checkout 內 `docs/specs/` 全部既有預案，無 `race-time-predictor` 同名規格。
- 最相近者為 Running Pace Calculator。既有規格包含三欄求解、分段表和 Riegel 1.06 預測，也接受範圍內的任意已知距離（公里或英里），並顯示四個標準距離的各列預測配速。既有求配速模式也已直接接受時間與距離。2026-11-11 主統籌將本案定位為既有 Running Pace Calculator 升級，聚焦選填自訂目標與簡化預測流程。 [既有固定 SPEC](https://github.com/KYStr/glossquote-labs-home/blob/40a7dc689e8e2fc2c527c323ca68398d95e9db19/docs/specs/running-pace-calculator/SPEC.md#L6-L23)
- 自訂距離上限 42,195 m 與 `running-pace-calculator`「預測不超過全馬」的既有限制對齊，避免兩工具對外口徑衝突。

## Fixtures 雙推導紀錄

fixtures.json 共 18 筆（15 核心＋3 controller）。所有成功案例的數值經兩種獨立方法推導且逐值一致：

- **手算推導（第一法）**：以 50 位十進位高精度運算（mpmath）直接計算 `T1 × (Dt/D1)^1.06`，再依 SPEC 釘版順序捨入：predictedSeconds = floor(raw + 0.5)；paceSecPerKm 由未捨入 raw 除以公里數後 floor(x×10 + 0.5)/10。共 25 列預測（6 成功案例 × 4–5 列）加 6 個 knownPaceSecPerKm。
- **獨立重算（第二法）**：另一支腳本以 IEEE-754 雙精度 `math.pow` 完全照 SPEC 的計算順序（ratio → pow → 乘 T1 → 捨入）重算全部案例，逐值斷言與第一法相同才寫入 fixtures；產生 fixtures 的腳本內含此斷言，任一不一致即中止。
- **捨入邊界餘裕**：全部預測列的 raw 值與最近 .5 邊界的最小距離為 0.0059 秒（`half-with-custom-target` 的 5k 列），配速（×10 尺度）最小餘裕 0.0071（`marathon-source` 的 half 列）；雙精度 pow 的實作差異在此量級約 1e-12 秒，餘裕至少高出六個數量級，fixtures 在釘版精度策略下穩定可重現。`min-custom-boundary` 原擬用 110 秒以外之值時 10k 列餘裕僅 0.0003，已改用 110 秒（該案例最差餘裕 0.166）。
- 錯誤案例（8 筆）的 expected 依 SPEC 的欄位順序與每欄檢查順序（容量→UNICODE→EMPTY→文法→範圍）逐筆手核；`inactive-custom-ignored` 的 expected 與 `five-k-source` 完全相同，驗證未啟用欄被忽略的釘版語義。

## 未驗項

- 產品交驗、Chrome/Edge 真實瀏覽器、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN。
- 原候選已有非作者初審。本修訂版的獨立複驗仍待執行，此升級提案不計新工具 ready 庫存。

## 2026-11-11 維護覆核

新增 `custom-source-matching-target`，用 15000 m 已知距離及 1:07:30 成績，將同一距離填入自訂目標。第五列以 4050 × (15000 / 15000)^1.06 得 4050 秒，4050 ÷ 15 得 270.0 秒／公里。對照原有 `custom-source` 的四列，新案例共有五列，前四列與原案例相同。現行共 16 筆核心、3 筆 controller，前述雙推導為原作者的歷史紀錄。
