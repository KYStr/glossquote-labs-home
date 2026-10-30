# 全選項組合表 / Option Matrix — 製作說明書 v1

**狀態：DRAFT / SPEC_ONLY，待非作者完整度審查。不是 ready 庫存、工具候選或產品通過證明。**

- 規格 ID：`spec-option-matrix-v1`。
- 文件修訂：public-r2；只移除內部協作識別，產品需求與驗收標準不變。
- [固定 brief](https://github.com/KYStr/glossquote-labs-home/blob/3236a9e030d0d24238a970a32ff98e4ac5794612/coordination/cloud/2026-10-29/SPEC-STOCK-BRIEF.md)；[既有主頁 source baseline](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。baseline 僅是工程/發布契約入口，沒有宣稱已存在本工具程式。
- 本文件以 GitHub commit 固定後由 registry 的 `document` 指向該 commit；文件不自填自己的未知 commit。所有執行、品質分數及原生證據目前為 `NOT_RUN / null`。

## 1. 目標 `goal`

**受眾與問題（設計假設，不是假造訪談）：** 小型網站/流程維護者常有數個選項群，例如登入狀態、語言、配送方式，想列出每個有限組合，再拿到自己的測試或討論流程逐筆檢查。手動複製表格容易漏掉一組或重複一列。

輸入 1–6 個維度及各自 1–12 個字面選項，明確按「產生全部組合」，取得順序可預測、沒有遺漏/重複的完整笛卡兒積，最多 2,000 列。檢查者可翻頁閱讀、下載 JSON，適用時下載 CSV。成功不是工具自動測過系統；只是正確列出使用者指定的有限組合。

**不做：** pairwise/覆蓋陣列縮減、隨機抽樣、機率/風險排序、選項相依/排除條件、有效業務規則推定、測試執行、通過/失敗追蹤、帳戶/歷史/雲端同步、檔案匯入、SQL/程式碼生成、試算表公式、個人假身分資料、API、付費服務。沒有「找出所有 bug」或「這些組合全部合法」的承諾。

## 2. 範圍與不重複依據 `scope`

### 2.1 來源快照與比較方式

開始時實讀 [registry revision 288](https://github.com/KYStr/glossquote-labs-home/blob/e5e5d6ee4e3ce38bd25e8bd73d0806a0ff101dc9/coordination/work-registry.json)：72 個既有 task、69 份 reserved spec、未消耗 ready=0；兩端 reconcile 已完成。所有既有 owner 不變。catalog 有 56 個公開目錄項，不等於只有 56 個已知工作；另核 registry 的 61 個本地工具與 8 個雲端重複方向。比較依用途、主要輸入、核心運算、輸出，不只看名稱。

[同分支固定 catalog 快照](https://github.com/KYStr/glossquote-labs-home/blob/dd059fc489ffc79c64754182ce09bc84151ae054/catalog.json) 的 Git blob 為 `aee12124696bbf216fdd3bbdca1e447fa7f423e8`。截至這次範圍比較，沒有生成有限選項笛卡兒積的既有 task/spec；此結論只涵蓋已 reconcile 的登記，不宣稱搜尋了使用者其他私人專案。實作前再讀最新 registry，若已有重疊 owner，停止並交統籌處理，不另改名領工作。

| 最近似既有工作（固定原規格） | 原用途 / 輸入 → 輸出 | 本預案的實質差異與不接管界線 |
|---|---|---|
| [CSV 欄位整理](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/04-csv-workbench/SPEC.md) | 已有 CSV → 選欄/定位/原資料匯出；FR-07/14–16 不生成新列 | 本工具沒有 CSV 輸入、清理/搜尋功能；由獨立選項群生成新案例列，不複製既有 CSV 編輯器 |
| [文字套版](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/43-template-merge/SPEC.md) | 已有 CSV 每列 + 文字模板 → 個人化文字 | 本工具沒有模板、placeholder 或已有名單；列數由選項乘積決定，不逐原資料列替換 |
| [隨機分組](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/17-random-groups/SPEC.md) | 人員名單 → 每人恰分一次、均衡分組 | 本工具無 RNG、不分配人員；每個選項會跨其他維度重複出現，完整枚舉全部 tuple |
| [權重決策矩陣](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/08-decision-matrix/SPEC.md) | 已知方案/準則/分數 → 加權排名 | 本工具不評分、不排名、不推薦；「矩陣」只表示組合列，不能借決策工具名稱暗示最佳方案 |
| [名單比對](https://github.com/KYStr/glossquote-labs-home/blob/be197ea30d909b1353e7f77bdf16b1811ac41f71/coordination/local/2026-10-29/specs/19-list-compare/SPEC.md) | 兩份名單 → 交集/差集/聯集 | 本工具不是集合合併；兩群各 2 項應輸出 4 個配對，不是最多 4 個單項 |
| 其餘 catalog / registry | 單位/日期/金額/時程/排班/裁切/庫存、文字格式與遮蔽、圖片/影音/字幕、檔案/書籤/聯絡人、字卡與其他保留責任 | 都不被本工作修改、整合或重標 ready；共同的下載/雙語 UI 不構成對其核心工作的接管 |

### 2.2 固定功能

1. 繁中 `/index.html`、英文 `/en/index.html`，完整對等標籤、說明、錯誤、空狀態與鍵盤操作。
2. 新增/刪除/上移/下移維度的原生按鈕；每維度一個名稱、一個每行一值 textarea。不能只有拖曳操作。
3. 即時顯示合法輸入的乘積數，不產生結果；無效時只顯示待修正與第一個錯誤位置，不留舊數量。
4. 明確產生、取消、翻頁、清空、載入不含個資的例子；一份可選取 JSON 預覽與兩種明確下載入口。
5. 列舉順序固定；原始輸入修改立刻撤銷結果。規格中的取消/清除不刪使用者已下載檔案。

## 3. 正常使用、取消與恢復 `userFlow`

### 3.1 桌面主旅程

初始 2 個空維度，無結果/檔案/背景運算。頂端說明「列出每個組合；不判斷組合是否適用，也不執行測試」。用戶可填「登入」=`訪客\n會員`、「語言」=`繁中\nEnglish`，看到「將產生 4 列」，按產生後依序是訪客/繁中、訪客/English、會員/繁中、會員/English。第一維最慢變、最後一維最快變。預覽第一頁，列號 `C0001`…`C0004`；JSON 下載包含完整 4 列，不是只有目前頁。

生成前顯示全部合法維度名稱、各選項數與總數，提醒個資不要填入。生成成功才啟用下載；按鈕文案只能說「交給瀏覽器下載」，不宣稱 OS 已保存成功。生成耗時期間顯示進度/取消，不鎖死主要操作。

### 3.2 編輯與所有權

- 所有名稱/選項 `input`、`change`、`compositionstart` 及結構變更先遞增 generation、取消計算、清結果與待匯出資料，再驗證新值。composition 期間禁止生成；compositionend 後仍需明確生成。即使改回原文，也不復活舊結果。
- 每次產生先撤銷舊結果，再讀取同一不可變快照；失敗或取消沒有可用的半份表。舊 callback、取消後完成、逾時後進度不能修改新狀態、焦點或按鈕。
- 正常翻頁只改目前頁，不重排/重算、不改資料或 generation。每頁最多 50 列；頁碼不循環，兩端相應停用。
- 維度順序決定結果順序。上移/下移保留當前欄位內容、撤銷結果，焦點留在同一維度的對應按鈕；到界線停用。

### 3.3 破壞性操作

刪除任何已有名稱或選項內容的維度、清空、載入例子、語言切換/同語首頁導航，在頁內有未空草稿或結果時先顯示可取消確認。確認對話含具體動作，不回顯內容；取消/ Escape 保留原值、結果、頁碼及焦點。確認才取消 generation、清結果後刪除/重設/導航。空維度可直接刪除，但最少保留一個。

清空回初始 2 個空維度，焦點首維名稱；例子覆蓋為本節 2×2 並清結果，**不自動生成**。不裝置全域 beforeunload 警告；頁面關閉/重載/外部導航會失去草稿，入口及輸出區明示。pagehide 清工作與資料；pageshow/BFCache 恢復時再次回初始空白。僅切至背景不自動清草稿，但生成中的工作立即取消，回前景需手動重做；完成結果可保留。

## 4. 精確輸入輸出 `inputsOutputs`

### 4.1 輸入契約

所有上限先驗證再分配結果，超過一單位整份拒絕，不截斷、不自動刪項。UI 可以暫留錯誤草稿供修正；不得利用 `maxlength` 靜默截斷貼上。核心自己驗 schema，不只依賴 UI。

| 項目 | 固定規則 |
|---|---|
| 維度數 | 1–6；初始2空欄；第7欄新增按鈕停用且核心仍拒絕 |
| 名稱 | 原字串≤128 UTF-16 units；只移除兩端 ASCII space U+0020，之後1–40 Unicode code points；完全空白依 JS trim 定義拒絕。名稱彼此大小寫敏感、逐碼點完全相同則拒絕；ASCII忽略大小寫等於 `caseId` 的名稱保留不用 |
| 選項來源 | 每維一個原字串≤4096 UTF-16 units；CRLF和單獨CR正規化為LF，空來源為0選項；非空以LF分割，**只容許刪除末尾恰一個空項**（輸入最後一個換行），中間空行/額外末尾空行均拒絕 |
| 每維選項 | 1–12；每值只移除兩端ASCII space，之後1–80 Unicode code points，完全空白拒絕。同維重複值拒絕並指出兩行；跨維相同值允許 |
| 文字 | 不做NFC/NFKC、大小寫轉換、數字/布林/日期轉型或escape解碼。拒未配對surrogate、C0/C1/DEL、U+2028/U+2029、U+202A–202E/U+2066–2069；選項原來源的CR/LF只作行分隔不作值內容，TAB拒絕。名稱不得含任何換行 |
| 總輸入 | 所有原名稱與原選項來源各自UTF-8 bytes的總和≤32,768；無額外分隔符計入。surrogate先拒再TextEncoder計量 |
| 總列數 | N為各維合法選項數之積；1≤N≤2,000。每次乘前可用N>floor(2000/nextCount)提早拒絕；不生成前2,000列冒充全部 |
| 識別 | UI維度用當前未使用的最小 `d1`…`d6`，移動保留ID，刪除後可重用。生成快照輸出欄位ID按結果次序重新固定為 `d1`…`dK`；無使用者字串作object key |

不同Unicode表示若逐碼點不同就視為不同值，可能看起來相同；旁註「不合併看起來相同的Unicode文字」。CSV/JSON也不會把 `001` 轉成數字。

### 4.2 結果與序列化

內部結果為不可變欄位列表與 rows；caseId 依目前生成序號，從 `C0001` 到 `C2000`，不是跨修改/跨專案永久身分。UI結果表首欄為caseId，其餘依維度次序；所有值只以textContent/value放入DOM。HTML、URL、公式字面沒有執行或連結效果。

JSON固定 schema（範例有效輸出，非已完成測試）：

```json
{
  "schemaVersion": 1,
  "tool": "option-matrix",
  "columns": [{"id":"d1","label":"登入"},{"id":"d2","label":"語言"}],
  "rows": [
    {"caseId":"C0001","values":["訪客","繁中"]},
    {"caseId":"C0002","values":["訪客","English"]},
    {"caseId":"C0003","values":["會員","繁中"]},
    {"caseId":"C0004","values":["會員","English"]}
  ]
}
```

- 精確鍵順序如上；`JSON.stringify(document, null, 2) + LF`，UTF-8、無BOM，固定檔名 `option-matrix.json`，MIME `application/json;charset=utf-8`。無時間/隨機值/檔案名/瀏覽器識別，兩語同輸入產出相同bytes。結果schema不供重新匯入，不能把載入JSON列為已承諾功能。
- CSV僅對無下述風險的結果提供；首列 `caseId` 與欄位label，其後每列caseId及values；全格雙引號，內部雙引號加倍，逗號分隔，CRLF列分隔、末尾CRLF，UTF-8無BOM。固定 `option-matrix.csv`，MIME `text/csv;charset=utf-8`。JSON才是保留字串型別的權威格式；試算表可能自行轉換日期/前導零，CSV不是跨應用型別或安全保證。
- **CSV風險**：對所有labels/values（含表頭）先檢查首碼點是否ASCII `= + - @` 或全形 `＝ ＋ － ＠`，以及 `String.trimStart()` 後首碼點是否其中之一；任一成立，整份CSV入口停用並顯示數量/欄位置，不回顯原值，不提供繞過/保護副本。JSON仍可取得原字串；不改值偷偷加單引號。C0/C1等先前已拒絕，CSV結構引號不當公式防護。
- 每種實際序列化產物最多2,097,152 bytes；合法CSV與JSON都須先完成有界序列化才提交結果；一者超限，整份結果拒絕。2,000是列數上限，不保證最長六欄文字也容得下輸出byte上限。CSV因風險停用時只計JSON，沒有「空CSV」下載。最多持有一個待下載objectURL，不預先產生所有Blob。
- 點選下載才以已固定bytes建立Blob/objectURL；同次只允許一個下載動作。URL持有10秒合理grace後撤銷；grace中停用兩下載鈕，輸入編輯可清結果但不得立即回收已交瀏覽器的URL；pagehide/清空則立即撤銷。到期回調只清自己URL，不能讓舊結果重新可下載。失敗固定錯碼、回收URL，已交OS的下載不可撤回。
- readonly JSON完整文字為缺少下載API時的手動選取備援；不讀或自動寫clipboard、無隱藏execCommand，不宣稱手動複製成功。

### 4.3 具體有效/無效例

| 輸入 | 預期 |
|---|---|
| A=`a\nb`，B=`x\ny\nz` | 6列：ax,ay,az,bx,by,bz（這裡是tuple簡記，不是串接字串） |
| 單維=`唯一` | 1列，不要求至少2個維度 |
| `紅\r\n藍\r\n` | 兩值，末尾只一個換行可忽略 |
| `紅\n\n藍` 或 `紅\n\n` | 中間/額外空行錯誤，不悄悄少算 |
| ` a \na` | ASCII trim後重複，第1與2行錯誤 |
| 不同維各有 `001` | 合法字串，按笛卡兒積正常重複；JSON保留前導零 |
| `=1+1` 或首碼點NBSP後接 `+x` | 合法文字值、JSON保留；CSV停用，不執行、不補字元 |
| `<img src=x onerror=alert(1)>` | 合法文字顯示，不建立img或事件handler |
| 10×10×10×2 | 2,000列合法；10×10×10×3為3,000，整份拒絕 |
| 80個emoji / 81個emoji選項 | 前者80碼點接受（仍滿足raw/總量上限），後者拒絕；不按視覺字形計數 |

## 5. 實作方案 `implementation`

### 5.1 自足靜態架構

使用原生HTML/CSS/ESM，Node24內建模組作測試/建置，runtime與dev均不新增第三方套件、不install、不CDN/外部字型。公共source可讀不是授權可任意抄用；不得複製其他工具的未授權實作。可依上述已公開契約自行寫此獨立工具；任何新增來源/依賴須另批准、列版本/授權，不在本預案內。

| 模組 | 單一責任 / 可驗入口 |
|---|---|
| `core/input.mjs` | validateDraft：只接受plain data exact keys、primitive字串、無holes/accessors/未知鍵；raw上限、Unicode/分隔/重複/數量驗證；回新快照，不改輸入 |
| `core/product.mjs` | countProduct及enumerate：固定mixed-radix順序，第一維最慢；每列values長K，N列完整；逐128列yield，檢查generation/cancel/5秒絕對期限 |
| `core/export.mjs` | 同一結果作JSON/CSV、風險檢查及byte上限；不接觸DOM/下載 |
| `core/session.mjs` | idle/invalid/generating/ready/error，generation單調遞增；所有晚到事件guard；確認對話與資料修改分離 |
| `app.mjs` + `i18n.mjs` | 真DOM事件、語意欄位/錯誤/確認/分頁、雙語文字；不另寫列舉演算法 |
| `download.mjs` | 單URL租期、10秒grace、失敗/離頁清理；不保存工作資料 |
| `scripts/build.mjs` / `check.mjs` | 固定public allowlist、link/secret/外部資源檢查、preview產物manifest；拒絕未知輸出或符號/硬連結，不刪他人資料 |
| `test/*.test.mjs` / `docs/VERIFICATION.md` | 原始literal oracle、負例/控制時序、真browser證據分開；所有作者新增code逐行中文解釋 |

`validateDraft` 的核心輸入固定 `{dimensions:[{id,name,optionsText}]}`；id為目前唯一d1…d6，不允許object任意鍵影響原型。其輸出 `{columns:[{id,label,options:string[]}],rowCount}` 重新按位置產生欄位id。所有錯誤只回固定碼及dimension/line/limit等數字，不攜原文字或exception stack。固定碼至少：`SCHEMA_INVALID`、`INPUT_LIMIT`、`INVALID_UNICODE`、`CONTROL_NOT_ALLOWED`、`DIMENSION_COUNT`、`NAME_EMPTY`、`NAME_LIMIT`、`NAME_DUPLICATE`、`NAME_RESERVED`、`OPTION_EMPTY`、`OPTION_LIMIT`、`OPTION_DUPLICATE`、`COMBINATION_LIMIT`、`OUTPUT_LIMIT`、`CANCELLED`、`TIMEOUT`、`UNSUPPORTED`、`EXPORT_FAILED`。CSV停用是 `CSV_RISK`，不讓JSON結果變成失敗。

enumerate用索引向量從全0開始：每輸出一列後，自最後一維加1，達該維長度則歸0並向前進位；最左溢出即停止。以整數N驗最終列數，不用隨機、不排序、不以JSON字串當去重key。生成與序列化同屬一個5秒絕對期限；每個yield前後及提交前檢查token/取消/時間，timeout丟棄整份結果。計時器不是硬即時CPU安全保證；最大輸入及每批量界須實測。5秒內背景取消/編輯必須阻止最後提交。

### 5.2 安全、隱私、可及性

- 同源靜態載入後，核心功能不需網路。無fetch/XHR/beacon/WebSocket、analytics、storage/cookie/IndexedDB/service worker、使用者內容URL、表單提交、第三方iframe，無權限要求。首次取得頁面需要網路；不承諾尚未載入也可離線。
- 全部使用者文字僅textContent/value；無innerHTML、eval、動態import使用者路徑或自動打開輸入URL。靜態安全標頭至少CSP `default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`、nosniff及no-referrer。精確是否支援需實際hosting查核，meta不能冒充frame-ancestors HTTP效果。
- 下載是唯一持久化途徑，使用者自行分享檔案需檢查內容；clear/pagehide只釋放頁面引用，不能保證物理記憶體抹除或刪OS檔案。不得記錄原文到console/報告/URL。
- 原生button/textarea/label/fieldset與legend；每欄錯誤aria-describedby，live status節制播報，不逐列朗讀2,000筆。結果table有caption/th scope、caseId可讀。鍵盤完整操作、可見焦點，不以色彩單獨標錯誤；確認區焦點設在保留/取消，關閉回觸發鈕。
- 桌面至少1280×720及1024×768、200%真zoom可完成旅程；長表可在有名稱的區域內水平捲動，外頁不遮主要動作。320CSS窄窗作可及性觀察，不等真手機通過；無資源的觸控/裝置明列未承諾，不新增硬門檻。減少動態無功能缺失，不需動畫完成任何操作。
- preview兩語noindex/nofollow，robots拒收錄，不放假正式canonical/sitemap/JSON-LD URL。正式origin未知，不能由本預案分配新子網域。未來正式發布另外批准後才建立真URL、互返hreflang/canonical與同語主頁連結並外驗。

## 6. 完整品質驗收契約 `acceptance`

以下九面向**都保留**，不得交驗時縮減。產品品質由不同且未製作該候選者對同一commit逐項給證據/分數，每項≥90且所有必要檢查完成才accepted；缺實測維持null/NOT_RUN，不能拿測試數量或平均分替代。規格完整度核查與將來產品評分不是同一件事。本文件目前無任何分數。

| 面向ID | 必達要求 / 方法 | 必留證據 / 未通過處置 |
|---|---|---|
| functionality | 1維/2×3/不等長6維/2,000列完整列舉，固定順序/唯一tuple/正確caseId；真UI主旅程/分頁/完整下載 | literal expected與實際輸出bytes、真鍵鼠流程；漏列/錯序/只匯出當頁為fail |
| boundaries | 全部raw/碼點/byte/選項數/乘積端點±1；empty/duplicates/schema/Unicode；取消/修改/背景/5秒timeout/晚到回調 | 分支原始log；取消後零可用半結果、generation不串線；不可控原生時序列NOT_RUN，不用mock冒替 |
| privacy | 真browser全Network/Storage從載入、輸入、生成、下載、清除、離頁/返回觀察；不得漏同源遙測 | 原始請求與storage檢查範圍；只看到UI不算PASS，無能力則null |
| security | 字面HTML/URL/公式、CSV_RISK、Unicode/原型/未知鍵、DOM與build allowlist；靜態headers真讀回 | source與負例、artifact/headers對應同commit；有限檢查非全面安全保證 |
| usability | 非作者只靠頁內說明完成新增/排序/生成/翻頁/下載/修錯/取消；理解完整組合≠有效業務測試 | 真操作觀察、產物重新以文字工具打開核對；不得宣稱使用者研究/喜好；無實作時NOT_RUN |
| accessibility | 純鍵盤兩語全流程、焦點/確認Escape、label/錯誤/表格語意、真200% zoom、對比與無色彩依賴 | browser版本/尺寸/操作紀錄；輔助科技若無實測列範圍未知，不冒稱全面認證；不把無資源手機加成硬門檻 |
| localization-seo | 兩語相同邏輯及產物，全部錯碼/說明/空狀態對等，同語首頁；preview與正式SEO分離 | 雙語頁檔/實際鏈接檢查；正式未部署就NOT_RUN，不把previewnoindex當正式SEO已驗 |
| toolchain-provenance | Node24零依賴、自足source/test/check/build、乾淨build重現manifest、固定candidate/PR、原規格版本與中文註解 | commands/exit/stdout、source及runtime hash；新來源授權與依賴變更先停報，不沿用他款PASS |
| compatibility | 記錄實際OS/瀏覽器版本；桌面Chromium系至少一款完成正常流程，Firefox等未驗列限制；下載API缺失備援、BFCache、背景取消 | 同候選真browser證據；CPU不能補真下載/返回，未測必要主支援環境不可accepted；不承諾手機或所有引擎 |

## 7. 最小充分測試與預期 `tests`

### 7.1 純函式 / 受控狀態測試（實作後執行，目前全部NOT_RUN）

| 組 | 資料與oracle（不可由被測函式生成expected） |
|---|---|
| T01 基本列舉 | 單維`[x]`→C0001[x]；`[a,b]×[x,y,z]`→六個明列tuple；六維各一項→一列六格 |
| T02 次序與重複 | 同值跨維合法，duplicate同維拒絕；換維度次序改tuple欄順/枚舉快慢，不遺漏；測同名label與caseId保留名 |
| T03 容量 | 維度0/1/6/7；每維0/1/12/13；10×10×10×2=2000過、×3拒；原字串/碼點/總UTF8/輸出bytes每一界線-1/等於/+1，用多byte與escape字符構造 |
| T04 文字 | CRLF/CR/LF、末尾一LF與兩LF、中間空行、ASCII邊空格重複、全形空白、NFC外觀相同但bytes不同、emoji、孤立surrogate、每個禁控制區間端點；結果不能偷偷normalize |
| T05 schema | null/array代object/未知key/getter/holeyarray/非primitive；不得呼叫accessor作驗證副作用；原草稿不變 |
| T06 序列化 | 應與§4範例JSON以固定indent/LF重建bytes一致；CSV引號/逗號/中文/emoji字面往返；caseId+表頭/每列欄數；001仍字串；formula風險header與值及NBSP前綴阻CSV但JSON保留 |
| T07 生命週期 | A生成pending→編輯B→A完成/失敗/進度均丟棄；取消/超時/visibility hidden/pagehide同理；clear→late也不能復活；composition禁止生成；雙點生成只一owner |
| T08 匯出資源 | Blob/URL建立失敗釋放；一次URL；10s前編輯不提前回收已交URL、到期只回收自己、不恢復過期下載；pagehide/clear即回收；unsupported有readonly備援 |
| T09 工具鏈 | 所有必要檔/語法/兩語key；public allowlist缺/多檔、符號/硬連結、未知dist、外部src/import、禁止storage/network；乾淨複本重建manifest相同，失敗不刪原未知資料 |

### 7.2 真桌面瀏覽器必要旅程

記OS/瀏覽器完整版本、viewport/zoom、candidate commit/runtime hash、輸入方式、時間、expected/actual、證據檔。每項PASS/FAIL/NOT_RUN，不以自動化fixture名稱偽裝真人或原生。

1. **B01 兩語主流程：** 從空頁只依說明填2×2例，生成/翻頁（另用5×12=60列）/查看最後頁，JSON及可用CSV各下載後實際打開，核不是當頁切片；以正常按鈕不是注入完成旗標。
2. **B02 錯誤與恢復：** 空行、重複、乘積超2000、修正後成功、資料變動舊下載撤銷；上移/下移/刪除，取消確認與Escape均原狀/焦點正確。
3. **B03 長表：** 合法2000列/6維，UI仍可取消或操作下一步，DOM最多50資料列；若工作很快看不到取消，純測證競態，原生只記實見，不聲稱人為取消已測。
4. **B04 生命週期：** 生成中切背景/離頁、重載及BFCache返回；以真可達步驟觀察空白恢復及無過期結果。無法控制的特定晚到時序明列NOT_RUN。
5. **B05 鍵盤/可讀：** 兩語完整Tab/ShiftTab/Enter/Space/Escape，visiblefocus、確認回焦、錯誤定位；1280×720及1024×768、200%真zoom，長值與窄表不遮主要控制；檢查對比及reducedmotion。
6. **B06 隱私/安全：** 完整Network/Storage，使用假哨兵值，不放真個資；same-origin第三方analytics也算。真hosting的CSP/nosniff/referrer逐項讀回，不把本地fixture的header當正式站。
7. **B07 故障備援：** 在有授權的controlled adapter測Blob/URL不可用及過期回調，另驗真下載；不能安全造成原生拒絕時標未跑，不更改瀏覽器/OS持久權限來造結果。

驗收者可加具體新反例，不得藉此刪原門檻；嚴重差異先重現/回作者，其他可評項保留。沒有產品實作就沒有B01–B07的PASS。

## 8. 交接與完成條件 `handoff`

### 8.1 這份規格的獨立完整度核查

作者先提交本文件固定commit與draft PR，另附有限自查（鏈接身分、差異矩陣、八節與九品質面向是否全含、範例可手算），不是產品測試。另一名未參與撰寫者實讀同commit，核八節各 `goal/scope/userFlow/inputsOutputs/implementation/acceptance/tests/handoff`；逐項記問題/證據。**作者不得為自己mark-spec-ready。** 若缺項則本ID revise-spec，不能另複製成第2份湊庫存。

未獨核前spec.status=draft、readiness=null、consumedBy=null，ready庫存不增加。完整度核查後如可ready，由不同actor依最新core/CAS處理；ready不等於工具accepted。此spec工作的submission依固定候選/PR與八項契約另記，不把規格ready冒稱產品通過。

### 8.2 未來實作者步驟（目前未派工）

1. 先讀最新registry與此固定文件，確認未有相同實作owner；正式production task另綁這份已ready的spec與完整九面向、allowedExecutors，取得唯一claim才實作。預設local-codex/P3；規格撰寫的承接不能拿來製作工具。
2. 在授權的新工具工作目錄以Node24內建工具建立原生靜態骨架；不抄未授權兄弟程式、不install、不開服務直到相應任務允許。
3. 先完成input/product/export/session純核心與T01–T08，再接真DOM/i18n與下載；新增作者code逐行中文解釋，不為註解去改第三方或既有來源hash。
4. 完成有限check/build、manifest與T09，保留精確commands/exit/log。build只寫全新或已確認自己擁有的dist，不刪他人樹；不使用npm install或外網依賴。
5. 在已批准的預覽環境做B01–B07；分開記原生、controlled adapter、靜態、未測。固定source/runtime/PR後交非作者逐九面向評，失敗回原owner修。
6. 正式origin、hosting、免費服務/公開來源權限未在本規格分配。未來發布需原批准流程：source→部署→同版HTTPS/兩語/SEO/同語首頁往返核對→才改catalog；此工作不建立repo/服務/workflow、不改主頁或catalog。

### 8.3 交件最小欄位與停止條件

交件須列規格 ID、製作者與獨立審查責任、source/candidate 40字元commit、文件路徑/PR、runtime逐檔manifest、Node/OS/browser版本、所有必要case結果與證據、九面向分數或null、缺口owner/解除條件、recovery/清除/下載界線。公開文件不得有私人本機路徑、真輸入內容、憑證或未授權素材。

遇新重疊owner、claim不符/未知CAS、來源不可讀、必須外部API/套件/費用/新權限、規格矛盾或超出此scope時停止該支線並報具體原因；先保留證據，不靠另改名、默調上限、關檢查或重試迴圈過門檻。工作中斷時保留文件版本與未完成事項，不假稱完成。

**當前完成界線：** 僅一份新的文件候選；未實作、未消耗、未獨核、未ready、未部署；沒有任何產品品質分數。
