# 含稅未稅換算 / Tax-Included Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-tax-included-converter-20261109` · 2026-11-11 · v2 維護候選

[任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [維護作者核對](AUTHOR-CHECK.md)

## goal

接案者和小商家以新臺幣整元估算未稅金額、營業稅額與含稅總額。桌面上以未稅成本推算報價，或從客戶提供的含稅金額拆出暫估數字。手機上可在與客戶對話時核對一筆價格或少量明細。成果應可當場看懂及下載，三個金額相加關係清楚，因取整造成的差額可追溯。

可觀察的完成結果是未稅 NT$100,000、5% 得稅額 NT$5,000、含稅 NT$105,000。以含稅 NT$10、5% 回推時，畫面及報告同時保留估算的未稅 NT$10、稅額 NT$0、含稅 NT$10，及以該未稅金額重算的含稅 NT$11、差額 +NT$1。估算用於報價和填票前核對。正式開票應依實際交易與適用規則另行核對。

## scope

- 單筆未稅正算及含稅反算。多筆明細以未稅金額輸入，按總額計算一次，並對照逐項各自捨入的稅額合計與差額。所有模式用同一手填稅率。預設 5%，輸入接受 0.01% 至 100%；自訂稅率只代表試算參數。
- 一次處理 1–20 筆明細，每個輸入及明細總額上限均為 NT$999,999,999,999。只接受整元、非負的新臺幣金額及 ASCII 格式。估算結果可下載 JSON。輸入與結果僅留目前頁面，初次載入靜態資源及準備好 Worker 後可以離線操作。
- 排除正式開立／上傳統一發票、申報、進項扣抵、零稅率／免稅判定、特種稅額、小規模營業人查定、跨幣別、角分、負值、逐項含稅反算、批次檔案匯入與持久儲存。綜合所得稅工具處理個人所得及稅額，統一發票對獎工具以發票號碼找中獎，本工具的輸入和工作結果為報價金額。

### 台灣法規與工具用途

2026-11-11 查核以下財政部一級來源。離線版本顯示查核日期；維護及正式發布前應重新檢查。稅率預設值與法規說明分別有來源。

- 第 10 條規定一般稅率 5%–10% 區間及徵收率由行政院定之，財政部問答列示一般稅率為 5%（問答更新 2018-01-22）。第 14 條規定依銷售額計算銷項稅額，尾數四捨五入至元。第 32 條規定定價內含營業稅；買受人為營業人，發票分列銷售額與銷項稅額；買受人為非營業人，以定價開立。法規頁最近修正 2025-05-28。 [營業稅法第 10、14、32 條](https://law-out.mof.gov.tw/LawContent.aspx?id=FL006082) · [財政部稅率問答](https://www.etax.nat.gov.tw/etwmain/tax-info/innotative-tax-e-reference/filing/business-tax/wMDMRl7)
- 南區國稅局 2026-03-10 示例為定價 NT$52,500，三聯式分列 NT$50,000 銷售額和 NT$2,500 稅額。示例可核對分列，結果整除，無法決定半元的回推算法。 [南區國稅局例示](https://www.ntbsa.gov.tw/singlehtml/5e0e49a811b74b50b5a6486d38374285?cntId=7074381e864443b4b9f9aa5ec43c80ca)
- 施行細則第 32-1 條適用於符合該條件、銷售給非營業人的當期發票總額申報，先算並捨入銷項稅額，再扣回銷售額。法規頁最近修正 2024-12-17。產品的單筆含稅拆分採未稅先捨的報價估算約定，與該申報流程用途不同。 [營業稅法施行細則第 32-1 條](https://law-out.mof.gov.tw/LawContent.aspx?id=FL006083)

## userFlow

採 [Gloss Tools Product App 設計基線](../../TOOL-DESIGN-BASELINE.md)。以報價工作區為主，桌面輸入與結果相鄰，結果側取較大空間；窄版依模式、欄位、換算、狀態、結果直排。格式、公式和來源放入一層有名稱的說明，估算與差額保持在結果旁。

```text
寬版 [工具名與語言]  [模式／金額／稅率與換算] [未稅｜稅額｜含稅]
                                                [差額與估算說明／下載]
窄版 [工具名與語言] → [模式／金額／稅率] → [換算與狀態]
                    → [三個金額／差額／估算說明／下載]
```

- 「計算模式 / Mode」選「單筆金額 / Single amount」或「多筆明細 / Multiple lines」。「稅率（%）/ Tax rate (%)」預設 `5`，旁註「台灣一般營業稅預設 5%，查核於 2026-11-11 / Default Taiwan business tax rate: 5% (verified 2026-11-11)」。
- 單筆的「金額基準 / Amount basis」選「未稅金額 / Net (tax-exclusive)」或「含稅金額 / Gross (tax-inclusive)」。輸入的整元欄標「金額（新臺幣元）/ Amount (NT$)」。初載單筆未稅，金額 `10000`，結果區為空。
- 明細有具列號的獨立欄位「第 {row} 列未稅金額 / Line {row} net amount」，首次進入為一空列。可新增、移除，最多 20 列，可移到零列並顯示「新增明細 / Add a line」。新增後聚焦新欄，移除後聚焦同位置剩餘列、前一列或新增按鈕。切換模式保留同頁各自的草稿，提交快照的非作用欄位依 §inputsOutputs 放 null。無效列保持原位置；明細缺列或超限聚焦明細群組。
- 「載入範例 / Load example」填入 `net-basic` 合成案例，標「範例 / Example」，等使用者按「換算 / Convert」。編輯時移除範例標記，取消舊報告。
- 結果標「未稅、稅額與含稅 / Net, tax and gross」。三個金額同層級，單筆對應輸入的欄標「輸入 / Your input」。明細另列未稅明細、按總額計稅、逐項計稅合計，並顯示「總額稅額減逐項稅額 / Tax on total minus per-line tax」；差額 0 明示兩者相同。含稅反算緊鄰估算結果顯示「以估算未稅金額正算的含稅總額 / Gross recalculated from estimated net」和「正算總額減輸入含稅 / Recalculated gross minus entered gross」。差額顯示 0 或有方向的 ±NT$ 金額與文字，保留可選取文字；§tests 的示例均可對照。所有成功結果顯示「整元估算，正式開票或申報前請另行核對。 / Whole-dollar estimate. Verify separately before invoicing or filing.」含稅回推另顯示「先將未稅金額取整，再以相減求得估算稅額。 / The net estimate is rounded first, then subtracted from the entered gross to estimate tax.」
- 使用者在成功後按「下載報告 / Download report」。草稿中的數值以文字欄保存，顯示金額可本地格式化，匯出格式依 §inputsOutputs。切語連結旁標「切換語言或離開會清除草稿 / Switching language or leaving clears this draft」，各語言提供同語系 Gloss Tools 首頁連結。

| 狀態 | 畫面與恢復 |
| --- | --- |
| empty | 提示「輸入金額或載入範例 / Enter an amount or load an example」。初載維持自然鍵盤起點。 |
| dirty | 移除結果與下載，顯示「輸入已變更，請重新換算 / Input changed. Convert again.」。 |
| busy | 同步呈現「處理中 / Working」及「取消 / Cancel」，報告隱藏；編輯回 dirty。 |
| success | 顯示當前結果、估算說明、適用的差額和下載。以 polite status 宣布完成，焦點保留在觸發控制。 |
| error | 保留草稿，顯示下節雙語錯誤與欄位。提交造成的輸入錯誤移焦首錯欄，系統錯誤維持可重試的操作。 |
| cancelled | 保留草稿，顯示「已取消，可重新換算 / Cancelled. You can convert again.」。 |
| blocked | JavaScript 關閉時顯示靜態雙語說明與同語首頁。Worker 無法準備時轉 error，保留草稿並提供重試；若首載資源未取得，告知需先載入完整頁面。無帳戶或權限流程。 |

「重設 / Reset」撤銷工作、清空非作用草稿、還原單筆未稅 10000 元及 5%，回到 empty 並聚焦金額。用原生 fieldset/legend、按鈕、可見 label、`aria-busy`、polite status，輸入錯誤以 `aria-invalid` 和 `aria-describedby` 關聯。取消時把焦點還給換算。禁止由狀態更新搶焦或只靠色彩傳達差額。長值和 20 列可完成操作。

## inputsOutputs

`run(input)` 是同步純函式。輸入為原型 `Object.prototype` 或 null 的普通 record，且僅含五個可列舉 own data 鍵。拒絕缺鍵、額外鍵（含 symbol）、accessor、錯型別及陣列洞。透過 own descriptors 讀取，避免觸發普通物件的 getter。依序檢查：

1. 外層 shape。鍵為 `mode`、`ratePercent`（string），`basis`、`amount`（各 string 或 null），`lines`（密集陣列或 null）。陣列只許標準索引與 `length`。長度不大於 20 的陣列，逐元素檢查為精確 `{amount: string}` 的普通 own data record。長度大於 20 時只讀取陣列長度，不掃描索引或元素，交給步驟 5 的容量檢查。shape 錯回 `SCHEMA`，field/row 均 null。任何無法安全檢查的物件以 `SCHEMA` 結束。
2. `mode` 內容。字串驗證共用順序是原始 UTF-16 長度、未配對 surrogate、空字串、該欄語法、數值範圍（適用才檢查）。依序為 `INPUT_LIMIT`、`UNICODE`、`EMPTY`，再回該欄的 `ENUM`、`DECIMAL_FORMAT`、`INTEGER_FORMAT` 或 `RANGE`。超過上限就停止，不轉 BigInt。mode 上限 16，允許 `single`、`lines`。
3. `ratePercent`。上限 16，必須完全匹配 ASCII `(0|[1-9][0-9]*)(\.[0-9]{1,2})?`（整個字串，尾換行不接受），且 0.01–100（含端點）。解析為整數百分之百分點 P。顯示／輸出的稅率字串去掉小數尾零和剩餘小數點，`5.50` 成 `5.5`。
4. 單筆。先檢查 `basis`（null 視為 EMPTY），上限 16，`net` 或 `gross`；接著 `lines` 必須為 null，否則 `INACTIVE_FIELD` 指向 lines；最後檢查 `amount`（null 視為 EMPTY）。金額上限 32 UTF-16 單元，整個字串須符合 ASCII `0|[1-9][0-9]*`，範圍 0–999999999999 元。不 trim，不接受正負號、逗號、小數、全形字或指數。
5. 明細。先檢查 `basis` 為 null，再檢查 `amount` 為 null，第一個不符回 `INACTIVE_FIELD` 指向該欄。其後 `lines` 為 null 或空陣列回 `EMPTY`，大於 20 回 `ROW_LIMIT`，均指向 lines。逐列依步驟 4 的金額規則檢查，field 為 amount，row 從 1 開始。所有列皆合法才檢查精確總和，超過 999999999999 回 `TOTAL_RANGE`、field=lines、row=null。
6. 只回傳第一錯。每個失敗是 `{ok:false,error:{code,field,row}}`，非明細列錯誤 row=null，整體系統錯誤 field/row=null。核心的非輸入失敗 `INTERNAL`，運行 Worker 或傳輸失敗 `WORKER_ERROR`；兩者都不回傳例外內容。前端錯誤不將使用者輸入拼到 DOM 或日誌。

| code | 繁體中文 | English |
| --- | --- | --- |
| SCHEMA | 無法讀取這次輸入，請重設後再換算。 | Could not read this input. Reset and try again. |
| INPUT_LIMIT | 這個欄位太長，請縮短後再換算。 | This entry is too long. Shorten it and try again. |
| UNICODE | 這個欄位含不完整的字元，請重新輸入。 | This entry contains an incomplete character. Re-enter it. |
| EMPTY | 請填寫這個欄位或新增至少一列明細。 | Complete this field or add at least one line. |
| ENUM | 請選取有效選項。 | Choose an available option. |
| INACTIVE_FIELD | 計算模式與輸入不符，請重新選擇模式。 | The input does not match this mode. Choose the mode again. |
| DECIMAL_FORMAT | 請輸入百分比，最多兩位小數。 | Enter a percentage with up to two decimal places. |
| INTEGER_FORMAT | 請輸入整元數字，不加符號或逗號。 | Enter whole dollars without signs or commas. |
| RANGE | 請輸入欄位說明列出的範圍。 | Enter a value within the range shown for this field. |
| ROW_LIMIT | 最多 20 列，請移除多出的明細。 | Use at most 20 lines. Remove the extra lines. |
| TOTAL_RANGE | 未稅明細總和不能超過 NT$999,999,999,999。 | The net line total must be at most NT$999,999,999,999. |
| INTERNAL | 換算未完成，草稿仍在。請再試一次。 | Conversion did not finish. Your draft is still here. Try again. |
| WORKER_ERROR | 無法完成換算，草稿仍在。請重試；若頁面未載完，請先連線。 | Conversion could not finish. Your draft is still here. Try again. Connect first if the page did not finish loading. |

成功回 `{ok:true,result}`。欄位及其列出順序即匯出次序。金額與列號為 JSON 整數，稅率為上述正規化字串，無額外鍵。

| 模式 | result 欄位順序 |
| --- | --- |
| 單筆未稅 | `mode:"single", basis:"net", ratePercent, net, tax, gross` |
| 單筆含稅 | `mode:"single", basis:"gross", ratePercent, net, tax, gross, forwardGross, forwardDifference` |
| 明細 | `mode:"lines", ratePercent, lines:[{row,net}], subtotalNet, tax, gross, perLineTaxSum, roundingDifference` |

`forwardDifference = forwardGross - gross`，所有含稅反算皆存在（含 0）。`roundingDifference = tax - perLineTaxSum`。單筆 `net + tax = gross`，明細 `subtotalNet + tax = gross`。兩種差額都保留符號，0 一律序列化為 `0`。

報告物件按 `schemaVersion:1, tool:"tax-included-converter", currency:"TWD", purpose:"estimate", result` 排列。result 使用上表同序，明細以原列順序及 row、net 排列。編碼等價於 `UTF8(JSON.stringify(orderedReport, null, 2) + "\n")`，無 BOM、LF 換行、兩空格縮排，唯一尾 LF。固定 MIME `application/json;charset=utf-8`、固定檔名 `tax-included-estimate.json`。兩語的同一結果產生同一 bytes，不含原始草稿、時戳、版本候選網址、診斷、使用者資訊或語系。只有當前 success 可以產生報告。

## implementation

### 精確算術

令 P 為 1–10000 的整數（百分比數字乘以 100），D 為 10000。所有非負中間值以 BigInt 表示。四捨五入 `rHU(n,d) = floor((2*n+d)/(2*d))`，`d > 0`。

- 未稅單筆，`net = amount`，`tax = rHU(net*P,D)`，`gross = net + tax`。
- 含稅單筆，`gross = amount`，`net = rHU(gross*D,D+P)`，`tax = gross-net`。用估算未稅重算 `forwardGross = net+rHU(net*P,D)`，並求 `forwardDifference`。估算未稅減精確未稅的差介於 −0.5（不含）與 +0.5（含）。將該差乘以 1+P/D 後四捨五入，正算差額只可能 −1、0、+1。差額 0 表示工具內兩種計算的含稅相符，仍是估算。
- 明細依輸入次序保留列號，`subtotalNet = Σ net_i`，`tax = rHU(subtotalNet*P,D)`，`gross = subtotalNet+tax`，`perLineTaxSum = Σ rHU(net_i*P,D)`。逐項比較只影響比較欄。
- 整元上限 L=999999999999。因 P≤D，每筆或總額稅 ≤L，逐項稅額合計也 ≤L；所有輸出絕對值 ≤2L，確定小於 2^53 才轉為 JSON Number。禁止浮點乘除、先四捨五入中間比例、靜默截斷。

### 核心、控制器、Worker 與資料生命週期

- `public/js/core/tax.mjs` 匯出純 `run` 與 `serializeReport`，供 Node 直接 import。序列化只接受成功結果的精確 schema，重建有序物件，非法結果回 null，介面不建立下載。 `public/js/controller.mjs` 持有草稿、generation、phase、error 和當代成功結果。測試可注入非同步 executor／計時器。 `public/js/worker.mjs` 由靜態同源 module 載入，只處理結構化運算訊息。 `public/js/app.js` 管理 DOM、兩語、focus、下載。不得把動態內容交給 innerHTML。
- 首載預備同源 Worker，收到 ready 後即已載入計算所需的 module。Worker 不讀網路或 storage。每次換算先同步進 busy、撤銷舊報告，擷取分離快照並遞增 generation。請求 `{generation,input}`，回傳 `{generation,outcome}`。generation 為頁面內遞增的非負安全整數。僅目前 Worker 送來的當代結果、在 busy 時且 shape 正確，才可發布。已撤銷的 generation 與舊 Worker 事件直接忽略。以 5 秒 timeout 處理 Worker 啟動／執行無回覆；逾時、error/messageerror 或當代訊息錯形均回 WORKER_ERROR，終止故障 Worker、清除 handlers 及計時器，保留草稿；下一次換算重新啟動。已正常準備的頁面可斷線計算，首載不全或 Worker 失效後重新載入可能需要連線。
- 輸入、模式、基準、列、範例變更、再次換算、取消、重設及 pagehide 均同步撤銷當代結果與下載並讓舊 generation 無效。正常 Worker 的計算最多為 20 列的短運算。取消立即結束當次畫面狀態並斷開結果提交，任何已在執行的短運算可結束，晚到結果／錯誤不得再更新 UI。重設同樣清除草稿、錯誤及工作引用，已預備 Worker 可以續用。離頁終止 Worker、清 timer/handlers 及所有草稿／輸出，bfcache 返回時按初載初始化。沒有重試迴圈。
- 下載僅在使用者按鈕事件內，以對應當代 success 的資料建立 Blob URL，交給原生 download anchor 觸發後移除 anchor。單次 URL 在觸發後 1 秒回收，且於任何撤銷結果、pagehide 時立即回收未清項；不保留輸出 Blob 或舊快照供再次下載。下載啟動失敗保持 success，旁註「無法下載，請再試一次 / Could not start the download. Try again.」。
- 靜態資源與同源 Worker 之外無程式發起的網路請求、遙測、CDN、遠端字型、Cookie、Local/SessionStorage、IndexedDB、CacheStorage、service worker 或日誌資料收集。連結只有使用者點擊才導航，外部來源連結設 no-referrer，禁止將輸入或結果送入 URL、表單提交或 Referer。CSP 最少 `default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`，靜態頁無需內嵌 script/style。以 HTTP header 加 `X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`。Worker JS 與 HTML MIME 正確。未取得的部署能力不改寫成已驗證 header。
- 兩語各自有靜態入口 `/index.html`、`/en/index.html`，`lang=zh-Hant`／`en`，同源靜態資源與 locale 字典完整覆蓋表單、說明、錯誤、狀態及差額。 `title`、description、h1、canonical、互返 hreflang（zh-Hant、en、x-default 指繁中）依頁面產生。預覽用預覽內部路徑且同時有 meta robots noindex 與禁止索引的 robots.txt；正式版由主統籌給核實的 HTTPS origin 後生成絕對 canonical/hreflang、可索引 robots.txt 及含兩語 URL 的 sitemap。繁中／英文分別連往 `https://glossquote.com/index.html` 與 `https://glossquote.com/en/index.html`。不從未核實網域產生正式 SEO。

## acceptance

以下是未來產品的九項必要面向。以同一固定產品 commit/PR 提交，非作者逐項評分，每項至少 90 且必要檢查全部執行通過才 accepted。預案的八節與維護任務的三項另有審查。檢查未做時記 NOT_RUN，並留下缺口和原因。

| ID | 可反駁的證據與通過條件 |
| --- | --- |
| functionality | 所有字面核心、控制器、匯出 fixtures 深比對；兩語實際完成三個運算分支、兩筆半元反例和下載。能辨認估算用途、符號與比對值。 |
| boundaries | 0 與最大值、稅率端點、20/21 列、總和超限、多重錯誤與 1-based 列號證據；不截斷、不誤接小數元、不復活晚到結果。 |
| privacy | 同候選的瀏覽器 Network/Storage 證據涵蓋操作、下載、hidden/pagehide，無表單資料外送、第三方資源、持久資料、`/cdn-cgi/rum` 或隱藏傳輸；初載完成後斷線仍可正常換算與匯出。 |
| security | 離線對照畸形 own data／getter／prototype／陣列洞與安全 DOM，HTTP 實測 CSP、MIME、frame、referrer 與拒絕不合格式輸入；不回顯例外或注入。 |
| usability | 桌面與 320px 窄版實圖顯示主工作、明細可編輯、估算與差額可見、錯誤可修、可取消／重設／重跑；不因長數字遮住動作。 |
| accessibility | 實際鍵盤走完兩語操作、檢查焦點／名稱／錯誤關聯／live status、真 200% 縮放、320px reflow、對比、觸控大小及 reduced motion；以畫面和量測留證。 |
| localization-seo | 查兩語頁面、表單、差額、估算、狀態與錯誤，無漏譯；預覽 noindex、相對路由與語言連結；正式發佈時再查 HTTPS、indexable robots、正式 canonical/hreflang、sitemap、同語首頁互連。 |
| toolchain-provenance | Node 24 離線執行固定命令，零外部 runtime/build 依賴；固定 specs/fixture hash、候選 SHA、原 owner、測試 exit、產物清單與兩次預覽生成 SHA-256 一致。 |
| compatibility | 已核實隔離的 Chrome 與 Edge，記 OS／版本、兩語、視窗、正常、錯誤、取消與下載；實際確認 UTF-8 bytes、離線、鍵盤及窄版。實體裝置未跑依實記錄，不以模擬視窗當作真機。 |

使用共享設計的正常文字對比 ≥4.5:1、大字和必要控制 ≥3:1、主要與觸控控制 ≥44×44 CSS px，按設計基線驗可見 focus、縮放與版面。產品候選先完成預覽必要檢查；正式 SEO／部署／首頁另於發佈驗證，維護候選期間產品與正式站均 NOT_RUN。

## tests

[fixtures.json](fixtures.json) 含核心、控制器及匯出字面 expected。舊 25 筆保留 ID 與計算語義，四筆既有含稅結果各新增比較欄。Python Fraction 與整數算式獨立推導 expected，不呼叫產品程式生成 expected。產品測試在 `node --test` 深比對；對傳入的字串按原始字元驗證，禁止以 CLI 轉碼掩蓋未配對 surrogate。JS record 特有的 getter、symbol、空洞和型別異常由程式化單測補足，getter 不得被呼叫。

- NT$10、5%：精確未稅 200/21，估算三元組 (10,0,10)。估算淨額 10 正算得稅 1、含稅 11，差額 +1。相鄰淨額 9 正算含稅 9，指定整元模型沒有含稅 10 的前像。
- NT$13、4%：精確未稅 25/2，精確稅 1/2。未稅先捨得 (13,0,13)，正算含稅 14，差額 +1。若先捨稅額則為 (12,1,13)。指定整元正算中，淨額 12、13 對應含稅 12、14。這筆自訂稅率僅測算術。
- NT$99、0.51%：精確未稅 990000/10051，估算 (98,1,99)。正算含稅 98，差額 −1。測得 0 時依然保留比較欄。明細三列各 10 元／5% 的總額稅 2、逐項合計 3，差額 −1。
- 測試正算及明細上限、零、稅率精度、欄位長度／Unicode／格式／範圍、列數、首錯優先、非作用欄位與所有列合法後才查總和。核心未接受資料不產生結果。
- 控制器以可控假 executor 驗 success→dirty→error、取消後晚到、較新的成功／錯誤後舊訊息晚到、重設或離頁時清理、故障後重試、timeout，及快照轉換不混入非作用模式。舊 URL 撤銷，失敗／取消／重設無報告；同一有效結果在兩語輸出相同 bytes。用 literal expected bytes 比對下載報告，另檢查 MIME、檔名、LF、BOM 與無額外欄。
- 隔離瀏覽器必要情境。兩語按鍵盤與指標走基本案例、兩個 +1 反例、−1 例、明細差、修正首錯、編輯撤銷、取消／重跑、下載及離線。對照繁中和英文估算文字、差額方向、匯出 bytes、Network/Storage、可及性及頁面 metadata。保留執行環境、步驟、結果及畫面。未核實隔離時記 `NOT_RUN_USER_FOCUS_INCIDENT`，不得啟用本機互動、焦點、鍵鼠、IME、剪貼簿或原生對話框。實體裝置或原生系統層檢查依實際授權和證據記錄。

## handoff

未來產品由具有效 production claim 的執行者在共享 repo 的 `tools/tax-included-converter/` 製作。以下是應交付且可執行的工具內命令，屬未來產品驗證，本維護候選尚無產品程式。

```text
node --version
npm test
npm run check
npm run build:preview
npm run check:generated:preview
npm run dev -- --port 4180
npm run build:production -- --origin <approved-https-origin>
npm run check:generated:production -- --origin <approved-https-origin>
```

Windows 背景 shell 使用 `npm.cmd`。Node 24、ESM、內建模組、無安裝步驟。 `npm test` 執行 `node --test`，check 驗 schema、locale 完整、檔案與靜態來源，兩組 build/check 以同一明確 origin 及模式比對可重建 bytes；預覽 `dist/`、正式 `dist-production/`。 `dev` 僅以指定可用埠在 `127.0.0.1` 服務已建好的預覽，埠衝突報錯，背景執行、不啟動瀏覽器。package scripts、靜態資源、產物檢查、字面測試、HANDOFF.md、VERIFICATION.md 都在工具目錄。參照 [製作清單](../../IMPLEMENTATION-CHECKLIST.md) 與 [預案品質說明](../../SPECIFICATION-STOCK.md)。

產品交接依序為純核心和固定字面、完整兩語狀態與報告、靜態檢查與隔離瀏覽器、固定 PR 與 commit 獨評。每項記實際命令及 exit、瀏覽器與限制、hash、PR、scope、九面向證據、NOT_RUN、已知問題與接手人。兩輪同失敗且無新增證據時轉交主統籌處理，保留當前 claim 及 checkpoint。正式部署、首頁和外驗由主統籌依已授權流程接續。

原規格固定在 [PR #242 的 21410d31](https://github.com/KYStr/glossquote-labs-home/pull/242)，原作者、claim 和來源保留。本維護候選提交新的固定 PR 供非作者核對規格、案例與來源，維護任務通過仍需走獨立八節預案評估。原 spec 登記的 production 繼承面向仍是八個文件欄位（REG-01）。請主統籌透過合法登記流程，以固定新候選和九個產品面向補正並讀回，再評估 ready 與生產承接。
