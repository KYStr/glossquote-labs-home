# 租屋預算規劃 / Rent Budget Planner

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-rent-budget-planner-20261109` · 2026-11-09 · v1

本組固定任務說明（run 4 SPEC-AUTHOR-BRIEF，概念 #6） · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

租屋族在看房前，先用月實領收入和自己選的租金比例，確認可負擔的租金上限；對一間候選物件，再一次算清簽約搬入要準備的總現金（第一個月租金、押金、仲介費）與每月繳完房租後的餘額。

- 行動。手機在租屋平台和計算頁之間切換，把物件標價貼回來核對是否超標、簽約要帶多少現金。
- 桌面。桌面把收入、比例和候選租金逐項調整，比較不同押金月數與仲介費設定下的搬入總額。

使用情境為預算試算，不是簽約建議。資料只保留在目前頁面草稿。

## scope

單一月收入、單一候選物件、整數新台幣、固定比例預設加自訂整數百分比。非目標為多物件比較或排序、合租分攤、水電費／管理費／稅費估算、貸款與購屋試算、儲存、帳號、媒合或簽約流程。

已與本 repo 的 `docs/specs/`、`tools/`、`sources/legacy/`、`sources/candidates/` 目錄比對，最相近者的實質差異如下。

- 報價組裝工具（quote-builder，`sources/legacy/`）：把品項與單價組成對客戶的報價。此處是租客自用的負擔能力與搬入現金試算，沒有品項、客戶或報價產出。
- 房貸攤還（mortgage-amortization，`docs/specs/mortgage-amortization/`）：有擔保貸款的本息攤還表。此處是無息的租賃簽約現金堆疊，沒有利率、期數或攤還。

判定規則由本文定義，無線上資料或外部服務依賴。押金與仲介費月數是可調參數，預設值（押金 2 個月、仲介費 0.5 個月）是台灣租屋市場常見行情，僅供試算，不引用法規條文。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「月實領收入、自訂比例 / Monthly take-home income and custom ratio」
- 欄位或說明「租金比例、候選租金、押金月數、仲介費 / Rent ratio, candidate rent, deposit months and agency fee」
- 「計算租屋預算 / Calculate rent budget」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「可負擔上限與搬入現金 / Affordable cap and move-in cash」先摘要再列細節：比例上限、候選占收入比與是否超標、搬入現金逐項（第一個月／押金／仲介費／總額）、每月餘額。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、選項、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。超標或負餘額以文字及符號提示，不只靠顏色。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"income":"45000","ratioPreset":"P30","customRatio":"","candidateRent":"12000","depositMonths":"2","agencyFee":"0.5"}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數含下列確切欄位的普通物件，只讀 own data。未知、缺欄、錯型別、accessor 皆 SCHEMA，field 為欄位名或 null，row 固定 null（本工具無列輸入）。JSON fixture 即介面。

- `income`：ASCII 十進整數字串，0 或非零開頭，無空白／符號／小數／指數，raw 最多 9 單元，範圍 0–999,999,999（月實領，NT$）。
- `ratioPreset`：列舉字串，只接受 `P25`、`P30`、`P33`、`CUSTOM`。
- `customRatio`：字串。`ratioPreset` 為 `CUSTOM` 時必填，ASCII 十進整數字串（同上文法），raw 最多 3 單元，範圍 1–100（整數百分比）。`ratioPreset` 非 `CUSTOM` 時本欄完全忽略，不驗證、不影響結果（可為空字串或任意字串）。
- `candidateRent`：ASCII 十進整數字串（同上文法），raw 最多 8 單元，範圍 0–99,999,999（NT$）。
- `depositMonths`：列舉字串，只接受 `0`、`1`、`2`、`3`（押金月數）。
- `agencyFee`：列舉字串，只接受 `0`、`0.5`、`1`（仲介費月數）。
- 預設 income 45000、ratioPreset P30、customRatio 空字串、candidateRent 12000、depositMonths 2、agencyFee 0.5。

先容量、再 surrogate、再該欄文法，欄位順序依下文。未另外指明時容量 INPUT_LIMIT、缺內容 EMPTY、列舉不符 ENUM、不成對 surrogate UNICODE。整份失敗回 `{ok:false,error:{code,field,row}}`。成功僅為 `{ok:true,result}`。資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊。

1. 依 income、ratioPreset、customRatio（僅 CUSTOM 時）、candidateRent、depositMonths、agencyFee 的順序驗證。字串欄先檢查型別（非字串為 SCHEMA，field 即該欄名）；raw 超限 INPUT_LIMIT、surrogate UNICODE、文法 INTEGER_FORMAT、範圍 RANGE、列舉 ENUM，field 即欄名。`customRatio` 在 CUSTOM 時為空字串回 EMPTY。
2. 比例固定為有理數：P25 = 1/4、P30 = 3/10、P33 = 1/3（33⅓ 的精確值，不用 0.33 近似）、CUSTOM = customRatio/100。以 BigInt 精確運算，不用浮點決定整數結果。
3. `maxRentNt = floor(income × ratio)`，無條件捨去到整數元，保證不超過所選比例。
4. `sharePercent`：income > 0 時為候選租金占收入百分比，先以千分位整數 `tenths = roundHalfUp(candidateRent × 1000 / income)` 計算（四捨五入至 0.1%），結果值為 tenths/10 的 JSON 數字。income = 0 時為 null。
5. `withinBudget = candidateRent ≤ maxRentNt`；`overByNt = max(0, candidateRent − maxRentNt)`。
6. 搬入現金：`firstMonthNt = candidateRent`；`depositNt = candidateRent × depositMonths`（精確整數）；`agencyFeeNt = roundHalfUp(candidateRent × agencyFee 月數)`（0.5 個月遇奇數租金時四捨五入到整數元）；`totalNt = firstMonthNt + depositNt + agencyFeeNt`。
7. `monthlyRemainderNt = income − candidateRent`，可為負數，負餘額不是錯誤，以原值輸出並在畫面以文字標示。
8. 結果 `{maxRentNt, candidate:{rentNt, sharePercent, withinBudget, overByNt}, moveIn:{firstMonthNt, depositNt, agencyFeeNt, totalNt}, monthlyRemainderNt}`。金額均為驗過的整數（月餘額可為負，絕對值不超過 income 上限）。畫面金額以千分位逗號顯示僅為呈現格式，機器值不隨 locale 改，不改核心結果。

固定下載 `rent-budget-report.json`。內容為 result 的 compact JSON、object own keys 按 UTF-16 code units 升序遞迴排列，array 順序不改，末尾一個 LF、UTF-8 無 BOM。字串用 JSON 字面轉義，不呼叫輸入的 toJSON。報告上限 2,097,152 bytes，超過 OUTPUT_LIMIT 並停用所有產物。其他副本只依上列精確規則。

## implementation

使用原生 HTML/CSS/ESM 與 Node 24 built-ins，零 runtime／建置依賴。候選目標 `tools/rent-budget-planner/`。src/core.mjs 放純驗證、推導、格式化。src/controller.mjs 管草稿、工作世代及資源。src/app.mjs 用安全 DOM API 綁表單。public/index.html 和 public/en/index.html 為兩個靜態入口。Node scripts 只建置工具 allowlist，不取線上檔、不發布。

- 工作開始先使舊結果失效並遞增世代號。Node 建置時從固定 source bytes 嵌入純核心及固定訊息處理器，頁面載入後從該固定字串建立 module Worker Blob URL。禁止使用者內容參與程式、eval、new Function 或動態 import。測試 import 同一份核心。
- Worker 每次只收目前快照及世代號。取消、換來源、重設、替換或 pagehide 時 terminate 並釋放結果及 URL。只收目前世代且 busy 的結果。成功後也停止 Worker。bfcache 回來重設。明確點下載才建 Blob URL，30 秒內撤銷，結果失效即提早撤銷。
- 表格與預覽用 textContent/value。輸入不當標記、style、selector、href、src 或檔名。禁 fetch、XHR、WebSocket、beacon、analytics、遠端字型、上傳、帳號、剪貼簿、持久 storage、service worker。工作內容不進 URL、history、console、日誌或執行證據。離頁丟棄引用，無安全抹除承諾。
- 正式與預覽均用同源靜態資產。CSP default-src none、script-src self、style-src self、worker-src blob:、img-src self、connect-src none、object-src none、base-uri none、form-action none、frame-ancestors none。self/none 加單引號。另設 nosniff、no-referrer 並拒絕 camera/microphone/geolocation 權限。語言和首頁連結是固定導航。


## acceptance

九面向在開工前固定。由未參與製作的 reviewer 對同一開啟 PR head 驗證。每個必要面向 ≥90 且必要檢查完成。100 全合規，90 僅有證據的純外觀瑕疵，80 有影響的缺陷，60 主流程失效，0 為觀察到整面向不可用，未觀察為 null。錯結果、舊結果復活、可執行輸入、外流或主要操作不可達均擋下交驗。本文只提供文件，九項產品分數皆 null、狀態均 NOT_RUN。

| 面向 ID | 同一候選的必要證據 |
| --- | --- |
| functionality | 從真實輸入執行「計算租屋預算」，畫面和完整報告符合核心 fixtures，使用者取得對應產物。 |
| boundaries | 合法端點、剛好越界、第一個錯誤和三種 controller case 的證據。 |
| privacy | 靜態載入後從使用到重設的零工作請求，並核對 storage、URL 和 log。 |
| security | 敵意輸入 inert、無動態執行、CSP、固定下載名稱、資源上限和 Worker/Blob dispose。 |
| usability | 兩語桌面與行動的主流程、空、繁忙、取消、錯誤、修改和下載可操作。 |
| accessibility | 鍵盤、焦點、labels/errors、狀態、WCAG 2.2 AA 目標、320px、實際 200% zoom、觸控及 reduced motion。 |
| localization-seo | 兩個獨立 HTML、全部訊息對譯、同語首頁回鏈、候選 noindex。正式 HTTPS/SEO 另驗。 |
| toolchain-provenance | Node 版本、離線命令和 exit、靜態 SHA-256、同一開啟 PR head、重建 bytes、零依賴。 |
| compatibility | 真實隔離 Chrome 與 Edge 兩語輸入、錯誤、reset、Worker、Blob 下載和 reflow。 |

## tests

驗收輸入見 [fixtures.json](fixtures.json)。10 個字面核心案例與 3 個 controller 案例。對每個 expected 深度比對，下載用獨立序列化驗 bytes 和 SHA-256。不得用產品程式產生 expected。

| 案例 ID | 驗證行為 |
| --- | --- |
| `standard-p30` | 30% 比例、押金 2 個月、仲介費半個月的標準堆疊 |
| `third-exact` | 三分之一比例的無條件捨去與恰好等於上限 |
| `custom-over` | 自訂比例、候選超標與超出額 |
| `agency-half-up` | 奇數租金的半個月仲介費四捨五入 |
| `no-deposit-no-fee` | 押金與仲介費皆為零 |
| `zero-income` | 收入零，占比為 null |
| `negative-remainder` | 租金高於收入，負餘額照常輸出 |
| `income-limit` | 收入 raw 超過容量 |
| `custom-ratio-missing` | 自訂比例未填 |
| `bad-deposit-enum` | 押金月數不在列舉內 |
| `state-dirty-error` | 先產出真結果，再改為無效輸入，舊結果及所有下載立即失效。 |
| `state-cancel-late` | 延遲成功後取消，舊回傳不能復活，重設回預設值。 |
| `state-replace-late` | 新工作失敗後收到上一份工作的成功，保留目前錯誤。 |

狀態測例使用可控制完成時間的假 Worker。state-dirty-error 先 run initial，再 edit 成 edit 並重新執行。state-cancel-late 先 run draft、在回傳前取消、注入舊世代 lateResult，最後重設。state-replace-late 先掛起 olderDraft，再以 newerDraft 啟動新工作，先令新工作出錯，再注入舊世代 olderLateResult。每個 expected checkpoint 分別檢查畫面與下載。

另測合法上限、剛好超限、錯型別、額外欄、單獨 surrogate、惡意字串、快速改值及晚到訊息。驗證 income 999,999,999／1,000,000,000、candidateRent 上限邊界、customRatio 1／100／101、ratioPreset 非 CUSTOM 時 customRatio 垃圾值被忽略、maxRent 捨去方向（比例邊界 ±1 元）。

候選 gate（均 NOT_RUN）

- 於 `tools/rent-budget-planner/` 記 Node 24.x，執行 `node --test`（core/controller/HTML/下載/建置）、`node scripts/check.mjs`（語法、外部依賴、危險 sink、allowlist）、`node scripts/build.mjs --mode preview`（重建兩次並逐檔比對排序後的 SHA-256）。測試僅合成資料及本機檔案。
- 以 `node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview` 供隔離預覽。已用端口則換空閒端口並記錄。GET/HEAD 正確 MIME、404、拒絕 traversal／符號連結逃逸，不列目錄或記請求內容。
- 各 Chrome、Edge 在兩語頁做範例、實際鍵入、錯誤、成功後 edit、取消、重設、Blob 下載並核對 bytes。在 1280×800 及 320 CSS px 檢查。真實 200% zoom、reduced motion、Tab/Shift+Tab、Enter/Space、focus、狀態與錯誤、正文對比≥4.5:1、控制／大字≥3:1、主要觸控≥44×44，40% 譯文增長不遺失功能。
- Network/Storage 以乾淨隔離 profile 核對初始請求、處理與重設的零工作 request、local/sessionStorage、IndexedDB、CacheStorage、cookie、service worker、URL 及 console。檢查資產載好後的離線計算。回首頁為明確使用者導航。
- 主代理須先證明隔離不碰桌面焦點、keyboard/IME/clipboard 或原生對話。禁止用 active 或 hidden IAB 試隔離。無合格機制記 NOT_RUN_USER_FOCUS_INCIDENT。原生選檔／OS 下載對話只列人工 NOT_RUN。記真實瀏覽器版本、證據和未驗項，Node／DOM 替代檢查不可冒稱 browser 通過。

兩語靜態內容與正式 gate（目前 NOT_RUN）

- 繁中 lang=zh-Hant，H1「租屋預算規劃」，title「租屋預算規劃｜Gloss Tools」，description「用月收入與租金比例算出可負擔的租金上限，再把簽約搬入要準備的第一個月租金、押金與仲介費一次算清。」。英文 lang=en，H1 “Rent Budget Planner”，title “Rent Budget Planner | Gloss Tools”，description “Work out the most rent you can afford from your monthly income and rent ratio, plus the full move-in cash: first month, deposit and agency fee.”。兩頁靜態呈現操作、限制、FAQ。全部狀態及錯誤使用對等本地化訊息。
- FAQ。33⅓ 預設怎麼算？直接用收入的三分之一，無條件捨去到整數元，不會超過比例。 / How does the 33⅓ preset work? It takes exactly one third of income, rounded down to whole dollars so it never exceeds the ratio.
- FAQ。仲介費半個月是固定的嗎？不是，可改成 0 或 1 個月；半個月是台灣常見行情，本工具只是試算。 / Is the half-month agency fee fixed? No — you can set 0 or 1 month; half a month is a common Taiwan market rate and this is an estimate only.
- 候選 /index.html、/en/index.html 帶 robots meta 與 X-Robots-Tag noindex,nofollow。無 production canonical、hreflang 或 sitemap。語言連結只帶路徑。
- 正式以實際核對的 HTTPS origin 生成兩個 self-canonical、互惠 zh-Hant/en、zh-Hant x-default、robots.txt/sitemap、正確 MIME、安全標頭、404 及 root redirects。規劃 origin https://rent-budget-planner.glossquote.com 尚未配置。首頁回鏈為 https://glossquote.com/index.html 或 https://glossquote.com/en/index.html。比對實際上線 bytes、標頭、雙語連結後再由主代理整合目錄。

## handoff

本份交付文件。固定保存 [SPEC.md](SPEC.md)、[BRIEF.md](BRIEF.md)、[fixtures.json](fixtures.json) 及 [AUTHOR-CHECK.md](AUTHOR-CHECK.md)，registry document 指向實際 GitHub commit。規格 task id `labs-rent-budget-planner-spec-20261109`（由主代理登記）。主頁基線 [固定 README](https://github.com/KYStr/glossquote-labs-home/blob/26525d5f6380915ea95dde879dec769442db0d95/README.md)。開工與送審前重讀遠端規則、registry、基線和既有 owner，檢查新增範圍。

非作者 reviewer 核對同一固定文件候選的八節及字面案例，保存 evidence。八節皆實核才可 mark-spec-ready。產品檢查獨立。缺陷交原作者修訂，重審新 head。

製作須有另登記 task、本人 ACK、明示 allowed executor、CAS 後同 operationId/claimId/owner 讀回。遵循 40 ready、5 held、1 working。製作目標 `tools/rent-budget-planner/`，同 repo 用 `codex/<task>-<actor>` 分支與開啟 PR。先完成核心／狀態 fixtures，再交雙語候選與真瀏覽器證據。

交驗附 candidate commit、PR head、來源與建置 hash、命令與 exit、實測及九項 evidence、未驗項和原 owner checkpoint。文件 ready、產品交驗、accepted、來源發布、部署及 catalog 各自留證。上線走既有批准。發現重疊、新依賴、費用、權限、持久環境或焦點風險，留 checkpoint 停在該項。
