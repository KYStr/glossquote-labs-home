# 介面與SEO：訂閱費用盤點

SPEC_ONLY，未做真機可用性測試。Product App模式；依 [設計系統](docs/DESIGN-SYSTEM.md)。使用系統字型，不下載Geist。標準暖紙/深墨/綠色主操作，只有全年合計有一個明顯數字；不用六張同大數字卡搶工作表。

Desktop：
```text
Gloss Tools / 訂閱費用盤點                 English / 工具首頁
幣別[TWD]　所有金額須同幣別
名稱           每次金額     週期       計畫停用       刪除
[影音]         [100.00]    [每月]       [ ]          [移除]
[新增訂閱]                                  [計算支出]
目前全年… / 平均每月…
計畫停用：…　保留：…          計算假設（緊貼結果）
逐列明細 / 完整文字報告                   [複製][下載TXT]
方法 / FAQ / 限制與隱私
```
Mobile：每列縱向label+input，period與stop相鄰，結果年度/每月成兩列；操作不靠橫向拖曳。計算按鈕在工作表後，不用固定footer遮擋虛擬鍵盤。最多60列可捲動整頁；不在巢狀scrollpane放必要操作。

可見：幣別、訂閱列、週期、停用checkbox、增刪、計算。相鄰：每列錯誤與刪除。結果後：copy/download與報告。說明折疊可用，但「不會真的取消服務」「全年化不是實際帳單」「月均捨入」必須結果旁可見。

狀態文案：初始「加入你目前付費的訂閱，再比較計畫停用後的費用」；未計算「資料已變更，請重新計算」；empty不可算；error「請填入最多二位小數的金額，例如100或99.90」並聚焦對應欄位；zero所有零時正確顯示0.00不是空；all stop時保留0項/0.00；clipboardbusy「正在複製」並立即pressed；拒絕「未複製，請選取下方報告手動複製」；clear「清除目前盤點？離開後不會保留」確定/取消。

英文對應：Add your current subscriptions to compare a planned reduction; Inputs changed. Calculate again.; Enter an amount with up to two decimal places, such as 100 or 99.90.; Copying…; Not copied. Select the report and copy it manually.; Clear this budget? Your entries are not saved after leaving.

名稱欄支援中文IME，不在composition中改字串；變更可先invalidate但不要重渲染輸入造成游標跳走。Tab順序依DOM，Enter在input不意外刪行；form提交只計算，其他buttons type=button。錯誤aria-describedby，完成status不連續播報逐鍵資料。觸控44px、焦點可見、320px無整頁橫溢，200%縮放功能完整。低階機最壞60列一次有界處理，不需worker；真iOS Safari、Android鍵盤、AT與實際200%沒測就記NOT_RUN。JS不可用時有兩語noscript，未有結果不啟用導出。

繁中 title：訂閱費用盤點：比較月繳、季繳與年繳支出｜GlossQuote
description：在瀏覽器整理同幣別訂閱，計算全年費用與平均每月金額，試算計畫停用後的差額。資料留在目前頁面，不連接帳戶或取消服務。
H1：訂閱費用盤點
英文 title：Subscription Budget: Compare Monthly and Annual Costs | GlossQuote
description：Compare monthly, quarterly and annual subscriptions in one currency. Estimate annual totals and a planned reduction locally in your browser, without connecting accounts.
H1：Subscription budget

FAQ雙語：
1. 會幫我取消嗎？不會，只計算你勾選的假設。 / Does this cancel a subscription? No. It only calculates your selected scenario.
2. 月均就是每月帳單嗎？不是，是全年化金額除12，未考慮實際扣款日、退款或稅費。 / Is the monthly average my bill? No. It divides the annualized amount by 12 and excludes billing dates, refunds and taxes.
3. 可以混幣別嗎？不行，標籤不會換匯；請先自行以同幣別輸入。 / Can I mix currencies? No. The label does not convert currencies. Enter all amounts in one currency.
4. 為何逐列月均加起來有差？各列顯示到分，總結先精確加年額再除12，可能有捨入差。 / Why can row averages differ from the total? Rows are rounded for display; totals are calculated from exact annual amounts first.
5. 關閉頁面會保存嗎？不會，需自己複製或下載報告；不是帳務紀錄。 / Are entries saved after leaving? No. Copy or download the report yourself. This is not an accounting record.

頁面語言zh-Hant/en、lang正確；雙語有完整同內容方法/FAQ/隱私與對應首頁link（https://glossquote.com/index.html、/en/index.html）。語言切換旁提醒清空，不把輸入塞URL。預覽noindex/nofollow且無production canonical/sitemap誤指；M2網址 subscriptions.glossquote.com 的 /index.html、/en/index.html，self canonical、雙向hreflang zh-Hant/en及x-default指繁中、OG/JSON-LD WebApplication符合可見內容；不虛構review/rating/download人數。robots/sitemap列兩頁，真正404、CSP closed static依發布契約。FAQ可以無結構化資料，不承諾搜尋rich result。
