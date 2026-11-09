# 血型相容查詢 / Blood Type Compatibility

**DRAFT_FOR_INDEPENDENT_DOCUMENT_REVIEW** · `spec-blood-type-compatibility-20261109` · 2026-11-09 · v1

[本組固定任務說明](https://github.com/KYStr/glossquote-labs-home/blob/1ce7ba3c83b35eeb99e2f11e3b3eb9e9c6df72bd/docs/consolidation/2026-11-09/SPEC-AUTHOR-BRIEF.md) · [個別任務簡報](BRIEF.md) · [字面案例](fixtures.json) · [作者檢查](AUTHOR-CHECK.md)

## goal

使用者在捐血或陪同就醫前，先依標準相容表確認某個血型的紅血球與血漿能捐給誰、能接受誰，或直接核對一組捐贈者與受血者。

- 桌面。在醫院或捐血站的資訊桌前選一個血型，四份名單與徽章一次看清，再切配對模式核對兩個人。
- 行動。手機在候診時查自己與家人的血型是否相容，不登入、不送出任何資料。

使用情境為教育參考。資料只保留在目前頁面草稿，結果不是醫療建議。

## scope

固定範圍為紅血球與血漿兩種血液產品、八種 ABO/Rh 血型、兩種查詢模式。紅血球相容採字面 8×8 矩陣；血漿相容只依 ABO 判定（不看 Rh），採字面 4×4 矩陣，兩份矩陣均寫死於本文 inputsOutputs，來源為國際通用的標準血型相容表（捐贈者紅血球抗原須為受血者可容忍集合的子集；血漿方向相反）。

非目標為：各血型人口比例（各地不同，易生引用錯誤，不列）、血小板／全血／冷凍沉澱品等其他產品、捐血資格判定（年齡、體重、捐血間隔、用藥等資格規則）、稀有血型調度、依個人病史的醫療建議，以及實際輸血決策——實際輸血一律以血庫交叉配血與醫療專業判斷為準，此限制以固定免責文案呈現於每次結果。

已比對本 repo `docs/specs/` 全部預案與概念清單，無血型或輸血相關工具，最相近者為無。判定規則由本文定義，無線上資料或外部服務依賴。

## userFlow

採 Gloss Tools Product App。遵守設計系統的 paper/ink、間距、焦點和斷點。寬版以輸入與結果相鄰，結果擁有最多空間。窄版依輸入、主操作、狀態、結果直排。首屏見主工作和常用設定，詳細格式用一層 disclosure。

- 欄位或說明「模式 / Mode」：單一血型「單一血型 / One blood type」或配對「捐贈者與受血者 / Donor and recipient」。
- 欄位或說明「血型 / Blood type」（單一模式）；配對模式為「捐贈者血型 / Donor blood type」與「受血者血型 / Recipient blood type」。血型一律以固定代碼顯示：`O-`、`O+`、`A-`、`A+`、`B-`、`B+`、`AB-`、`AB+`（半形減號 U+002D、半形加號 U+002B，顯示與資料代碼逐字相同，不做全形或數學減號替換）。
- 「查詢相容性 / Check compatibility」是主要操作。「載入範例 / Load example」填入 [fixtures.json](fixtures.json) 第一個合成案例，明示範例並等待手動執行。
- 單一模式結果依序顯示四個小節：「紅血球可捐給 / Red cells you can give to」、「紅血球可接受自 / Red cells you can receive from」、「血漿可捐給 / Plasma you can give to」、「血漿可接受自 / Plasma you can receive from」，每節為代碼清單或「無 / None」。徽章以文字標籤顯示於結果頂部，固定文案：「紅血球萬用捐贈者 / Universal red-cell donor」、「紅血球萬用受血者 / Universal red-cell recipient」、「血漿萬用捐贈者 / Universal plasma donor」、「血漿萬用受血者 / Universal plasma recipient」。血漿兩節下固定註記「血漿相容不看 Rh 因子，名單以 ABO 血型判定，同 ABO 的 Rh 陰性與陽性一併列出。 / Plasma compatibility does not depend on the Rh factor; lists are decided by ABO group and include both Rh variants of each ABO group.」
- 配對模式結果逐產品顯示「紅血球 / Red cells」與「血漿 / Plasma」及「相容 / Compatible」或「不相容 / Not compatible」，不得只用顏色區分。
- 每次成功結果末尾固定顯示免責文案，不可摺疊隱藏：「本工具僅供教育參考，依標準血型相容表整理；實際輸血以血庫交叉配血與醫療專業判斷為準。 / For education only, based on the standard blood-type compatibility chart. Actual transfusion always follows blood-bank crossmatching and clinical judgement.」
- 成功才顯示「下載報告 / Download report」。文字可手動選取。

| 狀態 | 操作與結果 |
| --- | --- |
| empty | 初載／重設，無結果，提示選血型或載入範例。 |
| dirty | 任一輸入、模式、來源或範例改變，立即撤銷舊結果和下載。顯示「輸入已變更，請重新執行 / Input changed. Run again.」。 |
| busy | 明確執行時處理快照，顯示「處理中 / Working」及「取消 / Cancel」
...[truncated 13571 chars]