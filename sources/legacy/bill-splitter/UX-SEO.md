# 分帳工具介面與SEO

本機候選採Product App及 [設計系統](docs/DESIGN-SYSTEM.md)。金額輸入與分帳表是主體。使用清晰金額欄、對齊小數及一個主要計算動作，不用儀表板卡片、假收入數字或裝飾圖表。實測與人工缺口見 docs/TEST-RESULTS.md。

目前為U14 v2：兩種模式都只填各人姓名／已付，自動加總並永遠計算結算；沒有手填總額與墊款開關。快速平均，進階可按份數。以原生radio模式選項及原tokens實作，不增加品牌重設。

```text
GlossQuote / 分帳與墊款                    English / 工具首頁
[快速結算 ○] [進階分帳 ○]  精度 [2位小數 v]
進階：[平均 v / 依份數]      （同一幣別）
序號  姓名              已付       份數(進階適用時)    移除
1     人員1             0          1                  ...
2     人員2             0          1                  ...
[新增人員]                    [算出誰付給誰] [清除]
結果：誰支付誰 / 自動總額與人數 / 各人明細 / 尾數說明
[複製明細] [下載TXT]             使用說明與FAQ
```

手機每人一個有legend序號的fieldset，姓名／已付永遠存在，份數只在進階份數模式顯示；移除仍可達。初始三人已付0、無結果，範例不自動載入。快速範例甲900／乙300／丙0；進階同額份數2/1/1，兩者仍需明確計算。清除保留模式，回三人0／份數1／平均／2位，focus第一人姓名。兩種報告結算先列；進階英文Share，快速Equal share。引言明示快速平均／進階可按份數，不在加權結果旁宣稱全部平均。

兩語關鍵文案：

| 狀態 | 繁中 | English |
|---|---|---|
| 初始 | 填入每人已付的共同費用，沒付的人也列入並填0。 | Enter what each person paid for shared costs. Include anyone who paid nothing with 0. |
| 精度說明 | 所有金額須使用同一幣別；共同費用請包含稅與服務費。 | Use one currency for all amounts; include tax and fees in the shared costs. |
| 份數全零 | 至少一人的份數必須大於0。 | At least one person must have a share greater than zero. |
| 合計超上限 | 已付合計超過金額上限，請核對各人的金額。 | Payments add up to more than the amount limit. Check each payment. |
| 草稿 | 資料已變更，請重新計算。 | Details changed. Calculate again. |
| 尾數 | 小數尾數依餘數大小分配，相同時由較前的人員取得。 | Leftover units go to the largest remainders; ties follow the people order. |
| 結算 | {from} 支付 {to} {amount} | {from} pays {to} {amount} |
| 無需結算 | 已付金額與應付一致，無需補付。 | Paid amounts match shares. No settlement is needed. |
| 切換語言 | 切換語言會清除目前內容。 | Switching language clears the current content. |

錯誤code到locale字典一致，error旁有field關聯，不把每次keystroke放assertive live region。兩語report帶人員序號、金額精度及尾數說明。格式化金額不是輸入格式；輸入旁明示不用千分位逗號。

## SEO

- 中文title：分帳結算｜填已付金額，算出誰付給誰 — GlossQuote
- 中文H1：算出誰付給誰
- 中文description：填入每人的已付金額，沒付填0，自動加總並平均或依份數分攤，算出誰付給誰多少。本機計算，不需帳號。
- English title：Quick Bill Settlement & Advanced Split — GlossQuote
- English H1：See who pays whom
- English description：Enter what each person paid, including 0. Total shared payments automatically, split equally or by shares, and see who pays whom. Local calculations without an account.
- 兩語各寫真實使用步驟和限制（中文約100–250字、英文100–180words）。
- FAQ：如何分配尾數？/ How is rounding handled? → 最大餘數，相同依順序 / Largest remainders first, then people order.
- FAQ：能直接轉帳嗎？/ Does this send money? → 不能，只產生計算結果 / No, it only calculates amounts.
- FAQ：可混用幣別嗎？/ Can I mix currencies? → 不可，沒有匯率，選0/2小數適合自己的單位 / No currency conversion; choose 0 or 2 decimals for one unit.
- FAQ：快速與進階有什麼不同？/ How do quick and advanced modes differ? → 兩種都自動加總；快速平均，進階可按份數。0份者不分攤，但付款仍列入應收 / Both total payments automatically; quick splits equally, advanced offers shares. Zero-share payers can still receive settlement.

正式候選split.glossquote.com的index.html與en/index.html，self-canonical、zh-Hant/en/x-default及可見WebApplication資料。無假評價或排行，不保證所有幣別小數規則，不描述為自動金流。首頁同語返回/語言切換不帶草稿。其餘正式/preview/404規則见 [RELEASE](docs/RELEASE.md)。
