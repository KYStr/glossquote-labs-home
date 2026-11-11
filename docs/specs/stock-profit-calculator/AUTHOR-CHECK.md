# 股票損益計算｜文件維護驗算

原作者為 `cloud-dot:3d64a845-35f8-4dbf-8f30-96e603f6cdc7:/home/hatch/workspace/glossquote-factory`。原 [PR #244](https://github.com/KYStr/glossquote-labs-home/pull/244)、候選 `5849c1ff1a6403e9261de07e0c4e7d506935629e`、owner 與 claim 均保留。原作者的檢查及 13 核心、3 狀態案例結果保存於固定來源。 [原作者檢查](https://github.com/KYStr/glossquote-labs-home/blob/5849c1ff1a6403e9261de07e0c4e7d506935629e/docs/specs/stock-profit-calculator/AUTHOR-CHECK.md)

本次文件維護者為 `local-codex:01a1c8a3-8a4e-7e31-a219-8ef84cf9e8a5`，任務 `labs-five-hour-repair-stock-20261111`，依固定簡報修正 ST-01～04。本文件記錄維護者離線驗算，待非作者依三個約定面向獨立審查。 [維護簡報](https://github.com/KYStr/glossquote-labs-home/blob/418aee70f60a04cbe19e339597c91a056bcad0c4/docs/reviews/five-hour-2026-11-11/dispatch/repair-stock/TASK.md)

## 字面驗算與變更

- **ST-01 當沖。** 100 股的 day 回 `DAY_TRADE_ROUND_LOT_REQUIRED`，standard 同資料賣出毛額 11,000 元，0.3% 稅為 33.00 元。合格 1000 股以股或張表示，110,000 元的賣出毛額乘 0.15%，稅皆為 165.00 元。買進 2 張、賣出 1000 股時仍只對賣出量計算，剩餘 1000 股。未確認、確認缺欄及錯型別各有獨立案例，並驗證交易腿變更會撤銷確認。
- **ST-02 理論價。** 預設案例成本 100,143 元。100.59 元時淨額為 100,145 元，首次達標。100.50 元時淨額為 100,055 元，101.00 元時為 100,553 元。這兩個 TWSE 格點供比較；100.59 元依舊是模型的每分理論門檻。結果與報告以 `breakevenPriceIsOrderQuote:false` 標示其用途。
- **ST-03 全域最小。** 1 股、買價 49 元、費率及稅率各 1%、最低費 0 元時，保本搜尋閉區間為 4898～5103 分，共 206 分位。49 元與 51 元的淨額皆 49 元，但 50 元時兩項費用各進位到 1 元，淨額下跌至 48 元。自第 1 分直接枚舉的首個達標分位為 4900。價格及最低費極值案例的保本值為 1,212,118.99 元，區間共 203 分位。
- **ST-04 精確金額。** 買價 999,999.99 元、買進 999,999 張、賣出 999,998 張時，成本分攤為 `333807328570927626160/333333` 元，輸出 `"1001422987135770.01"`。binary64 會把該值與 `"1001422987135770.00"` 映射成同一個數。另一例的成本 103/300 元，顯示 0.34 元。1.34 元的賣出價淨額為 0.34 元，低於未捨入的成本，首個達標為 1.35 元。
- **舊測例。** 九個成功核心 expected 與兩個晚到結果 payload 的 10 個金額字段改成兩位小數字串，並加固定 false 的理論價標記。既有百分比、股數、數值大小及四個錯誤回應保持原樣。所有完整草稿加上布林確認。既有 day 案例為 2000 股，明確確認後維持原稅額。取消與重設的草稿快照隨 schema 更新。新增案例詳見 [fixtures.json](fixtures.json)。

官方來源於 2026-11-11 重讀。第 2、2-2 條確認標準稅率、適格當沖與 2027-12-31 期限。交易所列明零股排除及適格帳戶、標的與成交時段，第 62 條釘定例示價位的格點，第 94 條規範券商自訂費率與通知門檻。 [證交稅條例](https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340078) · [證交所當日沖銷交易專區](https://www.twse.com.tw/zh/products/system/day-trading.html) · [證交所第 62 條](https://twse-regulation.twse.com.tw/TW/law/DOC01_print.aspx?FLCODE=FL007304&FLNO=62) · [證交所第 94 條](https://twse-regulation.twse.com.tw/TW/law/DOC01.aspx?FLCODE=fl007304&FLNO=94)

## 離線結果

Windows / Python 3.12.5 標準函式庫，用 `Fraction` 與獨立整數分進位核對 29 核心、4 狀態、2 組價格反證與 2 份完整匯出，exit 0。對 16 個較小的成功案例再從第一分枚舉核對全域最小。高價案例以未捨入的上下界及區間內每個分位核對。狀態測試為規格狀態模型。驗算未使用產品程式。

| 匯出樣本 | UTF-8 bytes（含 LF） | SHA-256 |
| --- | ---: | --- |
| round-lot-profit | 363 | `888c4bf269ee0126b477c87fe4830b3993b39e80b6697a700516ed2bfa5b2999` |
| large-precision | 468 | `cc35fb9e47cc63324b7929ea1ea9a8a2403d086027bcd834e458400437fcdaf1` |

舊 round-lot-profit 報告樣本為 296 bytes，SHA-256 `a8340e2a3639672a85fd44d66abb3d1e5fa4f8998ca6e0e3abe78b54053b7658`。新樣本保留 10 個金額的字面精度，且加入理論價標記。

## 未驗項

維護候選尚待非作者審查。八節正式文件 readiness、REG-01 登記修復及產品九面向另行驗收。產品執行、瀏覽器、真實下載、Network/Storage、正式站、合併與部署皆 NOT_RUN。
