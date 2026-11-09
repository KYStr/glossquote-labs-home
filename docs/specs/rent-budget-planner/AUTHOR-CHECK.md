# 租屋預算規劃 — 作者檢查

作者 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`，規格工作 `labs-rent-budget-planner-spec-20261109`（由主代理登記）。這是作者本人對文件的檢查，**不是**獨立審查；文件是否 ready 由非作者 reviewer 決定。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 查重：已比對本 repo 的 `docs/specs/`（101 份）、`tools/`、`sources/legacy/`、`sources/candidates/` 目錄，沒有租屋、租金或搬入現金相關工具。最相近者為 legacy 的 `quote-builder`（對客戶的品項報價組裝）與 `docs/specs/mortgage-amortization/`（有擔保貸款本息攤還）；本案是租客自用的負擔能力上限與無息簽約現金堆疊，輸入、輸出與使用情境皆不同，差異已寫入 SPEC scope。

- 案例重算：10 筆字面核心案例、3 筆 controller 案例。7 筆成功核心案例先以紙筆依 SPEC 規則計算（比例以有理數處理、maxRent 無條件捨去、仲介費半個月四捨五入、占比四捨五入至 0.1%），再以獨立的分數運算重算一次，兩次結果一致才寫入 fixtures；3 筆錯誤案例逐一對照驗證順序與固定錯誤碼（INPUT_LIMIT／EMPTY／ENUM）。`standard-p30` 核對點為「30% 比例下的搬入現金堆疊總額 42,000」；`third-exact` 核對點為「三分之一捨去後恰好等於上限、withinBudget 為 true」。

- 概念未定、由作者裁量並已釘入 SPEC 的決策：自訂比例只收整數百分比 1–100（不收小數，保整數精確）；maxRent 一律無條件捨去（不超過比例優先於接近比例）；半個月仲介費遇奇數租金四捨五入到整數元；候補租金占收入比輸出至 0.1%，收入為 0 時為 null；每月餘額可為負數且不是錯誤；非 CUSTOM 時 customRatio 完全忽略不驗證；押金與仲介費以列舉月數（0–3／0、0.5、1）而非自由數字輸入。

- 完整性自查：每個輸入欄位都有型別、文法、容量、範圍與預設；驗證順序、錯誤碼與 field 已固定；捨入模式逐值標明（floor／half-up／精確整數）；流程六狀態與 reset 預設值已釘；九面向已在 acceptance 預宣告；雙語 title／description／FAQ 與候選 noindex、正式 gate 已分開記載。

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
