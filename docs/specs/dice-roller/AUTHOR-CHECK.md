# 骰子模擬器 — 作者檢查

作者為本輪 run-5 規格作者（cloud-dot），本文是作者對自己文件的檢查紀錄，**不是**獨立審查；readiness 須由非作者 reviewer 對同一固定候選另行核對。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。
- 已比對本 repo 既有規格、產品與來源快照：最相近為 `dice-sum-distribution`（理論分布、無亂數不擲骰，與本案互補）、產品 `tools/lottery-number-picker/`（無放回抽號；本案沿用其 PRNG 與種子契約）、`group-generator` 規格（同釘 mulberry32、用途為洗牌分組）、`decision-wheel-picker`（抽單一選項）。實質差異已寫入 SPEC scope 節。
- fixtures 共 24 筆：21 筆字面核心案例（7 成功、14 錯誤）與 3 筆 controller 案例。

## PRNG 釘版來源

mulberry32 定義直接讀自本 checkout 內的兩個既有釘版並逐字元核對一致：產品核心 `tools/lottery-number-picker/public/js/core/lottery.mjs` 的 `createPrng`（常數 0x6D2B79F5、位移 15/7/14、OR 1/61、回傳分子除以 2^32），以及並行撰寫中的 `group-generator` 規格書 inputsOutputs 節的位元級敘述（同常數、同種子契約「核心不自產種子、app 填入並顯示」）。種子欄文法 `^(0|[1-9][0-9]*)$`、上限 10 單位、範圍 0–4294967295 與空種子在核心回 EMPTY 的行為，亦與 lottery 釘版相同。本案未更動任何既有釘版。

## 雙重推導紀錄

每筆成功案例的 expected 由兩份獨立實作交叉推導，兩邊一致才寫入 fixtures：

- 實作 A（Node.js）：直接採用 lottery 產品核心的 `createPrng` 原文，擲骰式為 `1 + Math.floor(next() * M)`。
- 實作 B（Python）：以純整數運算另行重寫 mulberry32（每步 `& 0xFFFFFFFF` 遮罩、`imul32` 以遮罩乘法代），擲骰式為整數式 `1 + (k * M) // 2^32`，不經浮點。
- 兩邊一致的核對點：種子 42 的前五個分子序列 `[2581720956, 1925393290, 3661312704, 2876485805, 750819978]`；7 筆成功案例的 rolls、sum、total 全部逐值相同（`caps-max` 的 100 顆 rolls 與總和 51508 亦然）。
- 另以第三份實作 C（僅依 SPEC 本文重寫 notation 掃描器＋種子管線＋擲骰核心，不看 A/B 程式）對 fixtures 全部 21 筆核心案例深度比對：21/21 一致，含 14 筆錯誤案例的 code、field、position 與 component。

逐步推導（`example-2d6`，種子 42、M=6；實作 B 的逐步驟追蹤，A 逐步值相同）：

- 第 1 顆：state = 42 + 0x6D2B79F5 = 1831565855（0x6D2B7A1F）。t XOR (t>>>15) = 1831575625、t OR 1 = 1831565855，imul 得 t = 65942231（0x03EE32D7）。t XOR (t>>>7) = 65662642、t OR 61 = 65942271，imul = 2518648654；t + imul（mod 2^32）= 2584590885；t XOR 之 = 2581825778（0x99E388F2）。分子 k = t XOR (t>>>14) = 2581720956，r ≈ 0.6011037519；點數 = 1 + floor(2581720956 × 6 / 2^32) = 1 + 3 = 4。
- 第 2 顆：state = 1831565855 + 0x6D2B79F5（mod 2^32）= 3663131668（0xDA56F414）。同流程得分子 k = 1925393290，r ≈ 0.4482905590；點數 = 1 + floor(1925393290 × 6 / 2^32) = 1 + 2 = 3。
- 故 rolls = [4, 3]、sum = 7、total = 7；`modifier-plus` 同種子同串流，rolls 相同、total = 10，兩案互為交叉核對。

其餘手算核對：

- `implicit-count-d20` 與 `negative-modifier` 共用種子 7 的第一抽（d20 得 1），兩案 rolls 一致、僅修正與 total 不同（1 與 −24），驗證負總和不夾限。
- 精確性：k × M ≤ (2^32 − 1) × 1000 < 2^42，雙精度乘積為精確整數，floor 無捨入歧義；sum 上限 100 × 1000 = 100,000，total 上限絕對值 110,000，皆為精確整數。
- `notation-too-long` 的字面字串為 34 個 UTF-16 單位 > 32 上限，故先回 INPUT_LIMIT 而非文法錯誤；其餘錯誤案例的 position 已由實作 C 依 SPEC 掃描規則逐案重現。

## 作者的設計決定（請 reviewer 特別核對）

- 骰式不修剪、任何空白皆為錯誤（在首次出現處回 NOTATION 與 position）：取最嚴格且可逐字元驗證的契約，UI 說明文字已明示格式。
- `d` 與 `D` 皆接受、正規化為小寫；省略骰數（如 `d20`）預設 1 顆。骰式元件允許前導零（`007d6` = 7 顆），但種子欄沿用 lottery 釘版拒絕前導零——兩欄規則不同，已在 SPEC 分節明示。
- 面數下限釘為 2：1 面骰恆擲出 1、無隨機語義，`2d1` 回 RANGE/sides。
- 平均／最大／最小等統計不進核心結果、亦不列為顯示需求：概念備註只要求逐顆結果與總和，分布與統計顯示刻意留在範圍外，避免與 `dice-sum-distribution` 混淆。

## 未驗證事項

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
