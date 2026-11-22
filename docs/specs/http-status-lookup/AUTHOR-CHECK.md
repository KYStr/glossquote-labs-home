# HTTP 狀態碼查詢 — 作者檢查

作者為 run 6 規格作者（http-status-lookup），登記、claim 與提交由家長辦理；本文件為作者對文件做的檢查，待非作者 readiness。作者不得稱自己的文件為獨審。

- 八節涵蓋 goal、scope、userFlow、inputsOutputs、implementation、acceptance、tests、handoff。配對 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json)。

- 已比對 registry r807 的 130 份預案及本 checkout 既有規格。最相近者的實質差異見 SPEC scope：url-inspector（拆解 URL 成分，不解釋狀態碼）、subnet-calculator（IPv4 子網路運算）、retry-budget（重試時間模型，Retry-After 為非目標）、jwt-decoder（解碼 token）。本 checkout 內無既有的狀態碼查詢規格。

- 17 筆字面核心案例、3 筆 controller 案例，共 20 筆。`code-404-not-found` 核對點為「4xx 分類與 404 的完整說明」。

## 推導一：手算

每個 fixture 的 expected 皆由作者手算字面寫入，未用產品程式產生：

- 分類：取代碼首位數字，`class = floor(code / 100)`，對照 SPEC §5 分類表（摘要逐字取自 IANA registry 註記）。例如 404 → 4 → client-error；209 → 2 → success；599 → 5 → server-error。
- 是否指派、官方名稱、出處：逐列對照 2026-11-21 讀取的 IANA HTTP Status Code Registry（https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml）。例如 418 登記為 `(Unused)`，出處 RFC 9110 §15.5.19；209、599 落在登記的 Unassigned 區間（209–225、512–599），故 `assigned=false`、官方名稱與出處為 null、其餘六個說明欄位用 SPEC §5 固定的未指派字串。
- 中文名稱、意義、成因、建議：逐字抄自 SPEC §5 狀態碼表該列（作者依各出處語義撰寫的固定文字）。
- 錯誤案例：依 SPEC §4 驗證順序手算。`099` 通過 `^[0-9]{3}$` 文法但值 99 < 100 → RANGE；`600` 值 > 599 → RANGE；`abc` 非數字 → INTEGER_FORMAT；空字串 → EMPTY；`123456789` 為 9 單元、超過 raw 上限 8 → INPUT_LIMIT。
- SPEC §5 狀態碼表 64 列：逐列手對 IANA 登記的官方名稱與出處；未指派區間（105–199、209–225、227–299、309–399、419–420、427、430、432–450、452–499、509、512–599）不逐列列出，僅在表末註明。

## 推導二：獨立重算（script）

以 `/tmp/verify_http_status.py` 獨立重算，未用 SPEC.md 或 fixtures.json 的內容當來源：

- 登記表由 script 內直接依 IANA 登記頁逐列鍵入（64 列：代碼、官方名稱、出處、temporary、obsolete），再逐項比對 SPEC.md 表格的官方名稱與出處是否一致。
- 對每個核心成功案例重算分類物件（首位數字 → 分類表）、assigned、官方名稱、出處、temporary、obsolete，並比對 fixture 的中英文意義／成因／建議是否與 SPEC.md 表格該列逐字一致。
- 對每個核心錯誤案例依釘版驗證規則（長度 > 8 → INPUT_LIMIT；空 → EMPTY；非 `^[0-9]{3}$` → INTEGER_FORMAT；值超出 100–599 → RANGE）重算錯誤碼與欄位並比對。
- 對 controller 案例內嵌的 404 結果與 `600` 草稿同樣重算比對。

執行結果：`cases=20 core_success=12 core_error=5 spec_rows=64`，`PASS: all fixture expected values independently recomputed and matched`。兩種推導一致，無差異。

## 依官方來源做的更正（概念筆記未定細節，以來源為準）

- `418`：概念筆記未寫名稱。常見說法 "I'm a teapot" 出自 RFC 2324 愚人節玩笑；現行 IANA 登記與 RFC 9110 §15.5.19 皆列為 `(Unused)`。SPEC 與 fixtures 採用 `(Unused)`，並在 SPEC §5 特別註記與 FAQ 中說明。
- `413`、`422` 等名稱採用 RFC 9110 現行名稱 "Content Too Large"、"Unprocessable Content"（舊 RFC 7231 的 "Payload Too Large"、舊 RFC 4918 的 "Unprocessable Entity" 已更名）；`414` "URI Too Long"、`416` "Range Not Satisfiable" 亦同。
- `104`：登記註明 TEMPORARY，registered 2024-11-13、extension registered 2025-09-15、expires 2026-11-13——登記已於 2026-11-13 到期，但登記列仍在。SPEC 仍收錄該列，以 `temporary=true` 及表內文字標示到期，不隱瞞、不刪除。
- `510`：登記標示 OBSOLETED（RFC 2774 已改為 Historic），以 `obsolete=true` 標示。
- `306`：登記描述為 `(Unused)`，與 418 同樣處理。
- `402`：登記為 "Payment Required"，但 RFC 9110 明言保留給未來付款機制、尚無標準語義；SPEC 據實說明，不編造語義。

## 未完成

- 產品交驗、Chrome/Edge、正式 HTTPS/SEO、Network/Storage、原生對話及部署皆 NOT_RUN，分數 null。未固定候選或未獨評前不計 ready。
