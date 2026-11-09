# 樂透選號器 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，run 4 規格撰寫，規格 task id `labs-lottery-number-picker-spec-20261109`（由主代理登記，作者未自行註冊、未執行任何 registry 指令）。這是作者本人對文件的檢查，**不是獨立審查**；readiness 須由非作者 reviewer 對同一固定候選另行核對。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已掃描本 repo `docs/specs/` 既有 101 份規格，無 lottery／樂透同名或同功能者。最相近為 `decision-wheel-picker`（從使用者清單抽一項）、`dice-sum-distribution`（骰子和機率分布）、`password-generator`（密碼學亂數產生密碼）；實質差異已寫入 SPEC scope 節。遊戲規則（大樂透 6/49、威力彩 6/38＋1/8、今彩539 5/39）依台灣彩券現行玩法固定於 SPEC 表格，與概念註記一致，無衝突需裁決。

- Fixture 推導：12 筆核心案例中 8 筆含號碼預期，全部由作者以兩份獨立 scratch 實作交叉推導——(A) Node.js 版採概念指定的 mulberry32 標準形（`Math.imul`），(B) Python 3 版以手寫 32 位元遮罩重寫同一演算法與 partial Fisher–Yates 抽樣——兩份輸出逐位相同，且各自重跑一次結果不變。scratch 實作是獨立推導工具，未提交、不是產品程式。4 筆錯誤案例（POOL_TOO_SMALL／RANGE seed／DUPLICATE／RANGE setCount）與 3 筆 controller 案例按 SPEC 固定規則手工推導。

- 完整性自查：PRNG 逐位步驟、抽樣程序、串流跨組／跨區消耗順序、每位置恰好一次 PRNG 呼叫（含池剩 1 時不省略）、排除先縮池、排除過多與恰好等於需選個數的界線、驗證順序與固定錯誤 code／field／row、種子與組數文法與上限、雙語字串（含誠實說明與 FAQ）、複製文字與下載 bytes 格式、flow 六狀態與世代丟棄規則，皆已在 SPEC 固定，無留給登入者查證的表格或規則。

- 概念註記未固定、由作者裁決並寫入 SPEC 者：遊戲 ID（`lotto649`／`power638`／`daily539`）與核心欄位形狀（字串欄位、排除為單一逗號字串、只修剪 U+0020、重複排除為 DUPLICATE 並以代幣序號為 row）；種子留空行為（核心回 EMPTY；app 於執行時以 crypto 產生種子並寫回欄位，使結果仍可重現）；組數預設 `"3"`、seed raw 上限 10、exclude raw 上限 256；不使用 Worker，改以 macrotask 排程＋世代號實現取消語義（計算量極小，理由寫入 implementation）；zone2 以單元素陣列或 `null` 表示；組間不去重。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
