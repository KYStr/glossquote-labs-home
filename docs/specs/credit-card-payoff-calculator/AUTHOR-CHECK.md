# 信用卡還款試算 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，來源工作為父層 run 4 規格指派（概念 #3），規格任務 `labs-credit-card-payoff-calculator-spec-20261109` 由主代理負責登記，作者未執行任何 registry/coordination 指令。本文件是作者對自己文件的檢查，**不是**獨立審查，不計 readiness。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對基線 commit `992da13` 的 `docs/specs/` 全部 101 份預案與 `tools/` 現有工具，無 credit-card／payoff 同名或同功能預案。最相近者 `spec-mortgage-amortization`（有擔保房貸攤還，其 goal 自列非目標含信用卡與循環信用）與 `spec-compound-interest-calculator`（儲蓄複利成長，非負債遞減）；實質差異見 SPEC scope 節，與概念 note 一致。

- 字面案例重算：10 筆核心案例與 3 筆 controller 案例。`fixed-payment-basic` 由作者逐月手算（12 列利息／本金／餘額全列），再以獨立 Python 程式依 SPEC 釘死規則（利息 I＝（B × aprBp ＋ 60000） div 120000、年金閉式 BigInt 有理數進位、同一月結模擬）重算兩次，兩次輸出逐字節相同且與手算一致；每筆成功案例另驗恆等式（本金總和＝原始餘額、totalPaid＝餘額＋總利息、末列餘額＝0）。`target-months-annuity` 的月付 94,560 分與公開年金常識值（10,000 元、24%、12 期約 945.60 元）相符。`payoff-too-long` 以本金每月成長率推估 600 個月本金總和約 601 分，遠小於餘額，錯誤判定可手算複核。expected 皆未由任何產品程式產生（本案無產品程式）。

- 概念 note 未釘死、由作者決定的規則（已全數寫入 SPEC）：（1）月利率分母固定 120000（aprBp／120000），利息 half-up 以整數式（＋60000）div 120000 表達；（2）模擬上限 600 個月，超過回 PAYOFF_TOO_LONG；（3）目標月數模式的年金下限規則 P ≤ I₁ 時 P＝I₁＋1，保證模擬有進展；（4）驗證順序與錯誤碼名（SCHEMA／INPUT_LIMIT／UNICODE／EMPTY／MONEY_FORMAT／PERCENT_FORMAT／INTEGER_FORMAT／ENUM／RANGE／NEVER_PAYOFF／PAYOFF_TOO_LONG）沿用 retry-budget 慣例，非啟用條件欄位必須為 null（SCHEMA）；（5）預設草稿值；（6）結果 rows 含全部月數不截斷，畫面 25 列分頁、報告完整匯出。概念 note 與現實規則無衝突，無需偏離。

- 完整性自查：goal 有具體情境與成功結果；scope 列 MVP 與非目標；userFlow 含六狀態、範例入口、錯誤回復與重設預設值；inputsOutputs 每欄位有文法、單位、raw 上限、範圍、驗證順序與輸出恆等式；implementation 釘死公式、BigInt 精確路徑、舍入、600 個月上限與 Worker／世代規則；acceptance 預宣告九面向與證據要求；tests 含 13 筆字面案例表與候選 gate；handoff 記錄任務 id、登記責任與交驗格式。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
