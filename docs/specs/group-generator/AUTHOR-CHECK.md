# 隨機分組產生器 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`（build5 spec 作者），工作 `run5 spec #33 group-generator`。作者文件核對，待非作者 readiness。本文件不是獨立審查。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重結論（已讀原文比對）。`sources/legacy/random-groups` 功能相近但契約不同：crypto 不可重現洗牌、僅組數模式 2–50 組；本案以種子決定論（可事後重現稽核）＋依每組人數模式＋組數 1–500 為差異，差異已寫入 SPEC scope。decision-wheel-picker 抽單一選項、gift-exchange-match 做一對一配對、lottery-number-picker 抽號碼池號碼，皆非名單分割。沿用 lottery 的決定論契約是刻意的一致性決定，不是重複製作。

- 決定論契約查證。已讀 `tools/lottery-number-picker/public/js/core/lottery.mjs`（其 SPEC 的產品實作）與 docs/specs/placeholder-text-generator/SPEC.md 第 4 節：mulberry32 位元公式、種子欄文法（`^(0|[1-9][0-9]*)$`、上限 10 單位、0–4294967295、驗證序 INPUT_LIMIT→EMPTY→INTEGER_FORMAT→RANGE）、「核心永不自產種子、空種子在核心為 EMPTY、app 填入並顯示」、「每個抽取位置恰取一次亂數（含只剩一個候選時）」皆屬實，本案逐項照釘；概念 #33 的敘述無須更正。全洗牌採 lottery 前向 Fisher–Yates 形態（j = i + floor(r × (N − i))）延伸至全部 N 個位置。

- PRNG 錨點核對（第一法：獨立整數實作）。作者以 Python 整數算術（遮罩 2^32、乘法取低 32 位元，與 Math.imul/>>> 位元語意等價）獨立實作 mulberry32，種子 42 前 8 抽的分子 k 依序為 2581720956、1925393290、3661312704、2876485805、750819978、2261697747、1173505300、2683257857；換算小數與 placeholder-text-generator 規格書公布的前 8 抽（0.601104、0.448291、0.852466、0.669734、0.174814、0.526593、0.273228、0.624745）逐一吻合至 1e-6 內。小註：該規格書稱公布值為「截尾」，實際公布值與四捨五入至 6 位一致、與截尾差 1e-6 量級——屬該文件顯示用語的小出入，本案以 k 整數為準，不受影響。

- 洗牌手算追蹤（第二法：手算，案例 `trace-five`，名單 [A,B,C,D,E]、種子 42、K=5）。以公布的 6 位小數值手算 floor：

| i | r（公布值） | span | floor(r×span) | j | 交換 | 陣列 |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 0.601104 | 5 | 3 | 3 | A↔D | D B C A E |
| 1 | 0.448291 | 4 | 1 | 2 | B↔C | D C B A E |
| 2 | 0.852466 | 3 | 2 | 4 | B↔E | D C E A B |
| 3 | 0.669734 | 2 | 1 | 4 | A↔B | D C E B A |
| 4 | 0.174814 | 1 | 0 | 4 | 自身 | D C E B A |

各步 r×span 距最近整數的最小餘裕為 0.00552（i=0），遠大於 6 位小數公布誤差上限（5e-7 × span 5 ≈ 2.5e-6），手算可靠。手算最終序 [D,C,E,B,A] 與獨立實作的追蹤輸出逐列一致；K=5 round-robin 後第 1–5 組依序為 D、C、E、B、A，與 fixtures 相同。
- 發牌手核（案例 `basic-count`）。獨立實作的洗牌序為 [黃小芬，王小明，張阿宏，劉小玉，李小華，林阿哲，吳阿國，陳小美]；人工 round-robin（K=3）：t0→組1 黃小芬、t1→組2 王小明、t2→組3 張阿宏、t3→組1 劉小玉、t4→組2 李小華、t5→組3 林阿哲、t6→組1 吳阿國、t7→組2 陳小美 → 組1 [黃小芬，劉小玉，吳阿國]、組2 [王小明，李小華，陳小美]、組3 [張阿宏，林阿哲]，與 fixtures 逐字一致。

- 全部案例推導。17 筆核心＋3 筆 controller 案例的 expected 全由上述獨立 Python 實作（解析、驗證序、PRNG、洗牌、發牌皆照 SPEC 釘版規則撰寫，非產品程式）產生；其後另以不變量審計腳本複核 10 筆成功核心案例：成員多重集與解析後名單恰等（無漏無重）、各組大小差 ≤1、較大組在前、size 欄與 members 長度一致、totalNames/groupCount 一致——全數通過。錯誤案例（EMPTY/ROW_LIMIT/RANGE/INTEGER_FORMAT/INPUT_LIMIT/ENUM）已逐案核對 code、field、row。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
