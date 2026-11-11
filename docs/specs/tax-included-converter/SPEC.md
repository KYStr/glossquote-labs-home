# 含稅未稅換算 / Tax-Included Converter

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-tax-included-converter-20261109` · 2026-11-09 · v1

[個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

接案者或小商家在報價與開立三聯式發票之間，需要把一個金額拆成發票上的三欄：未稅銷售額、營業稅額、含稅總計。

- 桌面。會計或接案者在電腦前拿到客戶的含稅總價，要回推未稅銷售額與稅額填入發票；或反過來，手邊是未稅成本，要加計營業稅報出含稅價。
- 行動。手機在與客戶對話中快速核對一筆金額含稅／未稅各是多少，不開啟任何會計系統。

稅額的算法是法律上有意義的部分，不是隨意的四捨五入：台灣一般稅額計算的銷項稅額依銷售總額計算一次，尾數不滿一元四捨五入（加值型及非加值型營業稅法第 14 條）。逐項各算一次稅再加總會得到不同結果，本工具把兩種算法的差額明示出來，讓使用者知道自己在用哪一種。使用情境為報價與填票前的估算，資料只保留在目前頁面草稿。

## scope

MVP 必做：單筆金額雙向換算（未稅→含稅＋稅、含稅→未稅＋稅）；稅率可編輯，預設 5；多筆未稅明細模式，稅額按明細總額計算一次，另顯示逐項計稅合計與差額。金額一律整數新台幣元（依據見 inputsOutputs），所有結果為未稅＋稅額＝含稅恰好成立的三元組。

已查核的稅率與捨入依據（2026-11-09 直讀官方來源）。

- 稅率 5% 不是寫死在單一條文：加值型及非加值型營業稅法第 10 條定稅率區間「最低不得少於百分之五，最高不得超過百分之十；其徵收率，由行政院定之」，財政部稅務入口網「Q1：營業稅稅率為何？」載明「目前稅率為 5%」。本工具據此預設 5，並開放編輯以對應其他稅率情境。
- 捨入：同法第 14 條「營業人銷售貨物或勞務……計算其銷項稅額，尾數不滿通用貨幣一元者，按四捨五入計算」。故稅額恆為整數元。
- 按總額計稅：三聯式統一發票的結構為明細金額（未稅）逐筆加總為「銷售額」，「營業稅」為銷售額乘以稅率後之金額（一次計算、一次四捨五入），「總計」為銷售額加營業稅。明細模式依此結構釘版。

非目標：實際開立統一發票／電子發票或申報；特種稅額計算（金融保險業、特種飲食業等，稅率與算法另有規定）；零稅率與免稅的判定；進項稅額扣抵；小規模營業人查定課徵（1%）的專屬流程（稅率欄位可自行輸入 1，但本工具不模擬查定）；含角分的金額（輸入小數即格式錯誤）；多幣別；逐筆「含稅明細」模式（明細一律未稅，與發票明細欄一致）。

已與 registry 及既有預案比對，最相近者的實質差異如下。

- 台灣所得稅試算（taiwan-income-tax-calculator）：課稅標的為綜合所得稅，與營業稅的含稅／未稅換算無關。
- 統一發票對獎（taiwan-invoice-prize-check）：查核發票號碼中獎，與金額換算無關。

判定規則由本文定義，除上述法規事實外無線上資料或外部服務依賴；稅率以開啟頁面時的固定預設為準，不即時連線更新。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「計算模式 / Mode」：分段選擇「單筆金額 / Single amount」與「多筆明細 / Multiple lines」。
- 欄位或說明「稅率（%）/ Tax rate (%)」，預設 `5`，旁註「台灣營業稅現行徵收率 5% / Taiwan business tax is currently 5%」。
- 單筆模式顯示「金額基準 / Amount basis」：分段選擇「未稅金額 / Net (tax-exclusive)」與「含稅金額 / Gross (tax-inclusive)」；及「金額（新台幣元）/ Amount (NT$)」。
- 明細模式顯示「明細金額（未稅，逐列一筆）/ Line amounts (net, one per row)」，可新增／移除列，最多 20 列並明示上限；切換模式時，未啟用模式的欄位在送入核心的快照中一律為 null。
- 「換算 / Convert」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 「未稅、稅額與含稅 / Net, tax and gross」先摘要再列細節：三個金額以相同大小並列，輸入的那一欄標示「輸入 / Your input」。明細模式另以表列出每列未稅金額，並列「逐項計稅合計 / Per-line tax sum」與「差額 / Difference」（差額為 0 時明示「與按總額計稅相同 / Same as taxing the total」）。結果旁常駐估算說明（原文見 tests 節）。成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示輸入或載入範例。 |
| dirty | 任一輸入、模式、基準或明細列改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」。無下載。編輯終止舊工作並回 dirty。 |
| success | 報告對應目前快照。含估算說明。若逐項與總額計稅不同，以文字及數值明示差額。 |
| error | 保留草稿，沒有結果。顯示本地化錯誤、欄位及適用列號。只有提交失敗才移焦首錯欄。 |
| cancelled | 保留草稿，終止並告知「已取消，可重新執行 / Cancelled. You can run again.」。舊結果仍無效。 |

「重設 / Reset」停止工作，復原預設 `{"mode":"single","basis":"net","amount":"10000","ratePercent":"5","lines":null}` 並聚焦首來源欄。標籤不可只用 placeholder。用 aria-busy 和 polite 回報狀態，以 aria-describedby/aria-errormessage 連結錯誤。語言連結旁揭露切語或離頁會失去草稿。沒有登入或權限要求。頁面載入後可離線計算，Worker 失敗保留草稿供重試。

## inputsOutputs

核心 `run(input)` 為同步純資料轉換。參數為含確切鍵 `{mode, ratePercent, basis, amount, lines}` 的普通物件，只讀 own data。未知鍵、缺鍵、錯型別、accessor 皆 SCHEMA，field,row=null。JSON fixture 即介面。textarea 以 DOM 的 LF 值為準。明示檔案欄才處理原始 bytes（本工具無）。

型別（形狀檢查，全數通過才進內容檢查）。

- `mode`：string。`ratePercent`：string。
- `basis`：string 或 null。`amount`：string 或 null。`lines`：array 或 null；array 的每個元素為只含鍵 `{amount}` 的普通物件，且其 `amount` 為 string。

金額一律整數元：輸入不接受小數點、千分位逗號、正負號、空白或指數；稅率是唯一可帶小數的欄位。金額上限 999,999,999,999 元。

內容檢查順序（整份失敗回 `{ok:false,error:{code,field,row}}`，field 為欄位名或 null，row 為明示 1-based 明細列號或 null；資源或 Worker 失敗用固定 INTERNAL/WORKER_ERROR，不回傳堆疊）。

1. `mode`：raw 超過 16 單元 INPUT_LIMIT；不成對 surrogate UNICODE；空字串 EMPTY；不是 `single` 或 `lines` 為
...[truncated 9113 chars]